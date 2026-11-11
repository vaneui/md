/** Optional policy that tightens the always-on `vaneui`-fence sanitize floor (see `renderSpec`) for untrusted content. */
export interface SanitizePolicy {
  /** Allowed URL schemes, lowercase with the colon (e.g. `"https:"`); others are dropped, relative URLs always pass. */
  allowedProtocols?: string[];
  /** Extra prop names to strip beyond the floor. */
  blockedProps?: string[];
  /** If set, only these component names may render; others become nothing. */
  allowComponents?: string[];
}

/** A conservative policy for user- or AI-authored fence content: only common navigation schemes on URL props. */
export const strictSanitizePolicy: SanitizePolicy = {
  allowedProtocols: ["http:", "https:", "mailto:", "tel:"],
};
