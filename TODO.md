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
marked and a way to change which ("If we have multiply Warehouses then there needs to be a way to
select the default Warehouse", `docs/wiseline-spec.md:3398`). `pm_warehouse` has no such column:
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

**Why:** the floor identifies a truck by its plate, and the Settings → Trucks table is meant to
show Name | Plate | Max Weight. `pm_truck` carries no plate: it has `name`, `driver_id`, `notes`
and the five measurements, so the column cannot be filled and is left out for now.

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
