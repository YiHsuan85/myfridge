import React, { useState, useEffect } from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auths";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  getDoc,
  setDoc
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { Ingredient, ShoppingItem, UserSettings } from "./types";

// Screens / Components
import AuthScreen from "./components/AuthScreen";
import Dashboard from "./components/Dashboard";
import RefridgeratorView from "./components/RefridgeratorView";
import ShoppingListScreen from "./components/ShoppingListScreen";
import SettingsScreen from "./components/SettingsScreen";
import AddIngredientModal from "./components/AddIngredientModal";

// Icons
import { 
  LayoutDashboard, 
  Refrigerator, 
  Settings, 
  Plus, 
  Sparkles,
  Egg,
  Bell,
  ShoppingCart
} from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [localUser, setLocalUser] = useState<{ uid: string; email: string; isAnonymous: boolean } | null>(() => {
    const saved = localStorage.getItem("local_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [authLoading, setAuthLoading] = useState(true);
  
  // App navigation state (bottom tabs)
  const [currentTab, setCurrentTab] = useState<"dashboard" | "fridge" | "shopping" | "settings">("dashboard");
  
  // Data States
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
    userId: "",
    reminderTime: "09:00",
    defaultExpiryFridge: 7,
    defaultExpiryFreezer: 30,
    defaultExpiryRoom: 14,
    notificationsEnabled: true
  });

  // UI state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // 1. Monitor Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setLocalUser(null);
        localStorage.removeItem("local_user");
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // 2. Manage Theme / Dark Mode (Tailwind)
  useEffect(() => {
    // Check localStorage or system settings for theme preferences
    const storedTheme = localStorage.getItem("fridge_theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    if (storedTheme === "dark" || (!storedTheme && systemPrefersDark)) {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const handleToggleDarkMode = () => {
    if (darkMode) {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
      localStorage.setItem("fridge_theme", "light");
    } else {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
      localStorage.setItem("fridge_theme", "dark");
    }
  };

  // 3. Sync User-specific data from Firestore OR Local Storage
  useEffect(() => {
    if (user) {
      const uid = user.uid;

      // A. Sync Refrigerator Ingredients (Ordered by expiry date ascending)
      const ingredientsQuery = query(
        collection(db, "users", uid, "ingredients"),
        orderBy("expiryDate", "asc")
      );
      
      const unsubscribeIngredients = onSnapshot(ingredientsQuery, (snapshot) => {
        const items: Ingredient[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as Ingredient);
        });
        setIngredients(items);
      }, (error) => {
        console.error("Error syncing ingredients from Firestore:", error);
      });

      // B. Sync Shopping List Items (Ordered by creation date)
      const shoppingQuery = query(
        collection(db, "users", uid, "shoppingList"),
        orderBy("createdAt", "desc")
      );
      const unsubscribeShopping = onSnapshot(shoppingQuery, (snapshot) => {
        const items: ShoppingItem[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as ShoppingItem);
        });
        setShoppingItems(items);
      }, (error) => {
        console.error("Error syncing shopping items:", error);
      });

      // C. Sync Settings
      const settingsRef = doc(db, "users", uid, "settings", "general");
      const syncSettings = async () => {
        try {
          const docSnap = await getDoc(settingsRef);
          if (docSnap.exists()) {
            setSettings(docSnap.data() as UserSettings);
          } else {
            // Initialize default user settings in database
            const defaultSettings: UserSettings = {
              userId: uid,
              reminderTime: "09:00",
              defaultExpiryFridge: 7,
              defaultExpiryFreezer: 30,
              defaultExpiryRoom: 14,
              notificationsEnabled: true
            };
            await setDoc(settingsRef, defaultSettings);
            setSettings(defaultSettings);
          }
        } catch (err) {
          console.error("Error syncing user settings:", err);
        }
      };
      syncSettings();

      return () => {
        unsubscribeIngredients();
        unsubscribeShopping();
      };
    } else if (localUser) {
      const uid = localUser.uid;
      const savedIngredients = localStorage.getItem(`local_ingredients_${uid}`);
      const savedShopping = localStorage.getItem(`local_shopping_${uid}`);
      const savedSettings = localStorage.getItem(`local_settings_${uid}`);

      if (savedIngredients) {
        setIngredients(JSON.parse(savedIngredients));
      } else {
        // High quality design mockup foods
        const initialIngredients = [
          {
            id: "local_1",
            name: "有機小松菜",
            category: "蔬菜",
            quantity: 2,
            unit: "包",
            expiryDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            storage: "fridge",
            location: "第三層",
            userId: uid,
            createdAt: new Date().toISOString()
          },
          {
            id: "local_2",
            name: "全脂牛奶",
            category: "乳品",
            quantity: 1,
            unit: "瓶",
            expiryDate: new Date().toISOString().split('T')[0],
            storage: "fridge",
            location: "門架",
            userId: uid,
            createdAt: new Date().toISOString()
          },
          {
            id: "local_3",
            name: "澳洲肋眼牛排",
            category: "肉類",
            quantity: 350,
            unit: "g",
            expiryDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
            storage: "fridge",
            location: "生鮮層",
            userId: uid,
            createdAt: new Date().toISOString()
          },
          {
            id: "local_4",
            name: "富士蘋果",
            category: "水果",
            quantity: 4,
            unit: "顆",
            expiryDate: new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0],
            storage: "fridge",
            location: "水果箱",
            userId: uid,
            createdAt: new Date().toISOString()
          },
          {
            id: "local_5",
            name: "土雞蛋",
            category: "蛋類",
            quantity: 6,
            unit: "顆",
            expiryDate: new Date(Date.now() + 8 * 86400000).toISOString().split('T')[0],
            storage: "fridge",
            location: "門架",
            userId: uid,
            createdAt: new Date().toISOString()
          },
          {
            id: "local_6",
            name: "切達起司片",
            category: "乳品",
            quantity: 10,
            unit: "片",
            expiryDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
            storage: "fridge",
            location: "第三層",
            userId: uid,
            createdAt: new Date().toISOString()
          }
        ];
        setIngredients(initialIngredients);
        localStorage.setItem(`local_ingredients_${uid}`, JSON.stringify(initialIngredients));
      }

      if (savedShopping) {
        setShoppingItems(JSON.parse(savedShopping));
      } else {
        const initialShopping = [
          { id: "local_shop_1", name: "希臘優格 (4入)", completed: false, userId: uid, createdAt: new Date().toISOString() },
          { id: "local_shop_2", name: "燕麥奶 1L", completed: true, userId: uid, createdAt: new Date().toISOString() },
          { id: "local_shop_3", name: "全脂牛奶", completed: false, userId: uid, autoAdded: true, createdAt: new Date().toISOString() }
        ];
        setShoppingItems(initialShopping);
        localStorage.setItem(`local_shopping_${uid}`, JSON.stringify(initialShopping));
      }

      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      } else {
        const defaultSettings: UserSettings = {
          userId: uid,
          reminderTime: "09:00",
          defaultExpiryFridge: 7,
          defaultExpiryFreezer: 30,
          defaultExpiryRoom: 14,
          notificationsEnabled: true
        };
        setSettings(defaultSettings);
        localStorage.setItem(`local_settings_${uid}`, JSON.stringify(defaultSettings));
      }
    } else {
      setIngredients([]);
      setShoppingItems([]);
    }
  }, [user, localUser]);

  // 4. Firestore Database Operations (Dual Engine Support)
  const handleAddIngredients = async (items: Omit<Ingredient, "id" | "userId" | "createdAt">[]) => {
    const uid = user ? user.uid : (localUser ? localUser.uid : null);
    if (!uid) return;

    if (user) {
      const colRef = collection(db, "users", uid, "ingredients");
      for (const item of items) {
        await addDoc(colRef, {
          ...item,
          userId: uid,
          createdAt: new Date().toISOString()
        });
      }
    } else {
      const newIngredients = [...ingredients];
      for (const item of items) {
        const newItem: Ingredient = {
          ...item,
          id: "local_" + Math.random().toString(36).substring(2, 11),
          userId: uid,
          createdAt: new Date().toISOString()
        };
        newIngredients.push(newItem);
      }

      setIngredients(newIngredients);
      localStorage.setItem(`local_ingredients_${uid}`, JSON.stringify(newIngredients));
    }
  };

  const handleUpdateIngredient = async (id: string, updates: Partial<Ingredient>) => {
    const uid = user ? user.uid : (localUser ? localUser.uid : null);
    if (!uid) return;

    if (user) {
      const docRef = doc(db, "users", uid, "ingredients", id);
      await updateDoc(docRef, updates);
    } else {
      const currentItem = ingredients.find((i) => i.id === id);
      if (!currentItem) return;

      const newIngredients = ingredients.map((i) => {
        if (i.id === id) {
          return { ...i, ...updates };
        }
        return i;
      });

      setIngredients(newIngredients);
      localStorage.setItem(`local_ingredients_${uid}`, JSON.stringify(newIngredients));
    }
  };

  const handleDeleteIngredient = async (id: string) => {
    const uid = user ? user.uid : (localUser ? localUser.uid : null);
    if (!uid) return;

    if (user) {
      const docRef = doc(db, "users", uid, "ingredients", id);
      await deleteDoc(docRef);
    } else {
      const newIngredients = ingredients.filter((i) => i.id !== id);
      setIngredients(newIngredients);
      localStorage.setItem(`local_ingredients_${uid}`, JSON.stringify(newIngredients));
    }
  };

  // Shopping List Operations
  const handleAddShoppingItem = async (name: string, autoAdded = false) => {
    const uid = user ? user.uid : (localUser ? localUser.uid : null);
    if (!uid) return;

    if (user) {
      const colRef = collection(db, "users", uid, "shoppingList");
      await addDoc(colRef, {
        name,
        completed: false,
        userId: uid,
        autoAdded,
        createdAt: new Date().toISOString()
      });
    } else {
      const newItem: ShoppingItem = {
        id: "local_shop_" + Math.random().toString(36).substring(2, 11),
        name,
        completed: false,
        userId: uid,
        autoAdded,
        createdAt: new Date().toISOString()
      };
      const updatedShop = [newItem, ...shoppingItems];
      setShoppingItems(updatedShop);
      localStorage.setItem(`local_shopping_${uid}`, JSON.stringify(updatedShop));
    }
  };

  const handleToggleShoppingItem = async (id: string, completed: boolean) => {
    const uid = user ? user.uid : (localUser ? localUser.uid : null);
    if (!uid) return;

    if (user) {
      const docRef = doc(db, "users", uid, "shoppingList", id);
      await updateDoc(docRef, { completed });
    } else {
      const updatedShop = shoppingItems.map((item) => {
        if (item.id === id) {
          return { ...item, completed };
        }
        return item;
      });
      setShoppingItems(updatedShop);
      localStorage.setItem(`local_shopping_${uid}`, JSON.stringify(updatedShop));
    }
  };

  const handleUpdateShoppingItem = async (id: string, updates: Partial<ShoppingItem>) => {
    const uid = user ? user.uid : (localUser ? localUser.uid : null);
    if (!uid) return;

    if (user) {
      const docRef = doc(db, "users", uid, "shoppingList", id);
      await updateDoc(docRef, updates);
    } else {
      const updatedShop = shoppingItems.map((item) => {
        if (item.id === id) {
          return { ...item, ...updates };
        }
        return item;
      });
      setShoppingItems(updatedShop);
      localStorage.setItem(`local_shopping_${uid}`, JSON.stringify(updatedShop));
    }
  };

  const handleClearCompletedShopping = async () => {
    const uid = user ? user.uid : (localUser ? localUser.uid : null);
    if (!uid) return;

    if (user) {
      const completedList = shoppingItems.filter((i) => i.completed);
      for (const item of completedList) {
        const docRef = doc(db, "users", uid, "shoppingList", item.id);
        await deleteDoc(docRef);
      }
    } else {
      const updatedShop = shoppingItems.filter((i) => !i.completed);
      setShoppingItems(updatedShop);
      localStorage.setItem(`local_shopping_${uid}`, JSON.stringify(updatedShop));
    }
  };

  // 5. Generate Warm Greeting based on hour
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 11) return "早安 ☕️";
    if (hours >= 11 && hours < 14) return "午安 🍱";
    if (hours >= 14 && hours < 18) return "下午好 🍰";
    if (hours >= 18 && hours < 22) return "晚上好 🌙";
    return "深夜好 🦉";
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-zinc-400 text-xs font-semibold animate-pulse">
          AI 智慧冰箱管家 載入中...
        </p>
      </div>
    );
  }

  if (!user && !localUser) {
    return (
      <AuthScreen 
        onLocalLogin={(guest) => {
          setLocalUser(guest);
          localStorage.setItem("local_user", JSON.stringify(guest));
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-[#000000] flex justify-center text-zinc-900 dark:text-zinc-50 transition-colors duration-300">
      
      {/* Container simulating a sleek iPhone display structure on desktop, expanding smoothly on mobile */}
      <div className="w-full max-w-lg bg-[#F2F2F7] dark:bg-[#1C1C1E] min-h-screen flex flex-col shadow-2xl relative border-x border-slate-200/50 dark:border-zinc-900/40">
        
        {/* Sleek Top iOS style Navigation Header */}
        <header className="sticky top-0 bg-[#F2F2F7]/90 dark:bg-[#1C1C1E]/90 backdrop-blur-md z-40 px-5 py-4 flex items-center justify-between border-b border-slate-200/40 dark:border-zinc-900/20">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">
              {getGreeting()}
            </span>
            <h1 className="text-xl font-black font-sans tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
              <Refrigerator className="w-5.5 h-5.5 text-emerald-500 dark:text-emerald-400" />
              我的冰箱
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark Mode Fast Quick Toggle icon */}
            <button
              id="header-dark-mode-btn"
              onClick={handleToggleDarkMode}
              className="p-2 bg-white dark:bg-zinc-900 rounded-2xl hover:bg-slate-50 border border-slate-150/40 dark:border-zinc-800 shadow-sm transition-all text-zinc-500 dark:text-zinc-400 cursor-pointer"
            >
              {darkMode ? (
                <span className="text-xs font-bold text-amber-400">☀️</span>
              ) : (
                <span className="text-xs font-bold text-indigo-500">🌙</span>
              )}
            </button>
          </div>
        </header>

        {/* Dynamic Screen Viewport */}
        <main className="flex-1 pt-2">
          {currentTab === "dashboard" && (
            <Dashboard
              ingredients={ingredients}
              onUpdateIngredient={handleUpdateIngredient}
              onDeleteIngredient={handleDeleteIngredient}
              settings={settings}
            />
          )}

          {currentTab === "fridge" && (
            <RefrigeratorView
              ingredients={ingredients}
              onUpdateIngredient={handleUpdateIngredient}
              onDeleteIngredient={handleDeleteIngredient}
              onAddShoppingItem={handleAddShoppingItem}
              settings={settings}
            />
          )}

          {currentTab === "shopping" && (
            <ShoppingListScreen
              ingredients={ingredients}
              shoppingItems={shoppingItems}
              onAddShoppingItem={handleAddShoppingItem}
              onToggleShoppingItem={handleToggleShoppingItem}
              onClearCompletedShopping={handleClearCompletedShopping}
              onUpdateShoppingItem={handleUpdateShoppingItem}
            />
          )}

          {currentTab === "settings" && (
            <SettingsScreen
              settings={settings}
              onSettingsChange={setSettings}
              darkMode={darkMode}
              onToggleDarkMode={handleToggleDarkMode}
              isLocal={!!localUser}
              onLocalLogout={async () => {
                setLocalUser(null);
                localStorage.removeItem("local_user");
                setCurrentTab("dashboard");
                try {
                  await signOut(auth);
                } catch (e) {
                  console.error("Error signing out from auth on local logout:", e);
                }
              }}
            />
          )}
        </main>

        {/* Bottom iOS Floating Add Button */}
        {(currentTab === "dashboard" || currentTab === "fridge") && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40">
            <button
              id="floating-add-btn"
              onClick={() => setIsAddModalOpen(true)}
              className="w-14 h-14 bg-gradient-to-tr from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:scale-105 transition-all cursor-pointer"
            >
              <Plus className="w-7 h-7" />
            </button>
          </div>
        )}

        {/* Sleek Apple-style Bottom Tab Bar Navigation */}
        <nav className="fixed bottom-0 w-full max-w-lg bg-[#F2F2F7]/80 dark:bg-[#1C1C1E]/80 backdrop-blur-lg border-t border-slate-200/40 dark:border-zinc-900/40 px-6 py-2.5 flex justify-around items-center z-30">
          
          <button
            id="tab-dashboard"
            onClick={() => setCurrentTab("dashboard")}
            className={`flex flex-col items-center gap-1.5 transition-colors cursor-pointer ${
              currentTab === "dashboard" 
                ? "text-emerald-500 dark:text-emerald-400" 
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <LayoutDashboard className="w-5.5 h-5.5" />
            <span className="text-[10px] font-bold">總覽</span>
          </button>

          <button
            id="tab-fridge"
            onClick={() => setCurrentTab("fridge")}
            className={`flex flex-col items-center gap-1.5 transition-colors cursor-pointer ${
              currentTab === "fridge" 
                ? "text-emerald-500 dark:text-emerald-400" 
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <Refrigerator className="w-5.5 h-5.5" />
            <span className="text-[10px] font-bold">我的冰箱</span>
          </button>

          <button
            id="tab-shopping"
            onClick={() => setCurrentTab("shopping")}
            className={`flex flex-col items-center gap-1.5 transition-colors cursor-pointer relative ${
              currentTab === "shopping" 
                ? "text-emerald-500 dark:text-emerald-400" 
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <ShoppingCart className="w-5.5 h-5.5" />
            <span className="text-[10px] font-bold">購物清單</span>
            {shoppingItems.filter(i => !i.completed).length > 0 && (
              <span className="absolute -top-1 -right-1.5 bg-amber-500 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center scale-90 border border-white dark:border-zinc-900 animate-pulse">
                {shoppingItems.filter(i => !i.completed).length}
              </span>
            )}
          </button>

          <button
            id="tab-settings"
            onClick={() => setCurrentTab("settings")}
            className={`flex flex-col items-center gap-1.5 transition-colors cursor-pointer ${
              currentTab === "settings" 
                ? "text-emerald-500 dark:text-emerald-400" 
                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <Settings className="w-5.5 h-5.5" />
            <span className="text-[10px] font-bold">設定</span>
          </button>

        </nav>

        {/* Floating Add Ingredient Modal Drawer */}
        {isAddModalOpen && (
          <AddIngredientModal
            settings={settings}
            onClose={() => setIsAddModalOpen(false)}
            onAdd={handleAddIngredients}
          />
        )}

      </div>
    </div>
  );
}
