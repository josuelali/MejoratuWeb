from fastapi import FastAPI, APIRouter, Request, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
from urllib.parse import urljoin, urlparse
from collections import defaultdict, deque
from pymongo import ASCENDING
from pymongo.errors import DuplicateKeyError
import os
import logging
import uuid
import httpx
import json
import re
import time
import asyncio
import hashlib
import hmac
import ipaddress
import socket
import stripe

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

HTML_FETCH_TIMEOUT_SECONDS = float(os.environ.get("HTML_FETCH_TIMEOUT_SECONDS", "4"))
OPENAI_TIMEOUT_SECONDS = float(os.environ.get("OPENAI_TIMEOUT_SECONDS", "6"))
QUICK_SCAN_MAX_SECONDS = float(os.environ.get("QUICK_SCAN_MAX_SECONDS", "7.5"))
DB_WRITE_TIMEOUT_SECONDS = float(os.environ.get("DB_WRITE_TIMEOUT_SECONDS", "1"))
MAX_HTML_BYTES = int(os.environ.get("MAX_HTML_BYTES", "2000000"))
MAX_REDIRECTS = int(os.environ.get("MAX_REDIRECTS", "5"))
RATE_LIMIT_REQUESTS = int(os.environ.get("RATE_LIMIT_REQUESTS", "30"))
RATE_LIMIT_WINDOW_SECONDS = int(os.environ.get("RATE_LIMIT_WINDOW_SECONDS", "60"))
PAYMENTS_ENABLED = os.environ.get("PAYMENTS_ENABLED", "false").lower() == "true"
STRIPE_EXPECTED_AMOUNT = int(os.environ.get("STRIPE_EXPECTED_AMOUNT", "699"))
STRIPE_CURRENCY = os.environ.get("STRIPE_CURRENCY", "eur").lower()
REPORT_TOKEN_TTL_DAYS = int(os.environ.get("REPORT_TOKEN_TTL_DAYS", "7"))

app = FastAPI(title="MejoraTuWeb API")
api_router = APIRouter(prefix="/api")


# --- CORS ---
allowed_origins = [
    "https://mejoratuweb.org",
    "https://www.mejoratuweb.org",
    "https://mejoratu-web.vercel.app",
    "https://mejoratuweb.onrender.com",
    "http://localhost:3000",
    "http://localhost:5173",
]

