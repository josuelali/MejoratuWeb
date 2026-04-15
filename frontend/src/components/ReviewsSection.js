import { motion } from "framer-motion";
import { Star } from "lucide-react";

const reviews = [
  {
    name: "Maria Garcia",
    role: "Propietaria de tienda online",
    text: "Descubri que mi web tenia errores criticos que me estaban costando miles de euros al mes. Con el informe completo pude arreglarlos y mi trafico subio un 40%.",
    rating: 5,
  },
  {
    name: "Carlos Rodriguez",
    role: "Consultor de marketing digital",
    text: "Uso esta herramienta con todos mis clientes. El analisis es muy preciso y las recomendaciones son accionables. Por solo 6,99 euros es una ganga.",
    rating: 5,
  },
  {
    name: "Laura Martinez",
    role: "Freelancer SEO",
    text: "La mejor herramienta de auditoria web que he probado. El escaneo rapido gratuito ya da mucha info, y el informe completo es brutal.",
    rating: 5,
  },
  {
    name: "Antonio Lopez",
    role: "Dueno de PYME",
    text: "No tenia idea de cuanto dinero estaba perdiendo por errores en mi web. Inverti 6,99 euros en el informe y recupere la inversion en 2 dias.",
    rating: 5,
  },
];

export default function ReviewsSection() {
  return (
    <section className="py-16 px-4 bg-[#05050A]" data-testid="reviews-section">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2
            className="text-2xl sm:text-3xl font-bold text-white mb-3"
            style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
          >
            Lo que dicen nuestros usuarios
          </h2>
          <p className="text-sm text-zinc-500">Mas de 2.000 webs analizadas</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {reviews.map((review, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#0F0F1A] border border-white/5 rounded-2xl p-5 hover:border-[#9D4CDD]/20 transition-all duration-300"
            >
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: review.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-[#FFCC00] text-[#FFCC00]" />
                ))}
              </div>
              <p className="text-sm text-zinc-300 mb-4 leading-relaxed italic">
                &ldquo;{review.text}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00E5FF]/30 to-[#9D4CDD]/30 flex items-center justify-center text-sm font-bold text-white">
                  {review.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{review.name}</p>
                  <p className="text-xs text-zinc-500">{review.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
