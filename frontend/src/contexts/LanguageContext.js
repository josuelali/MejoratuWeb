import { createContext, useContext, useState } from "react";

const translations = {
  es: {
    hero_title: "Tu web esta perdiendo trafico y dinero (descubrelo en 10 segundos)",
    hero_subtitle: "Analiza tu web gratis y descubre los errores que te estan costando clientes y ventas",
    analyze_btn: "Analizar Web",
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
    premium_title: "Desbloquear Informe Completo",
    premium_desc: "Accede al analisis detallado con plan de accion personalizado y recomendaciones avanzadas",
    premium_btn: "Desbloquear por 6,99\u20AC",
    email_title: "Recibe tips de optimizacion",
    email_desc: "Suscribete para recibir consejos semanales que mejoraran tu web",
    email_placeholder: "Tu correo electronico",
    subscribe: "Suscribirme",
    float_cta: "Probar ahora",
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
    premium_unlocked: "Tu informe premium ha sido desbloqueado",
    back_home: "Volver al inicio",
    error_analyze: "Error al analizar la web",
    subscribed: "Suscrito con exito!",
    login_required: "Inicia sesion para desbloquear",
    features_analyzed: "Aspectos analizados",
    trust_line: "Analisis potenciado por IA avanzada",
    quick_scan: "Escaneo Rapido",
    ai_analyzing: "Analisis IA en progreso... Los resultados completos apareceran en segundos",
    recent_analyses: "Analisis recientes",
    export_pdf: "Exportar PDF",
    report_title: "Informe de Analisis Web",
  },
  en: {
    hero_title: "Your website is losing traffic and money (find out in 10 seconds)",
    hero_subtitle: "Analyze your site for free and discover the errors costing you customers and sales",
    analyze_btn: "Analyze Website",
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
    premium_title: "Unlock Full Report",
    premium_desc: "Get detailed analysis with a personalized action plan and advanced recommendations",
    premium_btn: "Unlock for \u20AC6.99",
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
    premium_unlocked: "Your premium report has been unlocked",
    back_home: "Back to home",
    error_analyze: "Error analyzing the website",
    subscribed: "Successfully subscribed!",
    login_required: "Sign in to unlock",
    features_analyzed: "Features analyzed",
    trust_line: "Analysis powered by advanced AI",
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
