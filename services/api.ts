/* ======================================================
   API CONTRACTS v1
   Source of truth for frontend ↔ backend interaction
   ====================================================== */

/* ---------- COMMON TYPES ---------- */

export type UUID = string; // backend returns uuid as string
export type ISODate = string; // YYYY-MM-DD

export type MacroKey = 'protein' | 'fat' | 'carbs';
export type MacroMode = 'percent' | 'grams';

export type InsightSeverity = 'positive' | 'neutral' | 'warning';

/* ---------- NUTRITION ---------- */

export interface NutritionPer100g {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

/* ---------- PRODUCTS ---------- */

export interface Product {
  product_id: UUID;
  name: string;
  brand: string | null;
  is_custom: boolean;
}

export interface ProductSearchResult extends Product {
  nutrition_per_100g: NutritionPer100g;
}

/* ---------- MEAL ITEMS ---------- */

export type AddedVia = 'search' | 'manual' | 'label' | 'photo';

export interface ComputedNutrition {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface MealItem {
  item_id: UUID;
  product: Product;
  grams: number;
  added_via: AddedVia;
  computed: ComputedNutrition;
}

/* ---------- MEALS ---------- */

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealPreview {
  items_count: number;
  top_items: {
    name: string;
    grams: number;
  }[];
}

export interface Meal {
  meal_id: UUID;
  date: ISODate;
  type: MealType;
  title: string;
  time: string; // HH:mm
  collapsed_preview?: MealPreview;
  items?: MealItem[];
  computed: ComputedNutrition;
}

/* ---------- DAY (MAIN SCREEN) ---------- */

export interface DaySummary {
  calories: {
    consumed: number;
    target: number;
    tolerance: number;
  };
  macros: Record<
    MacroKey,
    {
      consumed: number;
      target: number;
    }
  >;
}

export interface DayInsight {
  text: string;
  severity: InsightSeverity;
}

export interface DayResponse {
  date: ISODate;
  summary: DaySummary;
  meals: Meal[];
  insight: DayInsight | null;
}

/* ---------- SETTINGS ---------- */

export interface MacroTargets {
  protein: number;
  fat: number;
  carbs: number;
}

export interface AppSettings {
  calorie_target: number;
  calorie_tolerance: number;
  macro_mode: MacroMode;
  macros: MacroTargets;
}

/* ---------- STATS ---------- */

export type StatStatus = 'under' | 'ok' | 'over';

export interface CaloriesStatPoint {
  date: ISODate;
  value: number;
  status: StatStatus;
}

export interface MacroStatPoint {
  date: ISODate;
  value: number;
}

export interface StatsResponse {
  range: '7d' | '14d' | '30d';
  series: {
    calories: CaloriesStatPoint[];
    macros: Record<MacroKey, MacroStatPoint[]>;
  };
  insights: DayInsight[];
}

/* ======================================================
   END OF CONTRACTS
   ====================================================== */
