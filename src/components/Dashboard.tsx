import React, { useState, useEffect } from "react";
import { Ingredient, UserSettings } from "../types";
import { 
  Sparkles, 
  AlertTriangle,
  Refrigerator,
  IceCream,
  Home,
  ChevronRight,
  Info,
  Lightbulb,
  CheckCircle2,
  Calendar,
  X,
  Play
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DashboardProps {
  ingredients: Ingredient[];
  onUpdateIngredient: (id: string, updates: Partial<Ingredient>) => Promise<void>;
  onDeleteIngredient: (id: string) => Promise<void>;
  settings: UserSettings;
}

export default function Dashboard({
  ingredients,
  onUpdateIngredient,
  onDeleteIngredient,
  settings
}: DashboardProps) {

  // Butler Advice states
  const [advice, setAdvice] = useState<string>("");
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [showAdvice, setShowAdvice] = useState(() => localStorage.getItem("show_fridge_advice") !== "false");

  // Calculate days left for any ISO date string
  const getDaysLeft = (expiryDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // 1. Calculate Statistics
  const fridgeCount = ingredients.filter(i => i.category === "fridge").length;
  const freezerCount = ingredients.filter(i => i.category === "freezer").length;
  const roomCount = ingredients.filter(i => i.category === "room").length;

  // Expiring items (days left <= 3)
  const expiringItems = ingredients.filter(i => getDaysLeft(i.expiryDate) <= 3);
  // Strictly expiring today or expired (days left <= 0)
  const strictlyExpiringToday = ingredients.filter(i => getDaysLeft(i.expiryDate) <= 0);
  // Expiring soon (days left > 0 && days left <= 3)
  const expiringSoon = ingredients.filter(i => {
    const d = getDaysLeft(i.expiryDate);
    return d > 0 && d <= 3;
  });

  // 2. Load Butler Advice from backend
  const fetchAdvice = async (force: boolean = false) => {
    // Check session cache to save API usage if not forced
    const cached = sessionStorage.getItem("fridge_butler_advice");
    if (cached && !force) {
      setAdvice(cached);
      return;
    }

    setAdviceLoading(true);
    try {
      const simplifiedItems = ingredients.map(i => ({
        name: i.name,
        quantity: i.quantity,
        category: i.category,
        daysLeft: getDaysLeft(i.expiryDate),
        notes: i.notes
      }));

      const res = await fetch("/api/fridge-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: simplifiedItems })
      });
      const data = await res.json();
      if (data.success && data.advice) {
        setAdvice(data.advice);
        sessionStorage.setItem("fridge_butler_advice", data.advice);
      } else {
        setAdvice("哈囉！今天又是美好的一天。記得多留意保存期限較短的食材，提早享用最美味！🥬✨");
      }
    } catch (e) {
      console.error(e);
      setAdvice("哈囉！今天又是美好的一天。記得多留意保存期限較短的食材，提早享用最美味！🥬✨");
    } finally {
      setAdviceLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvice();
  }, [ingredients.length]); // regenerate when ingredient count changes

  // 3. AI Alerts: daily alerts for expiring items
  // Let's filter ingredients that have 0 or 1 days left (or are expired) for the Alert panel
  const alertItems = ingredients.filter(i => {
    const days = getDaysLeft(i.expiryDate);
    return days <= 1; // today, expired, or tomorrow
  });

  // Quick Action: Eat Today (今天吃掉)
  const handleEatToday = async (item: Ingredient) => {
    try {
      if (item.quantity <= 1) {
        await onDeleteIngredient(item.id);
      } else {
        await onUpdateIngredient(item.id, { quantity: item.quantity - 1 });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Quick Action: Extend One Day (延長一天)
  const handleExtendOneDay = async (item: Ingredient) => {
    try {
      const currentExpiry = new Date(item.expiryDate);
      currentExpiry.setDate(currentExpiry.getDate() + 1);
      const newExpiryStr = currentExpiry.toISOString().split("T")[0];
      await onUpdateIngredient(item.id, { expiryDate: newExpiryStr });
    } catch (e) {
      console.error(e);
    }
  };

  // Quick Action: Discarded (已丟棄)
  const handleDiscard = async (item: Ingredient) => {
    if (window.confirm(`確定要將已過期的「${item.name}」標記為丟棄嗎？`)) {
      try {
        await onDeleteIngredient(item.id);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pb-24 font-sans text-zinc-900 dark:text-zinc-50">
      
      {/* 1. Dashboard Grid Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        
        {/* Total stats */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
            目前食材
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-black">{ingredients.length}</span>
            <span className="text-xs text-zinc-400">項</span>
          </div>
          <div className="absolute right-3 bottom-3 text-emerald-500/10">
            <Refrigerator className="w-12 h-12" />
          </div>
        </div>

        {/* Fridge items */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            冷藏庫
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-black">{fridgeCount}</span>
            <span className="text-xs text-zinc-400">項</span>
          </div>
        </div>

        {/* Freezer items */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
            冷凍庫
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-black">{freezerCount}</span>
            <span className="text-xs text-zinc-400">項</span>
          </div>
        </div>

        {/* Room items */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            室溫
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-black">{roomCount}</span>
            <span className="text-xs text-zinc-400">項</span>
          </div>
        </div>
      </div>

      {/* 2. Urgent Expiring alerts (Apple Reminder style) */}
      <div className="space-y-6">
        
        {/* AI Reminder Banner */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-rose-55 dark:bg-rose-950/30 rounded-xl text-rose-500 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="font-bold text-sm tracking-tight">快過期啦！</h2>
                <p className="text-[10px] text-zinc-400">提醒時間：每日 {settings.reminderTime}</p>
              </div>
            </div>
            {alertItems.length > 0 && (
              <span className="text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full animate-bounce">
                {alertItems.length} 個即期項目
              </span>
            )}
          </div>

          {alertItems.length === 0 ? (
            <div className="py-4 text-center text-xs text-zinc-400 flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              <span>今日沒有快過期的食材，太棒了！🥦</span>
            </div>
          ) : (
            <div className="space-y-3.5">
              <AnimatePresence mode="popLayout">
                {alertItems.map((item) => {
                  const daysLeft = getDaysLeft(item.expiryDate);
                  const isExpired = daysLeft < 0;
                  const isToday = daysLeft === 0;

                  return (
                    <motion.div
                      id={`alert-item-${item.id}`}
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="p-3 bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-800 dark:text-zinc-150">{item.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold rounded-md">
                            {isExpired ? `已過期 ${Math.abs(daysLeft)} 天` : isToday ? "今天到期" : "明天到期"}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-1">
                          數量: {item.quantity} · 保存於: {item.category === "fridge" ? "冷藏" : item.category === "freezer" ? "冷凍" : "室溫"}
                        </div>
                      </div>

                      {/* iPhone quick actions */}
                      <div className="flex gap-2 self-end sm:self-center">
                        <button
                          id={`alert-eat-btn-${item.id}`}
                          onClick={() => handleEatToday(item)}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl text-[11px] transition-all cursor-pointer shadow-sm shadow-emerald-500/10"
                        >
                          今天吃掉
                        </button>
                        <button
                          id={`alert-extend-btn-${item.id}`}
                          onClick={() => handleExtendOneDay(item)}
                          className="px-3 py-1.5 bg-white hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-semibold rounded-xl text-[11px] transition-all cursor-pointer"
                        >
                          延長一天
                        </button>
                        <button
                          id={`alert-discard-btn-${item.id}`}
                          onClick={() => handleDiscard(item)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold rounded-xl text-[11px] transition-all cursor-pointer"
                        >
                          已丟棄
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Refrigerator Butler AI Advice */}
        {showAdvice ? (
          <div className="bg-gradient-to-tr from-emerald-500/5 via-teal-500/5 to-cyan-500/5 dark:from-emerald-950/20 dark:via-teal-950/15 dark:to-cyan-950/10 border border-emerald-100/50 dark:border-emerald-900/10 rounded-3xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 dark:bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-500/10">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
                <h2 className="font-bold text-sm tracking-tight">AI 冰箱管家叮嚀</h2>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  id="refresh-advice-btn"
                  onClick={() => fetchAdvice(true)}
                  disabled={adviceLoading}
                  className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold flex items-center gap-1 cursor-pointer mr-1"
                >
                  {adviceLoading ? (
                    <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : "重新整理建議"}
                </button>
                <button
                  id="dismiss-advice-btn"
                  onClick={() => {
                    setShowAdvice(false);
                    localStorage.setItem("show_fridge_advice", "false");
                  }}
                  className="p-1 text-zinc-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                  title="隱藏此建議"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative z-10 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium bg-white/40 dark:bg-zinc-900/30 p-3.5 rounded-2xl border border-white/50 dark:border-zinc-800/30">
              {adviceLoading ? (
                <div className="py-4 text-center text-zinc-400 flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span>AI 管家正在幫您巡視冰箱、構思食譜...</span>
                </div>
              ) : (
                advice || "點擊上方重新整理建議，讓 AI 管家為您的冰箱規劃美味方案！🍳"
              )}
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              id="restore-advice-btn"
              onClick={() => {
                setShowAdvice(true);
                localStorage.setItem("show_fridge_advice", "true");
              }}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 font-bold flex items-center gap-1.5 bg-white dark:bg-zinc-900 px-3 py-2 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              顯示 AI 冰箱管家叮嚀
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
