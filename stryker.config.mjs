/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  mutate: ['src/**/lib/**/*.ts', 'src/api/**/*.ts', '!src/**/*.test.ts'],
  reporters: ['clear-text', 'html', 'json'],
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  jsonReporter: { fileName: 'reports/mutation/mutation.json' },
  coverageAnalysis: 'perTest',
  ignoreStatic: true,
  incremental: false,
  // Deliberately a file that does not exist: Stryker rewrites a tsconfig it finds through the
  // TypeScript JS API, which TypeScript 7 no longer ships, and crashes before the first mutant.
  tsconfigFile: 'tsconfig.stryker-none.json'
}
