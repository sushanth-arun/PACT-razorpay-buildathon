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

interface DemoAccount {
  id: string;
  name: string;
  email: string;
  category: string;
  role: "BUYER" | "MERCHANT";
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { id: "buyer", name: "AI Buyer", email: "buyer@pact.ai", category: "Autonomous Buyer", role: "BUYER" },
  { id: "ergospace", name: "ErgoSpace", email: "merchant@ergospace.com", category: "Seating & Desks", role: "MERCHANT" },
  { id: "deskforge", name: "DeskForge", email: "merchant@deskforge.com", category: "Motorized Desks", role: "MERCHANT" },
  { id: "cybertech", name: "CyberTech", email: "merchant@cybertech.com", category: "Battlestations", role: "MERCHANT" },
  { id: "officepro", name: "OfficePro", email: "merchant@officepro.com", category: "Enterprise AV", role: "MERCHANT" },
  { id: "nordicliving", name: "NordicLiving", email: "merchant@nordicliving.com", category: "Minimalist Wood", role: "MERCHANT" },
];

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

  const handleSelectDemoAccount = (acc: DemoAccount) => {
    setEmail(acc.email);
    setPassword("pact123456");
    setIsLogin(true);
    setIsForgotPassword(false);
    setError(null);
    setSuccessMsg(`Auto-filled ${acc.name} credentials!`);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* React Bits Aurora Ambient Background (Only on Auth Page) */}
      <Aurora
        colorStops={["rgba(37, 99, 235, 0.4)", "rgba(147, 51, 234, 0.35)", "rgba(6, 182, 212, 0.35)", "rgba(236, 72, 153, 0.25)"]}
        speed={0.8}
      />

      <div className="w-full max-w-5xl relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Half: 3D DepthText PACT */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center text-center p-2 sm:p-4">
          <div className="overflow-visible py-2 sm:py-4">
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
              fontSize="clamp(5rem, 15vw, 9.5rem)"
              fontWeight={900}
              shadow
            />
          </div>
        </div>

        {/* Right Half: Auth Card */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <SpotlightCard
            spotlightColor="rgba(124, 58, 237, 0.22)"
            className="bg-slate-950/95 border border-slate-800/90 p-0 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            <div className="p-6 sm:p-7 space-y-4">
              {/* Tab Switcher Slider: SIGN IN / CREATE ACCOUNT */}
              <div className="flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-800 font-sans text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setIsForgotPassword(false);
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                    isLogin && !isForgotPassword
                      ? "bg-purple-600 text-white font-bold shadow-md shadow-purple-950/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    setIsForgotPassword(false);
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                    !isLogin && !isForgotPassword
                      ? "bg-purple-600 text-white font-bold shadow-md shadow-purple-950/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Authentication Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Role Selector on Signup */}
                {!isLogin && !isForgotPassword && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider block">
                      Select Your Role
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setRole("BUYER")}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all text-left flex flex-col gap-0.5 ${
                          role === "BUYER"
                            ? "bg-cyan-950/70 border-cyan-500 text-white shadow-md shadow-cyan-950/50"
                            : "bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs text-cyan-400">
                          <Bot className="w-3.5 h-3.5" />
                          <span>AI Buyer</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-tight">
                          Autonomous Buyer
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRole("MERCHANT_ADMIN")}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all text-left flex flex-col gap-0.5 ${
                          role === "MERCHANT_ADMIN"
                            ? "bg-emerald-950/70 border-emerald-500 text-white shadow-md shadow-emerald-950/50"
                            : "bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-400">
                          <Store className="w-3.5 h-3.5" />
                          <span>Merchant</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-tight">
                          Store Admin
                        </p>
                      </button>
                    </div>
                  </div>
                )}

                {/* Display Name on Signup */}
                {!isLogin && !isForgotPassword && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-200 uppercase tracking-wide">
                      Your Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. Sushanth Arun"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-100 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                      />
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>
                )}

                {/* Merchant Store Fields */}
                {!isLogin && !isForgotPassword && role === "MERCHANT_ADMIN" && (
                  <div className="space-y-2.5 p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40">
                    <div className="space-y-1">
                      <label className="text-[11px] text-emerald-300 uppercase font-semibold">
                        Merchant Store Name *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="e.g. ErgoTech Works"
                          value={merchantName}
                          onChange={(e) => setMerchantName(e.target.value)}
                          required
                          className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-900 border border-emerald-700/60 text-slate-100 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                        <Store className="w-4 h-4 text-emerald-400 absolute left-3 top-2.5" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-200 uppercase font-semibold">
                        Store Description
                      </label>
                      <textarea
                        rows={2}
                        placeholder="High-performance ergonomic furniture..."
                        value={merchantDescription}
                        onChange={(e) => setMerchantDescription(e.target.value)}
                        className="w-full p-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 placeholder:text-slate-400 text-xs focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Email Address */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-200 uppercase tracking-wide">
                    Email Address *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-100 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors font-sans"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-200 uppercase tracking-wide">
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
                        className="text-[11px] font-medium text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                      >
                        {isForgotPassword ? "← Back to Sign In" : "Forgot Password?"}
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
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-100 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors font-sans"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  )}
                </div>

                {/* Confirm Password on Signup */}
                {!isLogin && !isForgotPassword && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-200 uppercase tracking-wide">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-100 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors font-sans"
                      />
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>
                )}

                {/* Feedback messages */}
                {error && (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-700/80 text-rose-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{error}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-700/80 text-emerald-200 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Submit CTA */}
                <div className="pt-1">
                  <Magnet strength={5} className="w-full">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:via-indigo-500 hover:to-blue-500 text-white font-sans text-xs sm:text-sm font-bold transition-all shadow-lg shadow-purple-950/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 tracking-wide"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : isForgotPassword ? (
                        <>
                          <span>Send Reset Link</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      ) : isLogin ? (
                        <>
                          <span>Sign In to PACT</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          <span>Create {role === "BUYER" ? "AI Buyer" : "Merchant"} Account</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </Magnet>
                </div>
              </form>

              {/* Pre-Seeded Demo Accounts: Compact 2-Column Grid */}
              {isLogin && !isForgotPassword && (
                <div className="pt-3.5 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wider">
                    <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                      <span>DEMO ACCOUNTS (CLICK TO FILL)</span>
                    </div>
                    <span className="text-slate-300 font-semibold font-mono text-[10px]">PW: pact123456</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {DEMO_ACCOUNTS.map((acc) => {
                      const isBuyer = acc.role === "BUYER";
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => handleSelectDemoAccount(acc)}
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer group flex flex-col justify-between gap-1 ${
                            isBuyer
                              ? "bg-slate-900/80 hover:bg-cyan-950/40 border-slate-800 hover:border-cyan-500/70"
                              : "bg-slate-900/80 hover:bg-emerald-950/40 border-slate-800 hover:border-emerald-500/70"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs font-bold truncate ${
                              isBuyer ? "text-cyan-300 group-hover:text-cyan-200" : "text-emerald-300 group-hover:text-emerald-200"
                            }`}>
                              {acc.name}
                            </span>
                            <span className="text-[10px] text-slate-300 font-medium shrink-0 bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700/60">
                              {acc.category}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-300 group-hover:text-slate-100 truncate font-mono">
                            {acc.email}
                          </span>
                        </button>
                      );
                    })}
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

