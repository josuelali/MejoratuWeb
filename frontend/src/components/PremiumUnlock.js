import { useLanguage } from "../contexts/LanguageContext";
import { Crown, Check, ArrowRight } from "lucide-react";

const STRIPE_LINK = "https://buy.stripe.com/cNi6oHgjJ3sF2nxaOjabK02";

export default function PremiumUnlock() {
  const { t } = useLanguage();

  return (
    <div
      className="relative overflow-hidden bg-gradient-to-br from-[#0F0F1A] to-[#1A0F2E] border border-[#9D4CDD]/20 rounded-2xl p-8 sm:p-12 text-center"
      data-testid="premium-unlock"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#9D4CDD]/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#00E5FF]/10 rounded-full blur-[80px]" />

      <div className="relative z-10">
        <Crown className="w-10 h-10 text-[#FFCC00] mx-auto mb-4" />
        <h3
          className="text-2xl sm:text-3xl font-bold text-white mb-2"
          style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
        >
          {t("premium_title")}
        </h3>
        <p className="text-zinc-400 mb-6 text-sm max-w-md mx-auto">{t("premium_desc")}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left max-w-md mx-auto mb-8">
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
          className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-[#9D4CDD] to-[#00E5FF] text-black font-bold text-base hover:scale-105 active:scale-95 transition-all duration-200 shadow-[0_0_30px_rgba(157,76,221,0.3)] hover:shadow-[0_0_40px_rgba(157,76,221,0.5)]"
          data-testid="premium-btn"
        >
          <Crown className="w-5 h-5" />
          Desbloquear informe completo por 6,99€
          <ArrowRight className="w-5 h-5" />
        </a>
      </div>
    </div>
  );
}
