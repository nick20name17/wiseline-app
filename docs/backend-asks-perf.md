# Backend: what the frontend's performance pass needs

From the 2026-10-09 audit of `dev` against Anthropic's «How we made claude.ai faster». Everything else
from that audit was fixed on the frontend; these need the API.

## 1. The Loading window asks for packages once per order

**Now.** `LoadingPage` lists the day's released Loads and, for every order on them, calls
`GET wrapping/orders/{order}/packages/` — one request per order, all on mount
(`src/features/shipping/components/loading-page.tsx`, `OrderPackages`). A day with 10 Loads of 6 orders
is 60 requests before the dock sees a full screen, and ticking one package refetches that order's list.

**Ask.** One of:

- `GET shipping/loads/?ship_date=…&status__in=…` (what `dayLoadsQuery` already calls) returns each
  order's packages inline: `package_id`, `name`, `weight`, `location`, `is_loaded`; or
- a batch endpoint, `GET wrapping/packages/?orders=A,B,C`, answering
  `{ "<order>": [ { package_id, name, weight, location, is_loaded } ] }`.

**Done when:** the Loading window for a day is one request (or two), however many orders are on it.

## 2. A refused auto-complete is invisible

Not a speed issue, but found on the same pass. When a Rollforming order is Rolled and every package is
located, `stages/rollforming.py` `recalculate` calls `OrderCompleteService.complete`; if EBMS refuses
(order not Open, status X), the error is only logged (`logger.warning`, `rollforming.py:133-137`) and the
order stays Rolled with nothing on it saying why. The board shows «waiting…» for a location the order
already has.

**Ask.** Store the last refusal on the order's department state (`complete_error`, `complete_error_at`)
and return it with the order, or have `GET wrapping/orders/{order}/complete/` included in the order
payload. **Done when:** the board can say «EBMS refused: not Open (status X)» on that row.

## 3. Coils with no gauge pass the gauge filter

`stages/coil_colours.py:86` admits `coalesce(rol_gauge, 0) == 0`, so a coil with a blank ROL_GAUGE shows
under every gauge — 24 and 26 ga coils under a 29 ga product, even when the gauge is written in the
description («CS26448262 26GA BLAC»). **Ask:** fill ROL_GAUGE in EBMS for those coils, or parse the
`NNGA` token from the description as a fallback. **Done when:** a 29 ga line lists no 24/26 ga coils.

## 4. A Manager can set priorities in another department

`POST multiupdate/items/` takes a priority but checks only the global role (`stages/routers.py:1419`),
not `set_priority` for the department, unlike `multiupdate/orders/` (`:1436-1438`). **Done when:** a
Manager of Trim gets 403 setting a priority on Rollforming line items through it.
