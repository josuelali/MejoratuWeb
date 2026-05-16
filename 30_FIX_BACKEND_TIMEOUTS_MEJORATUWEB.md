# 30_FIX_BACKEND_TIMEOUTS_MEJORATUWEB

## Rama

`fix-mejoratuweb-backend-timeouts`

## Contexto

En DevTools Network del preview Vercel se confirmó:

- Request: `quick-scan`
- URL: `https://mejoratuweb.onrender.com/api/quick-scan`
- Estado: `canceled`
- Tiempo: ~25s
- GA4 funcionaba correctamente

Conclusión: el frontend llamaba al backend correcto. El bloqueo estaba en el backend, especialmente en `/api/quick-scan` cuando una dependencia externa tardaba o fallaba.

## Causa encontrada

`/api/quick-scan` dependía directamente de `fetch_html()`.

Antes:

- Si el fetch HTML fallaba o tardaba, el endpoint lanzaba `HTTPException(400)`.
- No había fallback de resultado compatible para el frontend.
- El guardado en Mongo, si estuviera configurado y lento, tampoco tenía límite duro propio.
- Los timeouts existían, pero no había una garantía clara de respuesta rápida y degradada para el usuario.

## Solución aplicada

### Backend

Archivo modificado:

- `backend/server.py`

Cambios:

1. Se bajó el timeout HTML por defecto de 6s a 4s.
2. Se añadió límite duro para quick scan:
   - `QUICK_SCAN_MAX_SECONDS=7.5`
3. Se añadió timeout de escritura en base de datos:
   - `DB_WRITE_TIMEOUT_SECONDS=1`
4. `fetch_html()` ahora usa:
   - `httpx.Timeout(...)`
   - `asyncio.wait_for(...)`
   - connect timeout limitado
5. Se extrajo la construcción del resultado a `build_quick_scan_result(...)`.
6. `/api/quick-scan` ya no deja al usuario colgado si falla el fetch:
   - devuelve JSON compatible con el frontend,
   - marca `fallback: true`,
   - añade `fallback_reason: html_fetch_failed_or_timeout`,
   - mantiene `scan_id`, `url`, `score`, `checks`, `response_time`, `is_https`, `created_at`.
7. El endpoint `/api/analyze` conserva fallback heurístico si falla HTML u OpenAI.
8. Se bajó `OPENAI_TIMEOUT_SECONDS` de 8s a 6s para reducir riesgo de superar el timeout del frontend.

## No tocado

- No se tocó Stripe.
- No se tocó precio.
- No se implementó purchase.
- No se tocó producción.
- No se hizo merge.
- No se hizo push.
- No se modificó `analytics-mejoratuweb-events` directamente; se creó rama separada.

## Verificación local

Entorno usado para prueba local:

- Dependencias instaladas temporalmente en `/tmp/mejoratuweb-pydeps` con `pip --target`.
- Servidor local levantado con Uvicorn en `127.0.0.1:8015`.

Comandos ejecutados:

```bash
python3 -m py_compile backend/server.py
PYTHONPATH=/tmp/mejoratuweb-pydeps python3 -m py_compile backend/server.py
cd backend && PYTHONPATH=/tmp/mejoratuweb-pydeps python3 -m uvicorn server:app --host 127.0.0.1 --port 8015
```

Pruebas:

```bash
curl http://127.0.0.1:8015/api/health
curl -H 'Content-Type: application/json' -d '{"url":"https://example.com"}' http://127.0.0.1:8015/api/quick-scan
curl -H 'Content-Type: application/json' -d '{"url":"https://mejoratuweb.org"}' http://127.0.0.1:8015/api/quick-scan
curl -H 'Content-Type: application/json' -d '{"url":"https://10.255.255.1"}' http://127.0.0.1:8015/api/quick-scan
```

Resultados medidos:

| Endpoint / URL | Status | Tiempo | Resultado |
|---|---:|---:|---|
| `/api/health` | 200 | 0.002s | OK |
| `/api/quick-scan` `https://example.com` | 200 | 0.072s | sin fallback, score 68 |
| `/api/quick-scan` `https://mejoratuweb.org` | 200 | 0.252s | sin fallback, score 70 |
| `/api/quick-scan` `https://10.255.255.1` | 200 | 2.013s | fallback activo |

## Recomendación

Recomiendo hacer push de esta rama después de revisión rápida del diff.

No recomiendo merge directo todavía. Primero probar preview de esta rama y confirmar en DevTools que `quick-scan` responde antes de 8s también desde Vercel.
