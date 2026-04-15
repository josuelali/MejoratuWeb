import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import Header from "../components/Header";
import QuickScanCard from "../components/QuickScanCard";
import ReviewsSection from "../components/ReviewsSection";
import AffiliateSection from "../components/AffiliateSection";
import FloatingCTA from "../components/FloatingCTA";
import EmailPopup from "../components/EmailPopup";
import ChatWidget from "../components/ChatWidget";
import { Input } from "../components/ui/input";
import { Link } from "react-router-dom";
import { Search, ArrowRight, Loader2, Shield, Gauge, Eye, Rocket } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function LandingPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [url, setUrl] = useState("");
  const [quickScan, setQuickScan] = useState(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");
  const resultsRef = useRef(null);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setQuickLoading(true);
    setError("");
    setQuickScan(null);
    setAnalysis(null);
    setAiLoading(false);

    // Phase 1: Quick Scan (instant, no API key needed)
    try {
      const quickRes = await axios.post(`${API}/quick-scan`, { url: url.trim() });
      setQuickScan(quickRes.data);
      setQuickLoading(false);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    } catch (e) {
      setError(e.response?.data?.detail || t("error_analyze"));
      setQuickLoading(false);
      return;
    }

    // Phase 2: Full AI Analysis (runs in background)
    setAiLoading(true);
    try {
      const aiRes = await axios.post(`${API}/analyze`, { url: url.trim() });
      setAnalysis(aiRes.data);
    } catch (e) {
      console.error("AI analysis:", e.response?.data?.detail || e.message);
    } finally {
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
    <div className="min-h-screen bg-[#05050A] text-white" data-testid="landing-page">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A12] via-[#05050A] to-[#05050A]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#00E5FF]/[0.04] rounded-full blur-[150px]" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-[#9D4CDD]/[0.04] rounded-full blur-[120px]" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/20 mb-8">
              <div className="w-2 h-2 rounded-full bg-[#39FF14] animate-pulse" />
              <span className="text-sm text-[#00E5FF] font-medium">Mejora Tu WEB</span>
            </div>

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-none mb-6"
              style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
              data-testid="hero-title"
            >
              {t("hero_title")}
            </h1>

            <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed">
              {t("hero_subtitle")}
            </p>
          </motion.div>

          {/* URL Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="max-w-2xl mx-auto"
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#00E5FF] via-[#9D4CDD] to-[#00E5FF] rounded-2xl opacity-20 group-hover:opacity-40 blur-lg transition-opacity duration-500" />
              <div className="relative flex items-center bg-[#0A0A12] border border-white/10 rounded-xl p-2 gap-2">
                <Search className="w-5 h-5 text-zinc-500 ml-3 shrink-0" />
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  placeholder={t("url_placeholder")}
                  className="flex-1 bg-transparent border-0 text-white placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0 text-base h-12"
                  data-testid="url-input"
                />
                <button
                  onClick={handleAnalyze}
                  disabled={quickLoading || aiLoading || !url.trim()}
                  className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-[#00E5FF] to-[#9D4CDD] text-black font-bold text-sm hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_20px_rgba(0,229,255,0.3)] animate-pulse-glow"
                  data-testid="analyze-btn"
                >
                  {(quickLoading || aiLoading) ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="hidden sm:inline">{t("analyzing")}</span>
                    </>
                  ) : (
                    <>
                      {t("analyze_btn")}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2"
                  data-testid="error-message"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-16 flex flex-wrap items-center justify-center gap-4"
          >
            {features.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-500 text-sm"
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </div>
            ))}
          </motion.div>

          {/* Trust line */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="mt-8 text-xs text-zinc-600 tracking-wide"
          >
            <Rocket className="w-3 h-3 inline mr-1 -mt-0.5" />
            {t("trust_line")}
          </motion.p>
        </div>
      </section>

      {/* Quick Scan + Locked Results */}
      <div ref={resultsRef}>
        <AnimatePresence>
          {quickScan && <QuickScanCard data={quickScan} aiData={analysis} aiLoading={aiLoading} />}
        </AnimatePresence>
      </div>

      {/* Reviews - always visible after results */}
      {quickScan && <ReviewsSection />}

      {/* Affiliate Section */}
      {quickScan && <AffiliateSection />}

      {/* Footer */}
      <footer className="py-12 px-4 bg-[#05050A] border-t border-white/5">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Rocket className="w-5 h-5 text-[#00E5FF]" />
            <span className="text-lg font-black text-white" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
              Mejora Tu <span className="text-[#00E5FF]">WEB</span>
            </span>
          </div>
          <div className="flex items-center justify-center gap-6 mb-4">
            <Link to="/legal/privacidad" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Privacidad</Link>
            <Link to="/legal/terminos" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Terminos</Link>
            <Link to="/legal/cookies" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Cookies</Link>
          </div>
          <p className="text-xs text-zinc-600">2026 Mejora Tu WEB. Todos los derechos reservados.</p>
        </div>
      </footer>

      <FloatingCTA />
      <ChatWidget />
      <EmailPopup />
    </div>
  );
}
