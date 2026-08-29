"use client";

import React, { useEffect, useState } from "react";

interface CountUpProps {
  to: number | string;
  from?: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const CountUp: React.FC<CountUpProps> = ({
  to,
  from = 0,
  duration = 1000,
  className = "",
  prefix = "",
  suffix = "",
}) => {
  const targetNum = typeof to === "number" ? to : parseFloat(to.replace(/[^0-9.-]+/g, "")) || 0;
  const [count, setCount] = useState(from);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isNaN(targetNum)) return;
    let startTime: number | null = null;
    let animationFrameId: number;

    const updateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const current = Math.floor(from + progress * (targetNum - from));
      setCount(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCount);
      }
    };

    animationFrameId = requestAnimationFrame(updateCount);
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetNum, from, duration]);

  if (typeof to === "string" && isNaN(targetNum)) {
    return <span className={className}>{to}</span>;
  }

  return (
    <span className={className} suppressHydrationWarning>
      {prefix}
      {mounted ? count.toLocaleString("en-IN") : targetNum.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
};
