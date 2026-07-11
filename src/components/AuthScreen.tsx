import React, { useState } from "react";
import { 
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { auth } from "../firebase";
import { motion } from "motion/react";
import { 
  Refrigerator, 
  Sparkles, 
  AlertCircle, 
  ArrowRight,
  Monitor
} from "lucide-react";

interface AuthScreenProps {
  onLocalLogin: (localUser: { uid: string; email: string; isAnonymous: boolean }) => void;
}

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function AuthScreen({ onLocalLogin }: AuthScreenProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/popup-blocked") {
        setError("登入視窗被瀏覽器封鎖，請允許本網域的快顯視窗後重試。");
      } else if (err.code === "auth/popup-closed-by-user") {
        setError("登入視窗已被關閉。");
      } else if (err.code === "auth/operation-not-allowed") {
        setError("Firebase 控制台尚未啟用 Google 登入方式。請在 Firebase 啟用 Google Provider。");
      } else {
        setError("Google 登入失敗: " + err.message + "。建議點擊下方「快速體驗」直接免設定開始！");
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

        {/* Main Action Buttons */}
        <div className="space-y-3.5 relative z-10 mb-6">
          {/* Google Sign In (Primary / Bind Google option) */}
          <button
            id="auth-google-btn"
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 px-4 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 font-semibold rounded-2xl text-sm flex items-center justify-center gap-3 transition-all cursor-pointer border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            使用 Google 帳號登入 / 註冊
          </button>

          {/* Guest / Quick Experience (快速體驗) */}
          <button
            id="auth-anon-btn"
            type="button"
            onClick={handleAnonymousLogin}
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-2xl text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25"
          >
            <Sparkles className="w-4 h-4 text-emerald-100" />
            快速體驗 (免註冊試用)
            <ArrowRight className="w-4 h-4 ml-0.5 text-emerald-100" />
          </button>
        </div>

        <div className="mt-6 relative z-10">
          {/* Backup offline mode button */}
          <button
            id="auth-local-fallback-btn"
            type="button"
            onClick={handleManualLocalLogin}
            className="w-full py-3 bg-blue-50/50 dark:bg-blue-950/10 hover:bg-blue-100/40 dark:hover:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-semibold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-blue-100/30 dark:border-blue-900/10 shadow-sm"
          >
            <Monitor className="w-3.5 h-3.5" />
            💻 極速本機獨立儲存模式 (免連網/免帳號)
          </button>
        </div>
      </motion.div>
    </div>
  );
}
