import js from '@eslint/js';
import pluginLingui from 'eslint-plugin-lingui';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dev-dist',
      'coverage',
      'playwright-report',
      'test-results',
      'src/i18n/locales/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // UI strings must go through Lingui (plan §15).
    // ui/ primitives take their text through props, so the rule covers app/ and features/.
    files: ['src/app/**/*.tsx', 'src/features/**/*.tsx'],
    ignores: ['**/*.test.tsx'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { lingui: pluginLingui },
    rules: {
      'lingui/no-unlocalized-strings': [
        'error',
        {
          ignore: ['^[^a-zA-Z]*$', '^[a-z0-9]+(?:[-_:/.][a-z0-9]+)*$', '^StoneByStone$'],
          ignoreNames: [
            {
              regex: {
                pattern:
                  'className|^(aria-)?(role|type|id|to|href|name|variant|size|side|key|path|htmlFor|data-.*|testId|autoComplete|inputMode|lang|dir)$',
              },
            },
          ],
          ignoreFunctions: [
            'cva',
            'cn',
            'clsx',
            'console.*',
            'Error',
            'localStorage.*',
            'useNavigate',
            'matchMedia',
            'document.*',
          ],
          useTsTypes: true,
        },
      ],
      'lingui/t-call-in-function': 'error',
    },
  },
  {
    // Architecture rule (plan §23.2): domain is pure TypeScript.
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-*', 'dexie', 'dexie-*', 'zustand'],
              message: 'domain/ must stay pure TypeScript.',
            },
            {
              group: ['**/data/**', '**/features/**', '**/ui/**', '**/app/**'],
              message: 'domain/ must not import from data/, features/, ui/ or app/.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['*.config.{js,ts}', 'tests/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
);
