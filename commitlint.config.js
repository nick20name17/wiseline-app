export default {
  extends: ['@commitlint/config-conventional'],
  // dependabot bodies are release-note URLs that cannot be wrapped
  ignores: [commit => commit.includes('Signed-off-by: dependabot[bot]')]
}
