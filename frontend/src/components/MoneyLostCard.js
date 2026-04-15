import CountUp from "react-countup";
import { useLanguage } from "../contexts/LanguageContext";
import { TrendingDown } from "lucide-react";

export default function MoneyLostCard({ amount }) {
  const { t } = useLanguage();

  return (
    <div
      className="bg-[#0F0F1A] border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center hover:border-red-500/20 transition-all duration-300 min-h-[260px]"
      data-testid="money-lost-counter"
    >
      <div className="flex items-center gap-2 mb-4">
        <TrendingDown className="w-5 h-5 text-[#FF3B30]" />
        <span className="text-sm text-zinc-400">{t("money_lost")}</span>
      </div>
      <div
        className="text-5xl sm:text-6xl font-black text-[#FF3B30]"
        style={{
          fontFamily: "Cabinet Grotesk, sans-serif",
          textShadow: "0 0 30px rgba(255,59,48,0.3)",
        }}
      >
        <CountUp end={amount || 0} duration={2} separator="." prefix="-" suffix="\u20AC" />
      </div>
      <span className="text-sm text-zinc-500 mt-2">{t("per_month")}</span>
    </div>
  );
}
