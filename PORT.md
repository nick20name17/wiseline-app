# Porting the Wiseline prototype

This app is a React port of the HTML prototype in `../wiseline-demo`, built to be published on the new
review portal. The prototype is the specification, not a sketch: it encodes ~440 rules gathered from the
customer's canvas, and its own knowledge base lives in `../wiseline-demo/docs/knowledge-base/`.

**The port has to be indistinguishable from it.** Not "close" — indistinguishable, because 48 review
comments written against the prototype have to land on the same elements afterwards.

`../wiseline-demo` is reference only. **Never commit there.**

## Start here

```bash
python3 ../wiseline-demo/serve.py 8848         # the prototype — leave it running
bunx vite build && bunx vite preview --port 5199 --strictPort
bun tools/parity/capture.ts port http://localhost:5199
bun run parity                                 # or `bun run parity home__view-production`
```

Port 5199 rather than the 5173 in `package.json`: another project on this machine holds 5173, and the
scripts take the origin as an argument precisely so nothing has to be killed. A full capture of one side
is ~3–4 minutes — run it in the background and wait for `NN captures →`, do not poll it.

**Every page is across** — the four departments (Trim, Rollforming, Shipping, Accessories), the three
scan tools (driver, scanner, loading station), and Coils, Stock Cards, Settings, Dashboard, Activity,
EBMS, Warehouse and the sign-in. Every view green at both widths, modals included, with the one
exemption below.

**Port the requirement, not the mechanism.** The prototype is fifteen documents, so it hosts one page
inside another with an `<iframe>` and moves between them with `location.href`. Both came across literally
once, and both were wrong here: two documents mean two copies of every store — a card scanned in Trim's
Stock Cards dialog could only reach Trim through `localStorage`, and nothing was listening — while
`location.href` throws the SPA away and re-seeds it on every click. Stock Cards is now
`StockCardsPanel`, mounted by its own route and by Trim's dialog (the prototype's own note asks for
exactly that), and the four `location.href` jumps go through `useGoto`. Nothing in `src` frames a page
any more; if something needs to, that is the moment to ask why.

Hosting one page inside another puts two scoped stylesheets in one document, and 43 of the 142 class
names they share are defined differently on each — `.btn`, `.toolbar`, `.modal`, `.toast`. Order would
decide, and per-route CSS chunks make order depend on where the viewer had been. So `extract-css.ts`
emits a second sheet for a hosted page (`stockcards.hosted.css`) scoped under `.wl-stockcards-host`,
which wins on specificity instead. `HOSTED` in that script is the list; add to it if another page ever
gets hosted.

**The gate captures as one person.** `capture.ts` sets `wl_role = 'manager'`, so every worker screen —
Trim's and Rollforming's narrowed tab strips, read-only priority and notes, Rollforming's station bar —
is outside all three gates and has to be checked by hand against the prototype at the same role. A
board's own role comes from the sidebar's «Viewing as» (`src/session/dept-role.ts`, the prototype's
`wlOnRole`): worker and driver read as `worker`, everyone else as `manager`.

Two things printing taught late, since neither gate can see a print stylesheet. The port's `#root`
stands in for the prototype's `<body>`, so a rule that anchors at the root *twice* —
`html.is-printing-cards body > *` — had a step left over that could never match, and both print
sheets were dead; `scope.ts` now drops it. And the class those rules key on goes on `#root`, beside
`data-page`, not on `documentElement`.

**Activity is gated on a race, and it is worth knowing.** Its feed generates a random event every 4.5
seconds, on both sides. Both captures land inside that first window, so both show the sixteen seeded
rows — but a slow load on either side would put an invented row in one baseline and not the other. If
that page ever goes red with one extra row, re-run it before believing it. Every state clicks Pause
first, for exactly this reason.

**Shipping's board does not reach its own two most important screens.** `renderTruckExpandedGrid` (the
load-assignment grid) and the Load builder live *only* in a modal, so read `renderScheduled` and
`renderTruckExpandedGrid` together before touching either: `schedGridOrders` is deliberately shared by
the render, Select-All and Reschedule so all three act on the same visible rows.

