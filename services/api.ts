import {
  AppSettings,
  DailyStats,
  Meal,
  MealItem,
  MealType,
  NutritionBase,
  SearchResult,
} from '../types';

// Backend enums/types (from FRONTEND_API_V1_CONTRACTS)
type BackendMealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

type DayStatus = 'under' | 'ok' | 'over';

type StatsRange = '7d' | '14d' | '30d';

interface NutritionTotals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface Insight {
  text: string;
  severity: 'positive' | 'neutral' | 'warning';
}

interface Summary extends NutritionTotals {
  status: DayStatus;
}

interface MealSummary extends NutritionTotals {
  meal_id: string;
  meal_type: BackendMealType;
  meal_time: string; // 'HH:MM:SS'
  items_count: number;
}

interface DayResponse {
  date: string; // 'YYYY-MM-DD'
  summary: Summary;
  meals: MealSummary[];
  insight: Insight | null;
}

interface BackendMealItem extends NutritionTotals {
  item_id: string;
  name: string;
  grams: number; // > 0
  added_via: string | null;
  product_id?: string;
  brand?: string | null;
}

interface StatsDay extends NutritionTotals {
  date: string; // 'YYYY-MM-DD'
  status: DayStatus;
}

interface StatsResponse {
  range: StatsRange;
  items: StatsDay[];
}

interface CreateMealResponse {
  meal_id: string;
}

interface GetMealResponse {
  meal: {
    meal_id: string;
    meal_type: BackendMealType;
    meal_time: string; // 'HH:MM:SS'
  } & NutritionTotals;
  items: BackendMealItem[];
}

interface CreateProductResponse {
  product_id: string;
}


type JsonRecord = Record<string, any>;

const API_BASE_URL = 'https://gateway-api-food-mini-app-production.up.railway.app/v1';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const bodyPreview =
    options.body && typeof options.body === 'string'
      ? (() => {
          try {
            return JSON.stringify(JSON.parse(options.body), null, 2);
          } catch {
            return String(options.body);
          }
        })()
      : undefined;

  console.log('[gateway] calling backend', {
    url: `${API_BASE_URL}${path}`,
    method,
    body: bodyPreview,
  });

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });

    const payload = await res.json().catch(() => null);

    console.log('[gateway] backend response', {
      url: `${API_BASE_URL}${path}`,
      method,
      status: res.status,
      ok: res.ok,
      payload,
    });

    if (!res.ok) {
      const errorMessage = (payload && (payload as any).error?.message) || `API error: ${res.status}`;
      console.error('[gateway] backend error', { url: `${API_BASE_URL}${path}`, method, errorMessage });
      throw new Error(errorMessage);
    }

    return payload as T;
  } catch (e) {
    if (e instanceof TypeError) {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      const hint = offline
        ? 'offline or gateway unreachable'
        : 'network or CORS error while calling gateway';
      console.error('[gateway] request failed (network)', { url: `${API_BASE_URL}${path}`, method, hint, error: e });
      throw new Error(`Request failed: ${hint}`);
    }
    console.error('[gateway] request failed (unexpected)', { url: `${API_BASE_URL}${path}`, method, error: e });
    throw e as Error;
  }
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
  const nutrition = result.nutrition_per_100g ?? {};

  return {
    id: result.product_id,
    name: result.name,
    brand: result.brand ?? undefined,
    grams: 100,
    base: {
      k: nutrition.calories ?? 0,
      p: nutrition.protein ?? 0,
      f: nutrition.fat ?? 0,
      c: nutrition.carbs ?? 0,
    },
    kcal: nutrition.calories ?? 0,
  } as SearchResult;
}

const BACKEND_TO_FRONTEND_MEAL_TYPE: Record<BackendMealType, MealType> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

function backendMealTypeToFrontend(type: BackendMealType): MealType {
  return BACKEND_TO_FRONTEND_MEAL_TYPE[type];
}

function mapMealItemFromBackend(item: BackendMealItem): MealItem {
  const grams = item.grams;
  const factor = grams > 0 ? 100 / grams : 0;

  const base: NutritionBase = {
    k: Math.round(item.calories * factor),
    p: item.protein * factor,
    f: item.fat * factor,
    c: item.carbs * factor,
  };

  return {
    id: item.item_id,
    item_id: item.item_id,
    productId: item.product_id,
    name: item.name,
    brand: item.brand ?? undefined,
    grams,
    base,
    kcal: item.calories,
  } as MealItem;
}

