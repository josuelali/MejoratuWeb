import { motion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";
import { Zap, Lock, ArrowRight } from "lucide-react";

const STRIPE_LINK = "https://buy.stripe.com/cNi6oHgjJ3sF2nxaOjabK02";

export default function FloatingCTA() {
  const { t } = useLanguage();

  const scrollToInput = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      document.querySelector('[data-testid="url-input"]')?.focus();
    }, 500);
  };

  // Show unlock button if results are visible, otherwise show "try now"
  const hasResults = document.querySelector('[data-testid="quick-scan-results"]');

  return (
    <>
      {/* Floating unlock bar at bottom */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A12]/95 backdrop-blur-xl border-t border-white/10 px-4 py-3"
        data-testid="floating-cta-bar"
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={scrollToInput}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-300 hover:text-white hover:border-[#00E5FF]/30 transition-all"
            data-testid="floating-try-btn"
          >
            <Zap className="w-4 h-4 text-[#39FF14]" />
            {t("float_cta")}
          </button>

          <a
            href={STRIPE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#9D4CDD] to-[#00E5FF] text-black font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(157,76,221,0.3)]"
            data-testid="floating-unlock-btn"
          >
            <Lock className="w-4 h-4" />
            Desbloquear informe
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </motion.div>
    </>
  );
}
