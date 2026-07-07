import React, { useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously 
} from "firebase/auth";
import { auth } from "../firebase";
import { motion } from "motion/react";
import { Refrigerator, Mail, Lock, LogIn, UserPlus, Sparkles, AlertCircle, ArrowRight } from "lucide-react";

interface AuthScreenProps {
  onLocalLogin: (localUser: { uid: string; email: string; isAnonymous: boolean }) => void;
}

export default function AuthScreen({ onLocalLogin }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLocalFallbackBtn, setShowLocalFallbackBtn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("請填寫所有欄位");
      return;
    }
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      setShowLocalFallbackBtn(true);
      if (err.code === "auth/email-already-in-use") {
        setError("此 Email 已被註冊。");
      } else if (err.code === "auth/weak-password") {
        setError("密碼強度不足，至少需要 6 個字元。");
      } else if (err.code === "auth/invalid-email") {
        setError("請輸入正確格式的 Email。");
      } else if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("帳號或密碼錯誤。");
      } else if (err.code === "auth/operation-not-allowed") {
        setError("Firebase 控制台尚未啟用此登入方式。您可以點擊下方「切換為本機極速體驗」直接免設定開始使用！");
      } else {
        setError("Firebase 登入失敗: " + err.message + "。建議切換為下方「本機極速體驗」直接使用！");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      console.warn("Firebase Auth is disabled or unconfigured, falling back transparently to browser local sandbox mode:", err);
      // Fallback transparently
      const fallbackUser = { uid: "local_guest", email: "guest@local.fridge", isAnonymous: true };
      onLocalLogin(fallbackUser);
    } finally {
      setLoading(false);
    }
  };

  const handleManualLocalLogin = () => {
    const fallbackUser = { uid: "local_guest", email: "guest@local.fridge", isAnonymous: true };
    onLocalLogin(fallbackUser);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col justify-center items-center p-4 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-xl shadow-slate-100 dark:shadow-none border border-slate-100 dark:border-zinc-800 p-8 relative overflow-hidden"
      >
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/40 dark:bg-emerald-950/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-100/40 dark:bg-blue-950/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8 relative z-10">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            <Refrigerator className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 font-sans">
            AI 智慧冰箱管家
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-xs">
            專屬個人化食材管理助手。
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl flex items-start gap-3 text-sm"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 ml-1">
              電子郵件 Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none">
                <Mail className="w-4 h-4" />
              </span>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-150 dark:border-zinc-800 text-zinc-850 dark:text-zinc-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1 ml-1">
              密碼 Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="auth-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入密碼 (6位數以上)"
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-150 dark:border-zinc-800 text-zinc-850 dark:text-zinc-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-350 text-white font-medium py-3 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                註冊並登入
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                登入系統
              </>
            )}
          </button>
        </form>

        <div className="relative my-6 text-center z-10">
          <div className="absolute inset-y-1/2 left-0 right-0 border-t border-zinc-100 dark:border-zinc-800 -z-10" />
          <span className="bg-white dark:bg-zinc-900 px-3 text-xs text-zinc-400">或</span>
        </div>

        <div className="space-y-3 relative z-10">
          <button
            id="auth-anon-btn"
            type="button"
            onClick={handleAnonymousLogin}
            disabled={loading}
            className="w-full py-3 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-semibold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            快速體驗 (免註冊試用)
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            id="auth-local-fallback-btn"
            type="button"
            onClick={handleManualLocalLogin}
            className="w-full py-3 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-semibold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border border-blue-100/40 dark:border-blue-900/20"
          >
            🚀 本機獨立儲存模式 (極速/免連網)
          </button>

          <button
            id="auth-toggle-mode-btn"
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-center text-xs text-zinc-500 hover:text-emerald-500 transition-colors"
          >
            {isSignUp ? "已經有帳號了？ 立即登入" : "還沒有帳號？ 立即註冊帳號"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