extra_origins = os.environ.get("CORS_EXTRA_ORIGINS", "")
if extra_origins:
    allowed_origins.extend([
        origin.strip()
        for origin in extra_origins.split(",")
        if origin.strip()
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=None,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Stripe-Signature", "Authorization"],
    expose_headers=[],
)


# --- MongoDB ---
db = None
client = None
db_ready = False

mongo_url = os.environ.get("MONGO_URL")
db_name = os.environ.get("DB_NAME", "mejoratuweb")

if mongo_url:
    try:
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        logger.info("Cliente MongoDB configurado; conexión pendiente de readiness")
    except Exception as e:
        logger.warning(f"MongoDB desactivado: {e}")
        db = None
else:
    logger.warning("MONGO_URL no configurado. Pagos y análisis premium quedan bloqueados.")


# --- Models ---
class AnalyzeRequest(BaseModel):
    url: str


class EmailSubscribeRequest(BaseModel):
    email: str


class CreateCheckoutRequest(BaseModel):
    origin_url: str
    analysis_id: str
    email: Optional[str] = None


# --- Health ---
@app.get("/")
async def root():
    return {
        "status": "ok",
        "service": "MejoraTuWeb backend",
        "db": "enabled" if db is not None else "disabled"
    }


@api_router.get("/health")
async def health():
    return {"status": "ok", "service": "MejoraTuWeb backend"}


async def mongo_is_ready() -> bool:
    global db_ready
    if db is None:
        db_ready = False
        return False
    try:
        await asyncio.wait_for(db.command("ping"), timeout=2)
        db_ready = True
    except Exception as exc:
        logger.warning("MongoDB no disponible para readiness: %s", exc)
        db_ready = False
    return db_ready


def stripe_mode() -> str:
    return os.environ.get("STRIPE_MODE", "test").strip().lower()


def stripe_config_ready() -> bool:
    mode = stripe_mode()
    if mode not in {"test", "live"}:
        return False
    secret_key = os.environ.get("STRIPE_SECRET_KEY", "")
    expected_prefix = "sk_test_" if mode == "test" else "sk_live_"
    return all([
        PAYMENTS_ENABLED,
        secret_key.startswith(expected_prefix),
        os.environ.get("STRIPE_WEBHOOK_SECRET", "").startswith("whsec_"),
        os.environ.get("STRIPE_PRICE_ID", "").startswith("price_"),
        len(os.environ.get("REPORT_TOKEN_SECRET", "")) >= 32,
    ])


@api_router.get("/ready")
async def readiness():
    mongo_ok = await mongo_is_ready()
    payments_ok = stripe_config_ready()
    ready = mongo_ok and (not PAYMENTS_ENABLED or payments_ok)
    status = "ready"
    if not ready:
        status = "not_ready_for_payments" if mongo_ok and PAYMENTS_ENABLED else "not_ready"
    payload = {
        "status": status,
        "mongodb": "ready" if mongo_ok else "unavailable",
        "payments": f"{stripe_mode()}_ready" if payments_ok else ("not_ready" if PAYMENTS_ENABLED else "disabled"),
    }
    if not ready:
        raise HTTPException(status_code=503, detail=payload)
    return payload


rate_buckets = defaultdict(deque)


def enforce_rate_limit(request: Request, scope: str) -> None:
    forwarded = request.headers.get("x-forwarded-for", "")
    client_ip = forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown")
    key = (scope, client_ip)
    now = time.monotonic()
    bucket = rate_buckets[key]
    while bucket and bucket[0] <= now - RATE_LIMIT_WINDOW_SECONDS:
        bucket.popleft()
    if len(bucket) >= RATE_LIMIT_REQUESTS:
        raise HTTPException(status_code=429, detail="Demasiadas solicitudes. Inténtalo más tarde.")
    bucket.append(now)


def normalize_url(raw_url: str) -> str:
    url = raw_url.strip()

    if not url:
        raise HTTPException(
            status_code=400,
            detail="La URL no puede estar vacía"
        )

    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise HTTPException(status_code=400, detail="Solo se admiten URLs HTTP o HTTPS válidas")
    if parsed.username or parsed.password:
        raise HTTPException(status_code=400, detail="La URL no puede contener credenciales")
    return url


def safe_url_for_logs(url: str) -> str:
    """Conserva solo esquema, host y ruta; nunca query, fragmento ni credenciales."""
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        return "invalid-url"
    return f"{parsed.scheme}://{parsed.netloc}{parsed.path or '/'}"


def is_blocked_ip(value: str) -> bool:
    ip = ipaddress.ip_address(value)
    return any([
        ip.is_private,
        ip.is_loopback,
        ip.is_link_local,
        ip.is_multicast,
        ip.is_reserved,
        ip.is_unspecified,
    ])


async def validate_public_url(url: str) -> str:
    normalized = normalize_url(url)
    parsed = urlparse(normalized)
    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(status_code=400, detail="Host no válido")
    if hostname.lower() in {"localhost", "localhost.localdomain"}:
        raise HTTPException(status_code=400, detail="Destino no permitido")

    try:
        direct_ip = ipaddress.ip_address(hostname)
        addresses = {str(direct_ip)}
    except ValueError:
        try:
            loop = asyncio.get_running_loop()
            records = await loop.run_in_executor(
                None,
                lambda: socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == "https" else 80), type=socket.SOCK_STREAM),
            )
            addresses = {record[4][0] for record in records}
        except socket.gaierror as exc:
            raise HTTPException(status_code=400, detail="No se pudo resolver el dominio") from exc

    if not addresses or any(is_blocked_ip(address) for address in addresses):
        raise HTTPException(status_code=400, detail="Destino de red no permitido")
    return normalized


async def fetch_html(url: str, timeout: float = HTML_FETCH_TIMEOUT_SECONDS):
    started_at = time.perf_counter()
    timeout_config = httpx.Timeout(timeout, connect=min(timeout, 2.0))
    current_url = await validate_public_url(url)
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; MejoraTuWebBot/1.0; +https://mejoratuweb.org)"
    }

    response = None
    async with httpx.AsyncClient(follow_redirects=False, timeout=timeout_config) as http:
        for redirect_count in range(MAX_REDIRECTS + 1):
            current_url = await validate_public_url(current_url)
            async with http.stream("GET", current_url, headers=headers) as streamed:
                if streamed.status_code in {301, 302, 303, 307, 308}:
                    location = streamed.headers.get("location")
                    if not location or redirect_count >= MAX_REDIRECTS:
                        raise HTTPException(status_code=400, detail="Demasiadas redirecciones")
                    current_url = urljoin(current_url, location)
                    continue

                content = bytearray()
                async for chunk in streamed.aiter_bytes():
                    content.extend(chunk)
                    if len(content) > MAX_HTML_BYTES:
                        raise HTTPException(status_code=400, detail="La respuesta web es demasiado grande")
                response = httpx.Response(
                    streamed.status_code,
                    headers=streamed.headers,
                    content=bytes(content),
                    request=streamed.request,
                )
                break

    if response is None:
        raise HTTPException(status_code=400, detail="No se pudo obtener una respuesta web válida")

    response_time = time.perf_counter() - started_at
    return response, response_time


