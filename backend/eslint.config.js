export default [
  {
    ignores: ['node_modules/**', 'runtime/**', 'coverage/**', '**/coverage/**']
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      'no-unused-vars': 'off'
    }
  }
];
