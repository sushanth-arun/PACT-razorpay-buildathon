"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types";
import SpotlightCard from "@/components/SpotlightCard";
import { Magnet } from "@/components/Magnet";
import Aurora from "@/components/Aurora";
import DepthText from "@/components/DepthText";
import { 
  Bot,
  Store,
  Lock, 
  Mail, 
  User as UserIcon,
  KeyRound,
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Loader2
} from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const { login, signup, resetPassword } = useAuth();

  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [role, setRole] = useState<UserRole>("BUYER");
  
  // Form fields
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [merchantName, setMerchantName] = useState<string>("");
  const [merchantDescription, setMerchantDescription] = useState<string>("");

  // States
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isForgotPassword) {
        if (!email.trim()) {
          throw new Error("Please enter your registered email address.");
        }
        await resetPassword(email.trim());
        setSuccessMsg("Password reset email sent. Please check your inbox.");
        setLoading(false);
        return;
      }

      if (isLogin) {
        if (!email.trim() || !password) {
          throw new Error("Please fill in both email and password.");
        }
        const userProfile = await login(email.trim(), password);
        if (userProfile?.role === "MERCHANT_ADMIN") {
          router.push("/merchant/dashboard");
        } else {
          router.push("/deal-room");
        }
      } else {
        // Signup validation
        if (!email.trim() || !password) {
          throw new Error("Please provide email and password.");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        if (role === "MERCHANT_ADMIN" && !merchantName.trim()) {
          throw new Error("Please provide a business / merchant store name.");
        }

        await signup(email.trim(), password, role, {
          displayName: displayName.trim() || undefined,
          merchantName: merchantName.trim() || undefined,
          merchantDescription: merchantDescription.trim() || undefined,
        });

        if (role === "MERCHANT_ADMIN") {
          router.push("/merchant");
        } else {
          router.push("/deal-room");
        }
      }
    } catch (err: unknown) {
      let msg = "Authentication failed. Please try again.";
      if (err instanceof Error) {
        if (err.message.includes("invalid-credential") || err.message.includes("wrong-password")) {
          msg = "Invalid email or password. Please verify your credentials.";
        } else if (err.message.includes("email-already-in-use")) {
          msg = "An account with this email address already exists. Please log in.";
        } else if (err.message.includes("invalid-email")) {
          msg = "Please enter a valid email address.";
        } else if (err.message.includes("weak-password")) {
          msg = "Password is too weak. Please use at least 6 characters.";
        } else {
          msg = err.message;
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* React Bits Aurora Ambient Background (Only on Auth Page) */}
      <Aurora
        colorStops={["rgba(37, 99, 235, 0.4)", "rgba(147, 51, 234, 0.35)", "rgba(6, 182, 212, 0.35)", "rgba(236, 72, 153, 0.25)"]}
        speed={0.8}
      />

      <div className="w-full max-w-5xl relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Half: 3D DepthText PACT Only */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center text-center p-4">
          <div className="overflow-visible py-6">
            <DepthText
              text="PACT"
              layers={38}
              depth={3.2}
              faceColor="#f8fafc"
              depthColor="#7c3aed"
              tilt={9}
              pointerTracking
              smoothing={0.14}
              perspective={850}
              autoOrbit
              orbitSpeed={0.35}
              fontSize="clamp(5rem, 16vw, 9.5rem)"
              fontWeight={900}
              shadow
            />
          </div>
        </div>

        {/* Right Half: Login Form & Seeded Demo Credentials */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <SpotlightCard
            spotlightColor="rgba(124, 58, 237, 0.25)"
            className="bg-slate-950/95 border border-slate-800 p-0 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            <div className="p-6 sm:p-7 space-y-5">
              {/* Tab Switcher Slider: SIGN IN / CREATE ACCOUNT */}
              <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setIsForgotPassword(false);
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2.5 rounded-lg font-bold transition-all cursor-pointer ${
                    isLogin && !isForgotPassword
                      ? "bg-purple-600 text-white shadow-md shadow-purple-950/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  SIGN IN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    setIsForgotPassword(false);
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2.5 rounded-lg font-bold transition-all cursor-pointer ${
                    !isLogin && !isForgotPassword
                      ? "bg-purple-600 text-white shadow-md shadow-purple-950/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  CREATE ACCOUNT
                </button>
              </div>

              {/* Authentication Form: Email & Password */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Role Selector on Signup */}
                {!isLogin && !isForgotPassword && (
                  <div className="space-y-2">
                    <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider block">
                      SELECT YOUR ROLE
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRole("BUYER")}
                        className={`p-3 rounded-xl border cursor-pointer transition-all text-left flex flex-col gap-1 ${
                          role === "BUYER"
                            ? "bg-cyan-950/70 border-cyan-500 text-white shadow-md shadow-cyan-950/50"
                            : "bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-cyan-400">
                          <Bot className="w-4 h-4" />
                          <span>AI BUYER</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight">
                          Autonomous Buyer
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRole("MERCHANT_ADMIN")}
                        className={`p-3 rounded-xl border cursor-pointer transition-all text-left flex flex-col gap-1 ${
                          role === "MERCHANT_ADMIN"
                            ? "bg-emerald-950/70 border-emerald-500 text-white shadow-md shadow-emerald-950/50"
                            : "bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-emerald-400">
                          <Store className="w-4 h-4" />
                          <span>MERCHANT</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight">
                          Store Admin
                        </p>
                      </button>
                    </div>
                  </div>
                )}

                {/* Display Name on Signup */}
                {!isLogin && !isForgotPassword && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-300 uppercase">
                      Your Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. Sushanth Arun"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                      />
                      <UserIcon className="w-5 h-5 text-slate-500 absolute left-3 top-3.5" />
                    </div>
                  </div>
                )}

                {/* Merchant Store Fields */}
                {!isLogin && !isForgotPassword && role === "MERCHANT_ADMIN" && (
                  <div className="space-y-3 p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40">
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-emerald-400 uppercase font-bold">
                        Merchant Store Name *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="e.g. ErgoTech Works"
                          value={merchantName}
                          onChange={(e) => setMerchantName(e.target.value)}
                          required
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-emerald-800/60 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                        <Store className="w-5 h-5 text-emerald-500 absolute left-3 top-3" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-slate-300 uppercase">
                        Store Description
                      </label>
                      <textarea
                        rows={2}
                        placeholder="High-performance ergonomic furniture..."
                        value={merchantDescription}
                        onChange={(e) => setMerchantDescription(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-300 uppercase font-semibold">
                    Email Address *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                    />
                    <Mail className="w-5 h-5 text-slate-500 absolute left-3 top-3.5" />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono text-slate-300 uppercase font-semibold">
                      Password *
                    </label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(!isForgotPassword);
                          setError(null);
                          setSuccessMsg(null);
                        }}
                        className="text-xs font-mono text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        {isForgotPassword ? "← Back to Login" : "Forgot Password?"}
                      </button>
                    )}
                  </div>
                  {!isForgotPassword && (
                    <div className="relative">
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 transition-colors font-mono"
                      />
                      <Lock className="w-5 h-5 text-slate-500 absolute left-3 top-3.5" />
                    </div>
                  )}
                </div>

                {/* Confirm Password on Signup */}
                {!isLogin && !isForgotPassword && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-300 uppercase font-semibold">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 transition-colors font-mono"
                      />
                      <KeyRound className="w-5 h-5 text-slate-500 absolute left-3 top-3.5" />
                    </div>
                  </div>
                )}

                {/* Feedback messages */}
                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-sm flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
                    <span>{error}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Submit CTA */}
                <div className="pt-2">
                  <Magnet strength={6} className="w-full">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:via-indigo-500 hover:to-blue-500 text-white font-mono text-sm font-bold transition-all shadow-xl shadow-purple-950/60 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>PROCESSING...</span>
                        </>
                      ) : isForgotPassword ? (
                        <>
                          <span>SEND RESET LINK</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      ) : isLogin ? (
                        <>
                          <span>SIGN IN TO PACT</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          <span>CREATE {role} ACCOUNT</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </Magnet>
                </div>
              </form>

            {/* Quick Demo Credentials Footer (Only visible on Sign In tab) */}
            {isLogin && !isForgotPassword && (
              <div className="pt-5 border-t border-slate-200 dark:border-slate-800/80 font-mono text-xs text-slate-400 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs tracking-wider uppercase">
                  <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>PRE-SEEDED DEMO ACCOUNTS (CLICK TO AUTO-FILL)</span>
                  </div>
                  <span className="text-slate-600 dark:text-slate-400 font-bold">PW: pact123456</span>
                </div>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setEmail("buyer@pact.ai");
                    setPassword("pact123456");
                    setIsLogin(true);
                    setError(null);
                    setSuccessMsg("Auto-filled AI Buyer credentials!");
                  }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-cyan-50 dark:bg-slate-900/80 dark:hover:bg-cyan-950/40 border border-slate-200 hover:border-cyan-400 dark:border-slate-800 dark:hover:border-cyan-600 gap-1.5 transition-all text-left cursor-pointer group"
                >
                  <span className="text-cyan-700 dark:text-cyan-300 font-bold shrink-0 group-hover:text-cyan-800 dark:group-hover:text-cyan-200">AI Buyer:</span>
                  <code className="text-blue-600 dark:text-blue-300 font-semibold truncate">buyer@pact.ai</code>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] shrink-0">Global Buyer</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail("merchant@ergospace.com");
                    setPassword("pact123456");
                    setIsLogin(true);
                    setError(null);
                    setSuccessMsg("Auto-filled ErgoSpace Merchant credentials!");
                  }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 dark:bg-slate-900/80 dark:hover:bg-emerald-950/40 border border-slate-200 hover:border-emerald-400 dark:border-slate-800 dark:hover:border-emerald-600 gap-1.5 transition-all text-left cursor-pointer group"
                >
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold shrink-0 group-hover:text-emerald-800 dark:group-hover:text-emerald-200">ErgoSpace:</span>
                  <code className="text-slate-800 dark:text-slate-200 font-semibold truncate">merchant@ergospace.com</code>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] shrink-0">Seating & Desks</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail("merchant@deskforge.com");
                    setPassword("pact123456");
                    setIsLogin(true);
                    setError(null);
                    setSuccessMsg("Auto-filled DeskForge Merchant credentials!");
                  }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 dark:bg-slate-900/80 dark:hover:bg-emerald-950/40 border border-slate-200 hover:border-emerald-400 dark:border-slate-800 dark:hover:border-emerald-600 gap-1.5 transition-all text-left cursor-pointer group"
                >
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold shrink-0 group-hover:text-emerald-800 dark:group-hover:text-emerald-200">DeskForge:</span>
                  <code className="text-slate-800 dark:text-slate-200 font-semibold truncate">merchant@deskforge.com</code>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] shrink-0">Motorized Desks</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail("merchant@cybertech.com");
                    setPassword("pact123456");
                    setIsLogin(true);
                    setError(null);
                    setSuccessMsg("Auto-filled CyberTech Merchant credentials!");
                  }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 dark:bg-slate-900/80 dark:hover:bg-emerald-950/40 border border-slate-200 hover:border-emerald-400 dark:border-slate-800 dark:hover:border-emerald-600 gap-1.5 transition-all text-left cursor-pointer group"
                >
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold shrink-0 group-hover:text-emerald-800 dark:group-hover:text-emerald-200">CyberTech:</span>
                  <code className="text-slate-800 dark:text-slate-200 font-semibold truncate">merchant@cybertech.com</code>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] shrink-0">Battlestations</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail("merchant@officepro.com");
                    setPassword("pact123456");
                    setIsLogin(true);
                    setError(null);
                    setSuccessMsg("Auto-filled OfficePro Merchant credentials!");
                  }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 dark:bg-slate-900/80 dark:hover:bg-emerald-950/40 border border-slate-200 hover:border-emerald-400 dark:border-slate-800 dark:hover:border-emerald-600 gap-1.5 transition-all text-left cursor-pointer group"
                >
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold shrink-0 group-hover:text-emerald-800 dark:group-hover:text-emerald-200">OfficePro:</span>
                  <code className="text-slate-800 dark:text-slate-200 font-semibold truncate">merchant@officepro.com</code>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] shrink-0">Enterprise AV</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail("merchant@nordicliving.com");
                    setPassword("pact123456");
                    setIsLogin(true);
                    setError(null);
                    setSuccessMsg("Auto-filled NordicLiving Merchant credentials!");
                  }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 dark:bg-slate-900/80 dark:hover:bg-emerald-950/40 border border-slate-200 hover:border-emerald-400 dark:border-slate-800 dark:hover:border-emerald-600 gap-1.5 transition-all text-left cursor-pointer group"
                >
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold shrink-0 group-hover:text-emerald-800 dark:group-hover:text-emerald-200">NordicLiving:</span>
                  <code className="text-slate-800 dark:text-slate-200 font-semibold truncate">merchant@nordicliving.com</code>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] shrink-0">Minimalist Wood</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </SpotlightCard>
    </div>
  </div>
</div>
);
}
