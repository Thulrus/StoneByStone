import { defineConfig } from '@lingui/conf';
import { createSwcExtractor } from '@lingui/native-tools';

export default defineConfig({
  sourceLocale: 'en',
  locales: ['en'],
  catalogs: [
    {
      path: '<rootDir>/src/i18n/locales/{locale}/messages',
      include: ['src'],
    },
  ],
  extractors: [createSwcExtractor()],
});