**The Map is gated, with one honest exemption.** Its pins, legend and counts are the port's own work and
are compared like anything else. The OpenStreetMap tiles under them are not: how many have arrived when
the capture is taken is a fact about the network, so `collect.ts` records `.leaflet-tile-pane` but does
not descend into it. That is the only place the gate looks away, and it is one line, commented.

## The gates

Three checks decide whether a page is done. They are mechanical; nothing is judged by eye.

| Gate | Catches | Budget |
| --- | --- | --- |
| `data-comment` parity | a lost or renamed element — i.e. a review comment that can no longer be placed | exact |
| structural diff | a hierarchy change a screenshot cannot show | first difference wins |
| pixel diff | everything else | 0.1% |

Both viewports every time: 1440 and 390.

A capture refuses to be recorded under a page the browser is not on: one run filed thirteen mobile
captures under the name of the page before them, and a mislabelled baseline compares two real screens
against each other and reports nothing at all.

The first two are the ones that must hold: they are the behaviour and the anchors, and a comment lands or
does not. The pixel diff is a net, not a specification — it is how the three cascade bugs below were
found, none of which was visible by eye. When it is the only one red and the cause is understood and
cosmetic, say so and move on; do not spend a day on a sub-pixel.

### Screens the default capture cannot reach

A `.view` is captured as it first renders, so everything behind a tab, a mode switch or a drill-in went
unjudged — Production alone hid three whole renderers, and the port was green without any of them. The
states in `tools/parity/states.ts` are a view plus a short list of things to click, and the clicks are
addressed by `data-comment`: the one attribute both builds promise to keep, so one list drives the
prototype and the port without knowing anything about either's markup. A state whose path a build cannot
follow is reported, not skipped.

Two things the harness had to learn along the way. Views share a store, so a state's clicks are still in
effect when the next view renders — expanding an order on Unscheduled put its line items into the
Scheduled baseline — and the page is now reloaded whenever a state has dirtied it. And horizontal
scrollers are wound back before the screenshot on both sides: `fullPage` already means the gate does not
judge where a page is scrolled to, and the prototype rebuilds its markup on every click while React does
not, so the machine-tab strip alone would have failed forever on 390.

```bash
python3 ../wiseline-demo/serve.py 8848     # the prototype
bunx vite build                            # the port is served as a build, see below
bun run parity:demo                        # re-record the baseline (rarely)
bun run parity:port                        # record the port
bun run parity [page-or-key]               # compare, e.g. `bun run parity home__view-home`
```

The port is captured from `vite preview`, not the dev server: the React Compiler's babel plugin resolves
from the process working directory, and the preview harness keeps that inside the parent repo.

A page is ported when every one of its views is green at both widths.

## How each piece gets across

Nothing here is retyped by hand if a tool can copy it.

- **CSS** — `bun tools/port/extract-css.ts ../wiseline-demo` lifts every `<style>` block whole and scopes
  it to `[data-page="<page>"]`. Class names are untouched; they are what the gates compare.
- **Seed data** — `bun tools/port/dump-seed.ts <page> http://localhost:8848` loads the prototype, clears
  `localStorage`, and writes its own `store.get()` to `src/features/<page>/seed.json`.
- **Markup** — by hand, element for element, keeping every `data-comment` and every class.
- **Logic** — by hand, keeping the prototype's function names and store keys so its knowledge base still
  describes this code.

### The loop that ported six views

Repeat per view; it took roughly one commit each.

1. Read the prototype's `renderX()` and every helper it calls. Port the helpers into `selectors.ts` and
   `store.ts` under **the prototype's names** — `sortScheduled`, `allMachinesAssigned`, `releaseType` —
   so its knowledge base still describes this code.
2. Write the component with every `data-comment` and every class, and follow the prototype's *control
   flow*: where it returns early, return early. Production has three renderers behind one view because
   `renderProduction` returns three times, and flattening that into one component would have quietly
   changed which chrome each screen carries.
3. Interactions that only open a popover stay unwired, but the button, its classes and its
   `data-comment` are all there — a comment has to land on it either way.
4. `bunx vite build`, capture the port, run the gate. Read the three checks in order: `data-comment`
   first, structure second, pixels last.
