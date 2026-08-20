/**
 * Screens the default capture cannot reach.
 *
 * A `.view` is captured as it first renders, which leaves everything behind a tab, a mode switch or a
 * drill-in unjudged — Production alone hides three whole renderers that way, and a port can be green
 * without any of them existing. A state here is the same view plus a short list of things to click.
 *
 * Clicks are addressed by `data-comment`, and that is the whole trick: it is the one attribute both
 * builds promise to keep, so one list drives the prototype and the port without knowing anything about
 * either's markup. A state whose path a build cannot follow is reported, not skipped silently.
 */
export type State = {
  /** Page name, as `pageName()` gives it. */
  page: string
  /** The `.view` id the clicks start from, or `null` on a page that has no views. */
  view: string | null
  /** Appended to the capture key, so `home__view-production+wrapping__desktop`. */
  name: string
  /** `data-comment` values to click, in order. */
  clicks: string[]
  /**
   * Who is looking. Defaults to the Manager every other capture uses; `worker` is the only other one
   * worth recording, because it is the role the boards actually hide things from — and until a state
   * asked for it, every worker-only rule in the app was outside all three axes of the gate.
   */
  role?: 'manager' | 'worker'
}

export const STATES: State[] = [
  {
    page: 'home',
    view: 'view-production',
    name: 'wrapping',
    clicks: ['prod-mtab-7']
  },
  {
    page: 'home',
    view: 'view-production',
    name: 'wrapping-detail',
    clicks: ['prod-mtab-7', 'wrap-li-ono-13-0']
  },
  {
    page: 'home',
    view: 'view-production',
    name: 'wrapping-detail-stock',
    clicks: ['prod-mtab-7', 'wrap-li-ono-15-0']
  },
  {
    page: 'home',
    view: 'view-production',
    name: 'stockmfg',
    clicks: ['prod-mode-stock']
  },
  {
    page: 'home',
    view: 'view-production',
    name: 'completed-lists',
    clicks: ['prod-listtab-completed']
  },
  {
    page: 'home',
    view: 'view-scheduled',
    name: 'all-days',
    clicks: ['sch-daytab-all']
  },
  {
    page: 'home',
    view: 'view-home',
    name: 'expanded',
    clicks: ['uns-exp-1']
  },
  {
    page: 'rollforming',
    view: 'view-home',
    name: 'expanded',
    clicks: ['uns-exp-1']
  },
  // a split order: the line already scheduled by an earlier split is locked, losing its drag handle
  {
    page: 'rollforming',
    view: 'view-home',
    name: 'expanded-split',
    clicks: ['uns-exp-7']
  },
  // a Material Request is raw coil for a machine — it never splits, so the whole split head is gone
  {
    page: 'rollforming',
    view: 'view-home',
    name: 'expanded-mreq',
    clicks: ['uns-exp-4']
  },
  // pre-release: the head reads "Reviewing order", and both bulk buttons wait on a ticked unit
  {
    page: 'rollforming',
    view: 'view-scheduled',
    name: 'expanded-review',
    clicks: ['sch-exp-7']
  },
  {
    page: 'rollforming',
    view: 'view-scheduled',
    name: 'expanded-review-unit',
    clicks: ['sch-exp-7', 'sch-coilchkin-115-0']
  },
  // released: the selection column and the assignment buttons give way to See Packages
  {
    page: 'rollforming',
    view: 'view-scheduled',
    name: 'expanded-released',
    clicks: ['sch-exp-8']
  },
  // one machine rather than the all-machines overview, which is a different renderer
  {
    page: 'rollforming',
    view: 'view-scheduled',
    name: 'machine-tab',
    clicks: ['sch-gtab-TuffRibDiamondRib']
  },
  // another production day, and picking an order for release on it
  {
    page: 'rollforming',
    view: 'view-scheduled',
    name: 'day-16-release-picked',
    clicks: ['sch-daytab-2026-07-16', 'sch-relchk-6']
  },
  // one machine's runs rather than the all-machines overview
  {
    page: 'rollforming',
    view: 'view-production',
    name: 'machine-tab',
    clicks: ['prod-gtab-TuffRibDiamondRib']
  },
  // the Slit Line tab, where a run is listed for material that cannot be rolled yet
  {
    page: 'rollforming',
    view: 'view-production',
    name: 'slit-line',
    clicks: ['prod-gtab-SlitLine']
  },
  // one machine's buckets rather than the overview
  {
    page: 'rollforming',
    view: 'view-queue',
    name: 'machine-tab',
    clicks: ['q-gtab-TuffRibDiamondRib']
  },
  // the Slit Line Worker's own tab: every row here is waiting on material being slit
  {
    page: 'rollforming',
    view: 'view-queue',
    name: 'slit-line',
    clicks: ['q-gtab-SlitLine']
  },
  // a second coil folder, which is a different set of size sub-folders
  {
    page: 'rollforming',
    view: 'view-coils',
    name: 'folder-corrugated',
    clicks: ['coils-folder-Corrugated']
  },
  {
    page: 'rollforming',
    view: 'view-wrapping',
    name: 'machine-tab',
    clicks: ['wrap-gtab-BoardBatten']
  },
  // an expanded order: its full address, what is on it, and the deterministic line items
  {
    page: 'shipping',
    view: 'view-unscheduled',
    name: 'expanded',
    clicks: ['uns-exp-3']
  },
  // Toggle Notes, which puts a peek row under every order carrying a note — in every view at once
  {
    page: 'shipping',
    view: 'view-unscheduled',
    name: 'notes-toggled',
    clicks: ['topbar-togglenotes']
  },
  // both at once: an expanded order shows its last note inside the expansion, not under it
  {
    page: 'shipping',
    view: 'view-unscheduled',
    name: 'expanded-with-notes',
    clicks: ['topbar-togglenotes', 'uns-exp-3']
  },
  // a single day rather than the whole board: every truck's roll-up is scoped to it
  {
    page: 'shipping',
    view: 'view-scheduled',
    name: 'day-16',
    clicks: ['sch-daytab-2026-07-16']
  },
  // an overdue day — the tab, the truck card and its flag all change
  {
    page: 'shipping',
    view: 'view-scheduled',
    name: 'day-12-overdue',
    clicks: ['sch-daytab-2026-07-12']
  },
  // the month picker, where a day nothing ships on is a dead button rather than a missing one
  {
    page: 'shipping',
    view: 'view-scheduled',
    name: 'calendar-open',
    clicks: ['sch-cal-trigger']
  },
  // today's loads rather than the overdue day the board opens on
  {
    page: 'shipping',
    view: 'view-loading',
    name: 'day-14',
    clicks: ['ldg-daytab-2026-07-14']
  },
  // a day whose loads are still ahead: every pill is a different point in the scan cascade
  {
    page: 'shipping',
    view: 'view-loading',
    name: 'day-16',
    clicks: ['ldg-daytab-2026-07-16']
  },
  // an order opened for a partial schedule, with its lines tickable
  {
    page: 'accessories',
    view: 'view-unscheduled',
    name: 'expanded',
    clicks: ['uns-exp-13']
  },
  // the split order: its scheduled lines are locked, and its row checkbox with them
  {
    page: 'accessories',
    view: 'view-unscheduled',
    name: 'expanded-split',
    clicks: ['uns-exp-15']
  },
  // picking two lines arms Schedule selected and puts the count on it
  {
    page: 'accessories',
    view: 'view-unscheduled',
    name: 'lines-picked',
    clicks: ['uns-exp-13', 'uns-linechk-122', 'uns-linechk-123']
  },
  {
    page: 'accessories',
    view: 'view-scheduled',
    name: 'expanded',
    clicks: ['sch-exp-1']
  },
  // another prep day, which is a different set of orders
  {
    page: 'accessories',
    view: 'view-scheduled',
    name: 'day-16',
    clicks: ['sch-daytab-2026-07-16']
  },
  // the package builder, with its three gates all still shut
  {
    page: 'accessories',
    view: 'view-packaging',
    name: 'expanded',
    clicks: ['pkg-exp-1']
  },
  // a completed order that still holds its location, countdown and all
  {
    page: 'accessories',
    view: 'view-completed',
    name: 'expanded',
    clicks: ['comp-exp-8']
  },
  // a scan: the package's dot turns loaded and its load's progress moves with it
  {
    page: 'loading',
    view: null,
    name: 'scanned',
    clicks: ['loading-quick-1']
  },
  // the whole of Load 1 scanned on, which turns its status dot complete
  {
    page: 'loading',
    view: null,
    name: 'load-complete',
    clicks: ['loading-quick-1', 'loading-quick-2', 'loading-quick-3']
  },
  // the route started: every stop arms its Scan package button and the status reads Shipping
  {
    page: 'driver',
    view: null,
    name: 'started',
    clicks: ['foot-start']
  },
  // one package of two scanned off — the stop stays open and counts (1/2)
  {
    page: 'driver',
    view: null,
    name: 'part-delivered',
    clicks: ['foot-start', 'stop-deliver-1']
  },
  // both packages: the stop closes to Delivered and the next one becomes active
  {
    page: 'driver',
    view: null,
    name: 'stop-delivered',
    clicks: ['foot-start', 'stop-deliver-1', 'stop-deliver-1']
  },
  // paused: the dot stops, the label reads Paused and the button offers Resume
  {
    page: 'activity',
    view: null,
    name: 'paused',
    clicks: ['activity-pause-btn']
  },
  // one department and one event type, which between them leave a single day heading
  {
    page: 'activity',
    view: null,
    name: 'filtered',
    clicks: ['activity-pause-btn', 'activity-dept-chip-shipping', 'activity-type-chip-shipment']
  },
  // a filter nothing matches, which is the only way to see this page's empty state
  {
    page: 'activity',
    view: null,
    name: 'no-matches',
    clicks: ['activity-pause-btn', 'activity-dept-chip-shipping', 'activity-type-chip-coil']
  },
  // Failed filters on the status, not the type — the one chip in that strip that reads a different field
  {
    page: 'ebms',
    view: null,
    name: 'failed-only',
    clicks: ['wb-filter-failed']
  },
  // retrying the failed row: it turns Synced, the Retry button goes, and the two counts move
  {
    page: 'ebms',
    view: null,
    name: 'retried',
    clicks: ['wb-filter-failed', 'wb-retry-6']
  },
  // the coil sub-table: every per-coil control lives here, and nothing on the group row reaches it
  {
    page: 'coils',
    view: null,
    name: 'group-expanded',
    clicks: ['folder-tab-all', 'coilg-exp-0']
  },
  // #118/#127: the tab this page now opens on — one row per coil rather than per size
  {
    page: 'coils',
    view: null,
    name: 'flat-all-coils',
    clicks: []
  },
  // Low stock is the one chip that filters on a number rather than a location
  {
    page: 'coils',
    view: null,
    name: 'lowstock',
    clicks: ['filter-chip-lowstock']
  },
  // a coil checked into neither department: Slinet and the sub-row controls are disabled together
  {
    page: 'coils',
    view: null,
    name: 'unassigned-expanded',
    clicks: ['folder-tab-all', 'filter-chip-rollforming', 'coilg-exp-0']
  },
  // Print Selected is gated on a selection, so the enabled button is only reachable with one made
  {
    page: 'stockcards',
    view: null,
    name: 'selected',
    clicks: ['stock-card-1-select']
  },
  {
    page: 'settings',
    view: 'view-area',
    name: 'users',
    clicks: ['area-tab-users']
  },
  {
    page: 'settings',
    view: 'view-area',
    name: 'machines',
    clicks: ['area-tab-machines']
  },
  {
    page: 'settings',
    view: 'view-area',
    name: 'warehouses',
    clicks: ['area-tab-warehouses']
  },
  {
    page: 'settings',
    view: 'view-area',
    name: 'locationTypes',
    clicks: ['area-tab-locationTypes']
  },
  {
    page: 'settings',
    view: 'view-area',
    name: 'locations',
    clicks: ['area-tab-locations']
  },
  {
    page: 'settings',
    view: 'view-area',
    name: 'trucks',
    clicks: ['area-tab-trucks']
  },
  {
    page: 'settings',
    view: 'view-area',
    name: 'workdays',
    clicks: ['area-tab-workdays']
  },

  /* -- the Worker's own screens ------------------------------------------------------------------
     A board reads its role from «Viewing as», and these are what it hides: Trim and Rollforming drop
     tabs, priority and notes go read-only, and Rollforming grows a bar for its three stations. None of
     it was inside the gate until these five states, because every other capture is a Manager. */
  {
    page: 'home',
    view: 'view-production',
    name: 'as-worker',
    clicks: [],
    role: 'worker'
  },
  {
    page: 'home',
    view: 'view-coils',
    name: 'as-worker',
    clicks: [],
    role: 'worker'
  },
  {
    page: 'rollforming',
    view: 'view-production',
    name: 'as-worker',
    clicks: [],
    role: 'worker'
  },
  {
    page: 'rollforming',
    view: 'view-queue',
    name: 'as-worker-slitline',
    clicks: ['actor-slw'],
    role: 'worker'
  },
  {
    // Packaging is the only view a Worker has here, the way Production is on Trim
    page: 'accessories',
    view: 'view-packaging',
    name: 'as-worker',
    clicks: [],
    role: 'worker'
  },
  {
    page: 'shipping',
    view: 'view-unscheduled',
    name: 'as-worker',
    clicks: [],
    role: 'worker'
  },

  /* -- one state per modal ----------------------------------------------------------------------
     A modal is `display: none` until it opens and `collect.ts` records only what is visible, so every
     anchor inside one sat outside all three axes — 875 of the prototype's 1408. The paths below were
     derived by `discover-modals.ts` against the prototype; the last few are hand-walked, because their
     triggers are the ones that script refuses to click. */
  {
    page: 'accessories',
    view: 'view-unscheduled',
    name: 'modal-dropdown',
    clicks: ['pri-13']
  },
  {
    page: 'accessories',
    view: 'view-unscheduled',
    name: 'modal-note',
    clicks: ['note-btn-13']
  },
  {
    page: 'accessories',
    view: 'view-scheduled',
    name: 'modal-calendar',
    clicks: ['sch-exp-1', 'sch-reschedule-1']
  },
  {
    page: 'accessories',
    view: 'view-packaging',
    name: 'modal-locpicker',
    // «Select location» is disabled until a package has something in it, hence the auto-fill first
    clicks: ['pkg-exp-1', 'autofill-101', 'selectloc-1']
  },
  {
    page: 'accessories',
    view: 'view-completed',
    name: 'modal-alert',
    clicks: ['comp-exp-9', 'loctag-9-126']
  },
  {
    page: 'accessories',
    view: 'view-completed',
    name: 'modal-packages',
    clicks: ['comp-exp-9', 'comp-seepkg-9']
  },
  {
    page: 'coils',
    view: null,
    name: 'modal-coilfilter',
    clicks: ['coils-filter-btn']
  },
  {
    page: 'coils',
    view: null,
    name: 'modal-adjust',
    clicks: ['folder-tab-all', 'coilg-exp-0', 'coil-adjust-3']
  },
  {
    page: 'home',
    view: 'view-home',
    name: 'modal-calendar',
    clicks: ['uns-daypicker']
  },
  {
    page: 'home',
    view: 'view-home',
    name: 'modal-stockcards',
    clicks: ['uns-stock-cards']
  },
  {
    page: 'home',
    view: 'view-home',
    name: 'modal-stock',
    clicks: ['uns-create-stock']
  },
  {
    page: 'home',
    view: 'view-home',
    name: 'modal-dropdown',
    clicks: ['priority-1']
  },
  {
    page: 'home',
    view: 'view-home',
    name: 'modal-note',
    clicks: ['note-btn-1']
  },
  {
    page: 'home',
    view: 'view-scheduled',
    name: 'modal-machinecap',
    clicks: ['sch-daytab-gear-2026-07-09']
  },
  {
    page: 'home',
    view: 'view-scheduled',
    name: 'modal-allocstock',
    clicks: ['sch-allocstock']
  },
  {
    page: 'home',
    view: 'view-coils',
    name: 'modal-coilfilter',
    clicks: ['coils-filter-btn']
  },
  {
    page: 'home',
    view: 'view-coils',
    name: 'modal-cadjust',
    clicks: ['coilg-exp-0', 'coil-thickness-3']
  },
  {
    page: 'home',
    view: 'view-completed',
    name: 'modal-compdetail',
    clicks: ['comp-row-11']
  },
  {
    page: 'rollforming',
    view: 'view-home',
    name: 'modal-mreq',
    clicks: ['uns-mreq']
  },
  {
    page: 'rollforming',
    view: 'view-home',
    name: 'modal-kp',
    clicks: ['uns-exp-1', 'uns-stockchk-108']
  },
  {
    page: 'rollforming',
    view: 'view-production',
    name: 'modal-note',
    clicks: ['prod-linote-0-0']
  },
  {
    page: 'rollforming',
    view: 'view-scheduled',
    name: 'modal-calendar',
    clicks: ['sch-exp-7', 'sch-reschedule-7']
  },
  {
    page: 'rollforming',
    view: 'view-scheduled',
    name: 'modal-assign',
    clicks: ['sch-exp-7', 'sch-unitstockchk-115-0']
  },
  {
    page: 'rollforming',
    view: 'view-production',
    name: 'modal-pkg',
    clicks: ['prod-createpkg-0']
  },
  {
    page: 'rollforming',
    view: 'view-completed',
    name: 'modal-completed-detail',
    clicks: ['comp-row-9']
  },
  {
    page: 'settings',
    view: 'view-area',
    name: 'modal-form',
    clicks: ['area-add']
  },
  {
    page: 'shipping',
    view: 'view-unscheduled',
    name: 'modal-trucknotes',
    clicks: ['uns-trucknotes']
  },
  {
    page: 'shipping',
    view: 'view-unscheduled',
    name: 'modal-mapdetail',
    clicks: ['map-6']
  },
  {
    page: 'shipping',
    view: 'view-unscheduled',
    name: 'modal-notes',
    clicks: ['notes-6']
  },
  {
    page: 'shipping',
    view: 'view-loading',
    name: 'modal-loadtruck',
    clicks: ['ldg-truckhead-101-2026-07-13']
  },
  {
    page: 'stockcards',
    view: null,
    name: 'modal-dropdown',
    clicks: ['stock-filter-btn']
  },
  {
    page: 'stockcards',
    view: null,
    name: 'modal-newcard',
    clicks: ['stock-new-btn']
  },
  {
    page: 'stockcards',
    view: null,
    name: 'modal-createorder',
    clicks: ['stock-card-1-qr']
  },
  {
    page: 'coils',
    view: null,
    name: 'modal-usage',
    clicks: ['folder-tab-all', 'coilg-total-0']
  },
  {
    page: 'coils',
    view: null,
    name: 'modal-confirm',
    clicks: ['folder-tab-all', 'coilg-exp-0', 'coil-deplete-3']
  },
  {
    page: 'settings',
    view: 'view-area',
    name: 'modal-pkgmax',
    clicks: ['area-tab-machines', 'mgroup-pkgmax-Trim']
  },
  {
    page: 'settings',
    view: 'view-area',
    name: 'modal-suppliers',
    clicks: ['area-tab-machines', 'mgroup-suppliers']
  },
  {
    page: 'shipping',
    view: 'view-unscheduled',
    name: 'modal-schedule',
    clicks: ['uns-chk-6', 'uns-schedule']
  },
  {
    page: 'shipping',
    view: 'view-scheduled',
    name: 'modal-schedtruck',
    clicks: ['sch-truckhead-101-all']
  },
  {
    page: 'shipping',
    view: 'view-unscheduled',
    name: 'modal-completed',
    clicks: ['uns-completed']
  },
  {
    page: 'stockcards',
    view: null,
    name: 'modal-confirm',
    clicks: ['stock-card-1-delete']
  }
]

export const statesFor = (page: string, view: string | null) =>
  STATES.filter(state => state.page === page && state.view === view)
