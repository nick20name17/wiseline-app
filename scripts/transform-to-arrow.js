/**
 * Transform: convert function declarations to arrow functions
 * Compatible with .ts, .tsx, .js, and .jsx
 */
const transformer = (file, api) => {
  const j = api.jscodeshift.withParser('tsx') // 👈 enables TSX + TypeScript support

  return j(file.source)
    .find(j.FunctionDeclaration)
    .forEach((path) => {
      const { id, params, body, generator, async } = path.node

      // Skip functions with no name (like export default function)
      if (!id) return

      const arrowFn = j.arrowFunctionExpression(params, body, generator)
      arrowFn.async = async

      const decl = j.variableDeclaration('const', [
        j.variableDeclarator(j.identifier(id.name), arrowFn)
      ])

      j(path).replaceWith(decl)
    })
    .toSource({ quote: 'single', trailingComma: true })
}

export default transformer