async def save_document(collection: str, data: dict, required: bool = False):
    if db is None:
        if required:
            raise HTTPException(status_code=503, detail="Persistencia no disponible")
        return None

    try:
        document = json.loads(json.dumps(data, default=str))
        result = await asyncio.wait_for(
            db[collection].insert_one(document),
            timeout=DB_WRITE_TIMEOUT_SECONDS,
        )
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("No se pudo guardar en MongoDB/%s: %s", collection, exc)
        if required:
            raise HTTPException(status_code=503, detail="No se pudo guardar el análisis") from exc
        return None


# --- Quick Scan ---
def build_quick_scan_result(
    url: str,
    resp=None,
    html: str = "",
    headers_dict: Optional[dict] = None,
    response_time: float = 0,
    fallback_reason: Optional[str] = None
) -> dict:
    html = html or ""
    html_lower = html.lower()
    headers_dict = headers_dict or {}
    checks = []
    total = 0
    max_pts = 0

    # HTTPS
    is_https = url.startswith("https://")
    max_pts += 15

    if is_https:
        total += 15
        checks.append({
            "name": "HTTPS",
            "passed": True,
            "detail": "Conexión segura HTTPS activa",
            "points": 15
        })
    else:
        checks.append({
            "name": "HTTPS",
            "passed": False,
            "detail": "Sin HTTPS - conexión no segura",
            "points": 0
        })

    # Response status
    max_pts += 10
    status_code = getattr(resp, "status_code", None)

    if status_code is None:
        checks.append({
            "name": "Estado HTTP",
            "passed": False,
            "detail": "No se pudo verificar la respuesta HTTP a tiempo",
            "points": 0
        })
    elif 200 <= status_code < 300:
        total += 10
        checks.append({
            "name": "Estado HTTP",
            "passed": True,
            "detail": f"La web responde correctamente: HTTP {status_code}",
            "points": 10
        })
    elif 300 <= status_code < 400:
        total += 6
        checks.append({
            "name": "Estado HTTP",
            "passed": True,
            "detail": f"La web redirige: HTTP {status_code}",
            "points": 6
        })
    else:
        checks.append({
            "name": "Estado HTTP",
            "passed": False,
            "detail": f"La web responde con HTTP {status_code}",
            "points": 0
        })

    # Response time
    max_pts += 10

    if fallback_reason:
        checks.append({
            "name": "Velocidad",
            "passed": False,
            "detail": "La web tardó demasiado o no respondió; se generó diagnóstico rápido",
            "points": 0
        })
    elif response_time < 1:
        total += 10
        checks.append({
            "name": "Velocidad",
            "passed": True,
            "detail": f"{response_time:.2f}s (excelente)",
            "points": 10
        })
    elif response_time < 3:
        total += 5
        checks.append({
            "name": "Velocidad",
            "passed": True,
            "detail": f"{response_time:.2f}s (aceptable)",
            "points": 5
        })
    else:
        checks.append({
            "name": "Velocidad",
            "passed": False,
            "detail": f"{response_time:.2f}s (lento)",
            "points": 0
        })

    # Meta title
    max_pts += 10

    title_match = re.search(
        r"<title[^>]*>(.*?)</title>",
        html,
        re.IGNORECASE | re.DOTALL
    )

    if title_match and title_match.group(1).strip():
        title_text = title_match.group(1).strip()
        title_len = len(title_text)
        pts = 10 if 30 <= title_len <= 60 else 5
        total += pts

        checks.append({
            "name": "Meta Title",
            "passed": True,
            "detail": f"Encontrado ({title_len} caracteres)",
            "points": pts
        })
    else:
        checks.append({
            "name": "Meta Title",
            "passed": False,
            "detail": "No se encontró etiqueta title" if html else "No verificable en modo fallback",
            "points": 0
        })

    # Meta description
    max_pts += 10

    desc_match = re.search(
        r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']*)["\']',
        html,
        re.IGNORECASE
    )

    if not desc_match:
        desc_match = re.search(
            r'<meta[^>]+content=["\']([^"\']*)["\'][^>]+name=["\']description["\']',
            html,
            re.IGNORECASE
        )

    if desc_match and desc_match.group(1).strip():
        desc_text = desc_match.group(1).strip()
        desc_len = len(desc_text)
        pts = 10 if 120 <= desc_len <= 160 else 5
        total += pts

        checks.append({
            "name": "Meta Description",
            "passed": True,
            "detail": f"Encontrada ({desc_len} caracteres)",
            "points": pts
        })
    else:
        checks.append({
            "name": "Meta Description",
            "passed": False,
            "detail": "Falta meta description" if html else "No verificable en modo fallback",
            "points": 0
        })

    # Viewport
    max_pts += 10

    has_viewport = (
        'name="viewport"' in html_lower
        or "name='viewport'" in html_lower
    )

    if has_viewport:
        total += 10
        checks.append({
            "name": "Viewport",
            "passed": True,
            "detail": "Mobile-friendly configurado",
            "points": 10
        })
    else:
        checks.append({
            "name": "Viewport",
            "passed": False,
            "detail": "Falta viewport" if html else "No verificable en modo fallback",
            "points": 0
        })

    # H1
    max_pts += 10

    h1_count = len(re.findall(r"<h1[^>]*>", html, re.IGNORECASE))

    if h1_count == 1:
        total += 10
        checks.append({
            "name": "H1",
            "passed": True,
            "detail": "Un H1 encontrado",
            "points": 10
        })
    elif h1_count > 1:
        total += 5
        checks.append({
            "name": "H1",
            "passed": True,
            "detail": f"{h1_count} H1 encontrados. Recomendado: 1",
            "points": 5
        })
    else:
        checks.append({
            "name": "H1",
            "passed": False,
            "detail": "Sin etiqueta H1" if html else "No verificable en modo fallback",
            "points": 0
        })

    # Images alt
    max_pts += 10

    imgs = re.findall(r"<img[^>]*>", html, re.IGNORECASE)
    no_alt = [
        img for img in imgs
        if "alt=" not in img.lower() or 'alt=""' in img.lower()
    ]

    if len(imgs) == 0 and html:
        total += 10
        checks.append({
            "name": "Alt imágenes",
            "passed": True,
            "detail": "Sin imágenes que verificar",
            "points": 10
        })
    elif len(imgs) == 0:
        checks.append({
            "name": "Alt imágenes",
            "passed": False,
            "detail": "No verificable en modo fallback",
            "points": 0
        })
    elif len(no_alt) == 0:
        total += 10
        checks.append({
            "name": "Alt imágenes",
            "passed": True,
            "detail": f"Todas las imágenes ({len(imgs)}) tienen alt",
            "points": 10
        })
    else:
        pts = int(((len(imgs) - len(no_alt)) / len(imgs)) * 10)
        total += pts

        checks.append({
            "name": "Alt imágenes",
            "passed": False,
            "detail": f"{len(no_alt)}/{len(imgs)} imágenes sin alt",
            "points": pts
        })

    # Security headers
    max_pts += 10

    sec_headers = [
        "content-security-policy",
        "x-frame-options",
        "x-content-type-options",
        "strict-transport-security"
    ]

    found_headers = sum(1 for h in sec_headers if h in headers_dict)
    sec_pts = int((found_headers / len(sec_headers)) * 10)
    total += sec_pts

    checks.append({
        "name": "Cabeceras de seguridad",
        "passed": found_headers >= 3,
        "detail": f"{found_headers}/{len(sec_headers)} cabeceras encontradas" if headers_dict else "No verificable en modo fallback",
        "points": sec_pts
    })

    # Open Graph
    max_pts += 5

    has_og = (
        'property="og:' in html_lower
        or "property='og:" in html_lower
    )

    if has_og:
        total += 5
        checks.append({
            "name": "Open Graph",
            "passed": True,
            "detail": "Etiquetas Open Graph encontradas",
            "points": 5
        })
    else:
        checks.append({
            "name": "Open Graph",
            "passed": False,
            "detail": "Sin etiquetas Open Graph" if html else "No verificable en modo fallback",
            "points": 0
        })

    # Lang attribute
    max_pts += 5

    has_lang = (
        'lang="' in html_lower[:500]
        or "lang='" in html_lower[:500]
    )

    if has_lang:
        total += 5
        checks.append({
            "name": "Atributo lang",
            "passed": True,
            "detail": "Idioma declarado",
            "points": 5
        })
    else:
        checks.append({
            "name": "Atributo lang",
            "passed": False,
            "detail": "Falta atributo lang" if html else "No verificable en modo fallback",
            "points": 0
        })

    # Canonical
    max_pts += 5

    has_canonical = (
        'rel="canonical"' in html_lower
        or "rel='canonical'" in html_lower
    )

    if has_canonical:
        total += 5
        checks.append({
            "name": "Canonical",
            "passed": True,
            "detail": "Canonical encontrado",
            "points": 5
        })
    else:
        checks.append({
            "name": "Canonical",
            "passed": False,
            "detail": "Sin enlace canonical" if html else "No verificable en modo fallback",
            "points": 0
        })

    final_score = int((total / max_pts) * 100) if max_pts > 0 else 0
    scan_id = f"scan_{uuid.uuid4().hex[:12]}"

    result = {
        "scan_id": scan_id,
        "url": url,
        "score": final_score,
        "checks": checks,
        "response_time": round(response_time, 2),
        "is_https": is_https,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    if fallback_reason:
        result["fallback"] = True
        result["fallback_reason"] = fallback_reason

    return result


@api_router.post("/quick-scan")
async def quick_scan(req: AnalyzeRequest, request: Request):
    enforce_rate_limit(request, "quick-scan")
    url = await validate_public_url(req.url)

    try:
        resp, response_time = await asyncio.wait_for(
            fetch_html(url, timeout=HTML_FETCH_TIMEOUT_SECONDS),
            timeout=QUICK_SCAN_MAX_SECONDS
        )
        html = resp.text or ""
        headers_dict = {k.lower(): v for k, v in resp.headers.items()}
        result = build_quick_scan_result(
            url=url,
            resp=resp,
            html=html,
            headers_dict=headers_dict,
            response_time=response_time
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("Quick scan fallback para %s: %s", safe_url_for_logs(url), e)
        result = build_quick_scan_result(
            url=url,
            response_time=QUICK_SCAN_MAX_SECONDS,
            fallback_reason="html_fetch_failed_or_timeout"
        )

    await save_document("quick_scans", result)

    return result


# --- Full Analyze ---
def build_fallback_analysis(quick: dict) -> dict:
    """Construye un análisis heurístico sin exponer errores técnicos al usuario."""
    score = quick.get("score", 0)
    checks = quick.get("checks", [])
    failed_checks = [check for check in checks if not check.get("passed")]
    visible_checks = (failed_checks or checks)[:6]

    errors = [
        {
            "title": check.get("name", "Punto a revisar"),
            "description": check.get(
                "detail",
                "Se ha detectado un punto mejorable en la web."
            ),
            "severity": "critical" if not check.get("passed") else "info",
            "category": "seo"
        }
        for check in visible_checks
    ]

    if len(errors) < 5:
        errors.extend([
            {
                "title": "Claridad de la propuesta",
                "description": "Revisar que el visitante entienda rápido qué ofreces y qué debe hacer después.",
                "severity": "warning",
                "category": "ux"
            },
            {
                "title": "Llamada a la acción",
                "description": "Añadir o reforzar un CTA visible para convertir visitas en contactos o ventas.",
                "severity": "warning",
                "category": "ux"
            },
            {
                "title": "Confianza comercial",
                "description": "Incluir señales de confianza como reseñas, casos, garantías o datos de contacto claros.",
                "severity": "warning",
                "category": "ux"
            },
            {
                "title": "SEO básico",
                "description": "Revisar títulos, metadescripciones y estructura para mejorar la visibilidad orgánica.",
                "severity": "warning",
                "category": "seo"
            },
            {
                "title": "Conversión",
                "description": "Optimizar la ruta desde visita hasta contacto, presupuesto, compra o reserva.",
                "severity": "warning",
                "category": "ux"
            },
        ][:5 - len(errors)])

    return {
        "score": score,
        "money_lost_monthly": max(49, int((100 - score) * 7)),
        "summary": "Análisis generado en modo rápido.",
        "errors": errors,
        "opportunities": [
            {
                "title": "Mejorar conversión",
                "description": "Optimizar CTA, estructura de landing y propuesta de valor.",
                "impact": "high",
                "estimated_value": 149
            },
            {
                "title": "Mejorar SEO técnico",
                "description": "Corregir metadatos, canonical, H1 y estructura semántica.",
                "impact": "medium",
                "estimated_value": 99
            },
            {
                "title": "Aumentar confianza",
                "description": "Añadir pruebas sociales, contacto visible y argumentos claros de decisión.",
                "impact": "medium",
                "estimated_value": 99
            },
            {
                "title": "Captar leads",
                "description": "Crear una acción simple para que el visitante deje sus datos o pida información.",
                "impact": "high",
                "estimated_value": 199
            }
        ],
        "seo_score": score,
        "performance_score": score,
        "security_score": score,
        "ux_score": score,
        "recommendations": [
            "Revisar título, metadescripción y H1.",
            "Añadir CTA principal visible.",
            "Optimizar velocidad y cabeceras de seguridad.",
            "Mejorar confianza y ruta de contacto."
        ]
    }


def build_free_preview(full_result: dict) -> dict:
    errors = full_result.get("errors") or []
    return {
        "score": full_result.get("score", 0),
        "summary": full_result.get("summary", "Análisis completado."),
        "money_lost_monthly": full_result.get("money_lost_monthly", 0),
        "error_count": len(errors),
        "critical_error_count": len([
            error for error in errors if error.get("severity") == "critical"
        ]),
    }


async def persist_analysis(url: str, full_result: dict, fallback_reason: Optional[str] = None) -> dict:
    analysis_id = f"analysis_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    document = {
        "analysis_id": analysis_id,
        "url": url,
        "result": full_result,
        "payment_status": "unpaid",
        "created_at": now,
        "updated_at": now,
    }
    if fallback_reason:
        document["fallback_reason"] = fallback_reason
    await save_document("analyses", document, required=True)
    return {
        "analysis_id": analysis_id,
        "url": url,
        "result": build_free_preview(full_result),
        "is_premium": False,
    }


@api_router.post("/analyze")
async def analyze_url(req: AnalyzeRequest, request: Request):
    enforce_rate_limit(request, "analyze")
    if not await mongo_is_ready():
        raise HTTPException(status_code=503, detail="El análisis no puede guardarse en este momento")
    url = await validate_public_url(req.url)

    try:
        quick = await quick_scan(req, request)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error ejecutando quick_scan en analyze_url para %s", safe_url_for_logs(url))
        raise HTTPException(
            status_code=400,
            detail=f"No se pudo analizar la URL: {str(e)}"
        )

    openai_key = os.environ.get("OPENAI_API_KEY")

    if not openai_key:
        return await persist_analysis(url, build_fallback_analysis(quick), "openai_not_configured")

    # OpenAI directo por HTTP, sin librería externa.
    try:
        fetched, _response_time = await fetch_html(url, timeout=HTML_FETCH_TIMEOUT_SECONDS)
        html = fetched.text[:12000]
    except Exception as e:
        logger.exception("Error accediendo a HTML para análisis IA: %s", safe_url_for_logs(url))
        return await persist_analysis(url, build_fallback_analysis(quick), "html_fetch_failed")

    prompt = f"""
Analiza esta web y devuelve SOLO JSON válido con esta estructura exacta:

URL: {url}
HTML truncado:
{html}

{{
  "score": 0,
  "money_lost_monthly": 0,
  "summary": "",
  "errors": [
    {{"title": "", "description": "", "severity": "critical|warning|info", "category": "seo|performance|security|ux"}}
  ],
  "opportunities": [
    {{"title": "", "description": "", "impact": "high|medium|low", "estimated_value": 0}}
  ],
  "seo_score": 0,
  "performance_score": 0,
  "security_score": 0,
  "ux_score": 0,
  "recommendations": ["", ""]
}}

Todo en español. Mínimo 5 errores y 4 oportunidades. Sin markdown.
"""

    try:
        async with httpx.AsyncClient(timeout=OPENAI_TIMEOUT_SECONDS) as http:
            ai_resp = await asyncio.wait_for(
                http.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "Eres un auditor web experto. "
                                "Responde solo con JSON válido."
                            )
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 0.3
                }
            ),
                timeout=OPENAI_TIMEOUT_SECONDS + 1
            )

        if ai_resp.status_code >= 400:
            logger.warning("OpenAI devolvió error %s; usando fallback heurístico", ai_resp.status_code)
            return await persist_analysis(url, build_fallback_analysis(quick), "openai_error")

        response_text = ai_resp.json()["choices"][0]["message"]["content"]

        start = response_text.find("{")
        end = response_text.rfind("}") + 1

        if start >= 0 and end > start:
            analysis = json.loads(response_text[start:end])
        else:
            analysis = json.loads(response_text)

    except Exception as e:
        logger.exception("Error procesando respuesta IA")
        return await persist_analysis(url, build_fallback_analysis(quick), "ai_processing_failed")

    return await persist_analysis(url, analysis)


