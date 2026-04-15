import { motion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";
import { Check, X, Shield, Clock, Globe, Loader2, Rocket, Lock, AlertTriangle, ArrowRight } from "lucide-react";

const STRIPE_LINK = "https://buy.stripe.com/cNi6oHgjJ3sF2nxaOjabK02";

export default function QuickScanCard({ data, aiData, aiLoading }) {
  const { t } = useLanguage();

  const getScoreColor = (s) => {
    if (s >= 80) return "#39FF14";
    if (s >= 50) return "#FFCC00";
    return "#FF3B30";
  };

  const color = getScoreColor(data.score);

  // Select 3 checks: 2 passed + 1 failed
  const passed = data.checks?.filter((c) => c.passed) || [];
  const failed = data.checks?.filter((c) => !c.passed) || [];
  const visibleChecks = [...passed.slice(0, 2), ...failed.slice(0, 1)];
  const hiddenCount = (data.checks?.length || 0) - visibleChecks.length;

  // Error count from AI data
  const criticalErrors = aiData?.result?.errors?.filter((e) => e.severity === "critical")?.length || 0;
  const totalErrors = aiData?.result?.errors?.length || 0;
  const moneyLost = aiData?.result?.money_lost_monthly || 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="py-12 px-4 bg-[#05050A]"
      data-testid="quick-scan-results"
    >
      <div className="max-w-3xl mx-auto">
        {/* Score */}
        <div className="bg-[#0F0F1A] border border-white/5 rounded-2xl p-8 text-center mb-4">
          <p className="text-xs text-zinc-500 font-mono mb-4">{data.url}</p>
          <div className="flex items-baseline justify-center gap-2 mb-2">
            <span
              className="text-6xl sm:text-7xl font-black"
              style={{ color, fontFamily: "Cabinet Grotesk, sans-serif", textShadow: `0 0 30px ${color}40` }}
              data-testid="quick-score"
            >
              {data.score}
            </span>
            <span className="text-xl text-zinc-500">/100</span>
          </div>

          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-sm text-zinc-300">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              {data.response_time}s
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${data.is_https ? "bg-[#39FF14]/10 text-[#39FF14]" : "bg-red-500/10 text-red-400"}`}>
              <Shield className="w-3.5 h-3.5" />
              {data.is_https ? "HTTPS" : "No HTTPS"}
            </div>
          </div>

          {/* 3 visible checks */}
          <div className="space-y-2 mb-4">
            {visibleChecks.map((check, i) => (
              <div key={i} className="flex items-center gap-2.5 p-3 rounded-lg bg-white/[0.02] text-left">
                {check.passed ? (
                  <Check className="w-4 h-4 text-[#39FF14] shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-[#FF3B30] shrink-0" />
                )}
                <span className="text-sm text-zinc-300 flex-1">{check.name}</span>
                <span className="text-xs text-zinc-500">{check.detail}</span>
              </div>
            ))}
          </div>

          {/* Locked checks */}
          {hiddenCount > 0 && (
            <div className="relative overflow-hidden rounded-lg mb-6">
              <div className="space-y-2 opacity-20 blur-[2px] pointer-events-none">
                {data.checks?.slice(3, 6).map((check, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-3 rounded-lg bg-white/[0.02]">
                    <div className="w-4 h-4 rounded bg-zinc-700" />
                    <span className="text-sm text-zinc-500">{check.name}</span>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-[#0F0F1A]/60">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Lock className="w-4 h-4" />
                  +{hiddenCount} checks bloqueados
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PAIN MESSAGE */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-[#FF3B30]/10 to-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-2xl p-6 mb-4 text-center"
          data-testid="pain-message"
        >
          <AlertTriangle className="w-8 h-8 text-[#FF3B30] mx-auto mb-3" />
          <p className="text-base text-white font-medium mb-2">
            Se han detectado multiples errores que estan afectando tu posicionamiento y pueden estar haciendo que pierdas trafico y dinero.
          </p>

          {aiLoading && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <Loader2 className="w-4 h-4 text-[#00E5FF] animate-spin" />
              <span className="text-xs text-zinc-400">{t("ai_analyzing")}</span>
            </div>
          )}

          {aiData && totalErrors > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-3 space-y-2">
              <p className="text-lg font-bold text-[#FF3B30]" data-testid="error-counter">
                Se han detectado {criticalErrors > 0 ? `${criticalErrors} errores criticos` : `${totalErrors} errores`}
              </p>
              {moneyLost > 0 && (
                <p className="text-sm text-[#FF3B30]/80">
                  Estas perdiendo aproximadamente <span className="font-bold text-[#FF3B30]">{moneyLost.toLocaleString()}€/mes</span>
                </p>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* PREMIUM FEATURES + CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-gradient-to-br from-[#0F0F1A] to-[#1A0F2E] border border-[#9D4CDD]/20 rounded-2xl p-8 text-center"
          data-testid="premium-cta-block"
        >
          <h3 className="text-xl font-bold text-white mb-4" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
            Accede al analisis completo con:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left max-w-md mx-auto mb-6">
            {[
              "Lista completa de errores",
              "Soluciones paso a paso",
              "Optimizacion SEO avanzada",
              "Recomendaciones de conversion",
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                <Check className="w-4 h-4 text-[#39FF14] shrink-0" />
                {feat}
              </div>
            ))}
          </div>

          <a
            href={STRIPE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-[#9D4CDD] to-[#00E5FF] text-black font-bold text-lg hover:scale-105 active:scale-95 transition-all duration-200 shadow-[0_0_30px_rgba(157,76,221,0.4)] hover:shadow-[0_0_40px_rgba(157,76,221,0.6)] animate-pulse-glow"
            data-testid="unlock-btn"
          >
            Desbloquear informe completo por 6,99€
            <ArrowRight className="w-5 h-5" />
          </a>
        </motion.div>
      </div>
    </motion.section>
  );
}
