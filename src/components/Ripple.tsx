"use client";

import React, { useState } from "react";

interface RippleProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  rippleColor?: string;
  duration?: number;
}


export const Ripple: React.FC<RippleProps> = ({
  children,
  className = "",
  rippleColor = "rgba(255, 255, 255, 0.3)",
  duration = 600,
  ...props
}) => {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; size: number; id: number }>>([]);

  const addRipple = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const newRipple = { x, y, size, id: Date.now() };

    setRipples((prev) => [...prev, newRipple]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, duration);
  };

  return (
    <div
      className={`relative overflow-hidden cursor-pointer select-none inline-flex items-center justify-center ${className}`}
      onClick={addRipple}
      {...props}
    >
      {children}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute rounded-full pointer-events-none animate-ping opacity-75"
          style={{
            left: r.x,
            top: r.y,
            width: r.size,
            height: r.size,
            backgroundColor: rippleColor,
            animationDuration: `${duration}ms`,
          }}
        />
      ))}
    </div>
  );
};
