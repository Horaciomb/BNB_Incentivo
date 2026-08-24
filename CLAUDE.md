# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Small dashboard app for a sales-incentive campaign ("Cierre de Agosto 2026", BEX/BNB). Frontend and backend live in the **same root directory** (no `frontend/`/`backend/` subfolders):

- `src/` — React 19 + Vite app. `src/App.jsx` holds nearly all UI logic (~700 lines), `src/api.js` is the fetch wrapper, `src/main.jsx` is the entry point.
- `server.py` — single-file FastAPI backend at repo root.

## Running the app

- Frontend dev server: `npm run dev` → Vite on **port 5175** (hardcoded in `vite.config.js`, not Vite's default 5173). Proxies `/api/*` to `http://localhost:8000`.
- Frontend build: `npm run build`. Preview build: `npm run preview`.
- Backend: `python server.py` (or `uvicorn server:app`) → runs on **port 8000**. Activate the venv on Windows with `venv\Scripts\Activate.ps1`, not a POSIX `bin/activate`.
- Both must be running together for live data; the frontend falls back to hardcoded static data if the backend is unreachable (see below).
- No `requirements.txt` exists. The venv's pinned packages: `fastapi==0.141.1`, `uvicorn==0.52.4`, `psycopg2-binary==2.9.12`, `pydantic==2.13.4` (plus transitive deps). Regenerate a manifest from the venv (`venv\Scripts\pip.exe freeze`) if one is needed.
- No test suite, linter, or formatter is configured anywhere in this repo.

## Backend / database

`server.py` talks to **three** separate PostgreSQL databases on the same server (`10.0.0.2:5432`), not one:

| DB | Role/credential | Purpose |
|---|---|---|
| `rrhh_bd` | `bex_app` / `DB_PASSWORD` | Employee list (name, city, supervisor, `telefono`) for active BNB unit staff |
| `bnb_bd` | `bex_ingeniero` / `RRHH_PG_PASSWORD` | Raw `fact_afiliaciones` — real BNB campaign production |
| `bille_bd` | `bex_ingeniero` / `RRHH_PG_PASSWORD` | Raw `fact_afiliaciones` — real BILLE campaign production |

- **BILLE is not a separate business unit — it's a campaign of BNB.** Both campaigns are measured against the *same* active BNB-unit employees, matched by phone number (`empleado_unidad.telefono`).
- In `bnb_bd`/`bille_bd`, the column `fact_afiliaciones.codigo_bex` actually stores the **phone number** (not a business code) — that's the join key against `empleado_unidad.telefono`. This is a documented gotcha from the sibling RRHH migration project, not a mistake in this code.
- Counts are filtered by exact `fecha_hora_envio` in the campaign window (`CAMPANA_DESDE`/`CAMPANA_HASTA_EXCLUSIVO`, currently 24–31 Aug 2026), **never** read from `rrhh_bd.actividad_afiliacion_mensual` — that table aggregates by calendar month and would overcount, since the campaign is a partial-month window.
- Dedup ("producción no duplicada" per `correo.txt`) is `COUNT(DISTINCT id_afiliacion)`.
- `bex_ingeniero` is a privileged migration/reporting role (also used by the separate `rrhh-app`/`Lab` projects at `C:\temp\RRHH\`) — reused here read-only (`conn.set_session(readonly=True)`) rather than provisioning a new role, per explicit user decision. Its password lives only in the `RRHH_PG_PASSWORD` env var, shared with those other projects — never hardcode or version it.
- **If either `DB_PASSWORD` or `RRHH_PG_PASSWORD` is unset/empty, the backend skips all DB connections entirely** and serves hardcoded fallback data (`FALLBACK_BNB` / `FALLBACK_BILLE` lists in `server.py`) instead — partial real data (e.g. real names with zeroed-out counts because one DB wasn't reachable) is intentionally avoided. This is expected behavior for local dev without DB access, not a bug.
- A phone number shared by more than one active `empleado_unidad` row (rare, documented in the migration project) is treated as ambiguous and skipped rather than double-counted — see the `vistos` set in `get_incentivos()`.
- CORS is wide open (`allow_origins=["*"]`) — fine for local dev, would need tightening before any real deployment.
- A `.mcp.json` at the repo root declares read-only MCP Postgres connections to `rrhh_bd`, `bnb_bd`, and `bille_bd` (same `bex_ingeniero`/`RRHH_PG_PASSWORD` credential) so Claude Code can inspect the real schema directly — requires a Claude Code restart to pick up after being added/changed.

## Campaign rules — keep in sync across files

Campaign targets/prizes are duplicated independently in two places and must be edited together if the campaign changes:
- `server.py` → `META_CONFIG` dict
- `src/App.jsx` → `CAMPAIGN_RULES` constant

Current rule (per `correo.txt`, period 24–31 Aug 2026): BNB target 60 cuentas / Bs.150, Bille target 70 cuentas / Bs.150, both met → Bs.300 ("Bono Doble Meta").

Fallback employee datasets are *also* duplicated: `server.py` (`FALLBACK_BNB`/`FALLBACK_BILLE`) and `src/App.jsx` (`STATIC_BNB_DATA`/`STATIC_BILLE_DATA`).

## Legacy files — not part of the active app

These root-level files are earlier/parallel iterations, not wired into the Vite/FastAPI app. Don't edit them when working on `src/App.jsx` or `server.py`, and don't assume they're runnable as part of this project:
- `codigo.js` + `index_gas.html` — a Google Apps Script version reading from Google Sheets.
- `Dashboard_Corpus.html` — a standalone static HTML/Tailwind-CDN prototype.
