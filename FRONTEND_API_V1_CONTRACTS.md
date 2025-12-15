# FoodTracker Gateway API — v1 Frontend Contracts

This document describes **exact request/response contracts** for the frontend,
aligned with the current backend code (routers + `app/schemas/common.py`).

Base URL (production):

```text
https://<your-railway-domain>/
```

All application endpoints live under the `/v1` prefix unless noted otherwise.

---
## Global conventions

### Date & time formats

- Date in path or body: **`YYYY-MM-DD`** (ISO date, no time part)
- Time fields in body: **`HH:MM`** or `HH:MM:SS` (24h)

### Meal type enum

```ts
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
```

### Nutrition totals

Backend models (Pydantic):

```py
class NutritionTotals(BaseModel):
    calories: int
    protein: float
    fat: float
    carbs: float
```

Frontend TypeScript equivalent:

```ts
export interface NutritionTotals {
  calories: number; // integer
  protein: number;  // float
  fat: number;      // float
  carbs: number;    // float
}
```

### Error model

Planned/target model (from spec):

```json
{
  "error": {
    "code": "VALIDATION_ERROR|NOT_FOUND|INTERNAL|...",
    "message": "Human-readable message"
  }
}
```

**Note about 422 validation errors:**
FastAPI/Pydantic may still return raw validation errors in the form

```json
{ "detail": [ { "loc": [...], "msg": "...", "type": "..." } ] }
```

Frontend should be prepared to:
- use unified `error` when present, but
- also handle `detail[]` for low-level validation issues (like wrong field names).

---
## 1. Day overview

### GET `/v1/day/{date}`

- `date` (path): `YYYY-MM-DD`

Backend response model: `DayResponse`.

```ts
export type DayStatus = 'under' | 'ok' | 'over';

export interface Insight {
  text: string;
  severity: 'positive' | 'neutral' | 'warning';
}

export interface Summary extends NutritionTotals {
  status: DayStatus;
}

export interface MealSummary extends NutritionTotals {
  meal_id: string;
  meal_type: MealType;
  meal_time: string; // 'HH:MM:SS'
  items_count: number;
}

export interface DayResponse {
  date: string;        // 'YYYY-MM-DD'
  summary: Summary;
  meals: MealSummary[];
  insight: Insight | null;
}
```

Usage: hydrate the daily dashboard (header summary + meal cards list).

---
## 2. Meals CRUD

All routes live under `/v1/meals`.

### 2.1 POST `/v1/meals`

**Request body (backend `MealRequest`):**

```ts
export interface CreateMealRequest {
  date: string;      // 'YYYY-MM-DD'
  meal_type: MealType;
  meal_time: string; // 'HH:MM' or 'HH:MM:SS'
}
```

Note: **field names are important** — must be `meal_type` and `meal_time`
(not `type` / `time`).

**Response body:**

Backend returns only the new meal id:

```ts
export interface CreateMealResponse {
  meal_id: string;
}
```

Typical frontend flow:
1. Call `POST /v1/meals` with `CreateMealRequest`.
2. Get `meal_id` from response.
3. Optionally call `GET /v1/meals/{meal_id}` to load full card with items.

---

### 2.2 GET `/v1/meals/{meal_id}`

Returns the full meal card: totals + items.

Backend builds response from `v_meal_totals` and `v_meal_items_computed`.

```ts
export interface MealHeader extends NutritionTotals {
  meal_id: string;
  meal_type: MealType;
  meal_time: string; // 'HH:MM:SS'
}

export interface MealItem {
  item_id: string;
  name: string;
  grams: number;     // > 0
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  added_via: string | null; // e.g. 'search' | 'manual' | null
}

export interface GetMealResponse {
  meal: MealHeader;
  items: MealItem[];
}
```

---

### 2.3 DELETE `/v1/meals/{meal_id}`

Deletes meal and all its items (ON DELETE CASCADE in DB).

```ts
export interface DeleteMealResponse {
  status: 'ok';
}
```

If meal does not exist, backend returns `404` with error model.

---

### 2.4 POST `/v1/meals/{meal_id}/items`

Adds an item (product) to a meal.

**Important:** current backend supports **only reference by `product_id`**.
To add a custom product, first call `POST /v1/products`, then use returned `product_id` here.

**Request body (`MealItemRequest`):**

```ts
export interface CreateMealItemRequest {
  product_id: string;  // UUID of existing product
  grams: number;       // integer, must be > 0
  added_via?: string | null; // optional; source tag ('search', 'manual', etc.)
}
```

Validation:
- `grams <= 0` → 422 validation error.

**Response body:** same `MealItem` as in `GET /v1/meals/{meal_id}`:

```ts
export type CreateMealItemResponse = MealItem;
```

---

### 2.5 PATCH `/v1/meals/{meal_id}/items/{item_id}`

Updates grams for an existing item.

**Request body (`MealItemUpdateRequest`):**

```ts
export interface UpdateMealItemRequest {
  grams: number; // integer, must be > 0
}
```

**Response body:** updated `MealItem`.

```ts
export type UpdateMealItemResponse = MealItem;
```

If item does not exist (for given `meal_id` + `item_id`), backend returns 404.

---

### 2.6 DELETE `/v1/meals/{meal_id}/items/{item_id}`

Removes a specific item from the meal.

```ts
export interface DeleteMealItemResponse {
  status: 'ok';
}
```

