"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MerchantIndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/merchant/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center font-mono text-xs text-slate-400">
      Redirecting to Merchant Operations Dashboard...
    </div>
  );
}
