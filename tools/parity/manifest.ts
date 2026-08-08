/**
 * The port is judged page by page against the HTML prototype, so both sides need one name for the
 * same screen. `demo` is the file the prototype serves; `route` is where the React app puts it.
 *
 * Views are not listed here — a page's views are read off its own DOM at capture time (`.view`
 * elements), because the prototype is the authority on which ones exist and hand-copied lists drift.
 */
export type Page = {
  /** File under the prototype's server root. */
  demo: string
  /** Route in the React app, without a trailing slash. */
  route: string
}

export const PAGES: Page[] = [
  { demo: 'home.html', route: '/trim' },
  { demo: 'rollforming.html', route: '/rollforming' },
  { demo: 'shipping.html', route: '/shipping' },
  { demo: 'accessories.html', route: '/accessories' },
  { demo: 'coils.html', route: '/coils' },
  { demo: 'stockcards.html', route: '/stock-cards' },
  { demo: 'warehouse.html', route: '/warehouse' },
  { demo: 'loading.html', route: '/loading' },
  { demo: 'driver.html', route: '/driver' },
  { demo: 'scanner.html', route: '/scanner' },
  { demo: 'activity.html', route: '/activity' },
  { demo: 'dashboard.html', route: '/dashboard' },
  { demo: 'settings.html', route: '/settings' },
  { demo: 'ebms.html', route: '/ebms' },
  { demo: 'login.html', route: '/sign-in' }
]

/** Both widths the prototype was designed against; a gate that only checks one misses the other. */
export const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 }
] as const

export const pageName = (page: Page) => page.demo.replace(/\.html$/, '')
