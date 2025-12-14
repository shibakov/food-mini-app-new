export interface NutritionBase {
  k: number; // Calories
  p: number; // Protein
  f: number; // Fat
  c: number; // Carbs
}

export interface Product {
  id: string | number;
  name: string;
  brand?: string;
  grams: number;
  base: NutritionBase;
  kcal: number; // Calculated total kcal for current grams
}

export interface MealItem extends Product {
  item_id?: string | number;
  productId?: string | number;
}

export interface Meal {
  id: string | number;
  time: string;
  title: string;
  kcal: number;
  items: MealItem[];
  type?: MealType;
}

export interface DailyStats {
  date: string;
  totalKcal: number;
  protein: number;
  fats: number;
  carbs: number;
  meals: Meal[];
  status?: {
    code: 'under' | 'ok' | 'over';
    label: string;
    insight: string;
  };
}

export interface SearchResult extends Product {}

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface AppSettings {
  calorieTarget: number;
  tolerance: number;
  macroMode: 'percent' | 'grams';
  macros: { p: string; f: string; c: string };
}

export interface AddSheetContext {
  date: Date;
  meal?: Meal;
  defaultMealType?: MealType;
  defaultTime?: string;
}
