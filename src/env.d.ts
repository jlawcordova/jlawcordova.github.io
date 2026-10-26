/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** The Ask bot's Worker, such as https://ask.example.workers.dev/ask. Unset, the bubble isn't rendered (ask bot spec, R15). */
  readonly PUBLIC_ASK_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
