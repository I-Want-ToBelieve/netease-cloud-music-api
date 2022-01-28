// @ts-check

/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  root: true,
  extends: ['@quitsmx'],
  ignorePatterns: ['/dist', '/patches'],
  settings: {
    'import/resolver': {
      alias: {
        map: [['@', './src']],
        extensions: ['.tsx', '.ts', '.jsx', '.js'],
      },
    },
  },
  env: {
    node: true,
    jest: true,
  },
  overrides: [
    {
      parserOptions: {
        project: './tsconfig.json',
        ecmaFeatures: {
          classStaticBlock: true,
        },
      },
      files: ['*.ts', '*.tsx'],
      extends: ['@quitsmx/eslint-config/ts-runtime'],
      rules: {
        'no-void': 'off',
      },
    },
    {
      files: ['./*.js', 'scripts/**/*.js'],
      parserOptions: { sourceType: 'script' },
      extends: ['@quitsmx/eslint-config/node'],
      rules: {
        'node/no-unsupported-features/es-syntax': ['error', { ignores: ['modules'] }],
      },
    },
    {
      parserOptions: { project: './packages/**/tsconfig.json' },
      files: ['rollup.config.js', 'packages/**/*.ts'],
      extends: ['@quitsmx/eslint-config/ts-runtime'],
    },
  ],
}
