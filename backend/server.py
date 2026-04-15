from fastapi import FastAPI, APIRouter, Request, Response, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from openai import AsyncOpenAI
import stripe
import os
import logging
import uuid
import httpx
import json
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path
from pydantic import BaseModel
from typing import Optional

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
SESSION_SECRET = os.environ.get("SESSION_SECRET", "").strip()
SESSION_COOKIE_NAME = os.environ.get("SESSION_COOKIE_NAME", "session_token")
SESSION_DAYS = int(os.environ.get("SESSION_DAYS", "7"))

if not SESSION_SECRET:
    raise RuntimeError("SESSION_SECRET is required")

session_serializer = URLSafeTimedSerializer(SESSION_SECRET, salt="mejoratuweb-session")

app = FastAPI()
api_router = APIRouter(prefix="/api")
openai_client = None


# --- Models ---
class AnalyzeRequest(BaseModel):
    url: str


class EmailSubscribeRequest(BaseModel):
    email: str


class CreateCheckoutRequest(BaseModel):
    origin_url: str
    analysis_id: Optional[str] = None


class GoogleAuthRequest(BaseModel):
    id_token: str


# --- Auth Helpers ---
def _build_cookie_settings() -> dict:
    secure = os.environ.get("COOKIE_SECURE", "true").lower() != "false"
    same_site = os.environ.get("COOKIE_SAMESITE", "none").lower()
    if same_site not in {"lax", "strict", "none"}:
        same_site = "none"
    return {
        "httponly": True,
        "secure": secure,
        "samesite": same_site,
        "path": "/",
        "max_age": SESSION_DAYS * 24 * 60 * 60,
    }


def _sign_session_id(session_id: str) -> str:
    return session_serializer.dumps({"sid": session_id})


def _read_signed_session(raw_cookie: Optional[str]) -> Optional[str]:
    if not raw_cookie:
        return None

    max_age = SESSION_DAYS * 24 * 60 * 60
    try:
        data = session_serializer.loads(raw_cookie, max_age=max_age)
    except (BadSignature, SignatureExpired):
        return None

    return data.get("sid")


