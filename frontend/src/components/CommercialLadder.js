import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import axios from "axios";
import { ArrowRight, Bot, Check, LockKeyhole, Rocket, Search, X } from "lucide-react";
import { API } from "../lib/api";
import { DiagnosticHud, AgentFlow, InterventionScene, ProjectPortfolio } from "./VisualScenes";

if (typeof window !== "undefined" && !window.IntersectionObserver) {
  window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
}
const PREMIUM_URL = "https://buy.stripe.com/28E7sMbKhelIeUN8Tq63K00";
const focusAnalysis = () => {
  const input = document.querySelector('[data-testid="url-input"]');
  input?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  input?.focus({ preventScroll: true });
};
const tiers = [
  { id: "complete-report", step: "01", world: "ANALIZA", title: "Informe Completo", price: "6,99 €", description: "Descubre qué está frenando tu web con un diagnóstico claro y priorizado.", features: ["Diagnóstico completo", "Problemas priorizados", "Recomendaciones accionables"], icon: Search, accent: "cyan", action: "Analizar mi web", testId: "ladder-699-cta" },
  { id: "premium-seo", step: "02", world: "MEJORA", title: "MejoraTuWeb Premium", price: "49 €", description: "No solo te decimos qué falla. Corregimos una prioridad SEO real.", features: ["Informe Premium", "Hasta 3 páginas · 5 cambios", "Una ronda de revisión"], icon: Rocket, accent: "gold", action: "QUIERO UNA MEJORA SEO REAL", href: PREMIUM_URL, note: "Requiere acceso técnico. No garantiza posiciones, tráfico ni ventas.", testId: "ladder-49-cta" },
  { id: "ai-agent", step: "03", world: "AUTOMATIZA", title: "Agente IA 24/7", price: "499 € de implantación", description: "Atiende oportunidades incluso cuando tú no estás, con un agente adaptado a tu negocio.", features: ["Agente personalizado", "Guion y configuración inicial", "Pruebas y soporte inicial"], icon: Bot, accent: "violet", action: "SOLICITAR IMPLANTACIÓN", testId: "ladder-499-cta" },
];
const sceneCopy = [
  ["Todo empieza por una URL.", "Mira debajo de la superficie.", "Descubre qué merece atención antes de decidir tu siguiente paso."],
  ["De entender a intervenir.", "Una prioridad. Un cambio real.", "El diagnóstico toma forma en una intervención SEO concreta y revisable."],
  ["De mejorar a conectar.", "La siguiente oportunidad puede llegar cuando no estás.", "Un flujo diseñado alrededor de tu negocio: atender, cualificar y derivar."],
];

