// Player settings (Plan Part 2.11): every option with its default and allowed values. Global,
// stored in localStorage and applied live. Keybindings live with the Input module.

export type SettingDef =
  | { readonly type: 'bool'; readonly default: boolean }
  | {
      readonly type: 'number';
      readonly min: number;
      readonly max: number;
      readonly step: number;
      readonly default: number;
    }
  | { readonly type: 'choice'; readonly options: readonly string[]; readonly default: string };

const bool = (d: boolean) => ({ type: 'bool', default: d }) as const;
const num = (min: number, max: number, step: number, d: number) =>
  ({ type: 'number', min, max, step, default: d }) as const;
function choice<const O extends readonly string[]>(options: O, d: O[number]) {
  return { type: 'choice', options, default: d } as const;
}

export const settingsSchema = {
  graphics: {
    preset: choice(['low', 'medium', 'high', 'ultra', 'custom'], 'medium'),
    /** Auto = dynamic resolution targeting 60 fps; fixed uses `renderScalePercent`. */
    renderScaleMode: choice(['auto', 'fixed'], 'auto'),
    renderScalePercent: num(50, 100, 5, 100),
    shadows: choice(['off', 'low', 'medium', 'high'], 'medium'),
    ambientOcclusion: bool(true),
    antiAliasing: choice(['smaa', 'msaa4'], 'msaa4'),
    bloom: bool(true),
    drawDistance: choice(['near', 'standard', 'far'], 'standard'),
    snowDensity: choice(['low', 'medium', 'high'], 'medium'),
    forestDensity: choice(['low', 'medium', 'high'], 'medium'),
    fpsCap: choice(['30', '60', 'uncapped'], '60'),
    /** Vertical field of view in degrees (Plan Part 2.4: 55°, setting 45–75). */
    fov: num(45, 75, 1, 55),
    brightness: num(0.8, 1.2, 0.05, 1),
    filmGrain: num(0, 1, 0.05, 0.5),
    frostOverlay: num(0, 1, 0.05, 1),
  },
  audio: {
    /** Volumes in percent. */
    master: num(0, 100, 1, 80),
    music: num(0, 100, 1, 100),
    ambience: num(0, 100, 1, 100),
    sfx: num(0, 100, 1, 100),
    voices: num(0, 100, 1, 100),
    ui: num(0, 100, 1, 100),
    /** Rest length between music performances (Plan Part 6: Sometimes = 45–150 s). */
    musicFrequency: choice(['often', 'sometimes', 'rarely', 'off'], 'sometimes'),
    /** Keep music and ambience playing (−6 dB) while the tab is hidden. */
    backgroundAudio: bool(true),
    mono: bool(false),
    spatial: choice(['hrtf', 'stereo'], 'hrtf'),
    /** Gentle compression for quiet listening. */
    nightMode: bool(false),
  },
  controls: {
    mouseSensitivity: num(0.1, 3, 0.05, 1),
    invertY: bool(false),
    /** Lazy camera recenter behind the heading while moving (Plan Part 2.4). */
    cameraRecenter: bool(true),
    jog: choice(['hold', 'toggle'], 'hold'),
    holdActions: choice(['hold', 'toggle'], 'hold'),
    /** Seconds a hold action takes. */
    holdDuration: num(0.2, 1.5, 0.05, 0.5),
    stickDeadZone: num(0.05, 0.4, 0.01, 0.15),
    vibration: bool(true),
  },
  gameplay: {
    dayLength: choice(['relaxed', 'standard', 'brisk'], 'standard'),
    timePassesWhileTalking: bool(false),
    prompts: choice(['adaptive', 'always', 'minimal'], 'adaptive'),
    hud: choice(['standard', 'minimal', 'hidden'], 'standard'),
    clockFormat: choice(['24h', '12h'], '24h'),
    hints: bool(true),
    /** Auto sweet spot and auto-align in the minigames. */
    relaxedTiming: bool(false),
    aimAssist: num(0, 1, 0.05, 0.5),
    autoSawAndJig: bool(false),
  },
  accessibility: {
    /** Percent. */
    textSize: num(80, 150, 5, 100),
    uiScale: num(80, 150, 5, 100),
    readableFont: bool(false),
    highContrastPrompts: bool(false),
    soundCaptions: choice(['off', 'important', 'all'], 'off'),
    reduceMotion: bool(false),
    photosensitivity: bool(false),
  },
} as const satisfies Record<string, Record<string, SettingDef>>;

export type SettingsSchema = typeof settingsSchema;
export type SettingsGroup = keyof SettingsSchema;

type ValueOf<D> = D extends { type: 'bool' }
  ? boolean
  : D extends { type: 'number' }
    ? number
    : D extends { type: 'choice'; options: readonly (infer O)[] }
      ? O
      : never;

export type SettingsValues = {
  -readonly [G in SettingsGroup]: { -readonly [K in keyof SettingsSchema[G]]: ValueOf<SettingsSchema[G][K]> };
};
