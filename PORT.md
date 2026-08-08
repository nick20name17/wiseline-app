# Porting the Wiseline prototype

This app is a React port of the HTML prototype in `../wiseline-demo`, built to be published on the new
review portal. The prototype is the specification, not a sketch: it encodes ~440 rules gathered from the
customer's canvas, and its own knowledge base lives in `../wiseline-demo/docs/knowledge-base/`.

**The port has to be indistinguishable from it.** Not "close" — indistinguishable, because 48 review
comments written against the prototype have to land on the same elements afterwards.

`../wiseline-demo` is reference only. **Never commit there.**

## The gates

Three checks decide whether a page is done. They are mechanical; nothing is judged by eye.

| Gate | Catches | Budget |
| --- | --- | --- |
| `data-comment` parity | a lost or renamed element — i.e. a review comment that can no longer be placed | exact |
| structural diff | a hierarchy change a screenshot cannot show | first difference wins |
| pixel diff | everything else | 0.1% |

Both viewports every time: 1440 and 390.

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
| ✅ Trim shell + seed | sidebar, top bar, tabs, `seed.json` |
| 🟡 `/trim?view=home` | `data-comment` 145/145 and structure exact; **0.91% pixels desktop, 0.16% mobile** |
| ⬜ Trim: scheduled, production, coils, calendar, completed | |
| ⬜ The other 13 pages | |

### The open pixel difference

Three flexible columns disagree: `col-chk` 80 vs 40, `col-exp` 68 vs 34, customer 332 vs 83. Ruled out:
preflight, `border-collapse`, `table-layout`, `border-spacing`, `box-sizing`, and the markup — `<thead>`
and the rows are identical, and the computed styles differ in nothing but the resulting `width`.

The thing to chase: in the prototype the three add to 480, which with the fixed columns is exactly the
1168px table. In the port they add to 157 against the same 1168 — **323px unaccounted for**. Either the
measurement read the wrong row, or the port's table has a column that query did not see. Take the full
geometry of both tables in one pass — every `<th>`, every `<td>` of the first row, `offsetParent`, and the
width of `.table-wrap` — rather than probing property by property.

## Order of work

Trim first and slowly: it sets every pattern the other departments repeat. Within it —
shell + Unscheduled (done), Scheduled, Production, Wrapping, Coils + Calendar, Completed. Then
Rollforming, Shipping, Accessories, then the ten smaller pages.

## Afterwards: the comments

The 48 comments live in the **legacy** portal (`hub.rivnetech.com`, Railway project «Design Review
Portal», project 25), not in review-2.0. Their anchors carry `dataComment` on 45 of 48, which is the
bridge. The React build becomes a *new* project on the new portal — a project is unique per
`(repo_owner, repo_name, root_dir)` — so the threads are copied across with freshly captured anchors and
project 25 is never touched.

Coverage is decided by how much of the app a reveal hook can reach: the prototype's `window.__ebmsReveal`
(in `home.html` only) reaches 19 of them, 6 need nothing, and 20 sit behind modals and deep states it
cannot drive. Port a stronger `__ebmsReveal` — every page, and a declarative map from `data-comment` to
whatever opens it. The same map is what lets the gates see modal screens at all, which today's baseline
does not.
