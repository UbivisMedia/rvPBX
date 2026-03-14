module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
    jest: true
  },
  extends: ['eslint:recommended', 'plugin:import/recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'import/extensions': ['error', 'ignorePackages', { js: 'always' }],
    'no-console': 'off'
  }
};
