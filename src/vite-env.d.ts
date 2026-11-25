/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

declare module '*.po' {
  import type { Messages } from '@lingui/core';
  export const messages: Messages;
}
