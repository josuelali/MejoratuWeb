# 19_EVENTOS_IMPLEMENTADOS_MEJORATUWEB

## Rama

`analytics-mejoratuweb-events-clean`

Base:

`origin/master`

## Objetivo

Implementar medición GA4 mínima para el embudo de MejoraTuWeb sin tocar backend, Stripe, Payment Link, precio ni conversiones finales no verificadas.

## Eventos implementados

1. `analyze_started`
   - Se dispara al pulsar “Analizar Web”.
   - Archivo: `frontend/src/pages/LandingPage.js`.

2. `analysis_completed`
   - Se dispara cuando `/api/analyze` termina correctamente.
   - Incluye `score` y dominio analizado.
   - Archivo: `frontend/src/pages/LandingPage.js`.

3. `paywall_view`
   - Se dispara cuando se muestra el bloque de desbloqueo.
   - Archivos:
     - `frontend/src/components/QuickScanCard.js`
     - `frontend/src/components/PremiumUnlock.js`

4. `unlock_report_click`
   - Se dispara al pulsar botones de desbloqueo.
   - Archivos:
     - `frontend/src/components/QuickScanCard.js`
     - `frontend/src/components/PremiumUnlock.js`
     - `frontend/src/components/FloatingCTA.js`

5. `begin_checkout`
   - Se dispara justo antes de abrir Stripe Payment Link, en el mismo click del botón.
   - No se mide pago completado porque no hay confirmación real desde Stripe en este cambio.

## Archivo helper

`frontend/src/lib/analytics.js`

Funciones:

- `trackEvent()`
- `getPageParams()`
- `getAnalyzedDomain()`
- `trackCheckoutClick()`

## No tocado

- No `backend/server.py`.
- No `frontend/src/components/MoneyLostCard.js`.
- No Stripe config.
- No Payment Link.
- No precio visible.
- No producción.
- No merge.

## Verificación

```bash
git diff --name-only origin/master...HEAD
npm --prefix frontend run build
```

Confirmaciones esperadas:

- `backend/server.py` no aparece.
- `MoneyLostCard.js` no aparece.
- Los enlaces Stripe permanecen con el valor heredado de `origin/master`.
