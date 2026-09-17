# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Standalone Angular 19 app: a reference guide for wiring a Jeep (wire gauges, fuses, circuit
diagrams). Purely static/content-driven — no backend, no HTTP calls, no state management beyond
Angular Router.

## Commands

- `npm start` / `ng serve` — dev server at `http://localhost:4200/`, live reload
- `ng build` — production build to `dist/jeep-wiring-guide` (production is the default configuration)
- `ng build --configuration development` — unoptimized build with source maps
- `npm test` / `ng test` — Karma/Jasmine unit tests
- `ng test --include='**/some.component.spec.ts'` — run a single spec file
- `ng generate component pages/foo` — scaffold a new standalone component following the existing structure

## Architecture

All components are standalone (no NgModules). Routing is defined in `src/app/app.routes.ts` with
three routes: home (`/`), circuit detail (`/accessory/:id`), and reference (`/reference`).

**Content lives in one file:** `src/app/data/wiring-data.ts` is the single source of truth for all
wiring content — `CATEGORIES`, `CIRCUITS` (each with a `diagram`/`groundDiagram` stage list, notes,
and an optional spec `table`), plus reference-page data like `FUSE_PANEL`, `WIRE_COLORS`, and
`NEXT_STEPS`. Adding or editing a circuit means editing this data file — pages just read from it,
they don't hold their own copies of guide content.

**Page components read the data, they don't own it:**
- `pages/home` lists categories and their circuits (`circuitsFor(categoryId)` filters `CIRCUITS`).
- `pages/accessory-detail` resolves a `Circuit` by `:id` from the route param and renders its
  diagram/notes/table.
- `pages/reference` renders the static reference data (fuse panel, wire color legend, next steps)
  plus a couple of hand-written flow diagrams (main architecture, ground plan) defined inline in
  the component rather than in `wiring-data.ts`.

**Shared rendering:** `components/flow-diagram` renders a `CircuitStage[]` as a left-to-right
arrow diagram (`ground` input switches to the ground-wire visual style). Both `accessory-detail`
and `reference` reuse it instead of duplicating diagram markup.

When adding a new circuit/accessory: add an entry to `CIRCUITS` in `wiring-data.ts` (with a unique
`id` used in the route), and it will automatically appear on the home page under its `category`
and be reachable at `/accessory/<id>` — no route or page changes needed.
