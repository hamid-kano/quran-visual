/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Address that reviewers' notes are sent to; omitted, the site offers GitHub only. */
  readonly VITE_REVIEW_EMAIL?: string
}
