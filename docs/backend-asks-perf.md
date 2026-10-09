# Backend: what the frontend's performance pass needs

From the 2026-10-09 audit of `dev` against Anthropic's «How we made claude.ai faster». The first four
asks shipped in `wiseline-back` #336 (migration `c1e2f3a4b5d6`); one follow-up is open.

| # | Ask | Backend | App |
|---|---|---|---|
| 1 | Loading window: packages once per order | Done: `shipping/loads/` carries `orders[].packages` | Done: Loading reads them inline, one request a day |
| 2 | A refused auto-complete is invisible | Done: `complete_error`, `complete_error_at` on the department state | Done on the Completed tab, waiting on 5 |
| 3 | Coils with no gauge pass the gauge filter | Done, stricter: a coil with no `ROL_GAUGE` is left out of a gauged list | Nothing |
| 4 | Priority across departments via `multiupdate/items/` | Done: 403 without `set_priority` in the lines' departments | Nothing: the app does not call `multiupdate/items/` |

## 5. Open: the Completed tab does not get the refusal

**Now.** A Rolled order shows «waiting...» in exactly one place: the Completed tab and the order's window
behind it, read from `GET departments/{id}/completed-orders/` and
`GET departments/{id}/completed-orders/{order}/` (`stages/completed_orders.py`, `list_completed` and the
detail). #336 returns `complete_error` with `OrderDepartmentStateSchema` only, which neither of these
uses, so the app never sees it there.

**Ask.** Add `complete_error` (and `complete_error_at`) to each row of `list_completed` and to the
detail payload, read from the same `OrderDepartmentState` row they already select.

**Done when:** a Rolled order whose completion EBMS refused reads «EBMS refused» on the Completed tab,
with the message in its window. The app already reads `complete_error` from the list row, so no
frontend change is needed after it ships.
