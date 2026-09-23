# TODO

Work that is blocked on someone else, or deliberately deferred. Delete an entry once it lands.

## Backend: release asks for a machine on a line pulled wholly from stock

**Ask:** skip the machine check in `OrderDepartmentStateService` (`stages/services.py`, «line item(s)
still have no machine assigned») for a line whose `pull_from_stock >= quantity`.

**Why:** such a line reads Stock and needs no machine (p1 (292,449)), so the Scheduled tab shows
«Stock» in place of the machine picker. Release then answers 400 and the order cannot be released at
all — seen on 142885 with one of its two lines all from stock.

**On our side once it lands:** nothing changes.

## Backend: a line edited after release leaves its bendlist behind

**Ask:** when a released line item's `flow` or `pull_from_stock` changes through `PATCH /items/{id}/`,
move its pieces: reassigning the machine takes the line off its bendlist and onto a new one for the
other machine; a Stock figure changed at the machine lowers the row's Qty to Manufacture.

**Why:** the board lets the worker reassign a line's machine, which «spins off a new bendlist»
p1 (650,338), and enter Stock after damage p1 (700,451), with Qty to Manufacture following p1 (703,509).
`ItemsService.partial_update` rolls up the order status and nothing else; bendlists are only built at
release (`CutlistService.generate_for_releases`), so either edit would leave the list saying the old
thing. The row's `sources[].item_id` is already there to address the line.

**On our side once it lands:** the bendlist's Machine button and Stock keypad in `CutlistRows`.

## Backend: a stock order comes to Scheduled without its lines

