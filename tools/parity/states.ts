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
  }
]

export const statesFor = (page: string, view: string | null) =>
  STATES.filter(state => state.page === page && state.view === view)