404 if item not found.

---
## 3. Products

All routes live under `/v1/products`.

### 3.1 GET `/v1/products/search?q=...`

Case-insensitive search by name.

Backend response model: `ProductSearchResult`.

```ts
export interface ProductSearchResult {
  product_id: string;
  name: string;
  brand: string | null;
  nutrition_per_100g: NutritionTotals;
}

export type ProductSearchResponse = ProductSearchResult[];
```

---

### 3.2 POST `/v1/products`

Creates a **custom product**.

Backend request model: `ProductRequest`.

```ts
export interface CreateProductRequest {
  name: string;
  brand?: string | null;
  nutrition_per_100g: NutritionTotals;
}
```

Backend will:
- insert into `products` with `is_custom = true`,
- append a row to `product_nutrition_events` with `source = 'manual'`.

**Response (recommended for frontend typings):**

Backend returns at least `product_id`; depending on implementation it may also
include echoes of other fields. Safe minimal contract:

```ts
export interface CreateProductResponse {
  product_id: string;
  // other fields may be present but should not be relied upon as of now
}
```

Use `product_id` to add items to meals via `/v1/meals/{meal_id}/items`.

---

### 3.3 PATCH `/v1/products/{product_id}/nutrition`

Corrects nutrition values via events (append-only).

Backend request model: `ProductNutritionUpdate`.

```ts
export interface UpdateProductNutritionRequest {
  nutrition_per_100g: NutritionTotals;
}
```

> Note: earlier drafts mentioned an optional `note` field; current backend
> schema **does not** include it. Send only `nutrition_per_100g`.

**Response:**

```ts
export interface UpdateProductNutritionResponse {
  status: 'ok';
}
```

---

### 3.4 POST `/v1/products/recognize-photo`

Photo recognition proxy (currently stubbed).

**Request:**

- `multipart/form-data`
- One or multiple files under field name `files`.

Example (browser):

```ts
const formData = new FormData();
selectedFiles.forEach(file => formData.append('files', file));
await api.post('/v1/products/recognize-photo', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
```

**Response model (`PhotoRecognitionResponse`):**

```ts
export interface PhotoRecognitionResult {
  // shape is flexible / TBD; current backend returns stub
  [key: string]: any;
}

export interface PhotoRecognitionResponse {
  status: 'not_implemented' | 'ok';
  results: PhotoRecognitionResult[];
}
```

As of now, backend always returns:

```json
{ "status": "not_implemented", "results": [] }
```

Frontend should treat this as **non-functional placeholder**.

---
## 4. Settings

### 4.1 GET `/v1/settings`

Backend response model: `Settings`.

```ts
export type MacroMode = 'percent' | 'grams';

export interface Settings {
  calorie_target: number;    // multiple of 50
  calorie_tolerance: number; // multiple of 50
  macro_mode: MacroMode;
  protein_target: number;    // multiple of 5
  fat_target: number;        // multiple of 5
  carbs_target: number;      // multiple of 5
}
```

Constraints (enforced server-side):
- `calorie_target % 50 === 0`
- `calorie_tolerance % 50 === 0`
- `protein_target % 5 === 0`
- `fat_target % 5 === 0`
- `carbs_target % 5 === 0`
- if `macro_mode === 'percent'` → `protein + fat + carbs === 100`

### 4.2 PATCH `/v1/settings`

**Request body:** same shape as `Settings`.

```ts
export type UpdateSettingsRequest = Settings;
```

**Response:**

```ts
export interface UpdateSettingsResponse {
  status: 'ok';
}
```

On validation failure, backend returns 422 (validation error) with details.

---
## 5. Stats

### GET `/v1/stats?range=7d|14d|30d`

Backend response model: `StatsResponse`.

```ts
export type StatsRange = '7d' | '14d' | '30d';

export interface StatsDay {
  date: string;  // 'YYYY-MM-DD'
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  status: DayStatus; // 'under' | 'ok' | 'over'
}

export interface StatsResponse {
  range: StatsRange;
  items: StatsDay[];
}
```

Use this for history charts / trend widgets.

---
## 6. Health & readiness

These are mostly for monitoring and dev tooling; frontend usually does not call them directly.

### GET `/healthz`

- Liveness check (no DB access).
- Response: `{ "ok": true }` on success.

### GET `/readyz`

- Readiness probe (touches DB).
- Response:
  - `{ "ok": true }` when ready,
  - HTTP 503 when DB is unavailable.

---
## 7. Auth / user context

Current version assumes a **single fixed user** (see `app/config.py`, `app/dependencies.py`).

- Frontend does **not** send auth headers yet.
- All routes act on the injected `user_id`.
- Future versions may introduce real auth; this document will then be updated accordingly.

---
## 8. Integration checklist for frontend

1. Always call the **Gateway API**, never the DB or other services directly.
2. Use the exact field names and enums specified above (e.g. `meal_type` / `meal_time`).
3. Treat backend as single source of truth for all nutrition and totals.
4. When adding custom products, use two-step flow:
   - `POST /v1/products` → get `product_id`,
   - `POST /v1/meals/{meal_id}/items` with that `product_id`.
5. Handle both unified `error` model and raw `detail[]` validation errors.
6. For photo recognition, send `multipart/form-data` and be ready for `status: "not_implemented"`.
7. For Railway deployment, base URL is the Railway-assigned domain; keep backend start command as in README.