# --- Email ---
@api_router.post("/email/subscribe")
async def email_subscribe(req: EmailSubscribeRequest):
    data = {
        "email": req.email,
        "subscribed_at": datetime.now(timezone.utc).isoformat()
    }

    await save_document("email_subscribers", data)

    return {"message": "Suscrito correctamente"}


# --- Payments and premium delivery (explicit Stripe Test/Live mode) ---
def require_payment_dependencies() -> None:
    if not PAYMENTS_ENABLED:
        raise HTTPException(status_code=503, detail="Los pagos están desactivados")
    if not stripe_config_ready():
        raise HTTPException(status_code=503, detail="Stripe no está configurado para el modo seleccionado")
    if db is None or not db_ready:
        raise HTTPException(status_code=503, detail="Persistencia no disponible")


def checkout_origin(raw_origin: str) -> str:
    parsed = urlparse(raw_origin)
    origin = f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme and parsed.netloc else ""
    configured = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    allowed = {configured, "http://localhost:3000", "http://localhost:5173"}
    if origin not in allowed:
        raise HTTPException(status_code=400, detail="Origen de Checkout no permitido")
    return origin


def value_from(obj, key, default=None):
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


async def create_stripe_session(**kwargs):
    stripe.api_key = os.environ["STRIPE_SECRET_KEY"]
    return await asyncio.to_thread(stripe.checkout.Session.create, **kwargs)


