import React from "react";

/**
 * Optional policy that tightens the always-on fence sanitize floor for
 * untrusted content. The floor (in renderSpec) already strips
 * dangerouslySetInnerHTML, event handlers, and ref, and blocks
 * javascript:/vbscript:/non-image data: URLs. A policy can further restrict
 * URL schemes, block extra props, or narrow the component allowlist.
 */
export interface SanitizePolicy {
  /**
   * Allowed URL schemes, lowercase and colon-suffixed (e.g. ["http:",
   * "https:", "mailto:"]). A URL whose scheme is not listed is dropped;
   * scheme-less (relative) URLs are always allowed.
   */
  allowedProtocols?: string[];
  /** Extra prop names to strip beyond the floor. */
  blockedProps?: string[];
  /** If set, only these component names may render; others become nothing. */
  allowComponents?: string[];
}

/**
 * A conservative policy for user- or AI-authored fence content: only common
 * navigation schemes are allowed on URL props.
 */
export const strictSanitizePolicy: SanitizePolicy = {
  allowedProtocols: ["http:", "https:", "mailto:", "tel:"],
};

export const SanitizeContext = React.createContext<SanitizePolicy | undefined>(undefined);
