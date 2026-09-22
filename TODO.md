# TODO

Work that is blocked on someone else, or deliberately deferred. Delete an entry once it lands.

## Backend: filter users by role

**Ask:** add a `role` query parameter to `GET /users/`, e.g. `GET /users/?role=driver`.

**Why:** the driver picker is out of the truck form for now, but it comes back the moment a truck
carries a driver again, and Settings → Users needs the same narrowing. Today no endpoint can filter
by role:

- `GET /users/all/` takes no parameters at all;
- `GET /users/` takes only `limit` and `offset`;
- `GET /departments/users/assignments/` filters by `user_id` and `department_id`.

Any client that wants drivers has to download every user and filter in memory. With a hundred
users and five drivers that is ninety-five records fetched to be thrown away, and it grows with
the company.

**Shape we need:** `role` optional, matched exactly against the values
`GET /constants/users-roles/` returns, combinable with `limit`/`offset`. A `search` parameter on
the same endpoint would help too: Settings → Users pulls one large page and filters it in memory
(`usersQuery` in `src/features/users/api.ts`), the same stopgap the warehouses list uses.

**On our side once it lands:** the driver picker and the users list both ask for the role they
need instead of paging through everyone.

## Backend: default warehouse

**Ask:** a boolean on the warehouse marking the default one, exclusive across the table.

**Why:** the board spec asks for a Default column on Settings → Warehouses, with one warehouse
marked and a way to change which — "If we have multiply Warehouses then there needs to be a way to
select the default Warehouse" p1 (246,139). `pm_warehouse` has no such column:
its fields are `name`, `address`, `description`, `code`, `position`, `color` and the `c_*` contact
block, so the client has nothing to render or toggle.

**Shape we need:** `is_default` on `WarehouseSchemaOut`, settable through `PATCH /warehouses/{id}/`,
with the backend clearing the flag on the previous default so exactly one stays marked.

**Meanwhile:** the Default toggle writes `position` — 1 when on, 2 when off — and the badge marks
the lowest position, which the spec describes as the warehouse that opens first. It is a stand-in:
turning the toggle on does not turn the previous default off, so two warehouses can sit at 1 and
the badge falls to whichever the API lists first.

**On our side once it lands:** the badge reads `is_default` and the form gets a toggle instead of
leaning on `position`.

## Backend: filter warehouses

**Ask:** a `search` query parameter on `GET /warehouses/`, matching name, address and description.

**Why:** the endpoint takes only `limit` and `offset` — no `FilterDepends`, unlike `GET /trucks/`.
So the client pulls one large page and filters in memory (`warehousesQuery` in
`src/features/warehouses/api.ts`). Fine for a handful of warehouses, wrong once the list outgrows
a page.

**On our side once it lands:** move the filter into the query key and drop the in-memory `select`.

## Backend: truck plate numbers

**Ask:** a plate field on the truck, e.g. `plate: str | None`.

**Why:** the floor identifies a truck by its plate, and the prototype's Settings → Trucks table is
Name | Plate | Max Weight (`main`, `src/features/settings/config.tsx`). `pm_truck` carries no plate:
it has `name`, `driver_id`, `notes` and the five measurements, so the column cannot be filled and is
left out for now. The written spec does not mention a plate at all — this one comes from the board's
own screens.

**Shape we need:** `plate` on `TruckSchemaIn`/`TruckSchemaOut`, writable through
`POST /trucks/` and `PATCH /trucks/{id}/`, and matched by the existing `search` filter.

**On our side once it lands:** add the Plate column between Name and Max Weight in
`TrucksTable`, and a Plate box to the truck form.

## Backend: line items of a fresh EBMS order carry no department

**Ask:** create `pm_item` rows with `department_id` set when an order is first scheduled, or expose an
endpoint that does it.

**Why:** everything the Trim board writes goes through the department-scoped endpoints —
`POST /sales-orders/schedule/`, `POST /sales-orders/{id}/departments/{dept}/schedule/`,
`.../bypass/`. All of them reach the order's line items through
`Item.order == <autoid> AND Item.department_id == <dept>` (`OrderDepartmentStateService._department_items`,
`stages/services.py`). An EBMS order nobody has touched has no `pm_item` rows at all, so the call
answers `400 No line items of this order belong to that department.`

`POST /multiupdate/items/` does create missing rows (`ItemsService.multiupdate`), but from
`MultiUpdateItemSchema`, which carries no department — so the rows it creates have
`department_id = NULL` and are invisible to every query above, including the day strip
(`CapacityViewService._totals` filters on the same column). Only the migration backfill and
`StockOrderService` ever set the column today.

**Shape we need:** the department derived the same way the stock order path derives it — the line
item's `INVENTRY.PROD_TYPE` names an `INPRODTYPE` row whose autoid is the department's
`category_autoid` — applied whenever an `Item` is created.

