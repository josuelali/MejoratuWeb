import { useState, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";
import Header from "../components/Header";
import QuickScanCard from "../components/QuickScanCard";
import AnalysisResults from "../components/AnalysisResults";
import { HeroAtmosphere } from "../components/VisualScenes";
import CommercialLadder from "../components/CommercialLadder";
import CommercialFaq from "../components/CommercialFaq";
import { Input } from "../components/ui/input";
import { Search, Shield, Gauge, Eye } from "lucide-react";
import axios from "axios";
import { getAnalyzedDomain, getPageParams, trackEvent, trackEventOnce } from "../lib/analytics";
import { API } from "../lib/api";

export default function LandingPage() {
  const { t } = useLanguage();
  const reduced = useReducedMotion();
  const [url, setUrl] = useState("");
  const [quickScan, setQuickScan] = useState(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");
  const resultsRef = useRef(null);

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError("Introduce una URL");
      return;
    }

    setQuickLoading(true);
    setError("");
    setQuickScan(null);
    setAnalysis(null);

    try {
      const normalizedUrl = url.trim();
      const analyzedDomain = getAnalyzedDomain(normalizedUrl);

      trackEvent("analysis_started", {
        ...getPageParams(),
        analyzed_domain: analyzedDomain,
      });

      const quickRes = await axios.post(`${API}/quick-scan`, {
        url: normalizedUrl,
      });
      setQuickScan(quickRes.data);
      setQuickLoading(false);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      }, 200);

      setAiLoading(true);
      const analysisRes = await axios.post(`${API}/analyze`, {
        url: normalizedUrl,
      });
      setAnalysis(analysisRes.data);

      trackEventOnce("free_result_viewed", analysisRes.data.analysis_id, {
        ...getPageParams(),
        analyzed_domain: analyzedDomain,
        score: analysisRes.data?.result?.score ?? quickRes.data?.score,
        analysis_id: analysisRes.data.analysis_id,
      });
    } catch (e) {
      console.error("ERROR:", e);
      setError("No se pudo completar el análisis. Revisa la URL e inténtalo de nuevo.");
    } finally {
      setQuickLoading(false);
      setAiLoading(false);
    }
  };

  const features = [
    { icon: Search, label: "SEO" },
    { icon: Gauge, label: t("performance") },
    { icon: Shield, label: t("security") },
    { icon: Eye, label: "UX/UI" },
  ];

  return (
    <div className="mtw-experience min-h-screen bg-[#05050A] text-white">
      <Header />

      <section
        className="hero-live relative min-h-screen flex items-center justify-center pt-16 overflow-hidden"
        data-testid="hero-section"
      >
        <HeroAtmosphere />

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <p className="hero-kicker"><span /> TU WEB. SU SIGUIENTE NIVEL.</p>
          <h1
            className="hero-headline text-4xl sm:text-5xl lg:text-6xl font-black mb-6"
            data-testid="hero-title"
          >
            {t("hero_title")}
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 mb-4">
            {t("hero_subtitle")}
          </p>
          <p className="mx-auto mb-12 max-w-xl text-sm leading-6 text-zinc-500">
            Introduce la URL de tu web para empezar con un análisis gratuito.
          </p>

          {/* INPUT */}
          <div className="max-w-2xl mx-auto">
            <div className="hero-url relative flex items-center bg-[#0A0A12] border border-white/10 rounded-xl p-2 gap-2 focus-within:border-[#00E5FF]/40 transition-colors">
              <Search className="w-5 h-5 text-zinc-500 ml-3" />

              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAnalyze();
                }}
                placeholder="https://tusitio.com"
                aria-label="URL de tu web"
                className="flex-1 bg-transparent border-0 text-white placeholder:text-zinc-600 focus-visible:ring-0"
                data-testid="url-input"
              />

              <button
                onClick={handleAnalyze}
                disabled={quickLoading}
                className="hero-submit px-6 py-3 rounded-lg bg-gradient-to-r from-[#00E5FF] to-[#9D4CDD] text-black font-bold disabled:opacity-60"
                data-testid="analyze-btn"
              >
                {quickLoading ? "Analizando..." : t("analyze_btn")}
              </button>
            </div>

            {error && (
              <p
                className="mt-4 text-red-400 text-sm"
                data-testid="error-message"
              >
                {error}
              </p>
            )}

            {/* Features under input */}
            <motion.div
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-3 mt-8 text-xs text-zinc-500"
              data-testid="features-list"
            >
              {features.map(({ icon: Icon, label }, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]"
                >
                  <Icon className="w-3.5 h-3.5 text-[#00E5FF]" />
                  <span>{label}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <CommercialLadder />
      <CommercialFaq />
      <section className="final-scene" aria-labelledby="final-title">
        <div className="final-orbit" aria-hidden="true" />
        <p className="scene-eyebrow">EL SIGUIENTE PASO EMPIEZA AQUÍ</p>
        <h2 id="final-title">Empieza por descubrir<br />qué está frenando tu web.</h2>
        <p>De una URL a una decisión más clara.</p>
        <div className="final-actions"><button type="button" onClick={() => {
          const input = document.querySelector('[data-testid="url-input"]');
          input?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
          input?.focus({ preventScroll: true });
        }}>ANALIZAR MI WEB</button><a href="#complete-report">VER PLANES</a></div>
      </section>

      {/* RESULTS */}
      <div ref={resultsRef} data-testid="results-section">
        {quickScan && (
          <QuickScanCard
            data={quickScan}
            aiData={analysis}
            aiLoading={aiLoading}
            analysisId={analysis?.analysis_id}
          />
        )}

        {analysis && <AnalysisResults data={analysis} />}
      </div>

      <footer
        className="py-12 text-center text-zinc-500 text-sm"
        data-testid="footer"
      >
        MejoraTuWeb © 2026
      </footer>

    </div>
  );
}
