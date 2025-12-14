
import { Meal, MealItem, Product, SearchResult, AppSettings, DailyStats, MealType } from '../types';

const API_BASE_URL = 'https://gateway-api-food-mini-app-production.up.railway.app';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error: ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Core Requirement: GET /day/summary
  // Backend is single source of truth for calculations.
  getDaySummary: (date: Date): Promise<DailyStats> => {
    const dateStr = date.toISOString().split('T')[0];
    return request<DailyStats>(`/day/summary?date=${dateStr}`);
  },

  // Core Requirement: POST /food/log
  // Send intent data only.
  logFood: (data: { product_id: string | number; grams: number; timestamp: string; meal_type?: string }): Promise<any> => {
    return request(`/food/log`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Helpers mapped to expected backend endpoints
  meals: {
    // Legacy support if UI still calls specific item management, though logFood is primary.
    // Assuming backend supports RESTful management of logged items via /meals or similar.
    delete: (id: string | number) => request(`/meals/${id}`, { method: 'DELETE' }),
    updateItem: (mealId: string | number, itemId: string | number, data: { grams: number }) => 
      request(`/meals/${mealId}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deleteItem: (mealId: string | number, itemId: string | number) => 
      request(`/meals/${mealId}/items/${itemId}`, { method: 'DELETE' })
  },

  products: {
    search: (query: string): Promise<SearchResult[]> => {
      return request<{ results: SearchResult[] }>(`/products/search?q=${encodeURIComponent(query)}`)
        .then(res => res.results || []);
    },
    create: (data: any) => request(`/products`, { method: 'POST', body: JSON.stringify(data) }),
    updateNutrition: (id: string | number, base: any) => 
      request(`/products/${id}/nutrition`, { method: 'PATCH', body: JSON.stringify({ nutrition_per_100g: base }) })
  },

  settings: {
    get: (): Promise<AppSettings> => request(`/settings`),
    save: (settings: AppSettings) => request(`/settings`, { method: 'PATCH', body: JSON.stringify(settings) })
  },

  stats: {
    get: (range: string) => request(`/stats?range=${range}`)
  }
};