**On our side once it lands:** nothing changes. `src/features/trim/api.ts` already calls the
department endpoints and creates the `SalesOrder` row when the EBMS order has none.

## Backend: no image upload for a Stock Card

**Ask:** let `POST /files/models/` accept `model_name=StockCard`, or add an upload that returns a
`pm_file` id a stock card can point at.

**Why:** `StockCardSchemaIn` requires `image_id`, and the board says the Manager uploads the profile
sketch on the Create form (`docs/wiseline-spec.md`, p1 (71,307)). `files/routers.py` accepts only
`PackageItem`, `Package` and `Skid`, so no client can produce an `image_id` and no stock card can be
created from the app at all.

**On our side once it lands:** `StockCardsDialog` in `src/features/trim/components/` gets its Create
form; today it lists, prints and deletes only.

## Backend: filter priorities by department

**Ask:** a `department` query parameter on `GET /priorities/`.

**Why:** priorities are created per department and "would ONLY be for the Trim department"
(p1 (241,403)), and the write endpoints enforce that. The list endpoint does not: it returns every
department's, so the Trim board pulls the lot and filters in memory (`prioritiesQuery` in
`src/features/trim/api.ts`), keeping the ones with a matching department plus the ones with none.

**On our side once it lands:** move the filter into the query key and drop the `select`.

## Backend: reorder a department's priorities in one request

**Ask:** an endpoint that takes a department's priority ids in their new order and renumbers them
1..N in one transaction, e.g. `POST /priorities/reorder/` with `{ department, ids }`.

**Why:** the settings page reorders by dragging, and the hierarchy is the row order, so one drag
renumbers every priority between the two places. Today that is one `PATCH /priorities/{id}/` per
row (`useReorderPriorities` in `src/features/priorities/api.ts`); if one fails the others have
already landed and the department is left half-moved.

**On our side once it lands:** `useReorderPriorities` sends the ids once instead of a PATCH per row.

## Backend: a cutlist row says nothing about the line items on it

**Ask:** carry the line item's own fields on `CutlistRowSourceSchema` — at least `id_inven`,
`description`, `quantity` (ordered), `pull_from_stock` and `status` — or accept a list of
`origin_item`s on `GET /items/`.

**Why:** the board's bendlist is Width | Length | Qty Ordered | Stock | Qty to Manufacture | ID |
Description | Remanufacture | Machine | Status | Complete | Drawing | Line Item Notes
(`docs/wiseline-spec.md` screen (660,522)), and "Qty to Manufacture ... needs to show the difference
between the Qty Ordered and Stock columns" p1 (687,302). A row from
`GET /cutlists/` carries the width, the length, the quantity to make, the machine and the sources —
and a source is `order`, `origin_item`, `quantity` and nothing else. So the columns that describe
the trim itself cannot be filled, and neither can the per-line actions beside them: reassigning a
machine and the Stock keypad both need the numeric `pm_item` id, which no cutlist response names.

The same gap hides the Stock Order mark: the board puts an icon on a list carrying stock-order lines
p1 (585,288), and a source names its order only as an autoid.

**On our side once it lands:** `CutlistRows` in `src/features/trim/components/cutlist-rows.tsx`
grows the remaining columns; today it shows the size, the quantity, the machine split, the vented
pieces, the operator note and Complete.

## Backend: no Stock Manufacturing

**Ask:** an endpoint that records pieces the floor made against no order and pushes them to EBMS as
a manufacturing batch, plus one that lists what has been sent.

**Why:** a machine tab carries a Stock Manufacturing button, and "clicking the Stock Manufacturing
button opens this window" — a grid of Qty | ID | Description the worker types into, closed by
**Create Manufacturing Batch** p1 (1009,302), (1013,320). Nothing in `stages/` records that:
`stock.py` is Stock Cards, `stock_orders.py` raises an order that then goes through the tabs like
any other. There is no way to post a bare manufactured quantity.

**On our side once it lands:** the Production tab grows the button and the window behind it. Today
it has neither.

## Backend: no package list for an order still being wrapped

**Ask:** a `GET /wrapping/orders/{order}/packages/` — the same shape
`CompletedOrdersService.packages_for` already builds.

**Why:** the board's See Packages button sits on the order at the wrapping bench
(`docs/wiseline-spec.md` screen (808,517)) and opens the packages made for it, so one can be deleted
when it was packed wrong (`DELETE /wrapping/packages/{id}/` is there for exactly that). The packages are only readable once the order is complete, through
`GET /departments/{id}/completed-orders/{order}/` — which is the one moment the Worker no longer
needs them.

**On our side once it lands:** `WrapOrder` in `src/features/trim/components/wrap-order.tsx` gets
See Packages beside Create & Print. Today it shows the locations the order stands on, which is the
only part of that picture the API answers.

