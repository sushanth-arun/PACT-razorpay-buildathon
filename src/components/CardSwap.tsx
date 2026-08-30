"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CardSwapProps {
  children: React.ReactNode[];
  className?: string;
  cardClassName?: string;
}

export const CardSwap: React.FC<CardSwapProps> = ({
  children,
  className = "",
  cardClassName = "",
}) => {
  const [index, setIndex] = useState(0);

  const total = React.Children.count(children);
  if (total === 0) return null;

  const handleNext = () => {
    setIndex((prev) => (prev + 1) % total);
  };

  const handlePrev = () => {
    setIndex((prev) => (prev - 1 + total) % total);
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative min-h-[160px] w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`w-full ${cardClassName}`}
          >
            {React.Children.toArray(children)[index]}
          </motion.div>
        </AnimatePresence>
      </div>

      {total > 1 && (
        <div className="flex items-center justify-between pt-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  i === index ? "w-6 bg-blue-500" : "w-1.5 bg-slate-800 hover:bg-slate-700"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-[11px] font-bold transition-colors cursor-pointer"
            >
              PREV
            </button>
            <span className="text-[10px] text-slate-500">
              {index + 1} / {total}
            </span>
            <button
              type="button"
              onClick={handleNext}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-blue-400 hover:text-blue-300 text-[11px] font-bold transition-colors cursor-pointer"
            >
              NEXT
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
