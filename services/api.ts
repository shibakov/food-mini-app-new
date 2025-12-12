import { Meal, Product, SearchResult, AppSettings } from '../types';

// --- MOCK DATA STORE ---
// Simulating a DB
const PRODUCTS_DB: Product[] = [
  { id: 201, name: 'Apple', brand: 'Generic', grams: 100, base: { k: 52, p: 0.3, f: 0.2, c: 14 }, kcal: 52 },
  { id: 202, name: 'Apple Juice', brand: 'Tropicana', grams: 100, base: { k: 46, p: 0.1, f: 0.1, c: 11 }, kcal: 46 },
  { id: 203, name: 'Apricot', brand: 'Generic', grams: 100, base: { k: 48, p: 1.4, f: 0.4, c: 11 }, kcal: 48 },
  { id: 204, name: 'Banana', brand: 'Chiquita', grams: 100, base: { k: 89, p: 1.1, f: 0.3, c: 23 }, kcal: 89 },
  { id: 205, name: 'Bagel', brand: 'Store Brand', grams: 100, base: { k: 250, p: 10, f: 1.5, c: 49 }, kcal: 250 },
  { id: 206, name: 'Greek Yogurt', brand: 'Chobani', grams: 100, base: { k: 59, p: 10, f: 0.4, c: 3.6 }, kcal: 59 },
  { id: 207, name: 'Oatmeal', brand: 'Quaker', grams: 100, base: { k: 379, p: 13, f: 6.5, c: 67 }, kcal: 379 },
];

let MOCK_MEALS_STORE: Meal[] = [
  { 
    id: 1, 
    time: '08:00', 
    title: 'Breakfast', 
    kcal: 450, 
    items: [
      { id: 101, name: 'Oatmeal', grams: 50, base: { k: 379, p: 13, f: 6.5, c: 67 }, kcal: 189 }, 
      { id: 102, name: 'Banana', grams: 120, base: { k: 89, p: 1.1, f: 0.3, c: 23 }, kcal: 105 }, 
      { id: 103, name: 'Black Coffee', grams: 250, base: { k: 2, p: 0.1, f: 0, c: 0 }, kcal: 5 }
    ] 
  },
  { 
    id: 2, 
    time: '13:30', 
    title: 'Lunch', 
    kcal: 820, 
    items: [
      { id: 201, name: 'Grilled Chicken Breast', grams: 200, base: { k: 165, p: 31, f: 3.6, c: 0 }, kcal: 330 }, 
      { id: 202, name: 'Quinoa', grams: 150, base: { k: 120, p: 4.4, f: 1.9, c: 21 }, kcal: 180 }, 
      { id: 203, name: 'Avocado', grams: 80, base: { k: 160, p: 2, f: 15, c: 9 }, kcal: 128 }, 
      { id: 204, name: 'Olive Oil', grams: 10, base: { k: 884, p: 0, f: 100, c: 0 }, kcal: 88 }
    ] 
  },
  { 
    id: 3, 
    time: '19:00', 
    title: 'Dinner', 
    kcal: 650, 
    items: [
      { id: 301, name: 'Salmon Fillet', grams: 180, base: { k: 206, p: 22, f: 13, c: 0 }, kcal: 370 }, 
      { id: 302, name: 'Steamed Broccoli', grams: 150, base: { k: 34, p: 2.8, f: 0.4, c: 7 }, kcal: 50 }, 
      { id: 303, name: 'White Rice', grams: 150, base: { k: 130, p: 2.7, f: 0.3, c: 28 }, kcal: 195 }
    ] 
  },
];

let SETTINGS_STORE: AppSettings = {
  calorieTarget: 2000,
  tolerance: 100,
  macroMode: 'percent',
  macros: { p: '30', f: '35', c: '35' }
};

const STATS_HISTORY_MOCK = (days: number) => {
  const data = [];
  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  
  for (let i = 0; i < days; i++) {
    const seed = (i * 1337) % 100; 
    let kcal = 0;
    if (seed % 3 === 0) kcal = 2350; // Over
    else if (seed % 3 === 1) kcal = 1600; // Under
    else kcal = 2050; // OK
    kcal += (Math.random() * 200 - 100);

    data.push({
      id: i,
      label: days === 7 ? daysOfWeek[i % 7] : (i % 5 === 0 ? `${i + 1}` : ''),
      kcal: Math.round(kcal),
      p: Math.round(110 + Math.random() * 40),
      f: Math.round(50 + Math.random() * 30),
      c: Math.round(180 + Math.random() * 60),
    });
  }
  return data;
};

// --- SERVICE METHODS ---

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  meals: {
    // GET /daily-logs/{date}
    list: async (date: Date): Promise<Meal[]> => {
      await delay(600); 
      // In a real implementation: fetch(`/api/v1/daily-logs/${dateString}`)
      return [...MOCK_MEALS_STORE];
    },
    
    // POST /meals
    add: async (meal: Omit<Meal, 'id'>): Promise<Meal> => {
      await delay(800);
      const newMeal = { ...meal, id: Date.now() };
      MOCK_MEALS_STORE.push(newMeal);
      return newMeal;
    },

    // DELETE /meals/{id}
    delete: async (id: number): Promise<void> => {
      await delay(400);
      MOCK_MEALS_STORE = MOCK_MEALS_STORE.filter(m => m.id !== id);
      return;
    }
  },

  products: {
    // GET /products/search?q={query}
    search: async (query: string): Promise<SearchResult[]> => {
      await delay(300);
      if (!query) return [];
      return PRODUCTS_DB.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
    }
  },

  stats: {
    // GET /stats/history?period={period}
    getHistory: async (period: number) => {
      await delay(500);
      return STATS_HISTORY_MOCK(period);
    }
  },

  settings: {
    // GET /settings
    get: async (): Promise<AppSettings> => {
      await delay(200);
      return { ...SETTINGS_STORE };
    },
    
    // PUT /settings
    save: async (settings: AppSettings): Promise<void> => {
      await delay(400);
      SETTINGS_STORE = { ...settings };
      return;
    }
  }
};