function mapMealSummaryToMeal(summary: MealSummary): Meal {
  const type = backendMealTypeToFrontend(summary.meal_type);
  const time = summary.meal_time?.slice(0, 5) ?? summary.meal_time;

  return {
    id: summary.meal_id,
    time,
    title: type,
    kcal: summary.calories,
    items: [], // Day overview only has aggregated info; full items are loaded via GET /v1/meals/{meal_id}
    type,
  } as Meal;
}

function mapMealFromGetResponse(response: GetMealResponse): Meal {
  const { meal, items } = response;
  const type = backendMealTypeToFrontend(meal.meal_type);
  const time = meal.meal_time?.slice(0, 5) ?? meal.meal_time;

  return {
    id: meal.meal_id,
    time,
    title: type,
    kcal: meal.calories,
    items: items.map(mapMealItemFromBackend),
    type,
  } as Meal;
}

function mapDailyStats(payload: DayResponse): DailyStats {
  return {
    date: payload.date,
    totalKcal: payload.summary.calories,
    protein: payload.summary.protein,
    fats: payload.summary.fat,
    carbs: payload.summary.carbs,
    meals: payload.meals.map(mapMealSummaryToMeal),
    status: {
      code: payload.summary.status,
      label:
        payload.summary.status === 'under'
          ? 'Under target'
          : payload.summary.status === 'over'
          ? 'Over limit'
          : 'On track',
      insight: payload.insight?.text ?? '',
    },
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
      const payload = await request<DayResponse>(`/day/${dateStr}`);
      return mapDailyStats(payload);
    },
  },

  meals: {
    // POST /v1/meals — backend expects { date, meal_type, meal_time } and returns { meal_id }
    create: (payload: { date: string; meal_type: BackendMealType; meal_time: string }): Promise<CreateMealResponse> =>
      request<CreateMealResponse>(`/meals`, { method: 'POST', body: JSON.stringify(payload) }),

    // GET /v1/meals/{meal_id} — returns header + items with nutrition
    get: async (mealId: string | number): Promise<Meal> => {
      const response = await request<GetMealResponse>(`/meals/${mealId}`);
      return mapMealFromGetResponse(response);
    },

    delete: (mealId: string | number) => request(`/meals/${mealId}`, { method: 'DELETE' }),

    // POST /v1/meals/{meal_id}/items
    addItem: (
      mealId: string | number,
      data: { product_id: string | number; grams: number; added_via?: string | null }
    ) =>
      request(`/meals/${mealId}/items`, {
        method: 'POST',
        body: JSON.stringify({
          product_id: String(data.product_id),
          grams: data.grams,
          ...(data.added_via !== undefined ? { added_via: data.added_via } : {}),
        }),
      }),

    // PATCH /v1/meals/{meal_id}/items/{item_id}
    updateItem: (mealId: string | number, itemId: string | number, data: { grams: number }) =>
      request(`/meals/${mealId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify({ grams: data.grams }) }),

    deleteItem: (mealId: string | number, itemId: string | number) =>
      request(`/meals/${mealId}/items/${itemId}`, { method: 'DELETE' }),
  },

  products: {
    search: async (query: string): Promise<SearchResult[]> => {
      if (!query.trim()) return [];
      const results = await request<any[]>(`/products/search?q=${encodeURIComponent(query)}`);
      return results.map(mapProduct);
    },

    // POST /v1/products — creates a custom product
    create: (payload: { name: string; brand?: string; nutrition_per_100g: NutritionTotals }): Promise<CreateProductResponse> =>
      request<CreateProductResponse>(`/products`, { method: 'POST', body: JSON.stringify(payload) }),

    // PATCH /v1/products/{product_id}/nutrition — updates nutrition via events
    updateNutrition: (id: string | number, base: NutritionBase) =>
      request(`/products/${id}/nutrition`, {
        method: 'PATCH',
        body: JSON.stringify({ nutrition_per_100g: toNutritionPer100g(base) }),
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
    get: (range: StatsRange): Promise<StatsResponse> => request<StatsResponse>(`/stats?range=${range}`),
  },

};