async def retrieve_stripe_session(session_id: str):
    stripe.api_key = os.environ["STRIPE_SECRET_KEY"]
    return await asyncio.to_thread(
        stripe.checkout.Session.retrieve,
        session_id,
        expand=["line_items.data.price"],
    )


def validate_paid_session(session, expected_analysis_id: str) -> str:
    metadata = value_from(session, "metadata", {}) or {}
    analysis_id = value_from(session, "client_reference_id") or value_from(metadata, "analysis_id")
    if analysis_id != expected_analysis_id:
        raise HTTPException(status_code=400, detail="El pago no corresponde al análisis")
    if value_from(session, "payment_status") != "paid":
        raise HTTPException(status_code=400, detail="El pago no está confirmado")
    if value_from(session, "amount_total") != STRIPE_EXPECTED_AMOUNT:
        raise HTTPException(status_code=400, detail="Importe de pago incorrecto")
    if str(value_from(session, "currency", "")).lower() != STRIPE_CURRENCY:
        raise HTTPException(status_code=400, detail="Moneda de pago incorrecta")

    line_items = value_from(value_from(session, "line_items", {}), "data", []) or []
    price_ids = {
        value_from(value_from(item, "price", {}), "id")
        for item in line_items
    }
    if os.environ["STRIPE_PRICE_ID"] not in price_ids:
        raise HTTPException(status_code=400, detail="Producto de Stripe incorrecto")
    return analysis_id


