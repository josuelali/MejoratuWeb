import { useLanguage } from "../contexts/LanguageContext";
import { Globe, Rocket } from "lucide-react";

export default function Header() {
  const { lang, toggleLang } = useLanguage();

  return (
    <header
      className="fixed top-0 w-full z-50 backdrop-blur-xl bg-[#0A0A12]/60 border-b border-white/[0.06]"
      data-testid="header"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="w-6 h-6 text-[#00E5FF]" />
          <span
            className="text-xl font-black tracking-tight text-white"
            style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
          >
            Mejora Tu <span className="text-[#00E5FF]">WEB</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <nav className="hidden items-center gap-5 text-xs font-semibold text-zinc-400 lg:flex" aria-label="Navegación principal">
            <a href="#complete-report" className="transition hover:text-cyan-300">Analiza</a>
            <a href="#premium-seo" className="transition hover:text-amber-200">Mejora</a>
            <a href="#ai-agent" className="transition hover:text-violet-200">Automatiza</a>
            <a href="#projects" className="transition hover:text-white">Proyectos</a>
            <a href="#faq" className="transition hover:text-white">FAQ</a>
          </nav>
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-400 hover:text-white hover:border-[#00E5FF]/30 transition-all duration-200"
            data-testid="language-toggle"
          >
            <Globe className="w-4 h-4" />
            {lang.toUpperCase()}
          </button>

        </div>
      </div>
    </header>
  );
}
