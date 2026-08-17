import axios from "axios";

const RAW_BACKEND =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

export const API = `${RAW_BACKEND.replace(/\/+$/, "")}/api`;

export async function createCheckout(analysisId, email) {
  if (!analysisId) {
    throw new Error("El análisis todavía no está preparado");
  }
  const response = await axios.post(`${API}/payments/create-checkout`, {
    analysis_id: analysisId,
    origin_url: window.location.origin,
    ...(email ? { email } : {}),
  });
  return response.data;
}
