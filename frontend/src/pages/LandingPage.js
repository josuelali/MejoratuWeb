import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";
import Header from "../components/Header";
import QuickScanCard from "../components/QuickScanCard";
import ReviewsSection from "../components/ReviewsSection";
import AffiliateSection from "../components/AffiliateSection";
import FloatingCTA from "../components/FloatingCTA";
import EmailPopup from "../components/EmailPopup";
import ChatWidget from "../components/ChatWidget";
import { Input } from "../components/ui/input";
import { Link } from "react-router-dom";
import { Search, ArrowRight, Loader2, Shield, Gauge, Eye, Rocket, CheckCircle2, AlertTriangle, Clock, Mail } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const EXPRESS_LINK = "https://buy.stripe.com/4gM4gz9Vl0gt5zJcWrabK0b";
const PRO_LINK = "https://buy.stripe.com/28E8wPc3t1kx1jtf4zabK0c";
const AGENCY_LINK = "https://buy.stripe.com/5kQcN59Vl1kx8LV1dJabK0e";
const LEAD_EMAIL = "hola@mejoratuweb.org";

export default function LandingPage() {
  const { t } = useLanguage();
  const [url, setUrl] = useState("");
  const [quickScan, setQuickScan] = useState(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");
  const [lead, setLead] = useState({
    nombre: "",
    email: "",
    web: "",
    negocio: "",
    objetivo: "",
  });
  const analyzerRef = useRef(null);
  const resultsRef = useRef(null);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setQuickLoading(true);
    setError("");
    setQuickScan(null);
    setAnalysis(null);
    setAiLoading(false);

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

  const scrollToAnalyzer = () => {
    analyzerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => document.querySelector('[data-testid="url-input"]')?.focus(), 500);
  };

  const handleLeadChange = (field, value) => {
    setLead((current) => ({ ...current, [field]: value }));
  };

  const handleLeadSubmit = (event) => {
    event.preventDefault();
    const subject = "Nueva auditoría web - MejoraTuWeb.org";
    const body = [
      `Nombre: ${lead.nombre}`,
      `Email: ${lead.email}`,
      `URL de la web: ${lead.web}`,
      `Tipo de negocio: ${lead.negocio}`,
      `Objetivo principal: ${lead.objetivo}`,
    ].join("\n");
    window.location.href = `mailto:${LEAD_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const features = [
    { icon: Search, label: "SEO básico" },
    { icon: Gauge, label: "Velocidad" },
    { icon: Shield, label: "Confianza" },
    { icon: Eye, label: "Conversión" },
  ];

  const problems = [
    "No queda claro qué vendes",
    "El botón principal está escondido",
    "La versión móvil es débil",
    "No genera confianza",
    "Carga lento",
    "No tiene estructura SEO básica",
    "No captura leads",
  ];

  const pricing = [
    {
      title: "Auditoría Express",
      price: "49 €",
      items: ["Revisión manual de la web", "Informe PDF con errores prioritarios", "3 acciones urgentes", "Entrega en 24 horas"],
      cta: "Pedir Auditoría Express",
      href: EXPRESS_LINK,
      featured: true,
    },
    {
      title: "Auditoría Pro",
      price: "149 €",
      items: ["Todo lo anterior", "Revisión de copy, velocidad, confianza, móvil y SEO básico", "Vídeo Loom de 10–15 minutos", "Plan priorizado"],
      cta: "Pedir Auditoría Pro",
      href: PRO_LINK,
    },
    {
      title: "Marca blanca Agencia",
      price: "499 €",
      items: ["Adaptación básica para agencia", "Flujo de captación de leads", "Textos comerciales", "Script para cerrar clientes"],
      cta: "Quiero marca blanca",
      href: AGENCY_LINK,
    },
  ];

  return (
    <div className="min-h-screen bg-[#05050A] text-white" data-testid="landing-page">
      <Header />

      <section className="relative min-h-screen flex items-center justify-center pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A12] via-[#05050A] to-[#05050A]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#00E5FF]/[0.06] rounded-full blur-[150px]" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-[#9D4CDD]/[0.06] rounded-full blur-[120px]" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/20 mb-8">
              <div className="w-2 h-2 rounded-full bg-[#39FF14] animate-pulse" />
              <span className="text-sm text-[#00E5FF] font-medium">Auditoría web accionable en 24 horas</span>
            </div>

            <h1
              className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tighter leading-[0.95] mb-6"
              style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
              data-testid="hero-title"
            >
              Tu web puede estar perdiendo clientes ahora mismo
            </h1>

            <p className="text-base sm:text-xl text-zinc-300 max-w-3xl mx-auto mb-8 leading-relaxed">
              Detectamos errores de claridad, confianza, móvil, velocidad y conversión que pueden estar haciendo que pierdas contactos, reservas o ventas.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
              <button
                onClick={scrollToAnalyzer}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#9D4CDD] text-black font-black text-base hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(0,229,255,0.25)]"
              >
                Analizar mi web gratis
                <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href={EXPRESS_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-white text-black font-black text-base hover:bg-zinc-200 hover:scale-105 active:scale-95 transition-all"
              >
                Pedir auditoría Express — 49 €
              </a>
            </div>
          </motion.div>

          <motion.div
            ref={analyzerRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="max-w-2xl mx-auto"
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#00E5FF] via-[#9D4CDD] to-[#00E5FF] rounded-2xl opacity-20 group-hover:opacity-40 blur-lg transition-opacity duration-500" />
              <div className="relative flex flex-col sm:flex-row sm:items-center bg-[#0A0A12] border border-white/10 rounded-xl p-2 gap-2">
                <div className="flex items-center flex-1 min-w-0">
                  <Search className="w-5 h-5 text-zinc-500 ml-3 shrink-0" />
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                    placeholder={t("url_placeholder")}
                    className="flex-1 bg-transparent border-0 text-white placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0 text-base h-12"
                    data-testid="url-input"
                  />
                </div>
                <button
                  onClick={handleAnalyze}
                  disabled={quickLoading || aiLoading || !url.trim()}
                  className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-[#00E5FF] to-[#9D4CDD] text-black font-bold text-sm hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_20px_rgba(0,229,255,0.3)]"
                  data-testid="analyze-btn"
                >
                  {(quickLoading || aiLoading) ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t("analyzing")}</span>
                    </>
                  ) : (
                    <>
                      Analizar mi web gratis
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

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-300 text-sm">
                <Icon className="w-3.5 h-3.5 text-[#00E5FF]" />
                {label}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <div ref={resultsRef}>
        <AnimatePresence>
          {quickScan && <QuickScanCard data={quickScan} aiData={analysis} aiLoading={aiLoading} />}
        </AnimatePresence>
      </div>

      <section className="py-16 px-4 bg-[#05050A] border-y border-white/5">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[0.95fr_1.05fr] gap-10 items-center">
          <div>
            <p className="text-sm font-bold text-[#00E5FF] mb-3">Problema real</p>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-5" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
              Una web bonita no sirve si no convierte
            </h2>
            <p className="text-zinc-400 text-base leading-relaxed">
              Revisamos lo que un visitante decide en segundos: si entiende tu oferta, si confía y si sabe cuál es el siguiente paso.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {problems.map((problem) => (
              <div key={problem} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <AlertTriangle className="w-5 h-5 text-[#FFCC00] shrink-0 mt-0.5" />
                <span className="text-sm sm:text-base text-zinc-200">{problem}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="precios" className="py-16 px-4 bg-[#080812]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <p className="text-sm font-bold text-[#00E5FF] mb-3">Auditorías pagadas</p>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
              Elige el nivel de revisión que necesitas
            </h2>
            <p className="text-zinc-400">Informe claro, errores prioritarios y próximos pasos. Sin jerga y sin humo.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            {pricing.map((plan) => (
              <article key={plan.title} className={`relative rounded-3xl border p-6 bg-[#0F0F1A] ${plan.featured ? "border-[#00E5FF]/60 shadow-[0_0_45px_rgba(0,229,255,0.12)]" : "border-white/10"}`}>
                {plan.featured && (
                  <div className="absolute -top-3 left-6 rounded-full bg-[#00E5FF] px-3 py-1 text-xs font-black text-black">Entrega 24h</div>
                )}
                <h3 className="text-2xl font-black mb-2" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>{plan.title}</h3>
                <p className="text-4xl font-black text-white mb-6">{plan.price}</p>
                <ul className="space-y-3 mb-8">
                  {plan.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-zinc-300">
                      <CheckCircle2 className="w-5 h-5 text-[#39FF14] shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <a
                  href={plan.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 text-sm font-black transition-all hover:scale-[1.02] ${plan.featured ? "bg-gradient-to-r from-[#00E5FF] to-[#9D4CDD] text-black" : "bg-white text-black hover:bg-zinc-200"}`}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-[#05050A]">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8 items-stretch">
          <div className="rounded-3xl border border-[#FFCC00]/30 bg-[#FFCC00]/10 p-6 sm:p-8 flex flex-col justify-center">
            <Clock className="w-10 h-10 text-[#FFCC00] mb-4" />
            <h2 className="text-3xl font-black mb-3" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>Entrega en 24 horas para las primeras auditorías de esta semana.</h2>
            <p className="text-zinc-300">Si necesitas decidir rápido qué cambiar, envíanos tu web y recibe prioridades concretas antes de tocar diseño, anuncios o SEO.</p>
          </div>

          <form onSubmit={handleLeadSubmit} className="rounded-3xl border border-white/10 bg-[#0F0F1A] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-5">
              <Mail className="w-6 h-6 text-[#00E5FF]" />
              <h2 className="text-2xl sm:text-3xl font-black" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>Solicita una auditoría</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input required value={lead.nombre} onChange={(e) => handleLeadChange("nombre", e.target.value)} placeholder="Nombre" className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 h-12" />
              <Input required type="email" value={lead.email} onChange={(e) => handleLeadChange("email", e.target.value)} placeholder="Email" className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 h-12" />
              <Input required value={lead.web} onChange={(e) => handleLeadChange("web", e.target.value)} placeholder="URL de la web" className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 h-12" />
              <Input required value={lead.negocio} onChange={(e) => handleLeadChange("negocio", e.target.value)} placeholder="Tipo de negocio" className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 h-12" />
              <Input required value={lead.objetivo} onChange={(e) => handleLeadChange("objetivo", e.target.value)} placeholder="Objetivo principal" className="sm:col-span-2 bg-white/5 border-white/10 text-white placeholder:text-zinc-500 h-12" />
            </div>
            <button type="submit" className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#9D4CDD] px-5 py-4 font-black text-black hover:scale-[1.02] transition-all">
              Enviar datos por email
            </button>
          </form>
        </div>
      </section>

      {quickScan && <ReviewsSection />}
      {quickScan && <AffiliateSection />}

      <footer className="py-12 px-4 bg-[#05050A] border-t border-white/5 pb-28">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Rocket className="w-5 h-5 text-[#00E5FF]" />
            <span className="text-lg font-black text-white" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
              MejoraTuWeb<span className="text-[#00E5FF]">.org</span>
            </span>
          </div>
          <div className="flex items-center justify-center gap-6 mb-4">
            <Link to="/legal/privacidad" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Privacidad</Link>
            <Link to="/legal/terminos" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Términos</Link>
            <Link to="/legal/cookies" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Cookies</Link>
          </div>
          <p className="text-xs text-zinc-600">2026 MejoraTuWeb.org. Todos los derechos reservados.</p>
        </div>
      </footer>

      <FloatingCTA />
      <ChatWidget />
      <EmailPopup />
    </div>
  );
}
