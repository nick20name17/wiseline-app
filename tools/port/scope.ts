/**
 * Confines one page's stylesheet to that page.
 *
 * Each prototype file is its own document, so its rules can say `.btn` and mean only its own buttons.
 * The port is one document, and fifteen stylesheets that all define `.btn` would decide each other by
 * load order. Every selector is therefore prefixed with the page's own attribute — class names are
 * left exactly as written, because they are what the fidelity gate compares.
 */
import postcss, { type Rule } from 'postcss'
import selectorParser from 'postcss-selector-parser'

/** Stand for the page root itself, so their declarations land on the element carrying the attribute. */
const ROOT_SELECTORS = new Set([':root', 'html', 'body', 'html body'])

/** Never scoped: they name nothing in the document. */
const SKIP_AT_RULES = new Set([
  'keyframes',
  '-webkit-keyframes',
  'font-face',
  'property',
  'import',
  'charset'
])

export const scopeCss = (css: string, page: string) => {
  const scope = `[data-page="${page}"]`

  const prefix = (selector: string) => {
    if (ROOT_SELECTORS.has(selector.trim())) return scope

    return selectorParser(selectors => {
      selectors.each(sel => {
        const first = sel.first
        // `body .card` and `:root .card` are already anchored at the root — replace, don't nest
        if (first && ROOT_SELECTORS.has(String(first).trim())) {
          first.replaceWith(selectorParser.attribute({ attribute: `data-page="${page}"` } as never))
          return
        }
        sel.prepend(selectorParser.combinator({ value: ' ' }))
        sel.prepend(selectorParser.attribute({ attribute: `data-page="${page}"` } as never))
      })
    }).processSync(selector)
  }

  const root = postcss.parse(css)

  root.walkRules((rule: Rule) => {
    const parent = rule.parent
    if (parent?.type === 'atrule' && SKIP_AT_RULES.has((parent as { name: string }).name)) return
    rule.selectors = rule.selectors.map(prefix)
  })

  return root.toString()
}
