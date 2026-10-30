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

**3D map:** `src/app/data/jeep-map.ts` holds the 3D layout used by `/map` (lazy-loaded, three.js):
`MAP_NODES` (where things sit on the Jeep, in metres), `MAP_WAYPOINTS` (shared harness bends) and
`MAP_ROUTES` (legs per circuit id). The scene code is in `pages/jeep-map/jeep-scene.ts`; the page only
reads the data. Positions are illustrative, not measured. Clicking a part opens its connection
details (`connectionsFor()`), so every node needs a `desc` and every waypoint a `WAYPOINT_LABELS` entry.
Selecting a circuit also shows an example photo from `data/wire-images.ts` (Wikimedia Commons, free
licences, files in `public/images/wires/`). Keep the author and licence credit for any photo you add;
`jeep-map.spec.ts` checks every circuit has one.

**Schematics:** `data/circuit-schematics.ts` describes each circuit as branches of two-pin parts joined
by net names. `schematics/schematic.ts` lays that out once and produces the KiCad-style drawing on the
circuit page, a downloadable `.kicad_sch`, and a Universal Netlist (`.netlist.json`).
`npm run check:netlists` exports all circuits and loads and checks them with the
`@intelligentelectron/universal-netlist` package (a dev dependency). A new circuit needs an entry here;
`schematics/schematic.spec.ts` fails without one. Nothing has been opened in KiCad itself yet.
The page drawing has two palettes (`PALETTES`: dark by default, KiCad paper on a toggle), column captions
from `branchTitle()`, click-a-part explanations from `describePart()`/`PART_HELP`, and a legend from
`legendItems()`. The arrow diagrams tag each stage with a role from `flow-roles.ts`. The `.kicad_sch` and
netlist outputs are locked by golden hashes in `schematic.spec.ts`: change them only on purpose.

**Relays:** a circuit that uses a relay sets `relay: relayWiring({...})` in `wiring-data.ts`. The circuit page then
shows a 5-pin pinout and a pin-by-pin table (`components/relay-pinout`), with coil polarity per DIN 72552
(85 negative, 86 positive). `data/relay-wiring.spec.ts` fails if a circuit's schematic has a relay and `relay` is missing.

**Flashers:** the turn signal and hazard circuits set `flasher: flasherWiring({...})` the same way, giving a 3-pin
pinout and table (`components/flasher-pinout`, DIN 72552: 49 input, 49a output, 31 ground).
`data/flasher-wiring.spec.ts` fails if a schematic has a part named "flasher" and `flasher` is missing.

**Shopping list:** `/shopping` (`pages/shopping-list`) is a tick-off buy list read from `data/shopping-list.ts`.
Relay and flasher quantities are counted from the circuits' `relay`/`flasher` data. Item ids are the saved-data keys
(localStorage `jeep-shopping-list-v1`), so rename one only with a new key. Wire lengths are estimates. Wire is one row
per size and colour (`wire-<gauge>-<colour>`), with colours from `WIRE_COLORS`. The "Part" line in each arrow-diagram box
comes from `data/stage-parts.ts`, which works the part out from the box label, so a new circuit needs no extra field.

When adding a new circuit/accessory: add an entry to `CIRCUITS` in `wiring-data.ts` (with a unique
`id` used in the route), and it will automatically appear on the home page under its `category`
and be reachable at `/accessory/<id>` — no route or page changes needed. Also add a `MAP_ROUTES` entry
with the same id in `jeep-map.ts`: `jeep-map.spec.ts` fails if a circuit has no 3D route.
