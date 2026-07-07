import React from "react";
import { UserSettings } from "../types";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { 
  Bell, 
  BellOff, 
  Clock, 
  CalendarDays, 
  Check, 
  LogOut, 
  User, 
  Sparkles,
  RefreshCw,
  Moon,
  Sun
} from "lucide-react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

interface SettingsScreenProps {
  settings: UserSettings;
  onSettingsChange: (newSettings: UserSettings) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLocalLogout?: () => void;
  isLocal?: boolean;
}

export default function SettingsScreen({ 
  settings, 
  onSettingsChange, 
  darkMode, 
  onToggleDarkMode,
  onLocalLogout,
  isLocal = false
}: SettingsScreenProps) {
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  // Form local state
  const [reminderTime, setReminderTime] = React.useState(settings.reminderTime);
  const [defaultExpiryFridge, setDefaultExpiryFridge] = React.useState(settings.defaultExpiryFridge);
  const [defaultExpiryFreezer, setDefaultExpiryFreezer] = React.useState(settings.defaultExpiryFreezer);
  const [defaultExpiryRoom, setDefaultExpiryRoom] = React.useState(settings.defaultExpiryRoom);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(settings.notificationsEnabled);

  React.useEffect(() => {
    setReminderTime(settings.reminderTime);
    setDefaultExpiryFridge(settings.defaultExpiryFridge);
    setDefaultExpiryFreezer(settings.defaultExpiryFreezer);
    setDefaultExpiryRoom(settings.defaultExpiryRoom);
    setNotificationsEnabled(settings.notificationsEnabled);
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    const uid = auth.currentUser ? auth.currentUser.uid : "local_guest";

    const updated: UserSettings = {
      userId: uid,
      reminderTime,
      defaultExpiryFridge: Number(defaultExpiryFridge),
      defaultExpiryFreezer: Number(defaultExpiryFreezer),
      defaultExpiryRoom: Number(defaultExpiryRoom),
      notificationsEnabled,
    };

    try {
      if (auth.currentUser) {
        await setDoc(doc(db, "users", auth.currentUser.uid, "settings", "general"), updated);
      } else {
        localStorage.setItem(`local_settings_${uid}`, JSON.stringify(updated));
      }
      onSettingsChange(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const currentUser = auth.currentUser;

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 font-sans text-zinc-900 dark:text-zinc-50">
      {/* Settings Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">偏好設定</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          個人化調整您的冰箱管理提醒與到期預設天數。
        </p>
      </div>

      {/* Account Card */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-5 mb-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 dark:text-zinc-400">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="font-semibold text-sm">
              {isLocal ? "本機獨立儲存帳號" : (currentUser?.isAnonymous ? "訪客體驗帳號" : "註冊會員帳號")}
            </div>
            <div className="text-xs text-zinc-400 truncate max-w-[180px] md:max-w-xs">
              {isLocal ? "安全儲存於您的本機瀏覽器" : (currentUser?.email || "隨機暫存 ID: " + currentUser?.uid.substring(0, 8))}
            </div>
          </div>
        </div>
        
        <button
          id="logout-btn"
          onClick={handleLogout}
          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-medium rounded-2xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          登出
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Appearance Settings */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-4">
            顯示外觀
          </h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
              <div>
                <div className="font-medium text-sm">深色模式 (Dark Mode)</div>
                <div className="text-xs text-zinc-400">切換白天與夜間的護眼顏色</div>
              </div>
            </div>
            <button
              id="dark-mode-toggle"
              type="button"
              onClick={onToggleDarkMode}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                darkMode ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-700"
              }`}
            >
              <div 
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all shadow-sm ${
                  darkMode ? "right-1" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Expiry Settings */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4" />
            保存期限預設 (天)
          </h2>
          <p className="text-xs text-zinc-400 mb-4">
            設定手動新增食材時，各保存位置對應的預設保存天數：
          </p>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-2xl border border-transparent focus-within:border-emerald-500/20 transition-all">
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 block mb-1">
                冷藏預設
              </span>
              <div className="flex items-center gap-1">
                <input
                  id="settings-expiry-fridge"
                  type="number"
                  min="1"
                  required
                  value={defaultExpiryFridge}
                  onChange={(e) => setDefaultExpiryFridge(Number(e.target.value))}
                  className="w-full bg-transparent font-semibold text-sm focus:outline-none"
                />
                <span className="text-xs text-zinc-400">天</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-2xl border border-transparent focus-within:border-emerald-500/20 transition-all">
              <span className="text-[10px] font-medium text-cyan-600 dark:text-cyan-400 block mb-1">
                冷凍預設
              </span>
              <div className="flex items-center gap-1">
                <input
                  id="settings-expiry-freezer"
                  type="number"
                  min="1"
                  required
                  value={defaultExpiryFreezer}
                  onChange={(e) => setDefaultExpiryFreezer(Number(e.target.value))}
                  className="w-full bg-transparent font-semibold text-sm focus:outline-none"
                />
                <span className="text-xs text-zinc-400">天</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-2xl border border-transparent focus-within:border-emerald-500/20 transition-all">
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 block mb-1">
                室溫預設
              </span>
              <div className="flex items-center gap-1">
                <input
                  id="settings-expiry-room"
                  type="number"
                  min="1"
                  required
                  value={defaultExpiryRoom}
                  onChange={(e) => setDefaultExpiryRoom(Number(e.target.value))}
                  className="w-full bg-transparent font-semibold text-sm focus:outline-none"
                />
                <span className="text-xs text-zinc-400">天</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
          <h2 className="text-sm font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <Bell className="w-4 h-4" />
            AI 提醒與通知
          </h2>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </div>
              <div>
                <div className="font-medium text-sm">每日即期提醒</div>
                <div className="text-xs text-zinc-400">若有即期食材，系統每日於指定時間提醒</div>
              </div>
            </div>
            <button
              id="notifications-toggle"
              type="button"
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                notificationsEnabled ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-700"
              }`}
            >
              <div 
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all shadow-sm ${
                  notificationsEnabled ? "right-1" : "left-1"
                }`}
              />
            </button>
          </div>

          {notificationsEnabled && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium text-sm">提醒時間</div>
                  <div className="text-xs text-zinc-400">發送小叮嚀的時間</div>
                </div>
              </div>
              <input
                id="settings-reminder-time"
                type="time"
                required
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 rounded-xl text-sm font-semibold focus:outline-none focus:border-emerald-500 transition-all text-center"
              />
            </div>
          )}
        </div>

        {/* Submit Section */}
        <div className="flex items-center gap-3 pt-2">
          <button
            id="settings-save-btn"
            type="submit"
            disabled={saving}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-350 text-white font-medium py-3 px-4 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 transition-all cursor-pointer"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : success ? (
              <>
                <Check className="w-4 h-4" />
                設定已儲存
              </>
            ) : (
              "儲存設定"
            )}
          </button>
        </div>
      </form>

      {/* Custom Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 text-zinc-900 dark:text-zinc-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-2xl flex items-center justify-center mb-4">
                <LogOut className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-2">確定要登出系統嗎？</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
                {isLocal 
                  ? "登出後，本機的食材與設定依然會保留在瀏覽器中，您可以隨時再次登入存取。" 
                  : "登出後，您需要重新輸入帳號密碼才能存取您的雲端冰箱資料。"}
              </p>
              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-2xl text-xs transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowLogoutConfirm(false);
                    if (isLocal) {
                      if (onLocalLogout) {
                        onLocalLogout();
                      }
                    } else {
                      try {
                        await signOut(auth);
                      } catch (err) {
                        console.error("Error signing out:", err);
                      }
                    }
                  }}
                  className="flex-1 py-2.5 px-4 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-2xl text-xs transition-colors cursor-pointer shadow-lg shadow-rose-500/10"
                >
                  確定登出
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
