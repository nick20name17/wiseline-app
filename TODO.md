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
