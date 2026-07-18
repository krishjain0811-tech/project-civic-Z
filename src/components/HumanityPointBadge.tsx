import React from "react";
import { ShieldCheck, Flame, Heart } from "lucide-react";
import { motion } from "motion/react";

interface PointsBadgeProps {
  points: number;
  size?: "sm" | "md" | "lg";
}

export function HumanityPointBadge({ points, size = "md" }: PointsBadgeProps) {
  const getSizing = () => {
    switch (size) {
      case "sm":
        return {
          container: "px-2.5 py-1 text-xs gap-1",
          iconSize: 13,
          text: "font-bold text-orange-400"
        };
      case "lg":
        return {
          container: "px-5 py-2.5 text-xl gap-2.5 border-2",
          iconSize: 22,
          text: "text-2xl font-black text-orange-400 font-mono tracking-wide"
        };
      default:
        return {
          container: "px-3.5 py-1.5 text-sm gap-1.5 border",
          iconSize: 16,
          text: "font-extrabold text-orange-400 font-mono"
        };
    }
  };

  const currentSize = getSizing();

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center rounded-full bg-white/5 border border-white/10 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.1)] font-display ${currentSize.container}`}
      id="humanity-points-badge"
    >
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
      >
        <Heart size={currentSize.iconSize} className="fill-orange-500 text-orange-400" />
      </motion.div>
      <span className={currentSize.text}>{points.toLocaleString()}</span>
      <span className="text-[10px] text-orange-500/70 uppercase tracking-widest font-sans font-semibold">
        HP
      </span>
    </motion.div>
  );
}
