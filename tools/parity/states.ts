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
  /** The `.view` id the clicks start from. */
  view: string
  /** Appended to the capture key, so `home__view-production+wrapping__desktop`. */
  name: string
  /** `data-comment` values to click, in order. */
  clicks: string[]
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
  }
]

export const statesFor = (page: string, view: string | null) =>
  STATES.filter(state => state.page === page && state.view === view)
