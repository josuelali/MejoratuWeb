import { motion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";
import ScoreDisplay from "./ScoreDisplay";
import MoneyLostCard from "./MoneyLostCard";
import PremiumUnlock from "./PremiumUnlock";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { AlertTriangle, CheckCircle, Shield, Gauge, Search, Monitor, TrendingUp, FileDown, Lock } from "lucide-react";
import jsPDF from "jspdf";
import { getAnalyzedDomain, getPageParams, trackEventOnce } from "../lib/analytics";

const scoreColor = (score) => {
  if (score >= 80) return "text-[#39FF14]";
  if (score >= 50) return "text-[#FFCC00]";
  return "text-[#FF3B30]";
};

export default function AnalysisResults({ data }) {
  const { t } = useLanguage();
  const result = data.result || {};
  const isPremium = data.is_premium === true;

  const exportPDF = () => {
    if (!isPremium) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 20;
    const ensurePage = (needed = 20) => {
      if (y + needed > pageHeight - 18) { doc.addPage(); y = 20; }
    };
    const heading = (text, size = 14) => {
      ensurePage(18);
      doc.setFontSize(size);
      doc.setTextColor(20, 20, 20);
      doc.text(text, 20, y);
      y += size === 16 ? 9 : 7;
    };
    const paragraph = (text, indent = 20) => {
      const lines = doc.splitTextToSize(String(text || ""), pageWidth - indent - 20);
      ensurePage(lines.length * 5 + 6);
      doc.text(lines, indent, y);
      y += lines.length * 5 + 4;
    };
    const list = (items, formatter = (item) => item) => {
      (items || []).forEach((item) => paragraph(`• ${formatter(item)}`, 24));
      if (!(items || []).length) paragraph("No se han registrado elementos en esta categoría.");
    };

    // Portada y resumen ejecutivo.
    doc.setFontSize(22);
    doc.setTextColor(0, 160, 180);
    doc.text("MejoraTuWeb", 20, y);
    y += 10;
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    paragraph(`URL analizada: ${data.url}`);
    paragraph(`Fecha del informe: ${new Date().toLocaleDateString("es-ES")}`);
    heading("Resumen ejecutivo", 16);
    paragraph(`Puntuación general: ${result.score ?? "No disponible"}/100`);
    paragraph(result.summary || "No se ha generado un resumen para este análisis.");

    heading("Evaluación SEO básica");
    paragraph(`Puntuación SEO disponible: ${result.seo_score ?? "No disponible"}/100.`);
    paragraph("El detalle se limita a las comprobaciones y recomendaciones realmente incluidas en el análisis.");

    heading("Rendimiento y velocidad");
    paragraph(result.performance_score != null
      ? `Puntuación de rendimiento disponible: ${result.performance_score}/100.`
      : "No se dispone de una medición de rendimiento ejecutada.");

    heading("Experiencia móvil y usabilidad");
    paragraph(result.ux_score != null
      ? `Puntuación de experiencia de usuario disponible: ${result.ux_score}/100.`
      : "No se dispone de una comprobación móvil específica.");

    heading("Seguridad y configuración técnica");
    paragraph(result.security_score != null
      ? `Puntuación de seguridad disponible: ${result.security_score}/100.`
      : "No se dispone de una auditoría técnica avanzada.");

    heading("Problemas detectados");
    list(result.errors, (error) => `${error.title || "Problema"} — ${error.severity || "prioridad no indicada"}: ${error.description || "Sin descripción adicional."}`);

    heading("Oportunidades de mejora");
    list(result.opportunities, (opportunity) => `${opportunity.title || "Oportunidad"}: ${opportunity.description || "Sin descripción adicional."}`);

    heading("Plan de acción priorizado", 16);
    paragraph("Primero: corregir los problemas marcados como críticos o de alto impacto.");
    paragraph("Después: aplicar las recomendaciones SEO, de rendimiento, seguridad y usabilidad.");
    paragraph("Más adelante: revisar las oportunidades restantes y medir su efecto con herramientas específicas.");

    heading("Recomendaciones");
    list(result.recommendations);

    heading("Conclusión general", 16);
    paragraph("Este informe resume los datos disponibles en el análisis realizado. No sustituye una auditoría técnica avanzada ni garantiza posiciones, tráfico o ventas.");

    const filename = data.url.replace(/https?:\/\//, "").replace(/[^a-z0-9]/gi, "-");
    doc.save(`mejoratuweb-${filename}.pdf`);
    trackEventOnce("pdf_downloaded", data.analysis_id, {
      ...getPageParams(),
      analysis_id: data.analysis_id,
      analyzed_domain: getAnalyzedDomain(data.url),
    });
  };

  return (
    <motion.section className="py-20 px-4 bg-[#05050A]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-testid={isPremium ? "premium-analysis-results" : "analysis-results"}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#00E5FF] mb-4 font-mono">{data.url}</p>
          <p className="text-base text-zinc-400 max-w-2xl mx-auto mb-6">{result.summary}</p>
          {isPremium && (
            <Button onClick={exportPDF} className="bg-white/5 border border-white/10 text-zinc-300 hover:text-white rounded-full px-5 h-9 text-sm gap-2" data-testid="export-pdf-btn">
              <FileDown className="w-4 h-4" />{t("export_pdf")}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <ScoreDisplay score={result.score || 0} label={t("score")} />
          <MoneyLostCard amount={result.money_lost_monthly || 0} />
        </div>

        {!isPremium && (
          <div className="bg-[#0F0F1A] border border-white/5 rounded-2xl p-8 text-center mb-6">
            <Lock className="w-8 h-8 text-[#FFCC00] mx-auto mb-3" />
            <p className="text-white font-bold mb-2">{result.error_count || 0} errores detectados, {result.critical_error_count || 0} críticos</p>
            <p className="text-zinc-400 text-sm">El detalle, las soluciones y el PDF permanecen protegidos hasta confirmar el pago.</p>
          </div>
        )}

        {isPremium && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[["seo_score", t("seo"), Search], ["performance_score", t("performance"), Gauge], ["security_score", t("security"), Shield], ["ux_score", t("ux"), Monitor]].map(([key, label, Icon]) => (
                <div key={key} className="bg-[#0F0F1A] border border-white/5 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3"><Icon className="w-4 h-4 text-[#00E5FF]" /><span className="text-sm text-zinc-400">{label}</span></div>
                  <span className={`text-3xl font-black ${scoreColor(result[key] || 0)}`}>{result[key]}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-[#0F0F1A] border border-white/5 rounded-2xl p-6" data-testid="errors-card">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-400" />{t("errors")}</h3>
                <div className="space-y-3">{(result.errors || []).map((error, index) => (
                  <div key={index} className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                    <div className="flex gap-2 mb-1"><span className="text-sm font-medium text-white">{error.title}</span><Badge className="text-[10px] border border-red-500/20 text-red-400">{error.severity}</Badge></div>
                    <p className="text-xs text-zinc-500">{error.description}</p>
                  </div>
                ))}</div>
              </div>
              <div className="bg-[#0F0F1A] border border-white/5 rounded-2xl p-6" data-testid="opportunities-card">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-[#39FF14]" />{t("opportunities")}</h3>
                <div className="space-y-3">{(result.opportunities || []).map((opportunity, index) => (
                  <div key={index} className="bg-white/[0.02] border border-white/5 rounded-xl p-4"><p className="text-sm font-medium text-white mb-1">{opportunity.title}</p><p className="text-xs text-zinc-500">{opportunity.description}</p></div>
                ))}</div>
              </div>
            </div>

            <div className="bg-[#0F0F1A] border border-white/5 rounded-2xl p-6 mb-6">
              <h3 className="text-xl font-bold text-white mb-4">{t("recommendations")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{(result.recommendations || []).map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-lg"><CheckCircle className="w-4 h-4 text-[#00E5FF] mt-0.5" /><span className="text-sm text-zinc-300">{recommendation}</span></div>
              ))}</div>
            </div>
          </>
        )}

        {!isPremium && <PremiumUnlock analysisId={data.analysis_id} url={data.url} />}
      </div>
    </motion.section>
  );
}
