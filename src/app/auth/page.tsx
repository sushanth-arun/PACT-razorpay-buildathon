"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import SpotlightCard from "@/components/SpotlightCard";
import { Magnet } from "@/components/Magnet";
import { 
  Bot, 
  Store, 
  Lock, 
  Mail, 
  User as UserIcon, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Cpu,
  KeyRound
} from "lucide-react";
import { UserRole } from "@/types";

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
      {/* Subtle radial ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        <SpotlightCard
          spotlightColor="rgba(59, 130, 246, 0.25)"
          className="bg-slate-950/95 border border-slate-800 p-0 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl"
        >
          <div className="p-6 sm:p-7 space-y-5">
            {/* Embedded PACT Logo & Badge */}
            <div className="flex items-center justify-center gap-2.5 pb-1">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-950">
                <Cpu className="w-4.5 h-4.5" />
              </div>
              <span className="font-mono font-black text-xl tracking-wider text-white">PACT</span>
            </div>
            {/* Tab Switcher */}
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
                    ? "bg-blue-600 text-white shadow-md shadow-blue-950"
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
                    ? "bg-blue-600 text-white shadow-md shadow-blue-950"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                CREATE ACCOUNT
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role Selector on Signup */}
              {!isLogin && !isForgotPassword && (
                <div className="space-y-2">
                  <label className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    SELECT YOUR ROLE
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
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
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Discover & negotiate deals
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
                      <p className="text-[10px] text-slate-400 leading-tight">
                        Store catalog & policies
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* Display Name on Signup */}
              {!isLogin && !isForgotPassword && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-slate-400 uppercase">
                    Your Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. Sushanth Arun"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  </div>
                </div>
              )}

              {/* Merchant Store Fields */}
              {!isLogin && !isForgotPassword && role === "MERCHANT_ADMIN" && (
                <div className="space-y-3 p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-emerald-400 uppercase font-bold">
                      Merchant Store Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. ErgoTech Works"
                        value={merchantName}
                        onChange={(e) => setMerchantName(e.target.value)}
                        required
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-emerald-800/60 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                      <Store className="w-4 h-4 text-emerald-500 absolute left-3 top-3" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-slate-400 uppercase">
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
                <label className="text-[11px] font-mono text-slate-400 uppercase">
                  Email Address *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                </div>
              </div>

              {/* Password Fields */}
              {!isForgotPassword && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono text-slate-400 uppercase">
                      Password *
                    </label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setError(null);
                          setSuccessMsg(null);
                        }}
                        className="text-[11px] font-mono text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-colors font-mono"
                    />
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  </div>
                </div>
              )}

              {/* Confirm Password on Signup */}
              {!isLogin && !isForgotPassword && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-slate-400 uppercase">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-colors font-mono"
                    />
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  </div>
                </div>
              )}

              {/* Feedback messages */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Submit CTA */}
              <div className="pt-2">
                <Magnet strength={6} className="w-full">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-mono text-xs font-bold transition-all shadow-xl shadow-blue-950/60 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>PROCESSING...</span>
                      </>
                    ) : isForgotPassword ? (
                      <>
                        <span>SEND RESET LINK</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    ) : isLogin ? (
                      <>
                        <span>SIGN IN TO PACT</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        <span>CREATE {role} ACCOUNT</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </Magnet>
              </div>

              {isForgotPassword && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setIsLogin(true);
                    }}
                    className="text-xs font-mono text-slate-400 hover:text-slate-200"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              )}
            </form>

            {/* Quick Demo Credentials Footer */}
            <div className="pt-4 border-t border-slate-800/80 font-mono text-[11px] text-slate-400 space-y-2">
              <div className="flex items-center justify-between text-[10px] tracking-wider uppercase">
                <div className="flex items-center gap-1 text-blue-400 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>PRE-SEEDED DEMO ACCOUNTS</span>
                </div>
                <span className="text-slate-500 font-bold">PASSWORD: pact123456</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 text-[10px]">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-300 font-bold">AI Buyer:</span>
                  <code className="text-blue-300">buyer@pact.ai</code>
                  <span className="text-slate-500">Global Buyer</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-emerald-300 font-bold">ErgoSpace:</span>
                  <code className="text-slate-300">merchant@ergospace.com</code>
                  <span className="text-slate-500">Seating & Desks</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-emerald-300 font-bold">DeskForge:</span>
                  <code className="text-slate-300">merchant@deskforge.com</code>
                  <span className="text-slate-500">Motorized Desks</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-emerald-300 font-bold">CyberTech:</span>
                  <code className="text-slate-300">merchant@cybertech.com</code>
                  <span className="text-slate-500">Dev Battlestations</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-emerald-300 font-bold">OfficePro:</span>
                  <code className="text-slate-300">merchant@officepro.com</code>
                  <span className="text-slate-500">Enterprise AV</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-emerald-300 font-bold">NordicLiving:</span>
                  <code className="text-slate-300">merchant@nordicliving.com</code>
                  <span className="text-slate-500">Minimalist Wood</span>
                </div>
              </div>
            </div>
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
}
