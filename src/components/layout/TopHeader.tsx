"use client";

import React from "react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export const TopHeader: React.FC = () => {
  return (
    <header className="h-14 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur px-6 flex items-center justify-end sticky top-0 z-20 font-sans">
      <div className="flex items-center gap-3">
        <ThemeToggle />
      </div>
    </header>
  );
};




