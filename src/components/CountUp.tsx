"use client";

import React, { useEffect, useState } from "react";

interface CountUpProps {
  to: number | string;
  from?: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export const CountUp: React.FC<CountUpProps> = ({
  to,
  from = 0,
  duration = 800,
  className = "",
  prefix = "",
  suffix = "",
  decimals = 0,
}) => {
  const strVal = String(to ?? "");
  const detectedPrefix = prefix || (strVal.startsWith("₹") ? "₹" : strVal.startsWith("$") ? "$" : "");
  const detectedSuffix = suffix || (strVal.endsWith("%") ? "%" : "");

  const cleanNumStr = strVal.replace(/[^0-9.-]+/g, "");
  const targetNum = typeof to === "number" ? to : parseFloat(cleanNumStr) || 0;
  
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
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = from + easeProgress * (targetNum - from);
      setCount(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.floor(current));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCount);
      }
    };

    animationFrameId = requestAnimationFrame(updateCount);
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetNum, from, duration, decimals]);

  if (typeof to === "string" && isNaN(targetNum)) {
    return <span className={className}>{to}</span>;
  }

  const formattedValue = mounted 
    ? (decimals > 0 ? count.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : count.toLocaleString("en-IN"))
    : (decimals > 0 ? targetNum.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : targetNum.toLocaleString("en-IN"));

  return (
    <span className={className} suppressHydrationWarning>
      {detectedPrefix}
      {formattedValue}
      {detectedSuffix}
    </span>
  );
};
