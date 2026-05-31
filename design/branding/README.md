# myFinGrid — Logo System

Five logo directions for **myFinGrid**, a modern financial operating system (not a traditional fintech).
The name decomposes into three ideas the marks are built to express:

- **my** — personal ownership; this is *your* financial command center.
- **Fin** — finance, wealth, money in motion.
- **Grid** — the connected ecosystem / infrastructure that ties accounts, budgets, goals, and people together.

Every direction is built to read as **premium, trustworthy, intelligent, minimal, modern, product-first** —
in the company of Stripe, Ramp, Linear, Revolut, Mercury, and CRED. None of them use a dollar/rupee sign,
coin, piggy bank, or any finance cliché. Growth and wealth are expressed through **upward motion** and
**network structure**, intelligence through **geometric precision**, infrastructure through the **grid**.

## Palette

| Token | Hex | Use |
|-------|-----|-----|
| Emerald 400 | `#34d399` | gradient highlight (dark) |
| Emerald 500 | `#10b981` | primary brand |
| Emerald 600 | `#059669` | gradient base |
| Emerald 700 | `#047857` | gradient base (light/app-icon) |
| Zinc 100 | `#f4f4f5` | wordmark "FinGrid" on dark |
| Zinc 400 | `#a1a1aa` | wordmark "my" prefix |
| Ink | `#0a0a0a` | wordmark on light |

**Wordmark:** two-tone `my` + `FinGrid` — a muted `my` prefix in zinc-400 lets the `FinGrid` stem carry the
weight, signalling personal ownership without shouting. Set in Geist (the product's UI typeface) at semibold.

---

## Concept 1 — Minimal geometric grid *(shipped)*

**Files:** `01-geometric-grid/{icon-dark,icon-light,app-icon}.svg`

A 3×3 lattice (the *Grid*) with three active nodes climbing the diagonal along a rising connector —
wealth building, plotted on financial infrastructure. The faint background dots read as the full grid of
possibility; the lit nodes are the path actually taken. Pure geometry, no metaphors to decode.

- **Why it wins:** legible at 16px (favicon) up to billboard; the ascending line is an instant "growth" cue
  without a chart cliché; the lattice uniquely encodes "Grid".
- **Status:** this is the direction currently live in-app — see `components/shared/Logo.tsx` (mark) and
  `app/icon.svg` (favicon).

## Concept 2 — Abstract interconnected nodes

**Files:** `02-interconnected-nodes/{icon-dark,icon-light,app-icon}.svg`

A small constellation of linked nodes resolving upward into one bright apex node. Speaks to the *network* —
accounts, people you split with, data sources — converging into a single intelligent view. The accent node
is the "you" the system optimizes for.

- **Why it's strong:** most explicitly "ecosystem/infrastructure"; feels alive and data-native.
- **Watch-outs:** the most detail-heavy mark; relies on the apex-node accent to stay legible when shrunk.

## Concept 3 — Modern monogram (M · F · G)

**Files:** `03-monogram-mfg/{icon-dark,icon-light,app-icon}.svg`

A single confident monogram: the **M** is formed by two rising peaks (my + momentum), the **F** is the
crossbar arm on the left stem, and the **G** is the hooked right terminal. Three letters, one continuous gesture.

- **Why it's strong:** ownable as a letterform; scales into a tight, brandable badge; pairs cleanly with the wordmark.
- **Watch-outs:** monograms are crowded territory; the F/G reading is intentional but secondary to the M silhouette.

## Concept 4 — Premium fintech symbol

**Files:** `04-premium-symbol/{icon-dark,icon-light,app-icon}.svg`

Three stacked chevrons ascending with increasing opacity — layered financial infrastructure resolving into
upward momentum. The most abstract and "platform-like" of the set; reads like an aperture or a stack of strata.

- **Why it's strong:** the most restrained / institutional; ages well; obvious motion language.
- **Watch-outs:** chevron stacks are a common pattern — differentiation comes from the opacity gradient and proportions.

## Concept 5 — Hidden-grid negative space

**Files:** `05-negative-space/{icon-dark,icon-light,app-icon}.svg`

A solid emerald tile with grid seams *and* an ascending arrow carved out as negative space — the grid and the
growth are the same cut. A "second read" mark in the Mercury/FedEx tradition: structure first, then the arrow appears.

- **Why it's strong:** highest cleverness/recall; the negative-space arrow rewards a second look; superb as an app icon.
- **Watch-outs:** needs minimum size to hold the cut detail; the dark variant assumes a dark canvas (and vice-versa).

---

## File matrix

Each concept ships three SVGs:

| Variant | Canvas | Notes |
|---------|--------|-------|
| `icon-dark.svg` | transparent, for **dark** UI | brighter emerald gradient (`#34d399→#059669`) |
| `icon-light.svg` | transparent, for **light** UI | deeper emerald gradient (`#10b981→#047857`) |
| `app-icon.svg` | filled rounded tile (rx≈30/128) | white mark on emerald — iOS/Android/PWA, maskable-safe padding |

All marks are authored on a tidy grid (64×64 for icons, 128×128 for app icons), use rounded caps/joins,
and are single-color-gradient so they survive monochrome printing and OS tinting.

## Recommendation

**Concept 1** is shipped and is the safe, scalable flagship. For a more distinctive future evolution,
**Concept 5 (negative-space)** is the strongest app-icon and **Concept 2 (nodes)** best dramatizes the
"financial ecosystem" story. Concepts 3 and 4 are held as a monogram badge and an institutional alternate.

> These are production-ready SVG concepts, not final trademarked artwork. Have a designer/counsel do a final
> pass (and a trademark search on the wordmark) before commercial registration.
