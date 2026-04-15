# Deploy Backend (FastAPI) en Render

Este documento deja el backend de **MejoratuWeb** listo para producción en Render con autenticación de Google directa y cookie HTTP-only firmada.

## 1) Variables de entorno

Configura estas variables en el servicio de Render:

### Obligatorias
- `MONGO_URL`: cadena de conexión de MongoDB.
- `DB_NAME`: nombre de la base de datos.
- `SESSION_SECRET`: secreto largo y aleatorio para firmar cookies de sesión.
- `GOOGLE_CLIENT_ID`: Client ID OAuth 2.0 Web de Google.

### Recomendadas / opcionales
- `OPENAI_API_KEY`: necesaria para `/api/analyze`.
- `STRIPE_API_KEY`: necesaria para pagos.
- `STRIPE_WEBHOOK_SECRET`: recomendada para validar webhooks de Stripe.
- `SESSION_COOKIE_NAME`: por defecto `session_token`.
- `SESSION_DAYS`: por defecto `7`.
- `COOKIE_SECURE`: por defecto `true` (en producción mantener `true`).
- `COOKIE_SAMESITE`: por defecto `none` (útil para frontend en dominio distinto).
- `CORS_EXTRA_ORIGINS`: dominio(s) extra temporal(es), separados por coma (ej. Vercel preview).

## 2) CORS producción

El backend permite por defecto:
- `https://mejoratuweb.org`
- `https://www.mejoratuweb.org`

Si necesitas pruebas desde Vercel temporalmente, añade su dominio en `CORS_EXTRA_ORIGINS`.

## 3) Comandos de Render

En Render (Web Service):

- **Build Command**
  ```bash
  pip install -r requirements.txt
  ```

- **Start Command**
  ```bash
  uvicorn server:app --host 0.0.0.0 --port $PORT
  ```

> Si el root del repo no es `backend`, configura `Root Directory` como `backend` en Render.

## 4) Configuración Google Auth

### En Google Cloud Console
1. Crea (o usa) un proyecto en Google Cloud.
2. Ve a **APIs & Services > Credentials**.
3. Crea un **OAuth 2.0 Client ID** de tipo **Web application**.
4. En **Authorized JavaScript origins** agrega:
   - `https://mejoratuweb.org`
   - `https://www.mejoratuweb.org`
   - (opcional) dominio de Vercel para pruebas.
5. Copia el **Client ID** y guárdalo en Render como `GOOGLE_CLIENT_ID`.

### Flujo backend implementado (sin Emergent)
- `POST /api/auth/google` recibe `id_token` de Google.
- El backend verifica el token contra `GOOGLE_CLIENT_ID`.
- Crea o actualiza usuario en MongoDB.
- Crea sesión en colección `user_sessions`.
- Envía cookie HTTP-only firmada por backend.

## 5) Endpoints de auth disponibles

- `POST /api/auth/google`
- `GET /api/auth/me`
- `POST /api/auth/logout`

## 6) Verificación rápida post deploy

1. Frontend inicia sesión con Google y envía `id_token` a `POST /api/auth/google`.
2. Verifica que la respuesta incluya usuario y que se setee cookie HTTP-only.
3. Llama `GET /api/auth/me` con `credentials: 'include'` desde frontend.
4. Cierra sesión con `POST /api/auth/logout` y confirma que `/api/auth/me` devuelve 401.
