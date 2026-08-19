import { motion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";
import { Zap } from "lucide-react";

export default function FloatingCTA() {
  const { t } = useLanguage();

  const scrollToInput = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      document.querySelector('[data-testid="url-input"]')?.focus();
    }, 500);
  };

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

        </div>
      </motion.div>
    </>
  );
}
