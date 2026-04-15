import { motion } from "framer-motion";
import { useLanguage } from "../contexts/LanguageContext";
import ScoreDisplay from "./ScoreDisplay";
import MoneyLostCard from "./MoneyLostCard";
import PremiumUnlock from "./PremiumUnlock";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  AlertTriangle,
  CheckCircle,
  Info,
  Shield,
  Gauge,
  Search,
  Monitor,
  TrendingUp,
  Lightbulb,
  FileDown,
} from "lucide-react";
import jsPDF from "jspdf";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const severityConfig = {
  critical: { color: "bg-red-500/10 text-red-400 border-red-500/20" },
  warning: { color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  info: { color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
};

const categoryIcons = {
  seo: Search,
  performance: Gauge,
  security: Shield,
  ux: Monitor,
};

function getScoreColor(score) {
  if (score >= 80) return "text-[#39FF14]";
  if (score >= 50) return "text-[#FFCC00]";
  return "text-[#FF3B30]";
}

export default function AnalysisResults({ data }) {
  const { t } = useLanguage();
  const result = data.result;

  const exportPDF = () => {
    const doc = new jsPDF();
    const w = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(22);
    doc.setTextColor(0, 229, 255);
    doc.text("FixMySite AI", 20, y);
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(t("report_title"), 20, y + 8);
    y += 20;

    doc.setDrawColor(50, 50, 80);
    doc.line(20, y, w - 20, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`URL: ${data.url}`, 20, y);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, y + 6);
    y += 16;

    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(`${t("score")}: ${result.score}/100`, 20, y);
    y += 8;
    doc.setFontSize(12);
    doc.setTextColor(255, 59, 48);
    doc.text(`${t("money_lost")}: -${result.money_lost_monthly}\u20AC${t("per_month")}`, 20, y);
    y += 12;

    const subs = [
      { l: t("seo"), v: result.seo_score },
      { l: t("performance"), v: result.performance_score },
      { l: t("security"), v: result.security_score },
      { l: t("ux"), v: result.ux_score },
    ];
    doc.setFontSize(10);
    doc.setTextColor(180, 180, 180);
    subs.forEach((s) => {
      doc.text(`${s.l}: ${s.v}/100`, 20, y);
      y += 6;
    });
    y += 6;

    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(t("errors"), 20, y);
    y += 8;
    doc.setFontSize(9);
    result.errors?.forEach((err) => {
      if (y > 270) { doc.addPage(); y = 20; }
      const sev = err.severity === "critical" ? "[!]" : err.severity === "warning" ? "[~]" : "[i]";
      doc.setTextColor(err.severity === "critical" ? 255 : err.severity === "warning" ? 255 : 100,
        err.severity === "critical" ? 59 : err.severity === "warning" ? 204 : 150, err.severity === "critical" ? 48 : 0);
      doc.text(`${sev} ${err.title}`, 20, y);
      y += 5;
      doc.setTextColor(120, 120, 120);
      const lines = doc.splitTextToSize(err.description, w - 45);
      doc.text(lines, 25, y);
      y += lines.length * 4.5 + 3;
    });
    y += 6;

    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setTextColor(57, 255, 20);
    doc.text(t("opportunities"), 20, y);
    y += 8;
    doc.setFontSize(9);
    result.opportunities?.forEach((opp) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setTextColor(57, 255, 20);
      doc.text(`+ ${opp.title} (${opp.estimated_value}\u20AC/mes)`, 20, y);
      y += 5;
      doc.setTextColor(120, 120, 120);
      const lines = doc.splitTextToSize(opp.description, w - 45);
      doc.text(lines, 25, y);
      y += lines.length * 4.5 + 3;
    });

    if (result.recommendations?.length) {
      y += 6;
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(14);
      doc.setTextColor(0, 229, 255);
      doc.text(t("recommendations"), 20, y);
      y += 8;
      doc.setFontSize(9);
      doc.setTextColor(180, 180, 180);
      result.recommendations.forEach((rec) => {
        if (y > 275) { doc.addPage(); y = 20; }
        const lines = doc.splitTextToSize(`\u2022 ${rec}`, w - 40);
        doc.text(lines, 20, y);
        y += lines.length * 4.5 + 2;
      });
    }

    doc.save(`fixmysite-${data.url.replace(/https?:\/\//, "").replace(/[^a-z0-9]/gi, "-")}.pdf`);
  };

  return (
    <motion.section
      className="py-24 px-4 bg-[#05050A]"
      variants={container}
      initial="hidden"
      animate="show"
      data-testid="analysis-results"
    >
      <div className="max-w-7xl mx-auto">
        {/* Summary */}
        <motion.div variants={item} className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#00E5FF] mb-4 font-mono">
            {data.url}
          </p>
          <p className="text-base text-zinc-400 max-w-2xl mx-auto mb-6">{result.summary}</p>
          <Button
            onClick={exportPDF}
            className="bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 rounded-full px-5 h-9 text-sm gap-2"
            data-testid="export-pdf-btn"
          >
            <FileDown className="w-4 h-4" />
            {t("export_pdf")}
          </Button>
        </motion.div>

        {/* Score + Money Lost */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <motion.div variants={item}>
            <ScoreDisplay score={result.score} label={t("score")} />
          </motion.div>
          <motion.div variants={item}>
            <MoneyLostCard amount={result.money_lost_monthly} />
          </motion.div>
        </div>

        {/* Sub-scores */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { key: "seo_score", label: t("seo"), icon: Search },
            { key: "performance_score", label: t("performance"), icon: Gauge },
            { key: "security_score", label: t("security"), icon: Shield },
            { key: "ux_score", label: t("ux"), icon: Monitor },
          ].map(({ key, label, icon: Icon }) => (
            <div
              key={key}
              className="bg-[#0F0F1A] border border-white/5 rounded-2xl p-5 hover:border-[#00E5FF]/20 transition-all duration-300"
              data-testid={`subscore-${key}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4 text-[#00E5FF]" />
                <span className="text-sm text-zinc-400">{label}</span>
              </div>
              <span className={`text-3xl font-black ${getScoreColor(result[key])}`}>
                {result[key]}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Errors + Opportunities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Errors */}
          <motion.div
            variants={item}
            className="bg-[#0F0F1A] border border-white/5 rounded-2xl p-6"
            data-testid="errors-card"
          >
            <h3
              className="text-xl font-bold text-white mb-4 flex items-center gap-2"
              style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
            >
              <AlertTriangle className="w-5 h-5 text-red-400" />
              {t("errors")} ({result.errors?.length || 0})
            </h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {result.errors?.map((err, i) => {
                const sev = severityConfig[err.severity] || severityConfig.info;
                const CatIcon = categoryIcons[err.category] || Info;
                return (
                  <div
                    key={i}
                    className="bg-white/[0.02] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <CatIcon className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-medium text-white">{err.title}</span>
                          <Badge className={`text-[10px] px-1.5 py-0 border ${sev.color}`}>
                            {t(err.severity)}
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-500 leading-relaxed">{err.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Opportunities */}
          <motion.div
            variants={item}
            className="bg-[#0F0F1A] border border-white/5 rounded-2xl p-6"
            data-testid="opportunities-card"
          >
            <h3
              className="text-xl font-bold text-white mb-4 flex items-center gap-2"
              style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
            >
              <TrendingUp className="w-5 h-5 text-[#39FF14]" />
              {t("opportunities")} ({result.opportunities?.length || 0})
            </h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {result.opportunities?.map((opp, i) => (
                <div
                  key={i}
                  className="bg-white/[0.02] border border-white/5 rounded-xl p-4 hover:border-[#39FF14]/20 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-4 h-4 text-[#39FF14] mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-medium text-white">{opp.title}</span>
                        <Badge
                          className={`text-[10px] px-1.5 py-0 border ${
                            opp.impact === "high"
                              ? "bg-[#39FF14]/10 text-[#39FF14] border-[#39FF14]/20"
                              : opp.impact === "medium"
                              ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          }`}
                        >
                          {t(opp.impact)}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed">{opp.description}</p>
                      {opp.estimated_value > 0 && (
                        <p className="text-xs text-[#39FF14] mt-1 font-mono">
                          +{opp.estimated_value}€{t("per_month")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Recommendations */}
        {result.recommendations?.length > 0 && (
          <motion.div
            variants={item}
            className="bg-[#0F0F1A] border border-white/5 rounded-2xl p-6 mb-6"
            data-testid="recommendations-card"
          >
            <h3
              className="text-xl font-bold text-white mb-4"
              style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
            >
              {t("recommendations")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.recommendations?.map((rec, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-lg">
                  <CheckCircle className="w-4 h-4 text-[#00E5FF] mt-0.5 shrink-0" />
                  <span className="text-sm text-zinc-300">{rec}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Premium Unlock */}
        <motion.div variants={item}>
          <PremiumUnlock analysisId={data.analysis_id} />
        </motion.div>
      </div>
    </motion.section>
  );
}
