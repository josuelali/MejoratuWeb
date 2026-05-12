# Deploy Notes

## Render (Backend - https://mejoratuweb.onrender.com)
- **Root Directory:** `backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
- **Runtime:** Python 3.11.9 (`runtime.txt`)

### Environment Variables (Render)
| Key | Value | Required |
|---|---|---|
| `MONGO_URL` | mongodb+srv://... (Mongo Atlas) | Optional (sin DB también arranca) |
| `DB_NAME` | mejoratuweb | Optional |
| `OPENAI_API_KEY` | sk-... | Optional (sin clave usa análisis heurístico) |
| `OPENAI_MODEL` | gpt-4o-mini | Optional |
| `CORS_EXTRA_ORIGINS` | https://otra-url.com,... | Optional |

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
- `POST /api/payments/create-checkout` → devuelve enlace Stripe
- `GET /api/health` → status

## Stripe
- Checkout vía Payment Link directo:
  `https://buy.stripe.com/28E7sMbKhelIeUN8Tq63K00`
