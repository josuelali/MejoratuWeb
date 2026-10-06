import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";
import Header from "../components/Header";
import QuickScanCard from "../components/QuickScanCard";
import AnalysisResults from "../components/AnalysisResults";
import FloatingCTA from "../components/FloatingCTA";
import ChatWidget from "../components/ChatWidget";
import CommercialLadder from "../components/CommercialLadder";
import { Input } from "../components/ui/input";
import { Search, Shield, Gauge, Eye } from "lucide-react";
import axios from "axios";
import { getAnalyzedDomain, getPageParams, trackEvent, trackEventOnce } from "../lib/analytics";
import { API } from "../lib/api";

export default function LandingPage() {
  const { t } = useLanguage();
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
        resultsRef.current?.scrollIntoView({ behavior: "smooth" });
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
    <div className="min-h-screen bg-[#05050A] text-white">
      <Header />

      <section
        className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden"
        data-testid="hero-section"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(0,229,255,.12),transparent_34%),linear-gradient(180deg,#0A0A12,#05050A 72%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(0,229,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,.08)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6"
            data-testid="hero-title"
          >
            {t("hero_title")}
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 mb-4">
            {t("hero_subtitle")}
          </p>
          <p className="mx-auto mb-12 max-w-xl text-sm leading-6 text-zinc-500">
            Analízala, descubre qué está fallando y decide hasta dónde quieres mejorarla.
          </p>

          {/* INPUT */}
          <div className="max-w-2xl mx-auto">
            <div className="relative flex items-center bg-[#0A0A12] border border-white/10 rounded-xl p-2 gap-2 focus-within:border-[#00E5FF]/40 transition-colors">
              <Search className="w-5 h-5 text-zinc-500 ml-3" />

              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAnalyze();
                }}
                placeholder="https://tusitio.com"
                className="flex-1 bg-transparent border-0 text-white placeholder:text-zinc-600 focus-visible:ring-0"
                data-testid="url-input"
              />

              <button
                onClick={handleAnalyze}
                disabled={quickLoading}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#00E5FF] to-[#9D4CDD] text-black font-bold disabled:opacity-60"
                data-testid="analyze-btn"
              >
                {quickLoading ? "Analizando..." : t("analyze_btn")}
              </button>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 text-left sm:grid-cols-4" aria-hidden="true">
              {["SEO", "RENDIMIENTO", "MÓVIL", "CONVERSIÓN"].map((label, index) => (
                <div key={label} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.04]">
                  <div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-bold tracking-[0.16em] text-zinc-500">{label}</span><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" style={{ animationDelay: `${index * 180}ms` }} /></div>
                  <div className="h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-300" style={{ width: `${58 + index * 8}%` }} /></div>
                </div>
              ))}
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
              initial={{ opacity: 0 }}
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

      <FloatingCTA />
      <ChatWidget />
    </div>
  );
}
