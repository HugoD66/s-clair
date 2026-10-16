import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/generated/**',
      '**/.angular/**',
      '.pnpm-store/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      'docs/**',
      'apps/web/src/app/api-types.ts',
    ],
  },
  {
    files: ['**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
  {
    files: ['apps/web/src/**/*.ts'],
    extends: [...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['**/api/src/**', '@s-clair/api', '@prisma/*'] },
      ],
    },
  },
  {
    files: ['apps/api/src/**/*.controller.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['@prisma/*', '**/generated/prisma/**'] }],
    },
  },
  {
    files: ['apps/web/src/**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
  },
  prettier,
);
