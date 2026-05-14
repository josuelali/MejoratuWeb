from fastapi import FastAPI, APIRouter, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import os
import logging
import uuid
import httpx
import json
import re
import time

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

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
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# --- Mongo opcional ---
db = None
client = None

mongo_url = os.environ.get("MONGO_URL")
db_name = os.environ.get("DB_NAME", "mejoratuweb")

if mongo_url:
    try:
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        logger.info("MongoDB conectado")
    except Exception as e:
        logger.warning(f"MongoDB desactivado: {e}")
        db = None
else:
    logger.warning("MONGO_URL no configurado. Backend funcionará sin base de datos.")


# --- Models ---
class AnalyzeRequest(BaseModel):
    url: str


class EmailSubscribeRequest(BaseModel):
    email: str


class CreateCheckoutRequest(BaseModel):
    origin_url: str
    analysis_id: Optional[str] = None


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
    return {
        "status": "ok",
        "db": "enabled" if db is not None else "disabled"
    }


def normalize_url(raw_url: str) -> str:
    url = raw_url.strip()

    if not url:
        raise HTTPException(
            status_code=400,
            detail="La URL no puede estar vacía"
        )

    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    return url


async def fetch_html(url: str, timeout: int = 12):
    started_at = time.perf_counter()

    async with httpx.AsyncClient(follow_redirects=True, timeout=timeout) as http:
        resp = await http.get(
            url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (compatible; MejoraTuWebBot/1.0; "
                    "+https://mejoratuweb.org)"
                )
            }
        )

    response_time = time.perf_counter() - started_at
    return resp, response_time


async def save_document(collection: str, data: dict):
    if db is None:
        return None

    try:
        # Copia limpia para Mongo. Evita que Mongo añada _id al objeto original
        # que luego FastAPI intenta devolver como JSON.
        document = json.loads(json.dumps(data, default=str))
        await db[collection].insert_one(document)
    except Exception as e:
        logger.warning(f"No se pudo guardar en MongoDB/{collection}: {e}")

    return None