def hash_report_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@api_router.post("/payments/create-checkout")
async def create_checkout(req: CreateCheckoutRequest, request: Request):
    enforce_rate_limit(request, "checkout")
    require_payment_dependencies()
    if not await mongo_is_ready():
        raise HTTPException(status_code=503, detail="Persistencia no disponible")
    origin = checkout_origin(req.origin_url)
    analysis = await db.analyses.find_one({"analysis_id": req.analysis_id})
    if not analysis:
        raise HTTPException(status_code=404, detail="Análisis no encontrado")
    if analysis.get("payment_status") == "paid":
        raise HTTPException(status_code=409, detail="El análisis ya está pagado")
    if req.email and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", req.email):
        raise HTTPException(status_code=400, detail="Email no válido")

    session_args = {
        "mode": "payment",
        "line_items": [{"price": os.environ["STRIPE_PRICE_ID"], "quantity": 1}],
        "client_reference_id": req.analysis_id,
        "metadata": {"analysis_id": req.analysis_id},
        "success_url": f"{origin}/payment-success?session_id={{CHECKOUT_SESSION_ID}}",
        "cancel_url": f"{origin}/?checkout=cancelled",
    }
    if req.email:
        session_args["customer_email"] = req.email
    session = await create_stripe_session(**session_args)
    session_id = value_from(session, "id")
    await db.analyses.update_one(
        {"analysis_id": req.analysis_id, "payment_status": "unpaid"},
        {"$set": {
            "payment_status": "checkout_started",
            "stripe_session_id": session_id,
            "updated_at": datetime.now(timezone.utc),
        }},
    )
    return {"url": value_from(session, "url"), "session_id": session_id}