5. Add a state to `tools/parity/states.ts` for anything the default render does not show.

Two more things the gate is for, both from Rollforming:

- The prototype writes `space · nbsp · space` between a line's Product ID and its spec text, and JSX
  swallows one of a run of spaces. The structural diff collapses whitespace and reported nothing; the
  screenshot was 0.19% out on three states. Whenever markup is retyped, the spaces *between* elements
  are part of it.
- **A class the browser computes has to be computed in the port too.** Shipping fades the edge of any
  horizontally-scrollable table by toggling `can-scroll-l` / `can-scroll-r` on the wrapper from a
  measurement. The port needs `useTableShadows`, which runs after every render on purpose: a row
  expanding changes whether there is more to scroll. The gate caught it as `lost class can-scroll-r`,
  and nothing else on that page disagreed.
- **Read the store through `useStore`, never `get()`, anywhere a render depends on it.** The group tab
  strip read `activeGroup` with `get()`; its only prop is a constant, so the compiler was free to skip
  it, and the tabs kept the group they first rendered while the tables under them moved. The structural
  diff named it exactly — `lost class active` — because a state clicked the tab.

- **A toast that never shows is a missing element.** The scan tools raise one after every action, and
  the collector only records what is on screen — so a stubbed toast cost three `data-comment` values
  the prototype's baseline had. `useToast` wires it for real, on the prototype's own 2200ms.
- **The scan input takes focus back after every scan.** A gun types into whatever holds focus, and the
  focus ring is in the screenshot: leaving it off read as a 0.17% pixel difference, twice.
- **lucide renames icons; the prototype pinned an older CDN copy.** `wand-2` is `wand-sparkles` now,
  `check-square` is `square-check-big` — same glyphs, different classes, and the class is what the
  structural diff reads. The port writes the prototype's name on alongside; extra classes are
  tolerated, missing ones are not. Expect one of these per few pages.
- **Reading the clock in render costs the component its memoisation.** The release countdown called
  `Date.now()` inline, as the prototype does inside its 5-second re-render. React Compiler refuses to
  optimise a component that calls an impure function while rendering, and react-doctor caught it as an
  error. `useNow()` makes the tick a value; the selector takes `now` as an argument.
- **A counter a lambda increments loses the whole component.** Two views numbered their rows with
  `index++` inside a `.map`. React Compiler cannot lower that, bails on the function, and stops
  memoising it — react-doctor reported it as its top error. Compute the offsets before the map instead;
  the numbers, and so the anchors, are identical.

### Why the seed is copied and not written

A quarter of the review comments anchor to `data-comment` values built at runtime out of entity ids —
`wrap-locrow-13`, `prod-donebtn-4`, `wrap-li-pri-13-1`. Different ids, different anchors, lost comments.
Trim's order ids run `1..8, 13, 15, 9, 10, 14, 11, 12`; nobody would reproduce that by hand, and nobody
would think to try.

## Decisions already made

**Each page keeps its whole stylesheet.** An early version factored the rules common to all fifteen pages
into a `base.css`. Those rules are the prototype's density overrides, which it deliberately puts *last*;
loading them *first* flipped the cascade, `.btn` went 30px → 36px and the sign-in card grew 6px. Only 23
rules were common. Duplication is the cheaper mistake.

**Every `<style>` counts, attributes and all.** The role switcher ships its own
`<style data-comment="role-switch-style">`; a pattern matching only a bare `<style>` left «Viewing as»
`static` instead of a fixed floating pill.

**Tailwind and shadcn dress what we add; the prototype's CSS dresses what we ported.** They coexist
because Tailwind emits everything in cascade layers and unlayered rules beat layered ones, and because
the colliding tokens (`--accent`, `--border`, `--primary`) are declared by shadcn on `:root` and by the
prototype on the page element. The shadcn palette in `src/index.css` *is* the prototype's palette, so a
dialog opened over a ported screen matches it.

The layer rule only settles a property the prototype actually declares. Where it declares none, Tailwind
reaches straight into a ported page, and both ways it can do that cost a day each:

