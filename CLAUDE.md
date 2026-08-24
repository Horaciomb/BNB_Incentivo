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

- `server.py` connects to PostgreSQL (`rrhh_bd`) via `psycopg2`, reading `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD` env vars with hardcoded non-secret defaults (host `10.0.0.2`, db `rrhh_bd`, user `bex_app`, empty password default).
- **If `DB_PASSWORD` is unset/empty, the backend skips the DB connection entirely** and serves hardcoded fallback data (`FALLBACK_BNB` / `FALLBACK_BILLE` lists in `server.py`) instead of querying Postgres. This is expected behavior for local dev without DB access, not a bug.
- CORS is wide open (`allow_origins=["*"]`) — fine for local dev, would need tightening before any real deployment.

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
