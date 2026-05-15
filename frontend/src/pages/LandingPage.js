import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";
import Header from "../components/Header";
import QuickScanCard from "../components/QuickScanCard";
import AnalysisResults from "../components/AnalysisResults";
import FloatingCTA from "../components/FloatingCTA";
import ChatWidget from "../components/ChatWidget";
import { Input } from "../components/ui/input";
import { Search, Shield, Gauge, Eye } from "lucide-react";
import axios from "axios";
import { getAnalyzedDomain, getPageParams, trackEvent } from "../lib/analytics";

// Backend URL: production = https://mejoratuweb.onrender.com (set en Vercel)
const RAW_BACKEND =
  process.env.REACT_APP_BACKEND_URL || "https://mejoratuweb.onrender.com";
const API = `${RAW_BACKEND.replace(/\/+$/, "")}/api`;
const REQUEST_TIMEOUT_MS = 25000;

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

    try {
      const normalizedUrl = url.trim();
      const analyzedDomain = getAnalyzedDomain(normalizedUrl);

      trackEvent("analyze_started", {
        ...getPageParams(),
        analyzed_domain: analyzedDomain,
      });

      const quickRes = await axios.post(`${API}/quick-scan`, {
        url: normalizedUrl,
      }, {
        timeout: REQUEST_TIMEOUT_MS,
      });
      setQuickScan(quickRes.data);
      setQuickLoading(false);
      setAnalysis(null);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 200);

      setAiLoading(true);
      const analysisRes = await axios.post(`${API}/analyze`, {
        url: normalizedUrl,
      }, {
        timeout: REQUEST_TIMEOUT_MS,
      });
      setAnalysis(analysisRes.data);

      trackEvent("analysis_completed", {
        ...getPageParams(),
        analyzed_domain: analyzedDomain,
        score: analysisRes.data?.result?.score ?? quickRes.data?.score,
      });
    } catch (e) {
      console.error("ERROR:", e);
      const isTimeout = e.code === "ECONNABORTED" || String(e.message || "").toLowerCase().includes("timeout");
      setError(
        isTimeout
          ? "El servidor está tardando más de lo normal. Inténtalo de nuevo en unos segundos."
          : "No se pudo completar el análisis. Revisa la URL e inténtalo de nuevo."
      );
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
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A12] via-[#05050A] to-[#05050A]" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6"
            data-testid="hero-title"
          >
            {t("hero_title")}
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 mb-12">
            {t("hero_subtitle")}
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

      {/* RESULTS */}
      <div ref={resultsRef} data-testid="results-section">
        {quickScan && (
          <QuickScanCard
            data={quickScan}
            aiData={analysis}
            aiLoading={aiLoading}
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
