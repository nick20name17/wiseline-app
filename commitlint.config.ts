import type { UserConfig } from '@commitlint/types'

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 72]
  }
} satisfies UserConfig
