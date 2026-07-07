export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  category: "fridge" | "freezer" | "room"; // 冷藏, 冷凍, 室溫
  expiryDate: string; // YYYY-MM-DD
  notes: string;
  userId: string;
  minStock?: number; // 庫存低於設定值
  createdAt: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  completed: boolean;
  quantity?: number;
  userId: string;
  autoAdded?: boolean;
  createdAt: string;
}

export interface UserSettings {
  userId: string;
  reminderTime: string; // e.g. "09:00"
  defaultExpiryFridge: number; // e.g. 7 days
  defaultExpiryFreezer: number; // e.g. 30 days
  defaultExpiryRoom: number; // e.g. 14 days
  notificationsEnabled: boolean;
}

export interface CommonFoodTemplate {
  name: string;
  category: "fridge" | "freezer" | "room";
  expiryDays: number;
  icon: string;
}
