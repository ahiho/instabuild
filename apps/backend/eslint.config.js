import neo from 'neostandard';

export default [
  ...neo({
    ts: true,
  }),
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      '*.min.js',
      '.next/',
      '.nuxt/',
      '.vuepress/dist/',
      '.serverless/',
      '.fusebox/',
      '.dynamodb/',
      '.yarn/',
      '.pnp.*',
    ],
  },
  {
    rules: {
      '@stylistic/brace-style': 'off',
      '@stylistic/space-before-function-paren': 'off',
      '@stylistic/indent': 'off',
      '@stylistic/comma-dangle': 'off',
      '@stylistic/spaced-comment': 'off',
      '@stylistic/semi': 'off',
    },
  },
];
