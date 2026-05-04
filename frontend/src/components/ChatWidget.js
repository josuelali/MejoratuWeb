import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Volume2, VolumeX } from "lucide-react";

const STRIPE_LINK = "https://buy.stripe.com/4gM4gz9Vl0gt5zJcWrabK0b";

const qaData = [
  {
    q: "Que incluye el informe?",
    a: "La Auditoría Express incluye revisión manual, informe PDF con errores prioritarios, 3 acciones urgentes y entrega en 24 horas.",
  },
  {
    q: "Cuanto cuesta?",
    a: "La Auditoría Express cuesta 49 euros e incluye un informe claro para priorizar cambios que pueden estar costándote clientes.",
  },
  {
    q: "Como mejoro mi web?",
    a: "Primero, analiza tu web gratis. Después, pide la Auditoría Express de 49 euros si quieres una revisión manual con prioridades concretas.",
  },
  {
    q: "Es seguro pagar?",
    a: "Si, todos los pagos se procesan de forma segura a traves de Stripe, la plataforma de pagos lider mundial. Tus datos estan protegidos con encriptacion SSL.",
  },
  {
    q: "Quiero pedir la auditoría",
    a: "Excelente decision! Te redirijo al pago seguro...",
  },
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { type: "bot", text: "Hola! Soy el asistente de MejoraTuWeb.org. En que puedo ayudarte?" },
  ]);
  const [speaking, setSpeaking] = useState(false);
  const chatRef = useRef(null);

  const speak = (text) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "es-ES";
      utterance.rate = 1;
      utterance.onend = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  };

  const handleQuestion = (qa) => {
    setMessages((prev) => [...prev, { type: "user", text: qa.q }, { type: "bot", text: qa.a }]);
    speak(qa.a);
    if (qa.q.includes("pedir la auditoría")) {
      setTimeout(() => window.open(STRIPE_LINK, "_blank"), 2000);
    }
    setTimeout(() => {
      chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
    }, 100);
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-[#00E5FF] to-[#9D4CDD] flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:scale-110 transition-transform"
        whileTap={{ scale: 0.95 }}
        data-testid="chat-widget-btn"
      >
        {open ? <X className="w-6 h-6 text-black" /> : <MessageCircle className="w-6 h-6 text-black" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-6 z-50 w-80 max-h-[480px] bg-[#0A0A12] border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
            data-testid="chat-panel"
          >
            <div className="px-4 py-3 bg-gradient-to-r from-[#00E5FF]/10 to-[#9D4CDD]/10 border-b border-white/5 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">Asistente</p>
                <p className="text-xs text-zinc-500">Mejora Tu WEB</p>
              </div>
              <button
                onClick={speaking ? stopSpeaking : undefined}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                data-testid="chat-voice-btn"
              >
                {speaking ? (
                  <Volume2 className="w-4 h-4 text-[#00E5FF] animate-pulse" />
                ) : (
                  <VolumeX className="w-4 h-4 text-zinc-500" />
                )}
              </button>
            </div>

            <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[280px]">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                      msg.type === "user"
                        ? "bg-[#00E5FF]/20 text-[#00E5FF]"
                        : "bg-white/5 text-zinc-300"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-white/5 space-y-1.5 max-h-[180px] overflow-y-auto">
              {qaData.map((qa, i) => (
                <button
                  key={i}
                  onClick={() => handleQuestion(qa)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-[#00E5FF]/10 text-xs text-zinc-400 hover:text-[#00E5FF] transition-colors border border-transparent hover:border-[#00E5FF]/20"
                  data-testid={`chat-q-${i}`}
                >
                  {qa.q}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
