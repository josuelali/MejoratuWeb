# Deploy Notes

## Render (Backend - https://mejoratuweb.onrender.com)
- **Root Directory:** `backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
- **Runtime:** Python 3.11.9 (`runtime.txt`)

### Environment Variables (Render)
| Key | Value | Required |
|---|---|---|
| `MONGO_URL` | conexión existente de Mongo Atlas | Obligatoria para análisis y pagos |
| `DB_NAME` | mejoratuweb | Obligatoria |
| `OPENAI_API_KEY` | sk-... | Optional (sin clave usa análisis heurístico) |
| `OPENAI_MODEL` | gpt-4o-mini | Optional |
| `CORS_EXTRA_ORIGINS` | https://otra-url.com,... | Optional |
| `PAYMENTS_ENABLED` | `false` durante Fase A; activar solo con autorización | Obligatoria |
| `STRIPE_SECRET_KEY` | clave **Test Mode**; nunca Live en Fase A | Obligatoria para Checkout Test |
| `STRIPE_WEBHOOK_SECRET` | secreto del webhook **Test Mode** | Obligatoria para Checkout Test |
| `STRIPE_PRICE_ID` | Price ID Test correspondiente a 6,99 EUR | Obligatoria para Checkout Test |
| `STRIPE_EXPECTED_AMOUNT` | `699` | Obligatoria |
| `STRIPE_CURRENCY` | `eur` | Obligatoria |
| `FRONTEND_URL` | origen exacto del frontend de pruebas | Obligatoria |
| `REPORT_TOKEN_SECRET` | secreto aleatorio de al menos 32 caracteres | Obligatoria |
| `REPORT_TOKEN_TTL_DAYS` | `7` | Opcional |

## Vercel (Frontend - https://mejoratuweb.org)
- **Root Directory:** `frontend`
- **Build Command:** `npm run build` o `yarn build`
- **Output Directory:** `build`

### Environment Variables (Vercel)
| Key | Value |
|---|---|
| `REACT_APP_BACKEND_URL` | `https://mejoratuweb.onrender.com` |

> Importante: tras cambiar la variable en Vercel hay que **redeploy** para que tome efecto (las variables `REACT_APP_*` se inyectan en build time).

## Endpoints públicos
- `POST /api/quick-scan` → `{ "url": "https://..." }`
- `POST /api/analyze` → `{ "url": "https://..." }`
- `POST /api/email/subscribe` → `{ "email": "..." }`
- `POST /api/payments/create-checkout` → crea Checkout Session Test vinculada al análisis
- `POST /api/payments/webhook` → valida y procesa `checkout.session.completed`
- `GET /api/payments/status/{session_id}` → entrega autorización solo tras pago validado
- `GET /api/reports/{analysis_id}` → requiere token Bearer premium
- `GET /api/health` → confirma que el proceso está vivo
- `GET /api/ready` → confirma MongoDB y estado de pagos

## Stripe — Fase A
- Solo Test Mode.
- No usar Payment Link directo.
- No configurar claves Live ni webhook Live.
- No activar `PAYMENTS_ENABLED` en producción sin autorización expresa.
