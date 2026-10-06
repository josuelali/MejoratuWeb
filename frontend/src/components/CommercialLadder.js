import { useState } from "react";
import axios from "axios";
import { ArrowRight, Check, Rocket, Sparkles, Bot } from "lucide-react";

const PREMIUM_URL = "https://buy.stripe.com/28E7sMbKhelIeUN8Tq63K00";
const API = `${process.env.REACT_APP_BACKEND_URL || "http://localhost:8001"}/api`;

const tiers = [
  {
    id: "complete-report",
    eyebrow: "1 · DESCUBRE QUÉ FALLA",
    title: "Informe Completo",
    price: "6,99 €",
    description: "Analizamos tu web y te entregamos un informe claro con los principales problemas y recomendaciones priorizadas.",
    features: ["Diagnóstico completo", "Problemas priorizados", "Recomendaciones claras"],
    icon: Sparkles,
    action: "Analizar mi web por 6,99 €",
    onClick: () => document.querySelector('[data-testid="url-input"]')?.scrollIntoView({ behavior: "smooth", block: "center" }),
    testId: "ladder-699-cta",
  },
  {
    id: "premium-seo",
    eyebrow: "2 · CORRIGE UNA PRIORIDAD",
    title: "MejoraTuWeb Premium",
    price: "49 €",
    description: "Diagnóstico profesional y una mejora SEO concreta aplicada en hasta 3 páginas de tu web.",
    features: ["Informe Premium", "Revisión manual básica", "Hasta 3 páginas · 5 cambios", "Una ronda de revisión"],
    icon: Rocket,
    action: "Quiero una mejora SEO real",
    href: PREMIUM_URL,
    note: "Requiere acceso técnico. No garantiza posiciones, tráfico ni ventas.",
    testId: "ladder-49-cta",
  },
  {
    id: "ai-agent",
    eyebrow: "3 · AUTOMATIZA UNA PARTE",
    title: "Agente IA 24/7",
    price: "499 € de implantación",
    description: "Configuramos un agente IA adaptado a tu negocio para atender consultas y captar oportunidades según el caso de uso acordado.",
    features: ["Agente personalizado", "Guion y configuración inicial", "Pruebas y soporte inicial"],
    icon: Bot,
    action: "Solicitar implantación",
    testId: "ladder-499-cta",
  },
];

export default function CommercialLadder() {
  const [leadOpen, setLeadOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const requestImplementation = async (event) => {
    event.preventDefault();
    if (!email.trim()) return;
    setError("");
    try {
      await axios.post(`${API}/email/subscribe`, { email: email.trim() });
      setSent(true);
    } catch {
      setError("No se pudo enviar la solicitud. Inténtalo de nuevo.");
    }
  };

  return (
    <section className="py-20 px-4 bg-[#070711]" data-testid="commercial-ladder">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-[#00E5FF] mb-3">MEJORA TU WEB EN TRES NIVELES</p>
          <h2 className="text-3xl sm:text-4xl font-black text-white">Elige el siguiente paso para tu negocio</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {tiers.map(({ id, eyebrow, title, price, description, features, icon: Icon, action, href, note, onClick, testId }) => (
            <article key={id} className={`rounded-2xl border p-6 flex flex-col ${id === "complete-report" ? "border-[#00E5FF]/40 bg-gradient-to-br from-[#0b1822] to-[#111021]" : "border-white/10 bg-[#0F0F1A]"}`}>
              <Icon className="w-7 h-7 text-[#00E5FF] mb-5" />
              <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-2">{eyebrow}</p>
              <h3 className="text-xl font-bold text-white">{title}</h3>
              <p className="text-2xl font-black text-[#FFCC00] mt-2">{price}</p>
              <p className="text-sm text-zinc-400 mt-4 min-h-[72px]">{description}</p>
              <ul className="space-y-2 mt-5 mb-6 text-sm text-zinc-300 flex-1">
                {features.map((feature) => <li key={feature} className="flex gap-2"><Check className="w-4 h-4 text-[#39FF14] shrink-0" />{feature}</li>)}
              </ul>
              {href ? <a href={href} target="_blank" rel="noreferrer" data-testid={testId} className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 bg-white/10 hover:bg-white/15 text-white font-bold text-sm">{action}<ArrowRight className="w-4 h-4" /></a> : <button type="button" onClick={id === "ai-agent" ? () => setLeadOpen(true) : onClick} data-testid={testId} className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 bg-gradient-to-r from-[#00E5FF] to-[#9D4CDD] text-black font-bold text-sm">{action}<ArrowRight className="w-4 h-4" /></button>}
              {note && <p className="text-[11px] text-zinc-500 mt-3">{note}</p>}
            </article>
          ))}
        </div>
        {leadOpen && <div className="max-w-xl mx-auto mt-8 rounded-2xl border border-white/10 bg-[#0F0F1A] p-6" data-testid="agent-lead-form"><h3 className="text-lg font-bold text-white mb-2">Solicitar implantación</h3><p className="text-sm text-zinc-400 mb-4">Déjanos tu email y te contactaremos para concretar el caso de uso.</p>{sent ? <p className="text-[#39FF14] text-sm">Solicitud recibida.</p> : <form onSubmit={requestImplementation} className="flex gap-2"><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Tu email" className="min-w-0 flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white" /><button type="submit" className="rounded-lg bg-white text-black px-4 py-2 font-bold">Enviar</button></form>}{error && <p className="text-sm text-red-400 mt-3">{error}</p>}</div>}
      </div>
    </section>
  );
}