async def _create_session(user_id: str) -> str:
    session_id = f"sess_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)

    await db.user_sessions.insert_one(
        {
            "session_id": session_id,
            "user_id": user_id,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    return session_id


async def get_current_user(request: Request):
    raw_cookie = request.cookies.get(SESSION_COOKIE_NAME)
    session_id = _read_signed_session(raw_cookie)
    if not session_id:
        return None

    session = await db.user_sessions.find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        return None

    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_id": session_id})
        return None

    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    return user


# --- Auth Routes ---
@api_router.post("/auth/google")
async def auth_google(payload: GoogleAuthRequest, response: Response):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID not configured")

    try:
        token_info = id_token.verify_oauth2_token(
            payload.id_token,
            GoogleRequest(),
            GOOGLE_CLIENT_ID,
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    google_sub = token_info.get("sub")
    email = token_info.get("email")
    if not google_sub or not email:
        raise HTTPException(status_code=401, detail="Google token missing required claims")

    now = datetime.now(timezone.utc).isoformat()
    update_fields = {
        "email": email,
        "name": token_info.get("name", ""),
        "picture": token_info.get("picture", ""),
        "google_sub": google_sub,
        "email_verified": bool(token_info.get("email_verified", False)),
        "updated_at": now,
    }

    user = await db.users.find_one(
        {"$or": [{"google_sub": google_sub}, {"email": email}]}, {"_id": 0}
    )

    if user:
        user_id = user["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": update_fields})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one(
            {
                "user_id": user_id,
                **update_fields,
                "is_premium": False,
                "created_at": now,
            }
        )

    session_id = await _create_session(user_id)
    signed_session = _sign_session_id(session_id)
    response.set_cookie(SESSION_COOKIE_NAME, signed_session, **_build_cookie_settings())

    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user_doc


@api_router.get("/auth/me")
async def auth_me(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@api_router.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    raw_cookie = request.cookies.get(SESSION_COOKIE_NAME)
    session_id = _read_signed_session(raw_cookie)
    if session_id:
        await db.user_sessions.delete_one({"session_id": session_id})

    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return {"message": "Logged out"}


# --- Analysis ---
@api_router.post("/analyze")
async def analyze_url(req: AnalyzeRequest, request: Request):
    openai_key = os.environ.get("OPENAI_API_KEY")
    if not openai_key:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY no configurada. Configura la variable de entorno OPENAI_API_KEY.",
        )

    url = req.url.strip()
    if not url.startswith("http"):
        url = "https://" + url

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=15) as http:
            resp = await http.get(
                url,
                headers={"User-Agent": "Mozilla/5.0 FixMySiteAI/1.0"},
            )
            html = resp.text[:12000]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se pudo acceder a la URL: {str(e)}")

    prompt = f"""Analiza esta web y devuelve SOLO un JSON valido con esta estructura exacta:

URL: {url}
HTML (truncado):
{html}

{{
  "score": <numero 0-100>,
  "money_lost_monthly": <euros perdidos estimados por mes>,
  "summary": "<resumen breve en espanol>",
  "errors": [
    {{"title": "<titulo>", "description": "<descripcion>", "severity": "critical|warning|info", "category": "seo|performance|security|ux"}}
  ],
  "opportunities": [
    {{"title": "<titulo>", "description": "<descripcion>", "impact": "high|medium|low", "estimated_value": <euros/mes>}}
  ],
  "seo_score": <0-100>,
  "performance_score": <0-100>,
  "security_score": <0-100>,
  "ux_score": <0-100>,
  "recommendations": ["<recomendacion 1>", "<recomendacion 2>"]
}}

Se realista. Genera minimo 5 errores y 4 oportunidades. Todo en espanol. Solo JSON, sin markdown."""

    global openai_client
    if openai_client is None:
        openai_client = AsyncOpenAI(api_key=openai_key)

    response = await openai_client.responses.create(
        model="gpt-4o-mini",
        input=[
            {
                "role": "system",
                "content": "Eres un auditor web experto. Analizas webs para SEO, rendimiento, seguridad y UX. Responde solo con JSON valido.",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
    )
    response_text = response.output_text

    try:
        start = response_text.find("{")
        end = response_text.rfind("}") + 1
        if start >= 0 and end > start:
            analysis = json.loads(response_text[start:end])
        else:
            analysis = json.loads(response_text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Error al procesar el analisis de IA")

    analysis_id = f"analysis_{uuid.uuid4().hex[:12]}"
    user = await get_current_user(request)
    await db.analyses.insert_one(
        {
            "analysis_id": analysis_id,
            "url": url,
            "result": analysis,
            "is_premium": False,
            "user_id": user["user_id"] if user else None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )

    return {"analysis_id": analysis_id, "url": url, "result": analysis}


# --- Analysis History ---
@api_router.get("/analyses/history")
async def analysis_history(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    analyses = (
        await db.analyses.find({"user_id": user["user_id"]}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(20)
    )

    return analyses


@api_router.get("/analyses/{analysis_id}")
async def get_analysis(analysis_id: str):
    doc = await db.analyses.find_one({"analysis_id": analysis_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return doc


# --- Quick Scan (no API key needed) ---
@api_router.post("/quick-scan")
async def quick_scan(req: AnalyzeRequest, request: Request):
    url = req.url.strip()
    if not url.startswith("http"):
        url = "https://" + url

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10) as http:
            resp = await http.get(url, headers={"User-Agent": "Mozilla/5.0 FixMySiteAI/1.0"})
            html = resp.text
            headers_dict = {k.lower(): v for k, v in resp.headers.items()}
            response_time = resp.elapsed.total_seconds()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se pudo acceder a la URL: {str(e)}")

    html_lower = html.lower()
    checks = []
    total = 0
    max_pts = 0

    # HTTPS
    is_https = url.startswith("https://")
    max_pts += 15
    if is_https:
        total += 15
        checks.append({"name": "HTTPS", "passed": True, "detail": "Conexion segura HTTPS activa", "points": 15})
    else:
        checks.append({"name": "HTTPS", "passed": False, "detail": "Sin HTTPS - conexion no segura", "points": 0})

    # Response time
    max_pts += 10
    if response_time < 1:
        total += 10
        checks.append({"name": "Velocidad", "passed": True, "detail": f"{response_time:.2f}s (excelente)", "points": 10})
    elif response_time < 3:
        total += 5
        checks.append({"name": "Velocidad", "passed": True, "detail": f"{response_time:.2f}s (aceptable)", "points": 5})
    else:
        checks.append({"name": "Velocidad", "passed": False, "detail": f"{response_time:.2f}s (lento)", "points": 0})

    # Meta title
    max_pts += 10
    title_match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    if title_match and title_match.group(1).strip():
        tlen = len(title_match.group(1).strip())
        pts = 10 if 30 <= tlen <= 60 else 5
        total += pts
        checks.append({"name": "Meta Title", "passed": True, "detail": f"Encontrado ({tlen} caracteres)", "points": pts})
    else:
        checks.append({"name": "Meta Title", "passed": False, "detail": "No se encontro etiqueta title", "points": 0})

    # Meta description
    max_pts += 10
    desc_match = re.search(r"<meta[^>]+name=[\"']description[\"'][^>]+content=[\"']([^\"']*)[\"']", html, re.IGNORECASE)
    if not desc_match:
        desc_match = re.search(r"<meta[^>]+content=[\"']([^\"']*)[\"'][^>]+name=[\"']description[\"']", html, re.IGNORECASE)
    if desc_match and desc_match.group(1).strip():
        dlen = len(desc_match.group(1).strip())
        pts = 10 if 120 <= dlen <= 160 else 5
        total += pts
        checks.append({"name": "Meta Description", "passed": True, "detail": f"Encontrada ({dlen} caracteres)", "points": pts})
    else:
        checks.append({"name": "Meta Description", "passed": False, "detail": "Falta meta description", "points": 0})

    # Viewport
    max_pts += 10
    has_vp = 'name="viewport"' in html_lower or "name='viewport'" in html_lower
    if has_vp:
        total += 10
        checks.append({"name": "Viewport", "passed": True, "detail": "Mobile-friendly configurado", "points": 10})
    else:
        checks.append({"name": "Viewport", "passed": False, "detail": "Falta viewport (no mobile-friendly)", "points": 0})

    # H1
    max_pts += 10
    h1_count = len(re.findall(r"<h1[^>]*>", html, re.IGNORECASE))
    if h1_count == 1:
        total += 10
        checks.append({"name": "H1", "passed": True, "detail": "Un H1 encontrado (correcto)", "points": 10})
    elif h1_count > 1:
        total += 5
        checks.append({"name": "H1", "passed": True, "detail": f"{h1_count} H1s (deberia ser 1)", "points": 5})
    else:
        checks.append({"name": "H1", "passed": False, "detail": "Sin etiqueta H1", "points": 0})

    # Images alt
    max_pts += 10
    imgs = re.findall(r"<img[^>]*>", html, re.IGNORECASE)
    no_alt = [i for i in imgs if "alt=" not in i.lower() or 'alt=""' in i.lower()]
    if len(imgs) == 0:
        total += 10
        checks.append({"name": "Alt imagenes", "passed": True, "detail": "Sin imagenes que verificar", "points": 10})
    elif len(no_alt) == 0:
        total += 10
        checks.append({"name": "Alt imagenes", "passed": True, "detail": f"Todas ({len(imgs)}) con alt", "points": 10})
    else:
        pts = int(((len(imgs) - len(no_alt)) / len(imgs)) * 10)
        total += pts
        checks.append({"name": "Alt imagenes", "passed": False, "detail": f"{len(no_alt)}/{len(imgs)} sin alt", "points": pts})

    # Security headers
    max_pts += 10
    sec_hdrs = ["content-security-policy", "x-frame-options", "x-content-type-options", "strict-transport-security"]
    found = sum(1 for h in sec_hdrs if h in headers_dict)
    sec_pts = int((found / len(sec_hdrs)) * 10)
    total += sec_pts
    checks.append({"name": "Seguridad headers", "passed": found >= 3, "detail": f"{found}/{len(sec_hdrs)} cabeceras", "points": sec_pts})

    # Open Graph
    max_pts += 5
    has_og = 'property="og:' in html_lower or "property='og:" in html_lower
    if has_og:
        total += 5
        checks.append({"name": "Open Graph", "passed": True, "detail": "Tags OG encontrados", "points": 5})
    else:
        checks.append({"name": "Open Graph", "passed": False, "detail": "Sin etiquetas Open Graph", "points": 0})

    # Lang attribute
    max_pts += 5
    has_lang = 'lang="' in html_lower[:500] or "lang='" in html_lower[:500]
    if has_lang:
        total += 5
        checks.append({"name": "Atributo lang", "passed": True, "detail": "Idioma declarado", "points": 5})
    else:
        checks.append({"name": "Atributo lang", "passed": False, "detail": "Falta atributo lang", "points": 0})

    # Canonical
    max_pts += 5
    has_canon = 'rel="canonical"' in html_lower or "rel='canonical'" in html_lower
    if has_canon:
        total += 5
        checks.append({"name": "Canonical", "passed": True, "detail": "Enlace canonical encontrado", "points": 5})
    else:
        checks.append({"name": "Canonical", "passed": False, "detail": "Sin enlace canonical", "points": 0})

    final_score = int((total / max_pts) * 100) if max_pts > 0 else 0

    scan_id = f"scan_{uuid.uuid4().hex[:12]}"
    user = await get_current_user(request)
    await db.quick_scans.insert_one(
        {
            "scan_id": scan_id,
            "url": url,
            "score": final_score,
            "checks": checks,
            "response_time": round(response_time, 2),
            "is_https": is_https,
            "user_id": user["user_id"] if user else None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )

    return {
        "scan_id": scan_id,
        "url": url,
        "score": final_score,
        "checks": checks,
        "response_time": round(response_time, 2),
        "is_https": is_https,
    }


# --- Email ---
@api_router.post("/email/subscribe")
async def email_subscribe(req: EmailSubscribeRequest):
    existing = await db.email_subscribers.find_one({"email": req.email})
    if not existing:
        await db.email_subscribers.insert_one(
            {"email": req.email, "subscribed_at": datetime.now(timezone.utc).isoformat()}
        )
    return {"message": "Suscrito exitosamente"}


# --- Payments ---
PREMIUM_PRICE = 29.00


@api_router.post("/payments/create-checkout")
async def create_checkout(req: CreateCheckoutRequest, request: Request):
    stripe_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    user = await get_current_user(request)
    origin = req.origin_url
    success_url = f"{origin}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/"

    metadata = {
        "type": "premium_report",
        "analysis_id": req.analysis_id or "",
    }
    if user:
        metadata["user_id"] = user["user_id"]
        metadata["email"] = user["email"]

    stripe.api_key = stripe_key
    session = stripe.checkout.Session.create(
        mode="payment",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
        line_items=[
            {
                "quantity": 1,
                "price_data": {
                    "currency": "eur",
                    "unit_amount": int(PREMIUM_PRICE * 100),
                    "product_data": {"name": "MejoraTuWeb Premium Report"},
                },
            }
        ],
    )

    await db.payment_transactions.insert_one(
        {
            "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
            "session_id": session.id,
            "user_id": user["user_id"] if user else None,
            "analysis_id": req.analysis_id,
            "amount": PREMIUM_PRICE,
            "currency": "eur",
            "payment_status": "initiated",
            "metadata": metadata,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )

    return {"url": session.url, "session_id": session.id}


@api_router.get("/payments/status/{session_id}")
async def payment_status(session_id: str, request: Request):
    stripe_key = os.environ.get("STRIPE_API_KEY")
    if not stripe_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    stripe.api_key = stripe_key
    session = stripe.checkout.Session.retrieve(session_id)
    payment_status_value = session.get("payment_status")
    if payment_status_value == "paid":
        txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        if txn and txn["payment_status"] != "paid":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}},
            )
            if txn.get("analysis_id"):
                await db.analyses.update_one({"analysis_id": txn["analysis_id"]}, {"$set": {"is_premium": True}})
            if txn.get("user_id"):
                await db.users.update_one({"user_id": txn["user_id"]}, {"$set": {"is_premium": True}})

    return {
        "status": session.get("status"),
        "payment_status": payment_status_value,
        "amount_total": session.get("amount_total"),
        "currency": session.get("currency"),
    }


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    stripe_key = os.environ.get("STRIPE_API_KEY")
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")
    if not stripe_key or not webhook_secret:
        return {"status": "error"}

    body = await request.body()
    sig_header = request.headers.get("Stripe-Signature")
    stripe.api_key = stripe_key

    try:
        event = stripe.Webhook.construct_event(body, sig_header, webhook_secret)
        if event["type"] != "checkout.session.completed":
            return {"status": "ok"}

        checkout_session = event["data"]["object"]
        if checkout_session.get("payment_status") == "paid":
            session_id = checkout_session.get("id")
            txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            if txn and txn["payment_status"] != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}},
                )
                if txn.get("analysis_id"):
                    await db.analyses.update_one({"analysis_id": txn["analysis_id"]}, {"$set": {"is_premium": True}})
                if txn.get("user_id"):
                    await db.users.update_one({"user_id": txn["user_id"]}, {"$set": {"is_premium": True}})
    except Exception as e:
        logging.error(f"Webhook error: {e}")

    return {"status": "ok"}


def _build_cors_origins() -> list[str]:
    origins = [
        "https://mejoratuweb.org",
        "https://www.mejoratuweb.org",
    ]
    extra = os.environ.get("CORS_EXTRA_ORIGINS", "")
    if extra:
        origins.extend([item.strip() for item in extra.split(",") if item.strip()])
    return list(dict.fromkeys(origins))


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_build_cors_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