- *A ported class that spells a utility.* `<table class="grid">` made Tailwind emit a real
  `display: grid`; `<thead>` and `<tbody>` became blocks and laid themselves out as two separate tables.
  Ported markup is no longer scanned (`@source not './features'`), which covers every name only it
  uses — `filter`, for one. Across all fifteen pages `grid` is the only name we genuinely share, and it
  is reverted inside `[data-page]`.
- *Preflight, which does reach in, three times.* `input, button { font: inherit }` hands every control the
  page font; the prototype asks for that one declaration at a time, on the controls that want it, and
  leaves the rest on the browser's own Arial 13.333px — so a calendar cell was set in the wrong face,
  and the `line-height` the shorthand also carries made every button two pixels too tall. And
  `svg { display: block }` turns an inline icon into a line of its own: a day tab grew a third row and a
  production date wrapped under its own icon. And `font-size: inherit; font-weight: inherit` on `h1`–`h6`
  takes away a weight the prototype never declares because it is leaning on the browser's own bold — an
  empty state's `<h3>` came out at body weight. All three reverted inside `[data-page]`.

All four guards live at the bottom of the imports in `src/index.css`, at one element of specificity, so
any prototype rule still outranks them. Three of them were found only because the pixel gate stayed red at
0.11–0.12% — well under what anyone would notice by eye, and wrong on every screen. The heading one was
red at 390 and *green at 1440*: the same wrong text is a smaller share of a bigger page, so a defect can
hide behind the budget at one width and not the other.

One cost to know: this template's shadcn wraps `@base-ui/react`, so the DOM element is created inside
`node_modules` and the review plugin cannot stamp it with `data-review-src`. Such elements still anchor
through the `descent` leg, just less strongly. Prefer intrinsic elements on anything a client will
comment on.

**`#root` is the port's `<body>`.** The prototype writes its page as the first child of `<body>`; the port
writes the same markup as the first child of the mount point, and the gates compare from there. Global
chrome that is not part of a page — the toaster — is portalled to `document.body` so it stays out.

**Views are a search param, not routes.** `/trim?view=production` is the prototype's `#view-production`.
They share a store, a selection and a scroll position; the prototype treats moving between them as
changing a tab.

**The store is the prototype's store.** `createStore` in `src/store/create-store.ts` has the same shape and
the same shallow-merge `set`. Keys are not renamed and not split up: they are what the knowledge base
describes and what a real API will be fitted to. Read slices with `useStore`, one call per value — a
selector that builds an object returns a new snapshot every render and loops forever.

**The `wl_` keys stay.** They are the prototype's cross-page contracts and are now typed and zod-validated
under `src/store/shared/`. A browser that has used the demo keeps its state, and the two can run side by
side. `wl_loc_release_*` is deliberately four keys, one per department: they each number locations from 1.

## State

| | |
| --- | --- |
| ✅ Gates, baseline, tooling | `tools/parity/`, `tools/port/`, `parity/demo/` committed |
| ✅ `/sign-in` | green, both widths |
| ✅ Cross-page `wl_` contracts | typed, validated, 4 tests |
| ✅ Shared chrome | sidebar + top bar in `src/components/shell/`, lifted once two pages spelled them alike |
| ✅ Trim shell + seed | its own department bar, tabs, `seed.json` |
| ✅ `/trim` — all six views | green at 1440 and 390 |
| ✅ Trim's reachable states | 7 of them, incl. both wrapping drill-ins — see `tools/parity/states.ts` |
| ✅ Rollforming shell + Unscheduled | seven views as one search param, 4 states green at both widths |
| ✅ `/rollforming` — all seven views | green at 1440 and 390, 42 captures |
| ✅ Rollforming's reachable states | 13 of them, both renderers of every view that has two |
| ✅ Shipping shell + Unscheduled | + its Accessories tab; 5 captures green at both widths |
| ✅ `/shipping` — all five views | green at 1440 and 390, Map included |
| ✅ Shipping's reachable states | 8 of them: three on Scheduled, two on Loading, three on Unscheduled |
| ✅ `/accessories` — all four views | green at 1440 and 390, 20 captures |
| ✅ Accessories' reachable states | 7, incl. the split order and the package builder |
| ✅ The three scan tools | `/driver`, `/scanner`, `/loading` — green, with 5 states |
| ✅ `/activity` | green, with 3 states — paused, filtered, and no matches |
| ✅ `/dashboard` and `/warehouse` | green, warehouse with 2 legend states |
| ✅ `/ebms` | green, with 2 states — the Failed filter and a retry |
| ⬜ The last 3 pages | coils, stockcards, settings |

