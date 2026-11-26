/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

declare module '*.po' {
  import type { Messages } from '@lingui/core';
  export const messages: Messages;
}

/** Short commit hash of this build (vite.config.ts `define`). */
declare const __BUILD_SHA__: string;
/** ISO 8601 time this build was made. */
declare const __BUILD_TIME__: string;