# --- Quick Scan ---
@api_router.post("/quick-scan")
async def quick_scan(req: AnalyzeRequest, request: Request):
    url = normalize_url(req.url)

    try:
        resp, response_time = await fetch_html(url, timeout=12)
        html = resp.text or ""
        headers_dict = {k.lower(): v for k, v in resp.headers.items()}
    except Exception as e:
        logger.exception(f"Error accediendo a la URL {url}")
        raise HTTPException(
            status_code=400,
            detail=f"No se pudo acceder a la URL: {str(e)}"
        )

    html_lower = html.lower()
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

    if 200 <= resp.status_code < 300:
        total += 10
        checks.append({
            "name": "Estado HTTP",
            "passed": True,
            "detail": f"La web responde correctamente: HTTP {resp.status_code}",
            "points": 10
        })
    elif 300 <= resp.status_code < 400:
        total += 6
        checks.append({
            "name": "Estado HTTP",
            "passed": True,
            "detail": f"La web redirige: HTTP {resp.status_code}",
            "points": 6
        })
    else:
        checks.append({
            "name": "Estado HTTP",
            "passed": False,
            "detail": f"La web responde con HTTP {resp.status_code}",
            "points": 0
        })

    # Response time
    max_pts += 10

    if response_time < 1:
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
            "detail": "No se encontró etiqueta title",
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
            "detail": "Falta meta description",
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
            "detail": "Falta viewport",
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
            "detail": "Sin etiqueta H1",
            "points": 0
        })

    # Images alt
    max_pts += 10

    imgs = re.findall(r"<img[^>]*>", html, re.IGNORECASE)
    no_alt = [
        img for img in imgs
        if "alt=" not in img.lower() or 'alt=""' in img.lower()
    ]

    if len(imgs) == 0:
        total += 10
        checks.append({
            "name": "Alt imágenes",
            "passed": True,
            "detail": "Sin imágenes que verificar",
            "points": 10
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
        "detail": f"{found_headers}/{len(sec_headers)} cabeceras encontradas",
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
            "detail": "Sin etiquetas Open Graph",
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
            "detail": "Falta atributo lang",
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
            "detail": "Sin enlace canonical",
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


@api_router.post("/analyze")
async def analyze_url(req: AnalyzeRequest, request: Request):
    url = normalize_url(req.url)

    try:
        quick = await quick_scan(req, request)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error ejecutando quick_scan en analyze_url para {url}")
        raise HTTPException(
            status_code=400,
            detail=f"No se pudo analizar la URL: {str(e)}"
        )

    openai_key = os.environ.get("OPENAI_API_KEY")

    if not openai_key:
        analysis_id = f"analysis_{uuid.uuid4().hex[:12]}"
        result = {
            "analysis_id": analysis_id,
            "url": url,
            "result": build_fallback_analysis(quick)
        }

        await save_document("analyses", {
            **result,
            "is_premium": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

        return result

    # OpenAI directo por HTTP, sin librería externa.
    try:
        fetched, _response_time = await fetch_html(url, timeout=15)
        html = fetched.text[:12000]
    except Exception as e:
        logger.exception(f"Error accediendo a HTML para análisis IA: {url}")
        analysis = build_fallback_analysis(quick)
        analysis_id = f"analysis_{uuid.uuid4().hex[:12]}"
        result = {"analysis_id": analysis_id, "url": url, "result": analysis}
        await save_document("analyses", {
            **result,
            "is_premium": False,
            "fallback_reason": "html_fetch_failed",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return result

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
        async with httpx.AsyncClient(timeout=40) as http:
            ai_resp = await http.post(
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
            )

        if ai_resp.status_code >= 400:
            logger.warning("OpenAI devolvió error %s; usando fallback heurístico", ai_resp.status_code)
            analysis = build_fallback_analysis(quick)
            analysis_id = f"analysis_{uuid.uuid4().hex[:12]}"
            result = {"analysis_id": analysis_id, "url": url, "result": analysis}
            await save_document("analyses", {
                **result,
                "is_premium": False,
                "fallback_reason": "openai_error",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            return result

        response_text = ai_resp.json()["choices"][0]["message"]["content"]

        start = response_text.find("{")
        end = response_text.rfind("}") + 1

        if start >= 0 and end > start:
            analysis = json.loads(response_text[start:end])
        else:
            analysis = json.loads(response_text)

    except Exception as e:
        logger.exception("Error procesando respuesta IA")
        analysis = build_fallback_analysis(quick)
        analysis_id = f"analysis_{uuid.uuid4().hex[:12]}"
        result = {"analysis_id": analysis_id, "url": url, "result": analysis}
        await save_document("analyses", {
            **result,
            "is_premium": False,
            "fallback_reason": "ai_processing_failed",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return result

    analysis_id = f"analysis_{uuid.uuid4().hex[:12]}"

    result = {
        "analysis_id": analysis_id,
        "url": url,
        "result": analysis
    }

    await save_document("analyses", {
        **result,
        "is_premium": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return result


# --- Email ---
@api_router.post("/email/subscribe")
async def email_subscribe(req: EmailSubscribeRequest):
    data = {
        "email": req.email,
        "subscribed_at": datetime.now(timezone.utc).isoformat()
    }

    await save_document("email_subscribers", data)

    return {"message": "Suscrito correctamente"}


# --- Payments simplificado: usa tus enlaces Stripe directos ---
@api_router.post("/payments/create-checkout")
async def create_checkout(req: CreateCheckoutRequest):
    return {
        "url": "https://buy.stripe.com/28E7sMbKhelIeUN8Tq63K00",
        "message": "Redirección a Auditoría Express"
    }


@api_router.get("/payments/status/{session_id}")
async def payment_status(session_id: str):
    return {
        "status": "external_checkout",
        "payment_status": "managed_by_stripe_link"
    }


app.include_router(api_router)


@app.on_event("shutdown")
async def shutdown_db_client():
    if client:
        client.close()

