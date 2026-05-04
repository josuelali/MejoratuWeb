import { useLanguage } from "../contexts/LanguageContext";
import { Globe, Rocket } from "lucide-react";

const EXPRESS_LINK = "https://buy.stripe.com/4gM4gz9Vl0gt5zJcWrabK0b";

export default function Header() {
  const { lang, toggleLang } = useLanguage();

  const focusAnalyzer = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => document.querySelector('[data-testid="url-input"]')?.focus(), 500);
  };

  return (
    <header
      className="fixed top-0 w-full z-50 backdrop-blur-xl bg-[#0A0A12]/80 border-b border-white/[0.06]"
      data-testid="header"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <button onClick={focusAnalyzer} className="flex items-center gap-2 text-left" aria-label="Ir al analizador gratuito">
          <Rocket className="w-6 h-6 text-[#00E5FF]" />
          <span
            className="text-lg sm:text-xl font-black tracking-tight text-white"
            style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
          >
            MejoraTuWeb<span className="text-[#00E5FF]">.org</span>
          </span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <a href="#precios" className="hidden sm:inline-flex text-sm font-bold text-zinc-300 hover:text-white transition-colors">
            Precios
          </a>
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-400 hover:text-white hover:border-[#00E5FF]/30 transition-all duration-200"
            data-testid="language-toggle"
          >
            <Globe className="w-4 h-4" />
            {lang.toUpperCase()}
          </button>
          <a
            href={EXPRESS_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full bg-white px-3 sm:px-4 py-2 text-xs font-black text-black hover:bg-zinc-200 transition-colors"
          >
            Express 49 €
          </a>
        </div>
      </div>
    </header>
  );
}
