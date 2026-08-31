import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import axios from "axios";
import AnalysisResults from "../components/AnalysisResults";
import { API } from "../lib/api";
import { getAnalyzedDomain, getPageParams, trackEventOnce } from "../lib/analytics";
import { isValidCheckoutSessionId } from "../lib/paymentSession";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("processing");
  const [report, setReport] = useState(null);
  const sessionId = searchParams.get("session_id") || window.sessionStorage.getItem("mtw_checkout_session_id");

  useEffect(() => {
    if (!isValidCheckoutSessionId(sessionId)) {
      setStatus("failed");
      return undefined;
    }
    window.sessionStorage.removeItem("mtw_checkout_session_id");

    let active = true;
    let timeoutId;
    let attempts = 0;
    const poll = async () => {
      if (!active) return;
      try {
        const statusResponse = await axios.get(`${API}/payments/status/${encodeURIComponent(sessionId)}`);
        if (statusResponse.data.payment_status === "paid") {
          const { analysis_id: analysisId, access_token: token } = statusResponse.data;
          const reportResponse = await axios.get(`${API}/reports/${encodeURIComponent(analysisId)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!active) return;
          setReport(reportResponse.data);
          setStatus("success");
          const analyticsParams = {
            ...getPageParams(),
            analysis_id: analysisId,
            analyzed_domain: getAnalyzedDomain(reportResponse.data.url),
            currency: "EUR",
            value: 6.99,
          };
          trackEventOnce("purchase_completed", sessionId, analyticsParams);
          trackEventOnce("premium_report_viewed", analysisId, analyticsParams);
          return;
        }
      } catch (error) {
        if (error.response?.status === 400 || error.response?.status === 404) {
          setStatus("failed");
          return;
        }
      }
      attempts += 1;
      if (attempts >= 15) {
        setStatus("failed");
        return;
      }
      timeoutId = window.setTimeout(poll, 2000);
    };
    poll();
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [sessionId]);

  if (status === "success" && report) {
    return (
      <div className="min-h-screen bg-[#05050A] text-white">
        <div className="pt-12 text-center"><CheckCircle className="w-14 h-14 text-[#39FF14] mx-auto mb-3" /><h1 className="text-2xl font-bold">Pago confirmado</h1></div>
        <AnalysisResults data={report} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05050A] flex items-center justify-center text-white px-4" data-testid="payment-success-page">
      <div className="text-center max-w-md">
        {status === "processing" ? (
          <><Loader2 className="w-12 h-12 text-[#00E5FF] animate-spin mx-auto mb-4" /><p className="text-lg text-zinc-300">Confirmando el pago con Stripe…</p></>
        ) : (
          <><XCircle className="w-16 h-16 text-[#FF3B30] mx-auto mb-4" /><p className="text-lg text-red-400 mb-4">No se ha podido confirmar un pago válido.</p><button onClick={() => navigate("/")} className="px-6 py-3 rounded-full bg-white/10 text-white hover:bg-white/20">Volver</button></>
        )}
      </div>
    </div>
  );
}
