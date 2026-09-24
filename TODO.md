# TODO

Work that is blocked on someone else, or deliberately deferred. Delete an entry once it lands.

## Backend: no coil lots reach the app

**Ask:** mirror EBMS `INLOTS` so `CoilSyncService.sync` can create lot rows.

**Why:** `_lots_for` (`stages/coil_sync.py`) returns nothing while `INLOTS` is missing from the mirror
and logs «no coil lots were created», so `GET /coils/lots/` is empty and the Coils tab, the Slinet
coil checkbox and Cutlist Coils have nothing to show. The colour, gauge, width and folder columns and
the folder tabs are built but cannot be seen working until lots arrive.

**On our side once it lands:** nothing changes.

## Backend: Order Complete is refused by EBMS

**Ask:** get the `C_MFG` write on `ARINVDET` accepted — EBMS answers `FORBIDDEN`, «this field is read
only in EBMS»; it is a custom field and needs Jerry on the EBMS side. Seen on 142837
(`04E5VCBAI5C7HEH0`). CORS on errors and the 400 for an order not Open in EBMS have landed.

**Why:** no customer order can be completed, so Completed Orders cannot be checked against a real one.

**On our side once it lands:** nothing changes; the toast already shows the server's reason.

## Client: a Stock column on a stock order?

The board says both «no Stock column for Stock Orders» p1 (150,423) and «the Stock column needs to be
editable» p1 (326,443); the backend asked which. The Scheduled tab follows p1 (150,423) today and hides
the column on a stock order (`withoutStock` in `src/features/trim/lib/columns.ts`). Ask the client.

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

## Backend: review and release act on the whole order, not on one production day

**Ask:** accept a production date on the reviewed toggle
(`PATCH /sales-orders/{id}/departments/{dept}/`) and on `POST /departments/{dept}/release/`.
Unschedule takes one already, and release puts each line on its own day's lists.

**Why:** «After splitting an order, each part needs to act as a completely separate order.» The
Scheduled tab lists one row per production day, but reviewing or releasing one day still acts on
every day of the order. The backend holds one flag per (order, department) and needs a per-day state
first.

**On our side once it lands:** selection and review key on (order, day) in `ScheduledTab`, and each
call sends the row's day.

## Backend: no holidays

**Ask:** closed days beyond the weekend — the day strip's `is_work_day` knows Monday to Friday and the
company's `working_weekend` only.

**Why:** the board walks its strips over work days and refuses scheduling onto a closed day; a holiday
still reads as open.

**On our side once it lands:** nothing changes; the strips and pickers read `is_work_day`.

## Backend: a Wrapping row does not say it was bypassed

**Ask:** `is_bypassed` on `GET /wrapping/` rows.

**Why:** a bypassed line reads `wrapped` once packed, and the bench cannot tell it may not be remade
p1 (835,298).

**On our side once it lands:** the bench hides Remanufacture on such a line.

## Backend: Deplete is offered for a zero Coil Thickness only

**Ask:** answer Deplete from `POST /coils/lots/{id}/apply/` for any figure sent as 0.

**Why:** a 0 in Linear Feet or Weight means the coil is used up as much as a 0 thickness does, so the
app turns it into `coil_thickness: 0` to get the question.

**On our side once it lands:** `CoilAdjustDialog` sends the figure as typed.

## Backend: `order=` does not narrow `ebms/orders/`

**Ask:** honour `order=` (`invoice__like`) on `GET ebms/orders/`; it is left out of the line filter
(`origin_db/services.py` `paginated_list`), so the whole list comes back.

**Why:** an expanded order shows all its Trim lines, but the tab lists narrow each order's `details`
to the tab's; `wholeOrderQuery` searches the invoice and picks the order out instead.

**On our side once it lands:** `wholeOrderQuery` asks for the order by number.

## Backend: the capacity «Stock» figures count From Stock, not stock orders

**Ask:** `pieces_from_stock` / `bends_from_stock` on the day strip and machine-capacities count the
customer lines' `pull_from_stock` (`stages/capacity_view.py`). «The Stock numbers ONLY come from Stock
Orders» p1 (245,508): make them the pieces of stock orders scheduled that day, or say which is meant.

**On our side once it lands:** nothing changes; the Machine Capacities window reads the figures as sent.

## Deferred: a coil in the Slinet before cutting

«From here the Worker would have to put another coil into the Slinet and check off that it is in the
Slinet to be able to continue working on this cutlist» p1 (502,469). Gating the Slinet's Complete on a
coil of the list's colour being checked into the Slinet is a few lines in `CutlistRows`, but while the
backend has no coil lots it would stop every cutlist. Wait for coil lots, then add the gate.

## Backend: a bendlist row mixes products of one size

**Ask:** split bendlist rows by product as well as width × length, each with its own Complete.

**Why:** «Click the drop down on a bendlist to see all the line items that were assigned to the
Machine» p1 (653,304). A row holding two products of the same size shows «2 lines» and no ID or
Description; Complete is per row, so the app cannot split it on its side.

**On our side once it lands:** nothing changes; `describeGroup` names the one product behind a row.

## Backend: no Length on a completed order's lines

**Ask:** `length` on each line of `GET` completed-order detail.

**Why:** the board's Completed Orders line table is Qty Ordered, Stock, ID, Description, Length, Line
Item Notes p1 (878,571).

**On our side once it lands:** Length and Line Item Notes columns go into `COMPLETED_LINES_TABLE`.
