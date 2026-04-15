import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [status, setStatus] = useState("processing");
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) return;

    let attempts = 0;
    const poll = async () => {
      try {
        const res = await axios.get(`${API}/payments/status/${sessionId}`, {
          withCredentials: true,
        });
        if (res.data.payment_status === "paid") {
          setStatus("success");
          return;
        }
        if (res.data.status === "expired") {
          setStatus("failed");
          return;
        }
        if (attempts < 10) {
          attempts++;
          setTimeout(poll, 2000);
        }
      } catch {
        if (attempts < 10) {
          attempts++;
          setTimeout(poll, 2000);
        }
      }
    };
    poll();
  }, [sessionId]);

  return (
    <div
      className="min-h-screen bg-[#05050A] flex items-center justify-center text-white px-4"
      data-testid="payment-success-page"
    >
      <div className="text-center max-w-md">
        {status === "processing" && (
          <>
            <Loader2 className="w-12 h-12 text-[#00E5FF] animate-spin mx-auto mb-4" />
            <p className="text-lg text-zinc-300">{t("payment_processing")}</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="w-16 h-16 text-[#39FF14] mx-auto mb-4" />
            <h2
              className="text-2xl font-bold mb-2"
              style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
            >
              {t("payment_success")}
            </h2>
            <p className="text-zinc-400 mb-6">{t("premium_unlocked")}</p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-[#00E5FF] to-[#9D4CDD] text-black font-bold hover:scale-105 transition-transform"
              data-testid="back-home-btn"
            >
              {t("back_home")}
            </button>
          </>
        )}
        {status === "failed" && (
          <>
            <XCircle className="w-16 h-16 text-[#FF3B30] mx-auto mb-4" />
            <p className="text-lg text-red-400 mb-4">Payment failed or expired</p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              {t("back_home")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
