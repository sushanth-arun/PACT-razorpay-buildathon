"use client";

import React from "react";
import "./Aurora.css";

interface AuroraProps {
  colorStops?: string[];
  amplitude?: number;
  speed?: number;
  blend?: number;
  className?: string;
}

export const Aurora: React.FC<AuroraProps> = ({
  colorStops = ["#3b82f6", "#8b5cf6", "#06b6d4", "#ec4899"],
  speed = 1.0,
  className = "",
}) => {
  return (
    <div className={`aurora-container ${className}`}>
      <div
        className="aurora-element w-[600px] h-[600px] -top-32 -left-32"
        style={{
          background: `radial-gradient(circle, ${colorStops[0]} 0%, transparent 70%)`,
          animationDuration: `${14 / speed}s`,
        }}
      />
      <div
        className="aurora-element w-[700px] h-[700px] top-1/4 right-[-150px]"
        style={{
          background: `radial-gradient(circle, ${colorStops[1]} 0%, transparent 70%)`,
          animationDuration: `${20 / speed}s`,
          animationDelay: "-4s",
        }}
      />
      <div
        className="aurora-element w-[650px] h-[650px] -bottom-32 left-1/3"
        style={{
          background: `radial-gradient(circle, ${colorStops[2] || colorStops[0]} 0%, transparent 70%)`,
          animationDuration: `${16 / speed}s`,
          animationDelay: "-8s",
        }}
      />
      <div
        className="aurora-element w-[500px] h-[500px] top-1/3 left-10"
        style={{
          background: `radial-gradient(circle, ${colorStops[3] || colorStops[1]} 0%, transparent 70%)`,
          animationDuration: `${22 / speed}s`,
          animationDelay: "-12s",
        }}
      />
    </div>
  );
};

export default Aurora;
