// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';
import { FlatCompat } from '@eslint/eslintrc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  js.configs.recommended,
  ...compat.extends('airbnb-base'),
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // window: "readonly",
        // document: "readonly",
        // navigator: "readonly",
        // localStorage: "readonly",
        ...globals.browser,
        ...globals.node,
      },
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      'no-console': 'warn',
      'import/no-extraneous-dependencies': ['error', { devDependencies: ['**/*.config.js'] }],
      'no-underscore-dangle': ['error', { allow: ['__app', '__filename', '__dirname'] }],
      'import/prefer-default-export': 'off',
      camelcase: 'off',
      'no-plusplus': 'off',
      'import/no-cycle': 'off',
      'no-restricted-syntax': 'off',
      'class-methods-use-this': 'off',
    },
  },
];
