import React, { useState } from "react";
import { Ingredient, ShoppingItem } from "../types";
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Square, 
  CheckCircle2,
  Pencil,
  Check,
  X
} from "lucide-react";

interface ShoppingListScreenProps {
  ingredients: Ingredient[];
  shoppingItems: ShoppingItem[];
  onAddShoppingItem: (name: string) => Promise<void>;
  onToggleShoppingItem: (id: string, completed: boolean) => Promise<void>;
  onClearCompletedShopping: () => Promise<void>;
  onUpdateShoppingItem: (id: string, updates: Partial<ShoppingItem>) => Promise<void>;
}

export default function ShoppingListScreen({
  ingredients,
  shoppingItems,
  onAddShoppingItem,
  onToggleShoppingItem,
  onClearCompletedShopping,
  onUpdateShoppingItem
}: ShoppingListScreenProps) {
  const [newShopItem, setNewShopItem] = useState("");
  const [shopLoading, setShopLoading] = useState(false);
  
  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleAddShopping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopItem.trim()) return;
    setShopLoading(true);
    try {
      await onAddShoppingItem(newShopItem.trim());
      setNewShopItem("");
    } catch (err) {
      console.error(err);
    } finally {
      setShopLoading(false);
    }
  };

  const handleStartEdit = (e: React.MouseEvent, item: ShoppingItem) => {
    e.stopPropagation();
    setEditingId(item.id);
    setEditingName(item.name);
  };

  const handleSaveEdit = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!editingName.trim()) return;
    try {
      await onUpdateShoppingItem(id, { name: editingName.trim() });
      setEditingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pb-28 font-sans text-zinc-900 dark:text-zinc-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 text-white rounded-2xl shadow-md shadow-amber-500/10">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base tracking-tight">智慧採購清單</h2>
              <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mt-0.5">
                SMART SHOPPING LIST
              </p>
            </div>
          </div>
          
          {shoppingItems.some((item) => item.completed) && (
            <button
              id="clear-completed-shop-btn"
              onClick={onClearCompletedShopping}
              className="text-xs text-zinc-400 hover:text-rose-500 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer py-1.5 px-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              清除已完成
            </button>
          )}
        </div>

        {/* Quick Input Form */}
        <form onSubmit={handleAddShopping} className="flex gap-2 mb-6">
          <input
            id="shopping-quick-input"
            type="text"
            required
            placeholder="新增需要購買的食材..."
            value={newShopItem}
            onChange={(e) => setNewShopItem(e.target.value)}
            className="flex-1 px-4 py-3 bg-slate-50 dark:bg-zinc-800/50 border border-zinc-150 dark:border-zinc-800 text-zinc-850 dark:text-zinc-100 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
          />
          <button
            id="add-shopping-btn"
            type="submit"
            disabled={shopLoading || !newShopItem.trim()}
            className="px-5 bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            加入
          </button>
        </form>

        {/* List items */}
        {shoppingItems.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-400 font-medium">
            <ShoppingCart className="w-8 h-8 text-zinc-200 dark:text-zinc-800 mx-auto mb-2" />
            採購清單空空如也，食材補給滿分！🍏
          </div>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {shoppingItems.map((item) => {
              const isEditing = editingId === item.id;

              if (isEditing) {
                return (
                  <div
                    id={`shopping-row-${item.id}`}
                    key={item.id}
                    className="p-3 rounded-2xl border bg-white dark:bg-zinc-800 border-amber-500/50 flex items-center justify-between text-xs transition-all gap-2"
                  >
                    <div className="flex items-center gap-3 flex-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 text-zinc-850 dark:text-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-semibold"
                        autoFocus
                      />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={(e) => handleSaveEdit(e, item.id)}
                        className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all cursor-pointer shadow-sm"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-700 dark:hover:bg-zinc-650 text-zinc-600 dark:text-zinc-300 rounded-xl transition-all cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  id={`shopping-row-${item.id}`}
                  key={item.id}
                  onClick={() => onToggleShoppingItem(item.id, !item.completed)}
                  className={`p-3 rounded-2xl border flex items-center justify-between text-xs transition-all cursor-pointer group ${
                    item.completed 
                      ? "bg-slate-50/50 dark:bg-zinc-800/10 border-transparent text-zinc-400 line-through" 
                      : "bg-slate-50 dark:bg-zinc-800/30 border-slate-100 dark:border-zinc-800/60 hover:bg-slate-100/50 dark:hover:bg-zinc-800/40 text-zinc-800 dark:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.completed ? (
                      <CheckCircle2 className="w-4.5 h-4.5 text-zinc-400 shrink-0" />
                    ) : (
                      <Square className="w-4.5 h-4.5 text-zinc-300 dark:text-zinc-600 shrink-0" />
                    )}
                    <span className="font-semibold text-zinc-700 dark:text-zinc-200">{item.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.autoAdded && (
                      <span className="text-[9px] bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md font-black tracking-wider">
                        自動補貨
                      </span>
                    )}
                    <button
                      id={`edit-shopping-btn-${item.id}`}
                      onClick={(e) => handleStartEdit(e, item)}
                      className="p-1.5 text-zinc-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-xl transition-all cursor-pointer md:opacity-0 group-hover:opacity-100"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
