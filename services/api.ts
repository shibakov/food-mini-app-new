import {
  AppSettings,
  DailyStats,
  Meal,
  MealItem,
  MealType,
  NutritionBase,
  SearchResult,
} from '../types';

type JsonRecord = Record<string, any>;

const API_BASE_URL = 'https://gateway-api-food-mini-app-production.up.railway.app/v1';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMessage = (payload && payload.error?.message) || `API error: ${res.status}`;
    throw new Error(errorMessage);
  }

  return payload as T;
}

function toAppSettings(payload: JsonRecord): AppSettings {
  return {
    calorieTarget: payload.calorie_target,
    tolerance: payload.calorie_tolerance,
    macroMode: payload.macro_mode,
    macros: {
      p: payload.protein_target?.toString?.() ?? '0',
      f: payload.fat_target?.toString?.() ?? '0',
      c: payload.carbs_target?.toString?.() ?? '0',
    },
  };
}

function fromAppSettings(settings: AppSettings): JsonRecord {
  return {
    calorie_target: settings.calorieTarget,
    calorie_tolerance: settings.tolerance,
    macro_mode: settings.macroMode,
    protein_target: Number(settings.macros.p),
    fat_target: Number(settings.macros.f),
    carbs_target: Number(settings.macros.c),
  };
}

function mapProduct(result: any): SearchResult {
  return {
    id: result.id,
    name: result.name,
    brand: result.brand,
    grams: result.default_grams ?? 100,
    base: {
      k: result.nutrition_per_100g?.calories ?? result.base?.k ?? 0,
      p: result.nutrition_per_100g?.protein ?? result.base?.p ?? 0,
      f: result.nutrition_per_100g?.fat ?? result.base?.f ?? 0,
      c: result.nutrition_per_100g?.carbs ?? result.base?.c ?? 0,
    },
    kcal: result.kcal ?? 0,
  } as SearchResult;
}

function mapMealItem(result: any): MealItem {
  const nutrition =
    result.nutrition_per_100g ?? result.base ?? result.product?.nutrition_per_100g ?? {};
  const calories = result.kcal ?? result.calories ?? result.total_calories ?? 0;
  const grams = result.grams ?? result.amount ?? 0;
  const productId = result.productId ?? result.product_id ?? result.product?.id ?? result.id;
  const itemId = result.item_id ?? result.id ?? result.entry_id;

  return {
    id: itemId ?? productId,
    item_id: itemId,
    productId,
    name: result.name ?? result.product?.name ?? 'Meal item',
    brand: result.brand ?? result.product?.brand,
    grams,
    base: {
      k: nutrition.calories ?? nutrition.k ?? 0,
      p: nutrition.protein ?? nutrition.p ?? 0,
      f: nutrition.fat ?? nutrition.f ?? 0,
      c: nutrition.carbs ?? nutrition.c ?? 0,
    },
    kcal: calories,
  } as MealItem;
}

function mapMeal(result: any): Meal {
  return {
    id: result.id,
    title: result.title ?? result.type ?? 'Meal',
    time: result.time ?? result.logged_at ?? '00:00',
    type: result.type,
    kcal: result.kcal ?? result.total_kcal ?? result.totals?.calories ?? 0,
    items: (result.items ?? []).map(mapMealItem),
  } as Meal;
}

function normalizeStatus(raw: any) {
  if (!raw) return undefined;
  if (typeof raw === 'string') {
    return { code: raw, label: raw, insight: '' };
  }
  return {
    code: raw.code ?? raw.state ?? 'ok',
    label: raw.label ?? raw.title ?? 'On track',
    insight: raw.insight ?? raw.message ?? '',
  };
}

function mapDailyStats(payload: any): DailyStats {
  const totals = payload.totals ?? payload.summary ?? payload;
  return {
    date: payload.date ?? payload.day ?? '',
    totalKcal: totals.calories ?? totals.total_kcal ?? payload.total_calories ?? payload.totalKcal ?? 0,
    protein: totals.protein ?? totals.p ?? 0,
    fats: totals.fat ?? totals.fats ?? totals.f ?? 0,
    carbs: totals.carbs ?? totals.c ?? 0,
    meals: (payload.meals ?? []).map(mapMeal),
    status:
      normalizeStatus(payload.status) ??
      (payload.insight ? { code: 'ok', label: 'On track', insight: payload.insight } : undefined),
  };
}

function toNutritionPer100g(base: NutritionBase) {
  return {
    calories: base.k,
    protein: base.p,
    fat: base.f,
    carbs: base.c,
  };
}

export const api = {
  day: {
    get: async (date: Date): Promise<DailyStats> => {
      const dateStr = date.toISOString().split('T')[0];
      const payload = await request(`/day/${dateStr}`);
      return mapDailyStats(payload);
    },
  },

  meals: {
    create: (payload: { date: string; type: MealType; time: string; title?: string }) =>
      request<Meal>(`/meals`, { method: 'POST', body: JSON.stringify(payload) }),
    get: async (mealId: string | number) => {
      const meal = await request(`/meals/${mealId}`);
      return mapMeal(meal);
    },
    delete: (mealId: string | number) => request(`/meals/${mealId}`, { method: 'DELETE' }),
    addItem: (
      mealId: string | number,
      data: { product_id?: string | number; product?: JsonRecord; grams: number }
    ) => request(`/meals/${mealId}/items`, { method: 'POST', body: JSON.stringify(data) }),
    updateItem: (mealId: string | number, itemId: string | number, data: { grams: number }) =>
      request(`/meals/${mealId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteItem: (mealId: string | number, itemId: string | number) =>
      request(`/meals/${mealId}/items/${itemId}`, { method: 'DELETE' }),
  },

  products: {
    search: async (query: string): Promise<SearchResult[]> => {
      if (!query.trim()) return [];
      const results = await request<any[]>(`/products/search?q=${encodeURIComponent(query)}`);
      return results.map(mapProduct);
    },
    create: (payload: { name: string; brand?: string; nutrition_per_100g: JsonRecord }) =>
      request(`/products`, { method: 'POST', body: JSON.stringify(payload) }),
    updateNutrition: (id: string | number, base: NutritionBase, note?: string) =>
      request(`/products/${id}/nutrition`, {
        method: 'PATCH',
        body: JSON.stringify({ nutrition_per_100g: toNutritionPer100g(base), note: note ?? null }),
      }),
  },

  settings: {
    get: async (): Promise<AppSettings> => {
      const res = await request<JsonRecord>(`/settings`);
      return toAppSettings(res);
    },
    save: (settings: AppSettings) =>
      request(`/settings`, {
        method: 'PATCH',
        body: JSON.stringify(fromAppSettings(settings)),
      }),
  },

  stats: {
    get: (range: '7d' | '14d' | '30d') => request(`/stats?range=${range}`),
  },
};
