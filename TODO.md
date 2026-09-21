# TODO

Work that is blocked on someone else, or deliberately deferred. Delete an entry once it lands.

## Backend: filter users by role

**Ask:** add a `role` query parameter to `GET /users/`, e.g. `GET /users/?role=driver`.

**Why:** the driver picker on Settings → Trucks needs drivers only. Today no endpoint can narrow
by role:

- `GET /users/all/` takes no parameters at all;
- `GET /users/` takes only `limit` and `offset`;
- `GET /departments/users/assignments/` filters by `user_id` and `department_id`.

So the client downloads every user and filters in memory
(`driversQuery` in `src/features/trucks/api.ts`). With a hundred users and five drivers that is
ninety-five records fetched to be thrown away, and it grows with the company.

**Shape we need:** `role` optional, matched exactly against the values
`GET /constants/users-roles/` returns, combinable with `limit`/`offset`. A `search` parameter on
the same endpoint would let the future Settings → Users page stop paging through everything too.

**On our side once it lands:** replace the `select` filter in `driversQuery` with the query
parameter, and drop the shared `['users', 'all']` cache entry if nothing else needs the full list.
