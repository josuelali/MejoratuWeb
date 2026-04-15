import { motion } from "framer-motion";
import { ExternalLink, Video, Rocket, Globe, Brain } from "lucide-react";

const affiliates = [
  {
    name: "Pictory",
    desc: "Crea videos profesionales con IA en minutos. Perfecto para marketing de contenidos.",
    url: "https://pictory.ai?ref=joshue-cabello-rosa72",
    icon: Video,
    color: "#00E5FF",
  },
  {
    name: "Systeme.io",
    desc: "Plataforma todo-en-uno para marketing, funnels, email y ventas online.",
    url: "https://josuecabellorosa83.systeme.io/30a703c4",
    icon: Rocket,
    color: "#9D4CDD",
  },
  {
    name: "Hostinger",
    desc: "Hosting web rapido, seguro y economico. Mejora la velocidad de tu web.",
    url: "https://www.hostinger.com/es?REFERRALCODE=DZOJOSUECS4D",
    icon: Globe,
    color: "#39FF14",
  },
  {
    name: "Sistema Maestro IA",
    desc: "Domina la inteligencia artificial y automatiza tu negocio digital.",
    url: "https://sistemamaestroia.com/demo.html",
    icon: Brain,
    color: "#FFCC00",
  },
];

export default function AffiliateSection() {
  return (
    <section className="py-16 px-4 bg-[#05050A]" data-testid="affiliate-section">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2
            className="text-2xl sm:text-3xl font-bold text-white mb-3"
            style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
          >
            Herramientas recomendadas
          </h2>
          <p className="text-sm text-zinc-500">
            Las mejores herramientas para mejorar tu presencia online
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {affiliates.map((aff, i) => {
            const Icon = aff.icon;
            return (
              <motion.a
                key={i}
                href={aff.url}
                target="_blank"
                rel="nofollow sponsored noopener"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group bg-[#0F0F1A] border border-white/5 rounded-2xl p-5 hover:border-white/20 transition-all duration-300 flex items-start gap-4"
                data-testid={`affiliate-${i}`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${aff.color}15` }}
                >
                  <Icon className="w-5 h-5" style={{ color: aff.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-white">{aff.name}</span>
                    <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">{aff.desc}</p>
                </div>
              </motion.a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