**Ask:** fill `details` on the stock-order rows `GET ebms/orders/` returns — one per `pm_item` of the
order, shaped like an EBMS line (`autoid` = the item's `origin_item`, `inven`, `descr`, `quanto`,
and `item` with the app's row) — or accept `order=` on `GET /items/`.

**Why:** «the Manager would Schedule the Stock Order just like an EBMS order» p1 (146,355), which
means assigning each line a machine before Reviewed and Release. `StockOrderRowService.rows`
(`stages/stock_rows.py`) builds the row with `details = []`, and `GET /items/` has no order filter, so
the Scheduled tab shows «This order has no Trim line items to show» for S10010 and S10014. With no
line to assign, Release answers «no machine assigned» and the stock order never reaches the bench —
so the Stock window (`StockWrap`) cannot be reached either.

**On our side once it lands:** nothing changes; the Scheduled tab already renders `origin_items`.

## Backend: no coil lots reach the app

**Ask:** mirror EBMS `INLOTS` so `CoilSyncService.sync` can create lot rows.

**Why:** `_lots_for` (`stages/coil_sync.py`) returns nothing while `INLOTS` is missing from the mirror
and logs «no coil lots were created», so `GET /coils/lots/` is empty and the Coils tab, the Slinet
coil checkbox and Cutlist Coils have nothing to show. The colour, gauge, width and folder columns and
the folder tabs are built but cannot be seen working until lots arrive.

**On our side once it lands:** nothing changes.

## Backend: a remake turns green on Done, not on the row's Complete

**Ask:** move a remanufacture to Cut when its Slinet recut row is marked Complete (and to Bent when
the machine's row is), not only when the whole list is marked Done.

**Why:** «Once the Slinet Worker marks the material as Cut (Complete), then the Remanufacture column
needs to change from orange to green here in the Machine tab» p1 (613,462), (478,590).
`CutlistService._advance_remanufacture` (`stages/cutlist_services.py`) runs from `mark_done` only, so
the machine tab stays orange until the Slinet worker also presses Done.

**On our side once it lands:** `useUpdateCutlistRow` already invalidates everything under `trimKeys.all`.

## Backend: Order Complete answers nothing, not even an error

**Ask:** get the `C_MFG` write on `ARINVDET` accepted — EBMS answers `FORBIDDEN`, «this field is read
only in EBMS»; it is a custom field and needs Jerry on the EBMS side — and send CORS headers on error
responses too. An order not in EBMS `U` status may be refused as well; check that first and answer
with a clear 400. Seen on 142837 (`04E5VCBAI5C7HEH0`).

**Why:** the browser gets no response at all — status and body are both hidden — so the 502 with
EBMS's reason that #263 promises never reaches the toast. No order can be completed, so Completed
Orders cannot be checked against a real one.

**On our side once it lands:** nothing changes; the toast already shows the server's reason.

## Backend: a stock order shows on Unscheduled and Scheduled at once

**Ask:** check `StockOrderRowService.rows` (`stages/stock_rows.py`) for S10010 and S10014.

**Why:** both are scheduled (they show on the Scheduled tab with a production date), yet both also
come back with `is_scheduled=false`. The `having count(production_date) < count(id)` test is true,
so some Trim line of theirs has no date — possibly rows the #16 fix created on scheduling.

**On our side once it lands:** nothing changes.

## Backend: a bypassed order stays Bypassed after it is wrapped

**Ask:** roll the order's department status up to Wrapped once every line is Wrapped, bypassed or not.

**Why:** «It will stay Bypassed until the Worker wraps the trim» p1 (252,578). 142837 has every line
Wrapped and still reads Bypassed on the Scheduled tab.

**On our side once it lands:** nothing changes.

## Backend: a released line shows no status

**Ask:** set `not_started` on the line items at release (`docs/backend-asks.md` #8).

**Why:** after Release the lines of 142885 read «—» until the Slinet cut them; the board shows each
trim's status once released p1 (293,492), (293,525).

**On our side once it lands:** nothing changes.

## Backend: remakes come unfiltered

**Ask:** `origin_item` / `department` filters on `GET /remanufacturings/` (`docs/backend-asks.md` #30).

**Why:** `remanufacturingsQuery` pulls one page of every remake and narrows it by line in the browser.

**On our side once it lands:** the query asks for the lines it shows.

## Client: a Stock column on a stock order?

The board says both «no Stock column for Stock Orders» p1 (150,423) and «the Stock column needs to be
editable» p1 (326,443); the backend asked which. The Scheduled tab follows p1 (150,423) today and hides
the column on a stock order (`withoutStock` in `src/features/trim/lib/columns.ts`). Ask the client.

## Backend: reorder a department's priorities in one request

**Ask:** an endpoint that takes a department's priority ids in their new order and renumbers them
1..N in one transaction, e.g. `POST /priorities/reorder/` with `{ department, ids }`.

**Why:** the settings page reorders by dragging, and the hierarchy is the row order, so one drag
renumbers every priority between the two places. Today that is one `PATCH /priorities/{id}/` per
row (`useReorderPriorities` in `src/features/priorities/api.ts`); if one fails the others have
already landed and the department is left half-moved.

**On our side once it lands:** `useReorderPriorities` sends the ids once instead of a PATCH per row.

## Backend: the Wrapping row still lacks what the order screen reads

**Ask:** `length`, `unit_weight`, `po`, `salesman`, `ship_date` and `ship_via` on the rows
`GET /wrapping/` returns. `product_id`, `customer` and `from_stock` have landed.

**Why:** the order screen marks a piece that is not 120" in red (`length`), works the package weight
out from the pieces entered as `main` does (`unit_weight`), and carries the order info block under
the table (`po`, `salesman`, `ship_date`, `ship_via`) — `docs/wiseline-spec.md` screen (885,283).

**On our side once it lands:** `WrapOrder` gets the Length column, the full info block, and a
read-only package weight in place of the box the floor types it into.

## Backend: no drawing behind a trim

**Ask:** an image per product — a `drawing` (file id or URL) on whatever names the product, so a
line item can show the profile the floor is bending.

**Why:** the bendlist's last two columns are Drawing and Line Item Notes, and the Drawing is the
sketch of the profile (`docs/wiseline-spec.md` screen (660,522), expanded row). `files/routers.py`
attaches files to `PackageItem`, `Package` and `Skid` only, and nothing on a line item, a product or
a cutlist row points at one. The Stock Card holds a sketch through `image_id`, but a card exists for
stocked products alone.

**On our side once it lands:** the Drawing column goes into `CutlistRows`, beside the notes.

**Status:** deferred by the backend — drawings will live in S3, and it is still open whether a
drawing belongs to the product or to the line item (a custom trim has its own profile per order).

## Backend: no coil suppliers to manage

**Ask:** CRUD for a coil supplier — `GET/POST /coil-suppliers/` and `DELETE /coil-suppliers/{id}/`,
returning `id` and `name`.

**Why:** the Machines admin screen carries a Coil Suppliers button on the Rollforming section, and
"clicking this button would open this window where you would be able to create a list of coil
suppliers" (`docs/wiseline-spec.md` screens (807,64) and (807,77)) — a window listing Taylor, Color
Steel and Cascadia, each with a remove button, and an Add button below. The only supplier endpoint
is `GET /coil-assignment/{origin_item}/suppliers/`, which reads the suppliers behind one line item's
coils. Nothing lists the suppliers themselves, and nothing creates or removes one.

**On our side once it lands:** the Coil suppliers button on the Rollforming card in
`src/features/machines/components/machines-page.tsx` is enabled and opens the popup; today it is
shown disabled.

## Backend: no ceiling on a department's package weight

**Ask:** a `max_package_weight` (lb, nullable for no limit) on each department in
`GET /departments/all/`, writable through `PATCH /departments/{id}/`.

**Why:** an Over Weight package turns its box red, and Create & Print asks for an override
(`docs/wiseline-spec.md` screen p1 (940,365)-(951,365)). Something has to say what over weight is
per department, and the design on `main` sets it from a Max package button on each department of the
Machines screen (`src/features/settings/areas.tsx`). No endpoint stores such a figure.

**On our side once it lands:** the Max package button on every card in
`src/features/machines/components/machines-page.tsx` shows the figure and opens an editor; today it
is shown disabled with «no limit».

## Backend: a day's capacity is not its machines' daily max added up

**Ask:** `capacity` and `over_capacity` on `GET /departments/{id}/day-strip/` and `total.capacity`
on `GET /departments/{id}/machine-capacities/` computed as the sum of the department's machines'
`daily_max_bends`, instead of read from `/capacities/` on the EBMS category.

**Why:** the design on `main` has no department capacity to set; the day's ceiling is the machines'
daily max added up (`totalDailyCap` in `src/features/trim/selectors.ts` on `main`), and every day tab
shows `(used / capacity)` (`docs/wiseline-spec.md` screen p1 (81,286)). The API reads a figure that
nothing on screen sets.

**On our side once it lands:** `dailyCapacity` in `src/features/trim/api.ts` goes, and the two
queries take `capacity` and `over_capacity` as the server sends them.

## Backend: no Work Days source

**Ask:** which days are worked, holidays included — e.g. `is_work_day` on each
`GET /departments/{id}/day-strip/` entry, or `GET /work-days/`.

**Why:** the board walks its five-day strips over work days only, opens the Scheduled tab on the
first one, refuses scheduling onto a closed day («—» in the calendar picker), and greys closed days
on the Calendar with « · non-work day» (`selectors.ts` `nextWorkDays`, `schedule-modal.tsx`,
`calendar.tsx` on `main`). Settings › Work Days is a placeholder, and nothing the client reads says
which days are closed.

**On our side once it lands:** `CapacityCalendar` disables closed days, `isWorkDay` in
`calendar-tab.tsx` reads it instead of assuming Sat/Sun, and the strips skip closed days.

## Backend: an Order Note or line note cannot be marked unread

**Ask:** `read: false` on the existing mark-read calls, or `…/unread/` beside them.

**Why:** the board lets «Dealt with» be undone (`note-modal.tsx` on `main`). Only mark-read exists.

**On our side once it lands:** the «Dealt with» check in `OrderNoteDialog` and `LineNotesDialog`
becomes an undo button.

## Backend: review, release and unschedule act on the whole order, not on one production day

**Ask:** accept a production date on the reviewed toggle
(`PATCH /sales-orders/{id}/departments/{dept}/`), on `POST /departments/{dept}/release/` and on
the unschedule call.

**Why:** «After splitting an order, each part needs to act as a completely separate order.» The
Scheduled tab lists one row per production day, but reviewing, releasing or unscheduling one day
still acts on every day of the order.

**On our side once it lands:** selection and review key on (order, day) in `ScheduledTab`, and each
call sends the row's day.

## Backend: a coil lot has no grade, and the lots list takes no department filter

**Ask:** `grade` on `CoilLotSchema`, and/or `GET /coils/lots/?department_id=` applying that
department's Coil Filter on the server. `color`, `gauge`, `width`, `folder_id` and the folder filter
have landed.

**Why:** Trim Coils are the coils whose Thickness, Width and Grade all fall inside the filter; the
Grade leg still cannot be tested in the browser.

**On our side once it lands:** `passesCoilFilter` in `src/features/trim/lib/coils.ts` tests all
three legs (or goes, if the server filters).

## Backend: a cutlist source names no PO and no drawing

**Ask:** `po_number`, the order's printed number and its customer on `CutlistRowSourceSchema`, and
a drawing file URL once drawings exist.

**Why:** the «Orders using this size» window on `main` is Order | Customer | PO# | Product ID |
Description | Qty ord. | Stock | Qty to mfg | Drawing (`cutlist-total.tsx`). The line's own figures
now come from the source; the order number and customer are still looked up in the Scheduled list,
because a source names its order by autoid only.

**On our side once it lands:** `CutlistTotalDialog` gets PO# and Drawing and stops reading the
Scheduled list.

## Backend: a stock card carries no width, gauge, colour or image

**Ask:** `width`, `gauge`, `color` and an image URL on `StockCardSchema`.

**Why:** the prototype's Stock Cards panel shows the whole card face and filters by colour and gauge
(`src/features/stockcards/panel.tsx` on `main`).

**On our side once it lands:** `StockCardsDialog` shows the face and gets the two filters.

## Backend: an order's locations come one order at a time

**Ask:** the location codes on each order `GET ebms/orders/` returns (e.g. `location_codes: str[]`),
or `GET /wrapping/orders/locations/?order=…&order=…` for many orders at once.

**Why:** the Scheduled tab's Trim Location column lists every location an order stands in, as the
board does. Today that is one `GET /wrapping/orders/{order}/locations/` per row — up to 100 per page,
and again after every write.

**On our side once it lands:** `ScheduledRow` reads the codes off the order and its per-row query goes.

## Backend: overdue days come one strip request each

**Ask:** `GET /departments/{id}/day-strip/?dates=…&dates=…`, or the overdue endpoint returning the
same bends/capacity figures per day it already lists.

**Why:** every overdue day gets its own day tab, and each needs its bends and capacity. Today that is
one `day-strip` request per overdue day. The overdue list also flags days (e.g. with 0 bends) whose
orders do not show on the Scheduled tab — worth checking which orders it counts.

**On our side once it lands:** `ScheduledDayTabs` makes one request for all the extra days.

## Backend: no cheap counts for the tab strip

**Ask:** a counts endpoint for a department — unscheduled orders, scheduled orders, active Slinet
cutlists, Trim coils (after the Coil Filter) — e.g. `GET /departments/{id}/counts/`.

**Why:** the tab strip shows all four on every tab. Today the Coils count downloads every coil in
the company and filters it in the browser, and the others pull a full page each.

**On our side once it lands:** `TrimPage` reads the four figures from it.
