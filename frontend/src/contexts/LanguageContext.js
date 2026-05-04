import { createContext, useContext, useState } from "react";

const translations = {
  es: {
    hero_title: "Tu web puede estar perdiendo clientes ahora mismo",
    hero_subtitle: "Detectamos errores de claridad, confianza, movil, velocidad y conversion que pueden estar haciendo que pierdas contactos, reservas o ventas.",
    analyze_btn: "Analizar mi web gratis",
    analyzing: "Analizando...",
    url_placeholder: "Introduce la URL de tu sitio web...",
    score: "Puntuacion General",
    money_lost: "Dinero Perdido",
    per_month: "/mes",
    errors: "Errores Detectados",
    opportunities: "Oportunidades",
    seo: "SEO",
    performance: "Rendimiento",
    security: "Seguridad",
    ux: "Experiencia de Usuario",
    recommendations: "Recomendaciones",
    premium_title: "Auditoría Express",
    premium_desc: "Recibe una revision manual con informe PDF, errores prioritarios y 3 acciones urgentes en 24 horas.",
    premium_btn: "Pedir auditoría Express — 49 €",
    email_title: "Recibe una revisión clara",
    email_desc: "Déjanos tu email si quieres priorizar cambios que ayuden a conseguir más contactos.",
    email_placeholder: "Tu correo electronico",
    subscribe: "Suscribirme",
    float_cta: "Analizar gratis",
    login: "Iniciar sesion",
    logout: "Cerrar sesion",
    critical: "Critico",
    warning: "Advertencia",
    info: "Info",
    high: "Alto impacto",
    medium: "Impacto medio",
    low: "Bajo impacto",
    payment_success: "Pago exitoso!",
    payment_processing: "Verificando pago...",
    premium_unlocked: "Hemos recibido tu pedido de auditoría",
    back_home: "Volver al inicio",
    error_analyze: "Error al analizar la web",
    subscribed: "Suscrito con exito!",
    login_required: "Inicia sesion para pedir la auditoría",
    features_analyzed: "Aspectos analizados",
    trust_line: "Auditoría clara, priorizada y accionable",
    quick_scan: "Escaneo Rapido",
    ai_analyzing: "Analisis IA en progreso... Los resultados completos apareceran en segundos",
    recent_analyses: "Analisis recientes",
    export_pdf: "Exportar PDF",
    report_title: "Informe de Analisis Web",
  },
  en: {
    hero_title: "Your website may be losing customers right now",
    hero_subtitle: "We detect clarity, trust, mobile, speed, and conversion issues that may be costing you leads, bookings, or sales.",
    analyze_btn: "Analyze my site free",
    analyzing: "Analyzing...",
    url_placeholder: "Enter your website URL...",
    score: "Overall Score",
    money_lost: "Money Lost",
    per_month: "/month",
    errors: "Errors Detected",
    opportunities: "Opportunities",
    seo: "SEO",
    performance: "Performance",
    security: "Security",
    ux: "User Experience",
    recommendations: "Recommendations",
    premium_title: "Express Audit",
    premium_desc: "Get a manual review with a PDF report, priority errors, and 3 urgent actions within 24 hours.",
    premium_btn: "Order Express Audit — €49",
    email_title: "Get optimization tips",
    email_desc: "Subscribe to receive weekly tips to improve your website",
    email_placeholder: "Your email address",
    subscribe: "Subscribe",
    float_cta: "Try now",
    login: "Sign in",
    logout: "Sign out",
    critical: "Critical",
    warning: "Warning",
    info: "Info",
    high: "High impact",
    medium: "Medium impact",
    low: "Low impact",
    payment_success: "Payment successful!",
    payment_processing: "Verifying payment...",
    premium_unlocked: "We have received your audit order",
    back_home: "Back to home",
    error_analyze: "Error analyzing the website",
    subscribed: "Successfully subscribed!",
    login_required: "Sign in to order",
    features_analyzed: "Features analyzed",
    trust_line: "Clear, prioritized, actionable audit",
    quick_scan: "Quick Scan",
    ai_analyzing: "AI analysis in progress... Full results will appear in seconds",
    recent_analyses: "Recent analyses",
    export_pdf: "Export PDF",
    report_title: "Web Analysis Report",
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("es");
  const t = (key) => translations[lang]?.[key] || key;
  const toggleLang = () => setLang((l) => (l === "es" ? "en" : "es"));

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
