import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { Clock, ExternalLink, TrendingDown } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function getScoreColor(s) {
  if (s >= 80) return "text-[#39FF14]";
  if (s >= 50) return "text-[#FFCC00]";
  return "text-[#FF3B30]";
}

export default function HistorySection() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await axios.get(`${API}/analyses/history`, {
          withCredentials: true,
        });
        setHistory(res.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (!user || loading || history.length === 0) return null;

  return (
    <section className="py-16 px-4 bg-[#05050A]" data-testid="history-section">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="w-5 h-5 text-[#9D4CDD]" />
          <h2
            className="text-xl font-bold text-white"
            style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
          >
            {t("recent_analyses")}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {history.slice(0, 6).map((item, i) => (
            <motion.div
              key={item.analysis_id || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#0F0F1A] border border-white/5 rounded-xl p-4 hover:border-[#9D4CDD]/20 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.url}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-600 shrink-0 ml-2" />
              </div>
              <div className="flex items-center justify-between">
                <span
                  className={`text-2xl font-black ${getScoreColor(item.result?.score)}`}
                  style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
                >
                  {item.result?.score ?? "\u2014"}
                </span>
                {item.result?.money_lost_monthly > 0 && (
                  <div className="flex items-center gap-1 text-xs text-red-400">
                    <TrendingDown className="w-3 h-3" />
                    -{item.result.money_lost_monthly}€
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
