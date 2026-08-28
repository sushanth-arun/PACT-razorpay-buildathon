"use client";

import React from "react";
import { motion } from "framer-motion";

interface BlurTextProps {
  text: string;
  className?: string;
  delay?: number;
}

export const BlurText: React.FC<BlurTextProps> = ({
  text,
  className = "",
  delay = 0.05,
}) => {
  const words = text.split(" ");

  return (
    <span className={`inline-flex flex-wrap gap-1 ${className}`}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ filter: "blur(8px)", opacity: 0, y: 5 }}
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * delay }}
          className="inline-block"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
};