@api_router.post("/payments/webhook")
async def stripe_webhook(request: Request):
    if not stripe_config_ready():
        raise HTTPException(status_code=503, detail="Stripe no está configurado para el modo seleccionado")
    if not await mongo_is_ready():
        raise HTTPException(status_code=503, detail="Persistencia no disponible")
    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(
            payload,
            signature,
            os.environ["STRIPE_WEBHOOK_SECRET"],
        )
    except (ValueError, stripe.error.SignatureVerificationError) as exc:
        raise HTTPException(status_code=400, detail="Firma Stripe inválida") from exc

    event_id = value_from(event, "id")
    event_type = value_from(event, "type")
    if event_type != "checkout.session.completed":
        return {"received": True, "processed": False}

    event_session = value_from(value_from(event, "data", {}), "object", {})
    session_id = value_from(event_session, "id")
    analysis_id = value_from(event_session, "client_reference_id") or value_from(
        value_from(event_session, "metadata", {}) or {}, "analysis_id"
    )
    if not session_id or not analysis_id:
        raise HTTPException(status_code=400, detail="Evento Stripe incompleto")

    previous = await db.stripe_events.find_one({"event_id": event_id, "status": "completed"})
    if previous:
        return {"received": True, "processed": False, "duplicate": True}

    session = await retrieve_stripe_session(session_id)
    validate_paid_session(session, analysis_id)
    analysis = await db.analyses.find_one({
        "analysis_id": analysis_id,
        "stripe_session_id": session_id,
    })
    if not analysis:
        raise HTTPException(status_code=400, detail="Análisis o sesión no vinculados")

    customer_details = value_from(session, "customer_details", {}) or {}
    buyer_email = value_from(customer_details, "email") or value_from(session, "customer_email")
    now = datetime.now(timezone.utc)
    await db.analyses.update_one(
        {"analysis_id": analysis_id, "stripe_session_id": session_id},
        {"$set": {
            "payment_status": "paid",
            "email": buyer_email,
            "paid_at": now,
            "updated_at": now,
        }},
    )
    try:
        await db.stripe_events.update_one(
            {"event_id": event_id},
            {"$set": {
                "event_id": event_id,
                "type": event_type,
                "analysis_id": analysis_id,
                "status": "completed",
                "processed_at": now,
            }},
            upsert=True,
        )
    except DuplicateKeyError:
        return {"received": True, "processed": False, "duplicate": True}
    return {"received": True, "processed": True}


