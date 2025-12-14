# FoodTracker Gateway API — Frontend Handoff

Base URL (production): `https://<your-railway-domain>/`
All application endpoints live under the `/v1` prefix unless noted otherwise. Responses are JSON unless specified.

---
## Health & readiness
| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/healthz` | Simple liveness check (no DB access). Returns `{ "ok": true }`. |
| GET | `/readyz` | Readiness probe (touches DB). Returns `{ "ok": true }` or HTTP 503 when DB is unavailable. |

---
## Day overview
| Method | Path | Notes |
| ------ | ---- | ----- |
| GET | `/v1/day/{date}` | `date` must be `YYYY-MM-DD`. Returns: summary calories/macros, status, insight, and per-meal cards (each includes computed totals + items). Frontend displays this as the daily dashboard. |

---
## Meals CRUD
| Method | Path | Body |
| ------ | ---- | ---- |
| POST | `/v1/meals` | `{ "date": "YYYY-MM-DD", "type": "breakfast|lunch|dinner|snack", "time": "HH:MM" }`. Creates empty meal and returns full meal object. |
| GET | `/v1/meals/{meal_id}` | Returns full meal incl. items + computed totals. |
| DELETE | `/v1/meals/{meal_id}` | Cascades delete meal and all items. |
| POST | `/v1/meals/{meal_id}/items` | `{ "product_id": "uuid", "grams": number }` **or** `{ "product": {custom product payload}, "grams": number }`. Adds item and returns computed nutrition for that item plus updated meal totals. Enforces `grams > 0`. |
| PATCH | `/v1/meals/{meal_id}/items/{item_id}` | `{ "grams": number }` to update weight and recompute nutrition. |
| DELETE | `/v1/meals/{meal_id}/items/{item_id}` | Removes specific item. |

Meal payload fields follow the schemas in `app/schemas/common.py` (used in tests). Errors return `{ "error": { "code": "...", "message": "..." } }`.

---
## Products
| Method | Path | Notes |
| ------ | ---- | ----- |
| GET | `/v1/products/search?q=<query>` | Case-insensitive name search. Returns array of products with `nutrition_per_100g`. Use for autocomplete. |
| POST | `/v1/products` | Body: `{ "name": string, "brand": string | null, "nutrition_per_100g": { calories, protein, fat, carbs } }`. Creates custom product and records nutrition via `product_nutrition_events` (source=`manual`). Response includes product id. |
| PATCH | `/v1/products/{product_id}/nutrition` | Body: `{ "nutrition_per_100g": { ... } , "note": string | null }`. Creates correction event (source=`correction`). Frontend should call after editing macros. |

### Photo recognition proxy
| Method | Path | Body |
| ------ | ---- | ---- |
| POST | `/v1/products/recognize-photo` | `multipart/form-data` with one or multiple `files` fields (FastAPI `UploadFile`). Returns `{ "status": "not_implemented"/"ok", "results": [ { "label": str, "confidence": float, "nutrition_guess": {...} } ] }`. Currently stubbed to `not_implemented`, but API contract is in place for future proxying. Ensure frontend sends multipart request; dependency `python-multipart` is installed. |

---
## Settings
| Method | Path | Notes |
| ------ | ---- | ----- |
| GET | `/v1/settings` | Returns user settings (calorie target, tolerance, macro mode/targets). |
| PATCH | `/v1/settings` | Body matches GET payload. Validation enforced server-side: calorie steps of 50, macro steps of 5, percent mode sum must be 100, tolerance also 50-step. Example body:
```json
{
  "calorie_target": 2200,
  "calorie_tolerance": 100,
  "macro_mode": "percent",
  "protein_target": 30,
  "fat_target": 30,
  "carbs_target": 40
}
```
Response `{ "status": "ok" }`.

---
## Stats
| Method | Path | Notes |
| ------ | ---- | ----- |
| GET | `/v1/stats?range=7d|14d|30d` | Returns aggregated history based on `foodtracker_app.v_day_totals`. Each day includes totals and status (`under|ok|over`). Use for charts/history widgets. |

---
## Error model
All endpoints return structured errors:
```json
{
  "error": {
    "code": "VALIDATION_ERROR|NOT_FOUND|INTERNAL_ERROR|...",
    "message": "Human readable"
  }
}
```
HTTP status codes follow FastAPI defaults (400 for validation, 404 for missing entities, 503 for readiness).

---
## Auth / user context
Current version assumes a single fixed user (see `app/config.py` and `app/dependencies.py`). Frontend does not send auth headers yet; all routes act on the injected user id.

---
## Quick integration checklist for frontend
1. Always hit the Gateway, never DB directly.
2. Respect server-calculated totals; frontend should not recalc macros.
3. Use `/v1/day/{date}` to hydrate daily screen; use meal endpoints to mutate state.
4. For uploads (photo recognition), send `multipart/form-data` with file inputs named `files`.
5. Handle 422 validation errors by showing backend-provided `message`.
6. For Railway deployment, base URL is whatever Railway assigns; keep start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

This file can be copied into the frontend repository to inform API bindings.
