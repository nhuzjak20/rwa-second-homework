// In-memory feature flags controlling whether each vulnerability is active.
// Both default to SECURE (false). Flipped at runtime via POST /toggle from the
// header switches. State is process-global and resets on restart — fine for a demo.

export interface Flags {
  sqliVulnerable: boolean;
  authVulnerable: boolean;
}

export const flags: Flags = {
  sqliVulnerable: false,
  authVulnerable: false,
};

// UI toggle name -> flag key. Only these flags may be toggled from the UI.
export const TOGGLES = {
  sqli: 'sqliVulnerable',
  auth: 'authVulnerable',
} as const satisfies Record<string, keyof Flags>;

export type ToggleName = keyof typeof TOGGLES;

/**
 * Flip a flag by its UI name ('sqli' | 'auth').
 * @param name the UI toggle name
 * @param value explicit value; if omitted, the flag is inverted
 * @returns the new value
 * @throws if the name is not a known toggle
 */
export function setFlag(name: string, value?: boolean): boolean {
  const key = (TOGGLES as Record<string, keyof Flags>)[name];
  if (!key) {
    throw new Error(`Unknown toggle: ${name}`);
  }
  flags[key] = typeof value === 'boolean' ? value : !flags[key];
  return flags[key];
}
