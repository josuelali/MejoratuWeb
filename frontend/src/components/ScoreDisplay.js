import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function ScoreDisplay({ score, label }) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current > score) {
        clearInterval(interval);
        return;
      }
      setDisplayScore(current);
    }, 20);
    return () => clearInterval(interval);
  }, [score]);

  const getColor = (s) => {
    if (s >= 80) return "#39FF14";
    if (s >= 50) return "#FFCC00";
    return "#FF3B30";
  };

  const color = getColor(score);
  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  return (
    <div
      className="bg-[#0F0F1A] border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center hover:border-[#00E5FF]/20 transition-all duration-300 min-h-[260px]"
      data-testid="visual-score"
    >
      <span className="text-sm text-zinc-400 mb-4">{label}</span>
      <div className="relative w-44 h-44">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
          />
          <motion.circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 10px ${color}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-5xl font-black"
            style={{
              color,
              fontFamily: "Cabinet Grotesk, sans-serif",
              textShadow: `0 0 24px ${color}40`,
            }}
          >
            {displayScore}
          </span>
        </div>
      </div>
    </div>
  );
}
