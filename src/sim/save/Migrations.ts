// Save version chain (Plan Part 2.11): `migrations[n]` upgrades a save from version n to n + 1.
// Every released version keeps a fixture save in tests/fixtures/saves/ that must load.

export type Migration = (save: Record<string, unknown>) => Record<string, unknown>;

/** Empty until the first shape change after release. */
export const migrations: Readonly<Record<number, Migration>> = {};

export class SaveTooNewError extends Error {
  readonly version: number;
  constructor(version: number, supported: number) {
    super(
      `This save is from a newer version of Hearthwood (save v${version}, this build reads up to v${supported}).`,
    );
    this.name = 'SaveTooNewError';
    this.version = version;
  }
}

export class SaveMigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaveMigrationError';
  }
}

/** Upgrades `raw` step by step to `target`; each step works on a copy. */
export function migrate(
  raw: Record<string, unknown>,
  chain: Readonly<Record<number, Migration>>,
  target: number,
): Record<string, unknown> {
  let version = raw.saveVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new SaveMigrationError('The save has no valid saveVersion.');
  }
  if (version > target) throw new SaveTooNewError(version, target);
  let save = raw;
  while (version < target) {
    const step = chain[version];
    if (!step) throw new SaveMigrationError(`No migration from save v${version} to v${version + 1}.`);
    save = step(structuredClone(save));
    version += 1;
    save.saveVersion = version;
  }
  return save;
}
