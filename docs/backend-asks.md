# Backend asks — round 2

What the Trim board still needs from the API. The first round (`wiseline-back` #257–#263) is answered
and off this list. Board references are `p1 (x, y)` — page 1 of the client's workflow board, the point
the requirement sits at. Found while running the whole Trim flow against `api.wiseline.app` on
2026-09-23; order numbers are from that database.

## 1. Blocking the flow

1. **Order Complete gets no response.** `POST /wrapping/orders/04E5VCBAI5C7HEH0/complete/?department_id=1`
   (order 142837, every line Wrapped) still fails after #263. Cause found 2026-09-23: EBMS refuses the
   `C_MFG` write on `ARINVDET` (`stages/order_complete.py`) with `FORBIDDEN` — «Cannot set 'C_MFG'
   property of 'ARINVDET' entity… because this field is read only in EBMS». `C_MFG` is a custom field
   and needs opening on the EBMS side (Jerry) or another way to record the manufactured figure. EBMS may
   also refuse the write for an order not in `U` status; `order_complete.py` does not check the EBMS
   status first, so such an order should get a clear 400 before the push, not EBMS's error. Also
   send CORS headers on error responses, so the 502 with EBMS's reason reaches the app — today the
   browser sees no response at all. Until this works no customer order can be completed and the
   Completed Orders tab cannot be checked. Stock orders finish through manufacturing batches and do not
   hit this.

2. **A stock order comes without its lines.** `StockOrderRowService.rows` (`stages/stock_rows.py`)
   builds each stock-order row of `GET ebms/orders/` with `details = []`, and `GET /items/` has no
   `order` filter. So S10010, S10014 and S10015 show «no Trim line items» on Scheduled: no machine can
   be assigned, Release answers «no machine assigned», and the stock order never reaches the Stock
   window at the bench. Ask: fill `details` (one per `pm_item`, shaped like an EBMS line, `item`
   included), or accept `order=` on `GET /items/`. «The Manager would Schedule the Stock Order just
   like an EBMS order» p1 (146,355).

3. **Release refuses a line taken wholly from stock.** The machine check in
   `OrderDepartmentStateService` (`stages/services.py`, «line item(s) still have no machine assigned»)
   also applies to a line whose `pull_from_stock >= quantity`. Such a line is Stock and needs no machine
   p1 (292,449); the app shows «Stock» in place of the machine picker. Seen on 142885: the order could
   not be released until a machine was forced onto that line. Ask: skip the check for those lines.

4. **No coil lots reach the app.** `CoilSyncService._lots_for` (`stages/coil_sync.py`) returns nothing
   while `INLOTS` is not mirrored, so `GET /coils/lots/` is empty. The Coils tab, Cutlist Coils, the
   Slinet coil checkbox and the new colour / gauge / width / folder columns cannot be used at all.
   Nor can the rule that cutlist work waits for a coil checked into the Slinet p1 (502,469): the app
   cannot tie it to a coil while there are none.

## 2. Logic that does not follow the board

5. **A remake turns green on Done, not on Complete.** `CutlistService._advance_remanufacture` runs from
   `mark_done` only. The board: «Once the Slinet Worker marks the material as Cut (Complete), then the
   Remanufacture column needs to change from orange to green here in the Machine tab» p1 (613,462),
   (478,586), (478,590). Ask: advance to Cut when the recut row is completed, to Bent when the
   machine's row is.

6. **A bypassed order stays Bypassed after wrapping.** 142837 has every line Wrapped and the order still
   reads Bypassed. «It will stay Bypassed until the Worker wraps the trim» p1 (252,578). Ask: roll the
   order up to Wrapped like any other.

7. **A stock order is on Unscheduled and Scheduled at once.** S10010 and S10014 are scheduled (they
   have a production date on Scheduled) yet also come back with `is_scheduled=false`. The
   `having count(production_date) < count(id)` test in `stock_rows.py` is true, so some Trim line of
   theirs has no date — possibly rows the #16 fix created on scheduling.

8. **A released line shows no status.** After Release the lines of 142885 read «—» until the Slinet
   cut them. The board shows each trim's status once released p1 (293,492), (293,525): Not Started
   first. Ask: set `not_started` on the line items at release.

9. **An edit after release leaves its bendlist behind.** Reassigning a released line's machine
   «spins off a new bendlist» p1 (650,338), and Stock entered after damage lowers Qty to Manufacture
   p1 (700,451), (703,509). `PATCH /items/{id}/` rolls up the order status and nothing else; bendlists
   are only built at release. Ask: move the line's pieces to the new machine's bendlist on a `flow`
   change, and lower the row on a `pull_from_stock` change. (`sources[].item_id` is already there to
   address the line.)

10. **The first cut leaves the other lines Not Started.** When the Slinet completes its first row,
   `apply_row_completion` sets only that row's line items to Cut. «Once the Slinet Worker marks the
   first material line as Complete (Cut), then all the Status's for every line item connected to that
   cutlist would change to In Progress», on every machine p1 (650,318). Ask: move
   every line item of the cutlist to `in_progress` on its first completed row (Cut still wins per row).

11. **A remake leaves the line on its old bendlist.** `CutlistService.request_remanufacture`
   (`stages/cutlist_services.py`) creates the recut cutlist and the new bendlist, and leaves the
   original rows as they were. «That line item gets removed from the current bendlist and a new
   bendlist is created with only that line item in it» p1 (653,488). Ask:
   take the remade pieces off the current bendlist row when the remake is asked from a machine tab.

12. **Wrapping sorts by autoid, not by ID.** `GET /wrapping/` orders by `Item.origin_item`
   (`stages/wrapping.py:111`), the EBMS autoid. The board sorts by Production Date, then Priority, then
   ID — the Product ID (TBT8262, TDE8262…) p1 (943,285). Ask: make the third key the product ID.

## 3. Missing fields and endpoints

13. **Work days.** Which days are worked, holidays included: `is_work_day` on each
    `GET /departments/{id}/day-strip/` entry, or `GET /work-days/`. The board walks the five-day strip
    over work days only and refuses scheduling onto a closed day.

14. **Per-day review, release and unschedule.** A split order has a row per production day, but the
    reviewed toggle (`PATCH /sales-orders/{id}/departments/{dept}/`), `POST /departments/{dept}/release/`
    and unschedule act on the whole order. Ask: accept a production date so each day acts on its own.

15. **Mark a note unread.** `read: false` on the order-note and line-note mark-read calls, or an
    `…/unread/` beside them.

16. **Wrapping row fields.** On `GET /wrapping/` rows: `is_stock` (today the bench calls
    `GET …/complete/` only to learn which window to open), `is_bypassed` (a bypassed line reads
    `wrapped` once packed, and the bench cannot tell it may not be remade p1 (835,298)), `length` (red when not 120"),
    `unit_weight` (package weight worked out from the pieces entered), and `po`, `salesman`,
    `ship_date`, `ship_via` for the order info block p1 (885,283).

17. **Package weight ceiling.** `max_package_weight` (lb, nullable) per department in
    `GET /departments/all/`, writable via `PATCH /departments/{id}/`. An over-weight package turns its
    box red and asks for an override p1 (940,365).

18. **Cutlist source.** On `CutlistRowSourceSchema`: the order's printed number, its customer and
    `po_number`. The «Orders using this size» window is Order | Customer | PO# | …; a source names its
    order by autoid only, so today the app downloads the whole Scheduled list to label a few rows.

19. **Stock cards.** `width`, `gauge`, `color` and the image URL on `StockCardSchema`. The card carries
    `image_id` but nothing to show the picture from, and the panel filters by colour and gauge.

20. **Coils.** `grade` on `CoilLotSchema` (the Coil Filter's Grade leg cannot be tested without it), or
    `GET /coils/lots/?department_id=` applying the department's Coil Filter server-side. And offer
    Deplete from `POST /coils/lots/{id}/apply/` for any figure sent as 0, not only `coil_thickness`:
    today the app turns a 0 in Linear Feet or Weight into `coil_thickness: 0` to get the Deplete question.

21. **Coil suppliers.** `GET/POST /coil-suppliers/` and `DELETE /coil-suppliers/{id}/` (`id`, `name`) for
    the Coil Suppliers window on the Machines screen p1 (821,73).

22. **Day capacity.** `capacity` / `over_capacity` on the day strip and `total.capacity` on
    machine-capacities as the sum of the department's machines' `daily_max_bends`. The API reads a
    capacity off the EBMS category that nothing on screen sets; the app sums the machines itself today.

23. **Stock window rows.** `is_standard_length` on `GET /wrapping/stock-orders/{order}/` rows, as cutlist
    rows have, instead of the app's own 120".

24. **Default warehouse on a location slot.** `warehouse_is_default` on each `GET /wrapping/locations/`
    slot. Select Location opens on the default warehouse p1 (543,104), and today the app fetches the whole
    warehouse list only to learn which one that is.

25. **Drawings.** Deferred on your side (S3). Still open: does a drawing belong to the product or to the
    line item?

## 4. Requests the board makes too many of

26. **Stock orders on every page.** `GET ebms/orders/` prepends every matching stock order to every page
    and adds them to `count` again, so the app has to fetch all pages and deduplicate. Ask: page them
    with the rest.

27. **Order locations in bulk.** Location codes on each `GET ebms/orders/` row, or
    `GET /wrapping/orders/locations/?order=…&order=…`. Today: one request per Scheduled row.

28. **Overdue days in one request.** `GET /departments/{id}/day-strip/?dates=…&dates=…`, or the figures on
    the overdue list itself. Today: one request per overdue day.

29. **Tab-strip counts.** `GET /departments/{id}/counts/` — unscheduled, scheduled, active Slinet
    cutlists, Trim coils. Today the Coils count downloads every coil in the company.

30. **Remanufacturings by line.** `origin_item` / `department` filters on `GET /remanufacturings/`.
    Today the app pulls one page of every remake and narrows it itself.

31. **Reorder priorities in one call.** `POST /priorities/reorder/` with `{ department, ids }`, renumbering
    in one transaction. Today one drag is a `PATCH` per row, and a failure halfway leaves the
    department half-moved.

32. **One order's lines by its number.** An expanded order shows all its Trim lines, the ones outside
    the tab greyed out, but `GET ebms/orders/?is_scheduled=` also narrows each order's `details` to the
    matching lines, and `order=` (`invoice__like`) is not applied — the full list comes back. Today the
    app searches the invoice number and picks the order out. Ask: honour `order=`. Also note: a line's
    `production_date` on that list is the order's earliest day in the department, not the line's own;
    the app reads only `item.production_date`. And `count_items` does not always match the Trim lines
    sent (W20109: 5 against 4), so it cannot say on its own that lines were left out.

## 5. Questions

- Does `pieces_from_stock` / `bends_from_stock` on machine-capacities mean pieces of stock orders, or
  pieces pulled from stock? The Production tooltips read it as stock orders.
- The overdue list flags days with 0 bends, and days whose orders do not show on the Scheduled tab.
  Which orders does it count?
- A Stock column on a stock order: the board says both «no Stock column for Stock Orders» p1 (150,423)
  and «the Stock column needs to be editable» p1 (326,443). The app follows (150,423) for now — we are
  asking the client.
