# Backend asks

What the frontend needs from the API, as one list to hand over. Each item has its full reasoning — why,
the board screen it comes from, what changes on our side — under the same heading in `TODO.md`.

## Trim board — features that cannot be built without it

- [ ] **Work days.** Which days are worked, holidays included: `is_work_day` on each
      `GET /departments/{id}/day-strip/` entry, or `GET /work-days/`.
- [ ] **Per-day review, release, unschedule.** Accept a production date on the reviewed toggle
      (`PATCH /sales-orders/{id}/departments/{dept}/`), `POST /departments/{dept}/release/` and the
      unschedule call, so each part of a split order acts on its own.
- [ ] **Mark a note unread.** `read: false` on the order-note and line-note mark-read calls, or an
      `…/unread/` beside them.
- [ ] **Line items on a fresh EBMS order carry no department.** Create `pm_item` rows with
      `department_id` when an order is first scheduled.
- [ ] **Wrapping row fields.** On `GET /wrapping/` rows: `product_id`, `customer`, `is_stock`,
      `length`, `from_stock`, `unit_weight`, `po`, `salesman`, `ship_date`, `ship_via`.
- [ ] **Package list while wrapping.** `GET /wrapping/orders/{order}/packages/`, same shape as
      `CompletedOrdersService.packages_for`.
- [ ] **Package weight ceiling.** `max_package_weight` (lb, nullable) per department in
      `GET /departments/all/`, writable via `PATCH /departments/{id}/`.
- [ ] **Stock orders.**
  - Return the new order's number from `POST /stock-orders/`.
  - Accept an optional `description` per line.
  - An endpoint that takes a stock order's Wrapped figures and pushes its manufacturing batch to
    EBMS.
  - `qty_manufactured` on completed-order line items.
- [ ] **Stock Manufacturing.** Record pieces made against no order and push them to EBMS as a
      manufacturing batch, plus a list of what was sent.
- [ ] **Stock cards.** `width`, `gauge`, `color` and an image URL on `StockCardSchema`; let
      `POST /files/models/` accept `model_name=StockCard` (or another upload returning a `pm_file` id).
- [ ] **Cutlists.**
  - `is_remanufacture` (or `remanufacturing_id`) on `CutlistSchema`.
  - On `CutlistRowSourceSchema`: `id_inven`, `description`, `quantity`, `pull_from_stock`,
    `status`, `po_number`, drawing URL — or accept many `origin_item`s on `GET /items/`.
- [ ] **Drawings.** A `drawing` (file id or URL) per product.
- [ ] **Coils.**
  - `color`, `gauge`, `width`, `grade`, `folder_name` on `CoilLotSchema`.
  - `GET /coils/lots/?department_id=` applying that department's Coil Filter server-side.
  - `PATCH /coils/filters/{id}/` and `DELETE /coils/filters/{id}/`.
- [ ] **Coil suppliers.** `GET/POST /coil-suppliers/`, `DELETE /coil-suppliers/{id}/` (`id`, `name`).
- [ ] **Completed orders.** `trim_location` on `GET /departments/{id}/completed-orders/` rows;
      `po`, `salesman`, `ship_via`, `priority` on the detail.
- [ ] **Day capacity.** `capacity` / `over_capacity` on the day strip and `total.capacity` on
      machine-capacities computed as the sum of the department's machines' `daily_max_bends`.

## Trim board — requests the page makes too many of

- [ ] **Order locations in bulk.** Location codes on each `GET ebms/orders/` row, or
      `GET /wrapping/orders/locations/?order=…&order=…`. Today: one request per Scheduled row.
- [ ] **Overdue days in one request.** `GET /departments/{id}/day-strip/?dates=…&dates=…`, or
      figures on the overdue list itself. Today: one request per overdue day.
- [ ] **Tab-strip counts.** `GET /departments/{id}/counts/` — unscheduled, scheduled, active Slinet
      cutlists, Trim coils. Today the Coils count downloads every coil in the company.
- [ ] **Date range on orders.** `production_date__gte` / `__lte` on `GET ebms/orders/`. Today the
      Calendar pages through every scheduled order.
- [ ] **Reorder priorities in one call.** `POST /priorities/reorder/` with `{ department, ids }`.
- [ ] **Filter priorities by department.** `department` on `GET /priorities/`.

## Settings

- [ ] **Users by role.** `role` (and `search`) on `GET /users/`.
- [ ] **Default warehouse.** `is_default` on the warehouse, exclusive, settable via
      `PATCH /warehouses/{id}/`.
- [ ] **Search warehouses.** `search` on `GET /warehouses/`.
- [ ] **Truck plate.** `plate` on the truck schemas, matched by the existing `search`.

## Questions

- Is `source: 'machine'` accepted by the remanufacture request? The board sends it for a remake
  asked from a machine tab.
- Does `pieces_from_stock` / `bends_from_stock` on machine-capacities mean pieces of stock orders,
  or pieces pulled from stock? The Production tooltips read it as stock orders.
- The overdue list flags days with 0 bends, and days whose orders do not show on the Scheduled tab.
  Which orders does it count?