## Backend: the Wrapping row names no product and no customer

**Ask:** `product_id` and `customer` on the rows `GET /wrapping/` returns.

**Why:** the board's Wrapping table is Production Date | Order # | Customer Name | Qty Ordered |
Stock | Priority | Remanufacture | Status | ID | Description | Line Item Notes
(`docs/wiseline-spec.md` screen (885,283)). The row carries `order_number`, `description`,
`priority`, `status` and the three quantities — but nothing names the product, the customer, or how
much of the line comes from stock, and all three are columns the floor reads the table by.

**On our side once it lands:** the two columns go into `WrappingTab`; it shows the line item's
autoid in place of the product today.

## Backend: a coil filter can be created but never changed

**Ask:** `PATCH /coils/filters/{id}/` and `DELETE /coils/filters/{id}/`.

**Why:** the Coil Filter window sets the Thickness, Width and Grade a coil has to fall inside before
EBMS sends it to a department — "when the Thickness, Width and Grade ALL fall within the ranges set
in the filter, then that coil will show up in the Coils tab" p1 (253,609), with Apply All for a
limitless range p1 (287,612) — and the board treats it as a setting the Manager revisits. The table
holds one row per department and folder (`uq_coil_filter_folder`), and the only write is
`POST /coils/filters/`, which inserts — so applying a second time on the same folder breaks the
constraint. Today the window can write the first filter and nothing after it.

**On our side once it lands:** `CoilFilterDialog` in `src/features/trim/components/` drops the note
about the missing endpoint and its Apply saves whatever is on screen.

## Backend: a coil says nothing about the material on it

**Ask:** `color`, `gauge` and `width` on `CoilLotSchema`, from the EBMS product behind `inven`.

**Why:** the board's Coils table is Product ID | Color | Width (in.) | Count | Total Linear Feet |
Total Weight, opening into Coil # | Coil Thickness | Linear Feet | Weight | Location | Slinet | Note
(`docs/wiseline-spec.md` screen (361,608)), and a cutlist is matched to a coil by **colour**
p1 (426,341). The lot carries the product id and the measurements, so the three columns the floor
reads the table by cannot be filled, and the Cutlist Coils window can only say «coils in the Slinet»
rather than naming the colour it matched on.

**On our side once it lands:** the three columns go into `CoilsTab`, and the folder tabs follow once
`GET /coils/lots/` can filter by folder as well.

## Backend: a cutlist does not say it is a remake

**Ask:** `is_remanufacture` (or `remanufacturing_id`) on `CutlistSchema`.

**Why:** a remanufacture request spins off its own cutlist and bendlist, and the board marks those
lists so the floor knows the pieces on them are a remake rather than the order's own work — orange
until the Slinet cuts them, green after (p1 (519,586), (686,514)). The model carries
`remanufacturing_id` and the hybrid `is_remanufacture`, but `CutlistSchema` exposes neither, so the
Production tab cannot tell one list from another.

**On our side once it lands:** `CutlistCard` in `src/features/trim/components/` gets the badge; the
remake is visible today only where it was raised, at the wrapping bench.

## Backend: a completed order does not say where it is standing, or who it is for

**Ask:** `trim_location` (the codes, as the Completed table shows them) on the rows
`GET /departments/{id}/completed-orders/` returns, and `po`, `salesman`, `ship_via` and `priority`
on the detail beside the customer.

**Why:** the board's Completed Orders table is Ship Date | Production Date | Completed Date & Time |
Order # | Customer Name | **Trim Location** (`docs/wiseline-spec.md` screen (912,545)), and opening
one shows a footer of Customer Name, Order #, PO#, Salesman, Ship Date, Ship Via, Priority and Trim
Location, with a Select Location button beside it p1 (912,576). The list endpoint returns neither
the location nor those fields, and there is no endpoint that puts a location on an order that has no
new package being made — only `DELETE /wrapping/orders/{order}/locations/{id}/`, which frees one.

**On our side once it lands:** the Trim Location column goes into `CompletedTab` and the footer
fills out in `CompletedOrderDialog`; today the window names the customer, the two dates and the
locations the order still stands on, and can free one.

## Backend: no drawing behind a trim

**Ask:** an image per product — a `drawing` (file id or URL) on whatever names the product, so a
line item can show the profile the floor is bending.

**Why:** the bendlist's last two columns are Drawing and Line Item Notes, and the Drawing is the
sketch of the profile (`docs/wiseline-spec.md` screen (660,522), expanded row). `files/routers.py`
attaches files to `PackageItem`, `Package` and `Skid` only, and nothing on a line item, a product or
a cutlist row points at one. The Stock Card holds a sketch through `image_id`, but a card exists for
stocked products alone.

**On our side once it lands:** the Drawing column goes into `CutlistRows`, beside the notes.

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
