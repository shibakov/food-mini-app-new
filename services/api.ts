import {
  DayResponse,
  Meal,
  MealItem,
  ProductSearchResult,
  AppSettings,
  StatsResponse,
  ISODate,
  UUID,
  MealType,
  MacroMode
} from './contracts/api.v1';

/* ======================================================
   API CONFIG
   ====================================================== */

const API_BASE_URL = '/api/v1';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error: ${res.status}`);
  }

  return res.json();
}

/* ======================================================
   API METHODS
   ====================================================== */

export const api = {
  /* ---------- DAY / MAIN ---------- */

  getDay(date: ISODate): Promise<DayResponse> {
    return request(`/day/${date}`);
  },

  /* ---------- MEALS ---------- */

  createMeal(data: {
    date: ISODate;
    type: MealType;
    time: string;
  }): Promise<{ meal_id: UUID }> {
    return request(`/meals`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteMeal(mealId: UUID): Promise<{ ok: true }> {
    return request(`/meals/${mealId}`, {
      method: 'DELETE',
    });
  },

  getMeal(mealId: UUID): Promise<Meal> {
    return request(`/meals/${mealId}`);
  },

  /* ---------- MEAL ITEMS ---------- */

  addMealItem(
    mealId: UUID,
    data: {
      product_id: UUID;
      grams: number;
      added_via: 'search' | 'manual' | 'label' | 'photo';
    }
  ): Promise<{ item_id: UUID }> {
    return request(`/meals/${mealId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateMealItem(
    mealId: UUID,
    itemId: UUID,
    data: { grams: number }
  ): Promise<{ item_id: UUID }> {
    return request(`/meals/${mealId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteMealItem(
    mealId: UUID,
    itemId: UUID
  ): Promise<{ ok: true }> {
    return request(`/meals/${mealId}/items/${itemId}`, {
      method: 'DELETE',
    });
  },

  /* ---------- PRODUCTS ---------- */

  searchProducts(query: string): Promise<{ results: ProductSearchResult[] }> {
    return request(`/products/search?q=${encodeURIComponent(query)}`);
  },

  createProduct(data: {
    name: string;
    brand: string | null;
    nutrition_per_100g: {
      calories: number;
      protein: number;
      fat: number;
      carbs: number;
    };
    source: 'manual' | 'label';
  }): Promise<{ product_id: UUID }> {
    return request(`/products`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateProductNutrition(
    productId: UUID,
    nutrition_per_100g: {
      calories: number;
      protein: number;
      fat: number;
      carbs: number;
    }
  ): Promise<{ ok: true }> {
    return request(`/products/${productId}/nutrition`, {
      method: 'PATCH',
      body: JSON.stringify({ nutrition_per_100g }),
    });
  },

  /* ---------- SETTINGS ---------- */

  getSettings(): Promise<AppSettings> {
    return request(`/settings`);
  },

  saveSettings(settings: AppSettings): Promise<{ ok: true }> {
    return request(`/settings`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  },

  /* ---------- STATS ---------- */

  getStats(range: '7d' | '14d' | '30d'): Promise<StatsResponse> {
    return request(`/stats?range=${range}`);
  },
};
