// Global player settings (Plan Part 2.11): typed get/set with validation, live change events, and
// persistence to localStorage. Stored values are never trusted: unknown keys are dropped, bad values
// fall back to defaults and numbers are clamped and snapped to their step. Storage failures (private
// mode, quota) keep the settings in memory rather than breaking the game.

import {
  type SettingDef,
  type SettingsGroup,
  type SettingsValues,
  settingsSchema,
} from '../data/settings.ts';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const SETTINGS_KEY = 'hearthwood.settings';
export const SETTINGS_VERSION = 1;

type Key<G extends SettingsGroup> = keyof SettingsValues[G] & string;
type Listener = (group: SettingsGroup, key: string, value: unknown) => void;

const schema = settingsSchema as unknown as Record<string, Record<string, SettingDef>>;

/** Returns the value if it is valid for the setting (numbers clamped and snapped), else undefined. */
export function coerce(def: SettingDef, value: unknown): boolean | number | string | undefined {
  switch (def.type) {
    case 'bool':
      return typeof value === 'boolean' ? value : undefined;
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
      const snapped = def.min + Math.round((value - def.min) / def.step) * def.step;
      // Round away float noise from the snap (steps are at most 2 decimals).
      return Math.round(Math.min(def.max, Math.max(def.min, snapped)) * 1e6) / 1e6;
    }
    case 'choice':
      return typeof value === 'string' && def.options.includes(value) ? value : undefined;
  }
}

export function defaultSettings(): SettingsValues {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [group, defs] of Object.entries(schema)) {
    out[group] = {};
    for (const [key, def] of Object.entries(defs)) (out[group] as Record<string, unknown>)[key] = def.default;
  }
  return out as SettingsValues;
}

/** Defaults overlaid with every valid value found in `raw`. */
export function sanitizeSettings(raw: unknown): SettingsValues {
  const out = defaultSettings() as unknown as Record<string, Record<string, unknown>>;
  if (typeof raw !== 'object' || raw === null) return out as unknown as SettingsValues;
  for (const [group, defs] of Object.entries(schema)) {
    const src = (raw as Record<string, unknown>)[group];
    if (typeof src !== 'object' || src === null) continue;
    for (const [key, def] of Object.entries(defs)) {
      const v = coerce(def, (src as Record<string, unknown>)[key]);
      if (v !== undefined) (out[group] as Record<string, unknown>)[key] = v;
    }
  }
  return out as unknown as SettingsValues;
}

export class Settings {
  private values: SettingsValues;
  private readonly storage: KeyValueStorage | null;
  private readonly listeners = new Set<Listener>();

  constructor(storage: KeyValueStorage | null) {
    this.storage = storage;
    this.values = this.load();
  }

  get<G extends SettingsGroup, K extends Key<G>>(group: G, key: K): SettingsValues[G][K] {
    return this.values[group][key];
  }

  /** Sets a value if valid (numbers are clamped); returns false if it was rejected. */
  set<G extends SettingsGroup, K extends Key<G>>(group: G, key: K, value: SettingsValues[G][K]): boolean {
    const def = schema[group]?.[key];
    if (!def) return false;
    const v = coerce(def, value);
    if (v === undefined) return false;
    const current = this.values[group] as Record<string, unknown>;
    if (current[key] === v) return true;
    current[key] = v;
    this.persist();
    for (const fn of [...this.listeners]) fn(group, key, v);
    return true;
  }

  /** Restores defaults for one group, or for everything. */
  reset(group?: SettingsGroup): void {
    const defaults = defaultSettings();
    const groups = group ? [group] : (Object.keys(schema) as SettingsGroup[]);
    for (const g of groups) {
      for (const [key, value] of Object.entries(defaults[g])) {
        this.set(g, key as Key<typeof g>, value as never);
      }
    }
  }

  /** A copy of every value. */
  snapshot(): SettingsValues {
    return structuredClone(this.values);
  }

  /** Subscribes to changes; returns the unsubscribe function. */
  onChange(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private load(): SettingsValues {
    let raw: unknown = null;
    try {
      const text = this.storage?.getItem(SETTINGS_KEY);
      if (text) raw = JSON.parse(text);
    } catch {
      raw = null;
    }
    const stored = raw as { version?: unknown; values?: unknown } | null;
    return sanitizeSettings(stored && stored.version === SETTINGS_VERSION ? stored.values : null);
  }

  private persist(): void {
    try {
      this.storage?.setItem(SETTINGS_KEY, JSON.stringify({ version: SETTINGS_VERSION, values: this.values }));
    } catch {
      // Storage is unavailable or full: keep the settings for this session only.
    }
  }
}

/** localStorage if the browser allows it, else null (settings then live in memory). */
export function browserStorage(): KeyValueStorage | null {
  try {
    const s = globalThis.localStorage;
    const probe = `${SETTINGS_KEY}.probe`;
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}
