import React, { useState } from "react";
import { Ingredient, UserSettings } from "../types";
import { 
  Search, 
  Calendar, 
  Plus, 
  Minus, 
  Trash2, 
  Info, 
  CalendarDays, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Tag,
  Save,
  CheckCircle,
  Clock,
  Archive,
  Eye,
  Filter,
  ShoppingCart,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface RefrigeratorViewProps {
  ingredients: Ingredient[];
  onUpdateIngredient: (id: string, updates: Partial<Ingredient>) => Promise<void>;
  onDeleteIngredient: (id: string) => Promise<void>;
  onAddShoppingItem: (name: string) => Promise<void>;
  settings: UserSettings;
}

export default function RefrigeratorView({
  ingredients,
  onUpdateIngredient,
  onDeleteIngredient,
  onAddShoppingItem,
  settings
}: RefrigeratorViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterExpiring, setFilterExpiring] = useState(false);
  const [activeCategory, setActiveCategory] = useState<"fridge" | "freezer" | "room">("fridge");
  
  // Track which card is currently expanded for quick editing
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Expanded fields edit states
  const [editName, setEditName] = useState("");
  const [editExpiry, setEditExpiry] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editCategory, setEditCategory] = useState<"fridge" | "freezer" | "room">("fridge");
  const [savingId, setSavingId] = useState<string | null>(null);

  // Shopping cart micro-feedback state
  const [addedMap, setAddedMap] = useState<Record<string, boolean>>({});

  // Helper: calculate days remaining from today
  const getDaysLeft = (expiryDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Helper: get color tag class based on days left
  const getExpiryStyle = (daysLeft: number) => {
    if (daysLeft <= 0) {
      return {
        bg: "bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30",
        text: "text-rose-600 dark:text-rose-400",
        badge: "bg-rose-500 text-white",
        dot: "bg-rose-500",
        cardGlow: "shadow-rose-100 dark:shadow-none"
      };
    } else if (daysLeft < 3) {
      return {
        bg: "bg-amber-50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/30",
        text: "text-amber-600 dark:text-amber-400",
        badge: "bg-amber-500 text-white",
        dot: "bg-amber-500",
        cardGlow: "shadow-amber-100 dark:shadow-none"
      };
    } else {
      return {
        bg: "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-100/30 dark:border-emerald-900/10",
        text: "text-emerald-600 dark:text-emerald-400",
        badge: "bg-emerald-500 text-white",
        dot: "bg-emerald-500",
        cardGlow: "shadow-emerald-50/20 dark:shadow-none"
      };
    }
  };

  const handleToggleExpand = (item: Ingredient) => {
    if (expandedId === item.id) {
      setExpandedId(null);
    } else {
      setExpandedId(item.id);
      setEditName(item.name);
      setEditExpiry(item.expiryDate);
      setEditNotes(item.notes);
      setEditCategory(item.category);
    }
  };

  const handleSaveEdit = async (id: string) => {
    setSavingId(id);
    try {
      await onUpdateIngredient(id, {
        name: editName.trim(),
        expiryDate: editExpiry,
        notes: editNotes.trim(),
        category: editCategory
      });
      setExpandedId(null);
    } catch (e) {
      console.error("Error updating ingredient:", e);
    } finally {
      setSavingId(null);
    }
  };

  const handleAddToCart = async (e: React.MouseEvent, item: Ingredient) => {
    e.stopPropagation();
    try {
      await onAddShoppingItem(item.name);
      setAddedMap((prev) => ({ ...prev, [item.id]: true }));
      setTimeout(() => {
        setAddedMap((prev) => ({ ...prev, [item.id]: false }));
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleQtyAdjust = async (item: Ingredient, change: number) => {
    const newQty = item.quantity + change;
    if (newQty <= 0) {
      if (window.confirm(`確定要移除「${item.name}」嗎？`)) {
        await onDeleteIngredient(item.id);
      }
    } else {
      await onUpdateIngredient(item.id, { quantity: newQty });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`確定要刪除「${name}」嗎？`)) {
      await onDeleteIngredient(id);
    }
  };

  // Filter and Search ingredients
  const filteredIngredients = ingredients.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const daysLeft = getDaysLeft(item.expiryDate);
    const matchesExpiring = filterExpiring ? daysLeft <= 3 : true;
    const matchesCategory = item.category === activeCategory;

    return matchesSearch && matchesExpiring && matchesCategory;
  });

  return (
    <div className="max-w-3xl mx-auto px-4 pb-24 font-sans text-zinc-900 dark:text-zinc-50">
      
      {/* Search and Filters bar */}
      <div className="space-y-3 mb-5">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            id="fridge-search-input"
            type="text"
            placeholder="搜尋食材名稱..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 text-zinc-850 dark:text-zinc-100 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium shadow-sm"
          />
        </div>

        {/* Filter Chip Button */}
        <div className="flex items-center gap-2">
          <button
            id="toggle-filter-expiring-btn"
            onClick={() => setFilterExpiring(!filterExpiring)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              filterExpiring 
                ? "bg-rose-500 border-rose-500 text-white shadow-sm" 
                : "bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-slate-50"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            只看快過期食材 (少於 3 天)
          </button>
        </div>
      </div>

      {/* Apple segmented tab bar for categories */}
      <div className="bg-zinc-200/60 dark:bg-zinc-950/60 p-1 rounded-2xl flex text-xs font-bold mb-5 shadow-inner">
        <button
          id="category-fridge-btn"
          onClick={() => { setActiveCategory("fridge"); setExpandedId(null); }}
          className={`flex-1 py-2.5 text-center rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeCategory === "fridge" 
              ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm" 
              : "text-zinc-500 dark:text-zinc-400"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          冷藏庫 ({ingredients.filter(i => i.category === "fridge").length})
        </button>
        
        <button
          id="category-freezer-btn"
          onClick={() => { setActiveCategory("freezer"); setExpandedId(null); }}
          className={`flex-1 py-2.5 text-center rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeCategory === "freezer" 
              ? "bg-white dark:bg-zinc-800 text-cyan-600 dark:text-cyan-400 shadow-sm" 
              : "text-zinc-500 dark:text-zinc-400"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
          冷凍庫 ({ingredients.filter(i => i.category === "freezer").length})
        </button>

        <button
          id="category-room-btn"
          onClick={() => { setActiveCategory("room"); setExpandedId(null); }}
          className={`flex-1 py-2.5 text-center rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeCategory === "room" 
              ? "bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-sm" 
              : "text-zinc-500 dark:text-zinc-400"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          室溫 ({ingredients.filter(i => i.category === "room").length})
        </button>
      </div>

      {/* Grid of Food cards */}
      {filteredIngredients.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-12 text-center text-zinc-400 flex flex-col items-center justify-center gap-3">
          <Archive className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
          <div className="text-sm font-semibold text-zinc-500">這個區域沒有對應的食材</div>
          <p className="text-xs max-w-xs text-zinc-400">
            {searchQuery || filterExpiring 
              ? "嘗試調整您的搜尋關鍵字或清除過期篩選條件。" 
              : "點選下方「＋」按鈕，立即加入新鮮食材或辨識發票吧！"}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredIngredients.map((item) => {
            const daysLeft = getDaysLeft(item.expiryDate);
            const style = getExpiryStyle(daysLeft);
            const isExpanded = expandedId === item.id;

            return (
              <div 
                id={`ingredient-card-${item.id}`}
                key={item.id}
                className={`bg-white dark:bg-zinc-900 border border-slate-100/80 dark:border-zinc-800 rounded-3xl transition-all overflow-hidden ${style.cardGlow} shadow-sm`}
              >
                {/* Visible Primary Header of Card */}
                <div 
                  className={`p-4 flex items-center justify-between gap-3 ${
                    isExpanded ? "border-b border-slate-100 dark:border-zinc-800" : ""
                  }`}
                >
                  <div 
                    onClick={() => handleToggleExpand(item)}
                    className="flex-1 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[14px] text-zinc-850 dark:text-zinc-100">
                        {item.name}
                      </span>
                      {item.notes && !isExpanded && (
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 max-w-[120px] truncate">
                          ({item.notes})
                        </span>
                      )}
                    </div>
                    
                    {/* Expiry Badge */}
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${style.bg} ${style.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        {daysLeft < 0 
                          ? `已過期 ${Math.abs(daysLeft)} 天` 
                          : daysLeft === 0 
                          ? "今天到期" 
                          : `剩餘 ${daysLeft} 天`
                        }
                      </div>
                      
                      <div className="text-[10px] text-zinc-400">
                        到期日：{item.expiryDate}
                      </div>
                    </div>
                  </div>

                  {/* Quantity Stepper Controller (iOS Style, super fast clicks) */}
                  <div className="flex items-center gap-3">
                    {/* Add to Shopping Cart Button */}
                    <button
                      id={`add-to-cart-${item.id}`}
                      onClick={(e) => handleAddToCart(e, item)}
                      className={`p-2 rounded-full transition-all cursor-pointer ${
                        addedMap[item.id]
                          ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                          : "text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                      }`}
                      title={addedMap[item.id] ? "已加入購物清單" : "加入購物清單"}
                    >
                      {addedMap[item.id] ? (
                        <CheckCircle2 className="w-4.5 h-4.5" />
                      ) : (
                        <ShoppingCart className="w-4.5 h-4.5" />
                      )}
                    </button>

                    <div className="bg-slate-50 dark:bg-zinc-800 border border-zinc-150 dark:border-zinc-700/60 rounded-full p-0.5 flex items-center shadow-inner">
                      <button
                        id={`qty-minus-${item.id}`}
                        onClick={() => handleQtyAdjust(item, -1)}
                        className="w-7 h-7 bg-white dark:bg-zinc-900 hover:bg-slate-100 text-zinc-600 dark:text-zinc-300 rounded-full flex items-center justify-center font-bold text-xs shadow-sm cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      
                      <span className="px-3 font-bold text-xs min-w-[20px] text-center">
                        {item.quantity}
                      </span>
                      
                      <button
                        id={`qty-plus-${item.id}`}
                        onClick={() => handleQtyAdjust(item, 1)}
                        className="w-7 h-7 bg-white dark:bg-zinc-900 hover:bg-slate-100 text-zinc-600 dark:text-zinc-300 rounded-full flex items-center justify-center font-bold text-xs shadow-sm cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Quick Expand Toggle Arrow */}
                    <button
                      id={`expand-btn-${item.id}`}
                      onClick={() => handleToggleExpand(item)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Smooth Custom Editor Sheet (No extra popup layers!) */}
                {isExpanded && (
                  <div className="p-4 bg-slate-50/50 dark:bg-zinc-950/20 text-xs space-y-3.5 border-t border-slate-50 dark:border-zinc-800">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Name input */}
                      <div>
                        <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                          食材名稱
                        </span>
                        <input
                          id={`edit-name-input-${item.id}`}
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-850 px-3 py-2 border border-zinc-150 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 font-medium"
                        />
                      </div>

                      {/* Expiry Date */}
                      <div>
                        <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                          修改有效期限
                        </span>
                        <input
                          id={`edit-expiry-input-${item.id}`}
                          type="date"
                          value={editExpiry}
                          onChange={(e) => setEditExpiry(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-850 px-3 py-2 border border-zinc-150 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 font-medium text-center"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        備註內容
                      </span>
                      <input
                        id={`edit-notes-input-${item.id}`}
                        type="text"
                        value={editNotes}
                        placeholder="例如品牌或容量"
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-850 px-3 py-2 border border-zinc-150 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-emerald-500 font-medium"
                      />
                    </div>

                    {/* Change location / category */}
                    <div>
                      <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                        保存位置
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {(["fridge", "freezer", "room"] as const).map((loc) => (
                          <button
                            id={`edit-loc-${loc}-${item.id}`}
                            key={loc}
                            type="button"
                            onClick={() => setEditCategory(loc)}
                            className={`py-2 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                              editCategory === loc 
                                ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" 
                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100"
                            }`}
                          >
                            {loc === "fridge" ? "冷藏" : loc === "freezer" ? "冷凍" : "室溫"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons inside Card Expanded Form */}
                    <div className="flex gap-2 pt-2 border-t border-slate-200/50 dark:border-zinc-850">
                      <button
                        id={`delete-item-btn-${item.id}`}
                        type="button"
                        onClick={() => handleDelete(item.id, item.name)}
                        className="px-3.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/25 dark:hover:bg-rose-950/45 text-rose-600 dark:text-rose-400 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        刪除
                      </button>
                      
                      <button
                        id={`save-item-btn-${item.id}`}
                        type="button"
                        disabled={savingId === item.id}
                        onClick={() => handleSaveEdit(item.id)}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 px-4 rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10"
                      >
                        {savingId === item.id ? (
                          <span className="inline-block w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            儲存變更
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