@api_router.get("/payments/status/{session_id}")
async def payment_status(session_id: str, request: Request):
    enforce_rate_limit(request, "payment-status")
    require_payment_dependencies()
    if not await mongo_is_ready():
        raise HTTPException(status_code=503, detail="Persistencia no disponible")
    if not re.fullmatch(r"cs_test_[A-Za-z0-9_]+", session_id):
        raise HTTPException(status_code=400, detail="Sesión Stripe Test no válida")
    analysis = await db.analyses.find_one({"stripe_session_id": session_id})
    if not analysis:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if analysis.get("payment_status") != "paid":
        return {"status": "pending", "payment_status": analysis.get("payment_status", "unpaid")}

    token_payload = f"{analysis['analysis_id']}:{session_id}".encode("utf-8")
    token = hmac.new(
        os.environ["REPORT_TOKEN_SECRET"].encode("utf-8"),
        token_payload,
        hashlib.sha256,
    ).hexdigest()
    expires_at = analysis.get("access_token_expires_at") or (
        datetime.now(timezone.utc) + timedelta(days=REPORT_TOKEN_TTL_DAYS)
    )
    await db.analyses.update_one(
        {"analysis_id": analysis["analysis_id"], "payment_status": "paid"},
        {"$set": {
            "access_token_hash": hash_report_token(token),
            "access_token_expires_at": expires_at,
            "updated_at": datetime.now(timezone.utc),
        }},
    )
    return {
        "status": "complete",
        "payment_status": "paid",
        "analysis_id": analysis["analysis_id"],
        "access_token": token,
        "expires_at": expires_at,
    }


@api_router.get("/reports/{analysis_id}")
async def premium_report(
    analysis_id: str,
    request: Request,
    authorization: Optional[str] = Header(default=None),
):
    enforce_rate_limit(request, "premium-report")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Autorización premium necesaria")
    token = authorization.removeprefix("Bearer ").strip()
    if db is None:
        raise HTTPException(status_code=503, detail="Persistencia no disponible")
    if not await mongo_is_ready():
        raise HTTPException(status_code=503, detail="Persistencia no disponible")
    analysis = await db.analyses.find_one({"analysis_id": analysis_id})
    if not analysis or analysis.get("payment_status") != "paid":
        raise HTTPException(status_code=403, detail="Informe premium no autorizado")
    expected_hash = analysis.get("access_token_hash", "")
    if not expected_hash or not hmac.compare_digest(expected_hash, hash_report_token(token)):
        raise HTTPException(status_code=403, detail="Token premium no válido")
    expires_at = analysis.get("access_token_expires_at")
    now = datetime.now(timezone.utc)
    if expires_at and expires_at.tzinfo is None:
        now = now.replace(tzinfo=None)
    if not expires_at or expires_at <= now:
        raise HTTPException(status_code=403, detail="Token premium caducado")
    return {
        "analysis_id": analysis_id,
        "url": analysis["url"],
        "result": analysis["result"],
        "is_premium": True,
    }


app.include_router(api_router)


@app.on_event("startup")
async def initialize_database():
    if not await mongo_is_ready():
        return
    try:
        await db.analyses.create_index([("analysis_id", ASCENDING)], unique=True)
        await db.analyses.create_index(
            [("stripe_session_id", ASCENDING)],
            unique=True,
            sparse=True,
        )
        await db.stripe_events.create_index([("event_id", ASCENDING)], unique=True)
    except Exception as exc:
        global db_ready
        db_ready = False
        logger.error("No se pudieron preparar los índices MongoDB: %s", exc)


@app.on_event("shutdown")
async def shutdown_db_client():
    if client:
        client.close()
