# PRD - MejoraTuWeb.org

## Problem statement (original)
Revisar la app MejoraTuWeb.org existente para que funcione en producción:
- Frontend permite introducir URL.
- Backend analiza la web sin `emergentintegrations`.
- Render despliega sin errores.
- Frontend llama a `https://mejoratuweb.onrender.com/api/quick-scan` y `/api/analyze`.
- Resultado muestra análisis básico.
- CTA visible hacia Stripe.
- NO crear app nueva, NO cambiar diseño completo, NO borrar funcionalidades.

## Architecture
- **Frontend**: React 18 (Create React App) desplegado en Vercel - `https://mejoratuweb.org`
- **Backend**: FastAPI + httpx desplegado en Render - `https://mejoratuweb.onrender.com`
- **DB**: MongoDB (opcional, el backend arranca también sin Mongo)
- **Pagos**: Stripe Payment Link directo `https://buy.stripe.com/28E7sMbKhelIeUN8Tq63K00`
- **IA**: OpenAI vía httpx directo (opcional - sin clave hace fallback heurístico). **NO usa `emergentintegrations`.**

## User personas
- Dueño de pyme / freelance con web propia que sospecha que pierde tráfico/ventas.
- Marketing manager que quiere auditoría rápida para presentar a cliente.

## Core requirements (static)
1. Input de URL en hero → POST `/api/quick-scan` → muestra `QuickScanCard`.
2. Tras quick-scan → POST `/api/analyze` → muestra `AnalysisResults` con errores/oportunidades/sub-scores.
3. CTA Stripe visible en `QuickScanCard`, `PremiumUnlock` y `FloatingCTA`.
4. Backend sin dependencia de `emergentintegrations`.
5. CORS configurado para `mejoratuweb.org`, `mejoratuweb.onrender.com` y `*.vercel.app`.

## What's been implemented (2026-01)
- [2026-01] Fix `ImportError` de `pydantic_core` (reinstalado a versión compatible).
- [2026-01] Creados `/app/backend/.env` y `/app/frontend/.env` (faltaban).
- [2026-01] `LandingPage.js`: pasa de URL hardcoded a `REACT_APP_BACKEND_URL`; ahora monta `QuickScanCard` + `AnalysisResults` para mostrar el análisis básico real (antes sólo mostraba un mensaje genérico).
- [2026-01] `DEPLOY_NOTES.md` actualizado con variables de entorno Render + Vercel.
- [2026-01] Testing subagent: 9/9 backend pytest + 5/5 frontend flows OK.

## Confirmed not-needed (per problem statement)
- Reescritura de diseño.
- Eliminación de funcionalidades existentes (email popup, chat widget, historial, login, payment-success page, etc. siguen intactos).
- `emergentintegrations` removido conceptualmente (nunca estuvo en requirements.txt; el código usa httpx directo a OpenAI).

## Prioritized backlog
### P1
- Configurar variable `REACT_APP_BACKEND_URL=https://mejoratuweb.onrender.com` en Vercel y redeploy.
- Configurar `OPENAI_API_KEY` en Render para activar el análisis IA real (sin ella se usa fallback heurístico que ya funciona).

### P2
- Cachear el HTML del primer fetch en `/api/analyze` (hoy hace 2 requests al sitio analizado cuando hay OPENAI_API_KEY).
- Quitar el `document.querySelector(...)` muerto en `FloatingCTA.js` línea 18.
- Validar el path live de OpenAI con clave real (testing solo probó fallback).

### P3
- Reemplazar parser regex de HTML por BeautifulSoup para mayor robustez.
- Añadir webhook Stripe → marcar `analyses.is_premium=true` y enviar email con PDF completo.
- A/B test de copies del CTA (precio, urgencia).

## Endpoints
| Método | Ruta | Descripción |
|---|---|---|
| GET | /api/health | Health check |
| POST | /api/quick-scan | Análisis heurístico (12 checks) |
| POST | /api/analyze | Análisis completo (IA si hay key, fallback si no) |
| POST | /api/email/subscribe | Suscripción email |
| POST | /api/payments/create-checkout | Devuelve link Stripe |
| GET | /api/payments/status/{id} | Stub - Stripe gestiona el estado |