### What Shipping still owes

Its two modals, and they hold more than the other departments' do. `renderTruckExpandedGrid` — pick
orders, Add To Load, Reschedule, New Package — opens only from a truck card, and the Load builder with
its drag-to-reorder route and Release To Loading opens only from there. The board is honest about what it
shows, but nothing on it can be *done* until those two land. Also unopened: Completed Orders (90 days),
Trucks Notes, the Schedule modal and the per-order notes drawer.

### What Accessories still owes

Its modals: the scheduling calendar (entire, partial and reschedule all open the same one), the
location picker, the packages window and the two notes drawers. Also unwired, and deliberately: the
packaging inputs are `readOnly`, because a quantity typed there feeds the weight box, the three gate
buttons and Create & print — none of which exist yet, and a half-live input would be worse than a
still one.

### What Rollforming still owes

The same as Trim, and for the same reason: everything left is behind a modal. Thirteen of them, and they
are the substance of the page — the calendar that schedules, the Select Supplier / Coil Number and Create
Cutlist window, the coil picker and its lot numbers, the package builder and its keypad, the location
picker, the notes drawer, the material request form, the completed-order detail. Every button that opens
one is ported and carries its `data-comment`; none of them opens anything.

Two Queue actions are unwired for the same reason rather than because they are hard: checking a coil into
a machine depletes its on-hand and toasts, and completing a slit auto-fills a Supplier and Coil Number.
Both are pure state and both belong with a state that proves them.

### What Trim still owes

Nothing the gate can see. What is left on this page is behind a modal — the reschedule and machine
popovers, the notes drawer, the location picker, the coil-adjustment window, the wrap and stock keypads.
The buttons are all there and carry their `data-comment`; none of them opens anything yet, and no state
can reach a screen that does not open. Porting one means porting the state that proves it at the same
time, or the next person reads a green gate and believes it.

## Order of work

Trim first and slowly: it sets every pattern the other departments repeat. Rollforming, Shipping and
Accessories followed and are all done to the limit of what the gate can reach. What is left is the ten
smaller pages — and the modals, which are now the only outstanding work on all four departments and the
one thing no gate currently watches.

Two things the second department taught, both worth knowing before the third:

- **Share a piece of chrome only when two pages already spell it the same way.** The sidebar and top bar
  were identical down to the `data-comment`, so they moved to `src/components/shell/` with one prop
  between them (the search placeholder). The department bar was not: Rollforming's has a spacer, a
  `tabs-row` and an actor bar. Sharing that one would have meant six props and two branches.
- **A tab count can need a view that does not exist yet.** The tab strip is on screen in every view, so
  Rollforming's Queue count had to be right before the Queue was ported. Port the selector with the
  shell, not with the view.

## Afterwards: the comments

The 48 comments live in the **legacy** portal (`hub.rivnetech.com`, Railway project «Design Review
Portal», project 25), not in review-2.0. Their anchors carry `dataComment` on 45 of 48, which is the
bridge. The React build becomes a *new* project on the new portal — a project is unique per
`(repo_owner, repo_name, root_dir)` — so the threads are copied across with freshly captured anchors and
project 25 is never touched.

Coverage is decided by how much of the app a reveal hook can reach: the prototype's `window.__ebmsReveal`
(in `home.html` only) reaches 19 of them, 6 need nothing, and 20 sit behind modals and deep states it
cannot drive. The stronger hook this needs — a declarative map from `data-comment` to whatever opens it,
on every page — is the same idea as `tools/parity/states.ts`, which already reaches the tabs and the
drill-ins. When the modals are ported, grow that list rather than starting a second one, and the reveal
hook becomes a reader of it.
