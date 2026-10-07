import { useState } from "react";
import { ChevronDown } from "lucide-react";

const items = [
  ["¿Qué recibo por 6,99 €?", "Un informe completo con los principales problemas detectados y recomendaciones priorizadas."],
  ["¿Qué incluye MejoraTuWeb Premium?", "Un informe Premium y una intervención SEO concreta de hasta 3 páginas y 5 cambios, con una ronda de revisión."],
  ["¿Necesitáis acceso a mi web?", "Para aplicar la intervención de 49 € será necesario coordinar un acceso técnico adecuado."],
  ["¿Qué hace el Agente IA 24/7?", "Se diseña alrededor de tu caso de uso para atender consultas, cualificar oportunidades y derivarlas al negocio."],
  ["¿Los 499 € incluyen llamadas ilimitadas?", "No. Los 499 € corresponden a la implantación inicial y no incluyen llamadas ilimitadas."],
  ["¿Existen costes posteriores en el Agente IA?", "El mantenimiento, la telefonía o el uso de servicios de IA pueden generar costes adicionales. No se fija aquí una cuota mensual."],
];

export default function CommercialFaq() {
  const [open, setOpen] = useState(null);
  return <section id="faq" className="bg-[#050811] px-4 py-24" aria-labelledby="faq-title"><div className="mx-auto max-w-3xl"><p className="text-center text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">Preguntas frecuentes</p><h2 id="faq-title" className="mt-3 text-center text-3xl font-black text-white sm:text-4xl">Antes de dar el siguiente paso</h2><div className="mt-10 divide-y divide-white/10 rounded-3xl border border-white/10 bg-white/[0.025] px-6">{items.map(([question, answer], index) => <div key={question}><button type="button" className="flex w-full items-center justify-between gap-4 py-5 text-left text-sm font-bold text-white" aria-expanded={open === index} aria-controls={`faq-answer-${index}`} onClick={() => setOpen(open === index ? null : index)}>{question}<ChevronDown className={`h-5 w-5 shrink-0 text-cyan-300 transition-transform ${open === index ? "rotate-180" : ""}`} /></button>{open === index && <p id={`faq-answer-${index}`} className="faq-answer pb-5 pr-8 text-sm leading-6 text-slate-400">{answer}</p>}</div>)}</div></div></section>;
}
