export interface NutritionBase {
  k: number; // Calories
  p: number; // Protein
  f: number; // Fat
  c: number; // Carbs
}

export interface Product {
  id: number;
  name: string;
  brand?: string;
  grams: number;
  base: NutritionBase;
  kcal: number; // Calculated total kcal for current grams
}

export interface MealItem extends Product {}

export interface Meal {
  id: number;
  time: string;
  title: string;
  kcal: number;
  items: MealItem[];
}

export interface DailyStats {
  date: string;
  totalKcal: number;
  protein: number;
  fats: number;
  carbs: number;
  meals: Meal[];
}

export interface SearchResult extends Product {}

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface AppSettings {
  calorieTarget: number;
  tolerance: number;
  macroMode: 'percent' | 'grams';
  macros: { p: string; f: string; c: string };
}