export default function CommercialLadder() {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const journeyColor = useTransform(scrollYProgress, [0, .35, .65, 1], ["#67e8f9", "#fcd34d", "#a78bfa", "#67e8f9"]);
  const [leadOpen, setLeadOpen] = useState(false);
  const [lead, setLead] = useState({ first_name: "", last_name: "", phone: "", email: "", privacy_consent: false });
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const requestImplementation = async (event) => {
    event.preventDefault();
    setLeadSubmitting(true);
    setError("");
    try { await axios.post(`${API}/agent-leads`, lead); setSent(true); }
    catch (requestError) { setError(requestError?.response?.status === 409 ? "Ya hemos recibido una solicitud con estos datos." : "No se pudo enviar la solicitud. Inténtalo de nuevo."); }
    finally { setLeadSubmitting(false); }
  };
  useEffect(() => {
    if (!leadOpen) return undefined;
    const onKeyDown = event => { if (event.key === "Escape" && !leadSubmitting) setLeadOpen(false); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKeyDown); };
  }, [leadOpen, leadSubmitting]);
  const reveal = reduced ? {} : { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: .15 }, transition: { duration: .6 } };
  return <section ref={ref} className="commercial-journey" data-testid="commercial-ladder">
    <motion.div className="journey-rail" aria-hidden="true" style={{ color: reduced ? "#67e8f9" : journeyColor }}><motion.i style={{ scaleY: reduced ? 1 : scrollYProgress }} /></motion.div>
    <div className="journey-wrap">
      <nav className="journey-nav" aria-label="Escalera comercial">{tiers.map(tier => <a key={tier.id} href={`#${tier.id}`} className={`nav-${tier.accent}`}><span>{tier.step}</span>{tier.world}</a>)}</nav>
      <div className="journey-intro"><p className="scene-eyebrow">ANALIZA → MEJORA → AUTOMATIZA</p><h2>De detectar una fuga<br />a activar una oportunidad.</h2><p>Empieza con claridad, decide qué merece una intervención y construye después la automatización que tu negocio necesita.</p></div>
      {tiers.map(({ id, step, world, title, price, description, features, icon: Icon, accent, action, href, note, testId }, index) => <div className={`journey-scene scene-${accent}`} key={id}>
        <div className="scene-ambient" aria-hidden="true" />
        <motion.div {...reveal} className="scene-heading"><p className="scene-eyebrow"><span>{step} / {world}</span><span>{sceneCopy[index][0]}</span></p><h3>{sceneCopy[index][1]}</h3><p>{sceneCopy[index][2]}</p></motion.div>
        <div className={`scene-layout ${accent === "gold" ? "layout-reverse" : ""}`}>
          <motion.article {...reveal} id={id} className={`tier-card tier-${accent}`}>
            {accent === "gold" && <div className="recommended-badge">✦ RECOMENDADO</div>}
            <div className="tier-heading"><span className="scene-eyebrow">{step} · {world}</span><Icon size={25} aria-hidden="true" /></div>
            <h3>{title}</h3><p className="tier-price">{price}</p><p className="tier-description">{description}</p>
            <ul>{features.map(feature => <li key={feature}><Check size={16} aria-hidden="true" />{feature}</li>)}</ul>
            {href ? <a href={href} target="_blank" rel="noreferrer" data-testid={testId} className="tier-cta">{action}<ArrowRight size={17} aria-hidden="true" /></a>
              : <button type="button" onClick={id === "ai-agent" ? () => { setSent(false); setError(""); setLeadOpen(true); } : focusAnalysis} data-testid={testId} className="tier-cta">{action}<ArrowRight size={17} aria-hidden="true" /></button>}
            {note && <p className="tier-note">{note}</p>}
          </motion.article>
          <motion.div {...reveal} className="scene-visual">
            {index === 0 && <DiagnosticHud />}
            {index === 1 && <div className="premium-visual scene-panel"><div className="scene-caption"><span>DEL DIAGNÓSTICO A LA ACCIÓN</span><strong>SEO</strong></div><h4>De la prioridad<br />al cambio aplicado.</h4><InterventionScene /><p className="scene-footer">Proceso de trabajo · sin promesas de resultados</p></div>}
            {index === 2 && <AgentFlow />}
          </motion.div>
        </div>
        {index < 2 && <div className={`scene-transition transition-${accent}`} aria-hidden="true"><div className="transition-path"><i /></div><span>{index === 0 ? "LA CLARIDAD SE CONVIERTE EN ACCIÓN" : "EL SIGUIENTE PASO: CONECTAR OPORTUNIDADES"}</span><ArrowRight size={16}/></div>}
      </div>)}
      <ProjectPortfolio />
      {leadOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#02040b]/80 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => !leadSubmitting && setLeadOpen(false)}><motion.div {...reveal} role="dialog" aria-modal="true" aria-labelledby="agent-modal-title" data-testid="agent-lead-modal" className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-violet-200/20 bg-[#0b1020] p-6 shadow-2xl shadow-violet-950/50 sm:p-8" onMouseDown={event => event.stopPropagation()}><button type="button" aria-label="Cerrar solicitud" data-testid="agent-lead-close" onClick={() => !leadSubmitting && setLeadOpen(false)} className="absolute right-5 top-5 rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"><X size={20} aria-hidden="true" /></button><div className="mb-5 flex items-center gap-3 pr-8"><LockKeyhole className="h-5 w-5 text-violet-200" aria-hidden="true" /><h3 id="agent-modal-title" className="text-xl font-bold text-white">Solicitar agente IA 24/7</h3></div><p className="mb-6 text-sm leading-6 text-slate-400">Implantación desde 499 €. Déjanos tus datos para estudiar tu negocio y contactar contigo. Sin pago ahora.</p>{sent ? <p className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-200" role="status">Solicitud recibida. Nos pondremos en contacto contigo.</p> : <form onSubmit={requestImplementation} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm text-slate-300" htmlFor="agent-first-name">Nombre<input id="agent-first-name" name="first_name" required autoFocus value={lead.first_name} onChange={event => setLead({ ...lead, first_name: event.target.value })} placeholder="Tu nombre" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-white outline-none focus:border-violet-300/60" /></label><label className="space-y-2 text-sm text-slate-300" htmlFor="agent-last-name">Apellidos<input id="agent-last-name" name="last_name" required value={lead.last_name} onChange={event => setLead({ ...lead, last_name: event.target.value })} placeholder="Tus apellidos" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-white outline-none focus:border-violet-300/60" /></label></div><label className="block space-y-2 text-sm text-slate-300" htmlFor="agent-phone">Teléfono / WhatsApp<input id="agent-phone" name="phone" type="tel" required value={lead.phone} onChange={event => setLead({ ...lead, phone: event.target.value })} placeholder="+34 600 000 000" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-white outline-none focus:border-violet-300/60" /></label><label className="block space-y-2 text-sm text-slate-300" htmlFor="agent-email">Correo electrónico<input id="agent-email" name="email" type="email" required value={lead.email} onChange={event => setLead({ ...lead, email: event.target.value })} placeholder="tu@empresa.com" className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-white outline-none focus:border-violet-300/60" /></label><label className="flex items-start gap-3 text-sm leading-6 text-slate-300"><input name="privacy_consent" type="checkbox" required checked={lead.privacy_consent} onChange={event => setLead({ ...lead, privacy_consent: event.target.checked })} className="mt-1 h-4 w-4 accent-violet-400" /> <span>Autorizo que me contacten para responder a esta solicitud y he leído la <a href="/legal/privacy" target="_blank" rel="noreferrer" data-privacy-version="privacy-v1-2026-10-08" className="text-violet-200 underline">información de privacidad</a>.</span></label>{error && <p className="text-sm text-red-400" role="alert">{error}</p>}<button type="submit" disabled={leadSubmitting} className="w-full rounded-xl bg-white px-4 py-3 font-bold text-black transition hover:bg-violet-100 disabled:cursor-wait disabled:opacity-60">{leadSubmitting ? "Enviando…" : "Solicitar llamada"}</button></form>}</motion.div></div>}
    </div>
  </section>;
}
