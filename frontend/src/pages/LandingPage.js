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

// 🔴 BACKEND FIJO (CORREGIDO)
const API = "https://mejoratuweb.onrender.com";

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
    if (!url.trim()) {
      alert("Introduce una URL");
      return;
    }

    setQuickLoading(true);
    setError("");
    setQuickScan(null);
    setAnalysis(null);
    setAiLoading(false);

    try {
      // 🔴 LLAMADA DIRECTA AL ENDPOINT REAL
      const res = await axios.post(`${API}/analyze`, {
        url: url.trim(),
      });

      console.log("RESULTADO:", res.data);

      setQuickScan(res.data); // reutilizamos para mostrar algo

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 300);

    } catch (e) {
      console.error("ERROR:", e);
      setError("Error al analizar la web. Inténtalo de nuevo.");
    } finally {
      setQuickLoading(false);
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

      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A12] via-[#05050A] to-[#05050A]" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6">
            {t("hero_title")}
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 mb-12">
            {t("hero_subtitle")}
          </p>

          {/* INPUT */}
          <div className="max-w-2xl mx-auto">
            <div className="relative flex items-center bg-[#0A0A12] border border-white/10 rounded-xl p-2 gap-2">
              
              <Search className="w-5 h-5 text-zinc-500 ml-3" />

              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://tusitio.com"
                className="flex-1 bg-transparent border-0 text-white"
              />

              <button
                onClick={handleAnalyze}
                disabled={quickLoading}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#00E5FF] to-[#9D4CDD] text-black font-bold"
              >
                {quickLoading ? "Analizando..." : "Analizar Web"}
              </button>

            </div>

            {error && (
              <p className="mt-4 text-red-400">{error}</p>
            )}
          </div>

        </div>
      </section>

      <div ref={resultsRef}>
        {quickScan && (
          <div className="text-center p-10">
            <h2 className="text-2xl mb-4">Resultado detectado</h2>

            <p className="text-zinc-400 mb-6">
              Hemos encontrado errores importantes en tu web.
            </p>

            {/* 🔴 CTA DINERO */}
            <a
              href="https://buy.stripe.com/4gM4gz9Vl0gt5zJcWrabK0b"
              className="inline-block px-6 py-3 bg-[#00E5FF] text-black font-bold rounded-lg"
            >
              Desbloquear informe completo
            </a>
          </div>
        )}
      </div>

      <footer className="py-12 text-center text-zinc-500">
        MejoraTuWeb © 2026
      </footer>

      <FloatingCTA />
      <ChatWidget />
      <EmailPopup />
    </div>
  );
}