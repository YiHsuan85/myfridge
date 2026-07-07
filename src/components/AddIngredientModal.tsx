import React, { useState, useRef, useEffect } from "react";
import { Ingredient, CommonFoodTemplate, UserSettings } from "../types";
import { COMMON_FOODS } from "../constants/foods";
import { 
  X, 
  Search, 
  Sparkles, 
  Camera, 
  Upload, 
  Plus, 
  Check, 
  AlertCircle, 
  Calendar,
  FileText,
  Egg,
  Milk,
  Banana,
  Beef,
  Flame,
  Soup,
  CupSoda,
  Container,
  CircleDot,
  CheckCircle,
  Clock,
  RotateCw,
  Eye,
  Info
} from "lucide-react";

interface AddIngredientModalProps {
  onClose: () => void;
  onAdd: (ingredients: Omit<Ingredient, "id" | "userId" | "createdAt">[]) => Promise<void>;
  settings: UserSettings;
}

export default function AddIngredientModal({ onClose, onAdd, settings }: AddIngredientModalProps) {
  const [activeTab, setActiveTab] = useState<"manual" | "preset" | "ai">("manual");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Form states (Manual Mode)
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [category, setCategory] = useState<"fridge" | "freezer" | "room">("fridge");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [minStock, setMinStock] = useState<number>(1);

  // Preset search states
  const [presetSearch, setPresetSearch] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<CommonFoodTemplate | null>(null);

  // AI OCR states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState("image/jpeg");
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [selectedScanIndexList, setSelectedScanIndexList] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper: get today plus offset days format YYYY-MM-DD
  const getFutureDateString = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  // Set initial expiry date based on category default setting
  useEffect(() => {
    if (category === "fridge") {
      setExpiryDate(getFutureDateString(settings.defaultExpiryFridge));
    } else if (category === "freezer") {
      setExpiryDate(getFutureDateString(settings.defaultExpiryFreezer));
    } else {
      setExpiryDate(getFutureDateString(settings.defaultExpiryRoom));
    }
  }, [category, settings]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("請輸入食材名稱");
      return;
    }
    if (quantity <= 0) {
      setError("數量必須大於 0");
      return;
    }
    if (!expiryDate) {
      setError("請選擇有效期限");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await onAdd([{
        name: name.trim(),
        quantity,
        category,
        expiryDate,
        notes: notes.trim(),
        minStock: Number(minStock)
      }]);
      setSuccess("新增成功！");
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError("新增失敗，請稍後再試: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Preset Selection Click
  const handleSelectPreset = (preset: CommonFoodTemplate) => {
    setSelectedPreset(preset);
    setName(preset.name);
    setCategory(preset.category);
    
    // Custom logic to set expiry days from preset or settings
    const days = preset.expiryDays;
    setExpiryDate(getFutureDateString(days));
    
    // Switch to manual view with prepopulated values
    setActiveTab("manual");
  };

  // Handle Image Upload / Camera Capture
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setScannedItems([]); // clear previous scans
      };
      reader.readAsDataURL(file);
    }
  };

  // Call backend to scan receipt via Gemini API
  const handleScanReceipt = async () => {
    if (!selectedImage) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/scan-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          image: selectedImage, 
          mimeType: imageMimeType 
        })
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "辨識失敗，請重試或改為手動輸入");
      }
      
      if (data.items && data.items.length > 0) {
        // Pre-fill the standard expiry date for each AI scanned item based on standard/estimated days
        const processed = data.items.map((item: any) => {
          const days = item.expiryDays || 7;
          return {
            ...item,
            quantity: item.quantity || 1,
            category: item.category || "fridge",
            expiryDate: getFutureDateString(days),
            notes: item.notes || "",
            minStock: 1
          };
        });
        setScannedItems(processed);
        // Default select all items
        setSelectedScanIndexList(processed.map((_: any, i: number) => i));
      } else {
        setError("未能辨識出食材。請確保相片清晰，或改為手動輸入");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "系統辨識發生錯誤，請稍候重試");
    } finally {
      setLoading(false);
    }
  };

  // Toggle scanned item checkbox
  const toggleScanItemSelect = (index: number) => {
    if (selectedScanIndexList.includes(index)) {
      setSelectedScanIndexList(selectedScanIndexList.filter(i => i !== index));
    } else {
      setSelectedScanIndexList([...selectedScanIndexList, index]);
    }
  };

  // Confirm scanned import
  const handleImportScanned = async () => {
    if (selectedScanIndexList.length === 0) {
      setError("請至少勾選一項食材");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const toImport = scannedItems
        .filter((_, idx) => selectedScanIndexList.includes(idx))
        .map(item => ({
          name: item.name,
          quantity: Number(item.quantity) || 1,
          category: (item.category === "fridge" || item.category === "freezer" || item.category === "room") ? item.category : "fridge",
          expiryDate: item.expiryDate || getFutureDateString(7),
          notes: item.notes || "",
          minStock: Number(item.minStock) || 1
        }));
      
      await onAdd(toImport);
      setSuccess(`成功匯入 ${toImport.length} 項食材！`);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError("匯入食材失敗: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get Lucide Icons dynamically based on Preset string
  const renderFoodIcon = (iconName: string) => {
    const classVal = "w-5 h-5 text-zinc-500 dark:text-zinc-400";
    switch (iconName) {
      case "Milk": return <Milk className={classVal} />;
      case "Egg": return <Egg className={classVal} />;
      case "Banana": return <Banana className={classVal} />;
      case "Beef": return <Beef className={classVal} />;
      case "Flame": return <Flame className={classVal} />;
      case "Soup": return <Soup className={classVal} />;
      case "Cup": return <CupSoda className={classVal} />;
      case "Container": return <Container className={classVal} />;
      case "CircleDot": return <CircleDot className={classVal} />;
      default: return <Egg className={classVal} />;
    }
  };

  // Filter COMMON_FOODS based on search input
  const filteredPresets = COMMON_FOODS.filter(p => 
    p.name.includes(presetSearch) || 
    (p.category === "fridge" && "冷藏".includes(presetSearch)) ||
    (p.category === "freezer" && "冷凍".includes(presetSearch)) ||
    (p.category === "room" && "室溫".includes(presetSearch))
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans text-zinc-900 dark:text-zinc-50 transition-colors duration-300">
      <div 
        className="w-full sm:max-w-lg bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-slide-up sm:animate-scale-in"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-500 dark:text-emerald-400">
              <Plus className="w-5 h-5" />
            </div>
            <span className="font-bold text-base">新增食材</span>
          </div>
          <button 
            id="close-modal-btn"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Apple Segmented Control */}
        <div className="p-3 bg-slate-50 dark:bg-zinc-950/60 flex border-b border-slate-100 dark:border-zinc-800/40">
          <div className="w-full bg-zinc-200/60 dark:bg-zinc-800/50 p-1 rounded-2xl flex text-xs font-semibold">
            <button
              id="tab-manual-btn"
              onClick={() => setActiveTab("manual")}
              className={`flex-1 py-2 text-center rounded-xl transition-all cursor-pointer ${
                activeTab === "manual" 
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
              }`}
            >
              手動輸入
            </button>
            <button
              id="tab-preset-btn"
              onClick={() => setActiveTab("preset")}
              className={`flex-1 py-2 text-center rounded-xl transition-all cursor-pointer ${
                activeTab === "preset" 
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
              }`}
            >
              常見食材
            </button>
            <button
              id="tab-ai-btn"
              onClick={() => setActiveTab("ai")}
              className={`flex-1 py-2 text-center rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === "ai" 
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 animate-pulse" />
              AI 辨識發票
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl flex items-center gap-2.5 text-xs">
              <AlertCircle className="w-4.5 h-4.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center gap-2.5 text-xs">
              <Check className="w-4.5 h-4.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* TAB 1: MANUAL FORM */}
          {activeTab === "manual" && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                  食材名稱
                </label>
                <input
                  id="ingredient-name-input"
                  type="text"
                  required
                  placeholder="例如：林鳳營鮮乳、有機波菜..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800/50 border border-zinc-150 dark:border-zinc-800 text-zinc-850 dark:text-zinc-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                    保存位置
                  </label>
                  <select
                    id="ingredient-category-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800/50 border border-zinc-150 dark:border-zinc-800 text-zinc-850 dark:text-zinc-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  >
                    <option value="fridge">冷藏 (低溫)</option>
                    <option value="freezer">冷凍 (結冰)</option>
                    <option value="room">室溫 (避光)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    有效期限
                  </label>
                  <input
                    id="ingredient-expiry-input"
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-zinc-150 dark:border-zinc-800 text-zinc-850 dark:text-zinc-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                  數量
                </label>
                <div className="flex items-center bg-slate-50 dark:bg-zinc-800/50 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-1 max-w-xs">
                  <button
                    id="qty-minus-btn"
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-semibold cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    id="ingredient-qty-input"
                    type="number"
                    required
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-transparent text-center font-bold text-sm focus:outline-none"
                  />
                  <button
                    id="qty-plus-btn"
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-semibold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                  備註 / 說明
                </label>
                <input
                  id="ingredient-notes-input"
                  type="text"
                  placeholder="例如：品牌、重量，或『要提早吃完』"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800/50 border border-zinc-150 dark:border-zinc-800 text-zinc-850 dark:text-zinc-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                />
              </div>

              <div className="pt-4">
                <button
                  id="ingredient-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-350 text-white font-medium py-3 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 transition-all cursor-pointer"
                >
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "加入冰箱"
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: PRESET SEARCH */}
          {activeTab === "preset" && (
            <div className="space-y-4">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  id="preset-search-input"
                  type="text"
                  placeholder="搜尋快速食材庫 (例如：雞蛋、冷藏...)"
                  value={presetSearch}
                  onChange={(e) => setPresetSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-zinc-150 dark:border-zinc-800 text-zinc-850 dark:text-zinc-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 max-h-[45vh] overflow-y-auto pr-1">
                {filteredPresets.map((preset, index) => (
                  <button
                    id={`preset-item-${index}`}
                    key={index}
                    onClick={() => handleSelectPreset(preset)}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-zinc-800/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-900/30 rounded-2xl text-left transition-all group cursor-pointer"
                  >
                    <div className="w-9 h-9 bg-white dark:bg-zinc-800 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                      {renderFoodIcon(preset.icon)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-800 dark:text-zinc-150">{preset.name}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                          preset.category === "fridge" ? "bg-emerald-500" : preset.category === "freezer" ? "bg-cyan-500" : "bg-amber-500"
                        }`} />
                        {preset.category === "fridge" ? "冷藏" : preset.category === "freezer" ? "冷凍" : "室溫"} · {preset.expiryDays}天
                      </div>
                    </div>
                  </button>
                ))}
                {filteredPresets.length === 0 && (
                  <div className="col-span-2 text-center py-8 text-xs text-zinc-400">
                    找不到相關的常見食材
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: AI SCAN RECEIPT */}
          {activeTab === "ai" && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/10 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-3">
                <Sparkles className="w-5 h-5 shrink-0 text-emerald-500 animate-bounce mt-0.5" />
                <div>
                  <p className="font-semibold text-sm mb-1">AI 智慧辨識匯入</p>
                  <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    拍照或上傳購物發票、超市收據、甚至直接拍下多種食材，AI 會自動辨識文字，智慧預測數量、保存位置與保存期限！
                  </p>
                </div>
              </div>

              {!selectedImage ? (
                <div className="flex gap-3">
                  {/* Native Upload triggers camera on iPhone automatically via input capture */}
                  <button
                    id="scan-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 dark:hover:border-emerald-500/50 bg-slate-50 dark:bg-zinc-800/20 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 rounded-2xl flex flex-col items-center justify-center gap-2.5 transition-all text-zinc-500 dark:text-zinc-400 group cursor-pointer"
                  >
                    <div className="w-11 h-11 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform text-zinc-600 dark:text-zinc-300">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">拍攝照片 / 選取檔案</span>
                    <span className="text-[10px] text-zinc-400">支援發票收據與食材圖</span>
                  </button>
                  <input
                    id="receipt-file-input"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Image Preview & Buttons */}
                  <div className="relative rounded-2xl overflow-hidden border border-slate-100 dark:border-zinc-800 aspect-[16/9] bg-slate-100 dark:bg-zinc-950 flex items-center justify-center group">
                    <img 
                      src={selectedImage} 
                      alt="Scanned item preview" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-2">
                      <button 
                        id="ai-reselect-btn"
                        onClick={() => {
                          setSelectedImage(null);
                          setScannedItems([]);
                        }}
                        className="p-2 bg-white hover:bg-zinc-100 text-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-1 shadow-md transition-all cursor-pointer"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        重新選取
                      </button>
                    </div>
                  </div>

                  {scannedItems.length === 0 ? (
                    <button
                      id="ai-trigger-scan-btn"
                      onClick={handleScanReceipt}
                      disabled={loading}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-350 text-white font-medium py-3 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 transition-all cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin" />
                          <span>AI 正在辨識中，約需 3-5 秒...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>開始 AI 智慧文字辨識</span>
                        </>
                      )}
                    </button>
                  ) : (
                    /* Display parsed list */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          辨識出 {scannedItems.length} 項食材：
                        </span>
                        <button
                          id="scan-toggle-all-btn"
                          onClick={() => {
                            if (selectedScanIndexList.length === scannedItems.length) {
                              setSelectedScanIndexList([]);
                            } else {
                              setSelectedScanIndexList(scannedItems.map((_, i) => i));
                            }
                          }}
                          className="text-xs text-emerald-500 font-semibold hover:underline"
                        >
                          {selectedScanIndexList.length === scannedItems.length ? "取消全選" : "全選"}
                        </button>
                      </div>

                      <div className="max-h-[30vh] overflow-y-auto border border-slate-100 dark:border-zinc-800 rounded-2xl divide-y divide-slate-100 dark:divide-zinc-800">
                        {scannedItems.map((item, idx) => (
                          <div 
                            key={idx}
                            onClick={() => toggleScanItemSelect(idx)}
                            className={`p-3 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                              selectedScanIndexList.includes(idx) 
                                ? "bg-emerald-50/30 dark:bg-emerald-950/10" 
                                : "hover:bg-slate-50 dark:hover:bg-zinc-800/40"
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <input 
                                id={`scan-item-checkbox-${idx}`}
                                type="checkbox"
                                checked={selectedScanIndexList.includes(idx)}
                                onChange={() => {}} // handled by parent div click
                                className="mt-0.5 rounded text-emerald-500 focus:ring-emerald-500/20"
                              />
                              <div>
                                <div className="font-bold text-zinc-800 dark:text-zinc-200">{item.name}</div>
                                <div className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                                    item.category === "fridge" ? "bg-emerald-500" : item.category === "freezer" ? "bg-cyan-500" : "bg-amber-500"
                                  }`} />
                                  <span>{item.category === "fridge" ? "冷藏" : item.category === "freezer" ? "冷凍" : "室溫"}</span>
                                  <span>· 數量: {item.quantity}</span>
                                  <span>· 預計保存: {item.expiryDate}</span>
                                </div>
                              </div>
                            </div>
                            {item.notes && (
                              <span className="text-[10px] bg-slate-100 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-md">
                                {item.notes}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2.5 pt-2">
                        <button
                          id="ai-cancel-list-btn"
                          onClick={() => {
                            setSelectedImage(null);
                            setScannedItems([]);
                          }}
                          className="px-4 py-3 bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl text-xs font-semibold cursor-pointer hover:bg-slate-200"
                        >
                          清空重來
                        </button>
                        <button
                          id="ai-import-scanned-btn"
                          onClick={handleImportScanned}
                          disabled={loading || selectedScanIndexList.length === 0}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-350 text-white font-medium py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 transition-all cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          匯入選取食材 ({selectedScanIndexList.length} 項)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
