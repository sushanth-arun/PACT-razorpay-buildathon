import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  actions,
  className,
}) => {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800", className)}>
      <div className="space-y-1.5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-100">{title}</h1>
          {badge}
        </div>
        {description && (
          <p className="text-sm text-slate-400 font-normal">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
};

