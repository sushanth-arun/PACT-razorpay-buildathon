import React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children, className }) => {
  return (
    <div className={cn("p-6 max-w-[1600px] w-full mx-auto space-y-6", className)}>
      {children}
    </div>
  );
};

