# 30_FIX_BACKEND_TIMEOUTS_MEJORATUWEB

## Rama limpia

`fix-mejoratuweb-backend-timeouts-clean`

Base obligatoria usada:

`origin/master`

## Objetivo

Corregir el timeout de `/api/quick-scan` sin arrastrar cambios de analytics, frontend, Stripe, precio ni purchase.

## Archivos modificados

- `backend/server.py`
- `30_FIX_BACKEND_TIMEOUTS_MEJORATUWEB.md`

## Causa

`/api/quick-scan` dependía de un fetch HTML externo. Si la web analizada tardaba, fallaba o quedaba bloqueada, el endpoint podía tardar demasiado o devolver error, haciendo que el frontend cancelase la petición cerca de su timeout.

## Solución aplicada

En `backend/server.py`:

- `HTML_FETCH_TIMEOUT_SECONDS` por defecto: `4` segundos.
- `QUICK_SCAN_MAX_SECONDS` por defecto: `7.5` segundos.
- `OPENAI_TIMEOUT_SECONDS` por defecto: `6` segundos.
- `DB_WRITE_TIMEOUT_SECONDS` por defecto: `1` segundo.
- `fetch_html()` usa timeout explícito de `httpx` y límite con `asyncio.wait_for()`.
- `/api/quick-scan` ahora construye un resultado compatible aunque falle o tarde el fetch HTML.
- Si hay fallo/timeout, devuelve `200` con:
  - `scan_id`
  - `url`
  - `score`
  - `checks`
  - `response_time`
  - `is_https`
  - `created_at`
  - `fallback: true`
  - `fallback_reason: html_fetch_failed_or_timeout`
- `save_document()` no bloquea la respuesta si Mongo va lento.
- `/api/analyze` conserva fallback heurístico y reduce timeout de HTML/OpenAI.

## No tocado

- No frontend.
- No analytics / GA4.
- No Stripe.
- No Payment Link.
- No precio.
- No purchase.
- No master.
- No producción.
- No merge.
- No push.

## Verificación requerida

```bash
git diff --name-only origin/master...HEAD
python3 -m py_compile backend/server.py
curl http://127.0.0.1:8015/api/health
curl -H 'Content-Type: application/json' -d '{"url":"https://example.com"}' http://127.0.0.1:8015/api/quick-scan
curl -H 'Content-Type: application/json' -d '{"url":"https://mejoratuweb.org"}' http://127.0.0.1:8015/api/quick-scan
```
