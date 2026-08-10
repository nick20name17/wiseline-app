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

/**
 * `html.is-printing-cards body > *` anchors at the root twice: the port's page attribute already stands
 * for the prototype's `body`, so the second step has nothing left to match and the whole rule is dead —
 * which is how both print stylesheets came across silently doing nothing.
 */
const dropStrandedBody = (sel: selectorParser.Selector) => {
  sel.each(node => {
    if (node.type !== 'tag' || node.value !== 'body' || node === sel.first) return

    const before = node.prev()
    node.remove()
    if (before?.type === 'combinator' && before.value === ' ') before.remove()
  })
}

/**
 * `hostClass` emits a second, stronger copy of a page's sheet for the case where that page is *hosted
 * inside another one* — Stock Cards in Trim's dialog. Both pages then have rules for `.btn`, `.toolbar`
 * and forty-one other shared classes, all at the same specificity, so which one wins would come down to
 * the order the two chunks happened to load in — i.e. on where the viewer had been before. A class in
 * front of the attribute settles it by specificity instead, whatever the order.
 */
export const scopeCss = (css: string, page: string, hostClass?: string) => {
  const scope = `${hostClass ? `.${hostClass}` : ''}[data-page="${page}"]`

  const anchor = () => {
    const attribute = selectorParser.attribute({ attribute: `data-page="${page}"` } as never)
    if (!hostClass) return [attribute]
    return [selectorParser.className({ value: hostClass } as never), attribute]
  }

  const prefix = (selector: string) => {
    if (ROOT_SELECTORS.has(selector.trim())) return scope

    return selectorParser(selectors => {
      selectors.each(sel => {
        const first = sel.first
        // `body .card` and `:root .card` are already anchored at the root — replace, don't nest
        if (first && ROOT_SELECTORS.has(String(first).trim())) {
          const [head, ...rest] = anchor()
          first.replaceWith(head!)
          for (const node of rest) head!.parent?.insertAfter(head!, node)
          dropStrandedBody(sel)
          return
        }
        sel.prepend(selectorParser.combinator({ value: ' ' }))
        for (const node of anchor().reverse()) sel.prepend(node)
        dropStrandedBody(sel)
      })
    }).processSync(selector)
  }

  const root = postcss.parse(css)

  root.walkRules((rule: Rule) => {
    const parent = rule.parent
    if (parent?.type === 'atrule' && SKIP_AT_RULES.has((parent as { name: string }).name)) return
    rule.selectors = [...new Set(rule.selectors.map(prefix))]
  })

  return root.toString()
}
