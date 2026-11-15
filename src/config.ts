export interface Flags {
  sqliVulnerable: boolean;
  csrfVulnerable: boolean;
}

export const flags: Flags = {
  sqliVulnerable: false,
  csrfVulnerable: false,
};

export const TOGGLES = {
  sqli: 'sqliVulnerable',
  csrf: 'csrfVulnerable',
} as const satisfies Record<string, keyof Flags>;

export type ToggleName = keyof typeof TOGGLES;

export function setFlag(name: string, value?: boolean): boolean {
  const key = (TOGGLES as Record<string, keyof Flags>)[name];
  if (!key) {
    throw new Error(`Unknown toggle: ${name}`);
  }
  flags[key] = typeof value === 'boolean' ? value : !flags[key];
  return flags[key];
}
