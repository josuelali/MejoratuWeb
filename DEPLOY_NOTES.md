# Deploy Notes

## Render (Backend)
- **Root Directory:** `backend`
- **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`

## Vercel (Frontend)
- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `build`
