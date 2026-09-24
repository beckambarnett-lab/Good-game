// Save bytes (Plan Part 2.11): JSON → UTF-8 → gzip (CompressionStream, in browsers and Node),
// with a CRC32 and length of the uncompressed JSON kept beside the bytes for verify-after-write.

import { crc32 } from '../../core/crc32.ts';
import { type Migration, migrate, migrations } from './Migrations.ts';
import { assertSaveShape, SAVE_VERSION, type SaveFile } from './SaveModel.ts';

export class SaveCorruptError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'SaveCorruptError';
  }
}

export interface EncodedSave {
  gz: Uint8Array;
  /** CRC32 and byte length of the uncompressed JSON. */
  crc: number;
  byteLength: number;
}

const utf8 = new TextEncoder();
const fromUtf8 = new TextDecoder('utf-8', { fatal: true });

async function pipeThrough(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  const written = writer.write(bytes as Uint8Array<ArrayBuffer>).then(() => writer.close());
  // A failure also errors the readable side, which is where it is reported.
  written.catch(() => undefined);
  const out = new Uint8Array(await new Response(stream.readable).arrayBuffer());
  await written;
  return out;
}

export const gzip = (bytes: Uint8Array): Promise<Uint8Array> =>
  pipeThrough(bytes, new CompressionStream('gzip'));
export const gunzip = (bytes: Uint8Array): Promise<Uint8Array> =>
  pipeThrough(bytes, new DecompressionStream('gzip'));

export async function encodeSave(save: SaveFile): Promise<EncodedSave> {
  const json = utf8.encode(JSON.stringify(save));
  return { gz: await gzip(json), crc: crc32(json), byteLength: json.length };
}

/**
 * Decompresses, verifies (when the checksum is known), parses, migrates to the current version and
 * checks the shape. Any damage surfaces as SaveCorruptError.
 */
export async function decodeSave(
  gz: Uint8Array,
  expected?: { crc: number; byteLength: number },
  chain: Readonly<Record<number, Migration>> = migrations,
): Promise<SaveFile> {
  let json: Uint8Array;
  try {
    json = await gunzip(gz);
  } catch (e) {
    throw new SaveCorruptError('the save could not be decompressed', e);
  }
  if (expected && (json.length !== expected.byteLength || crc32(json) !== expected.crc)) {
    throw new SaveCorruptError('the save failed its checksum');
  }
  let raw: unknown;
  try {
    raw = JSON.parse(fromUtf8.decode(json));
  } catch (e) {
    throw new SaveCorruptError('the save is not valid JSON', e);
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new SaveCorruptError('the save is not an object');
  }
  const migrated = migrate(raw as Record<string, unknown>, chain, SAVE_VERSION);
  try {
    assertSaveShape(migrated);
  } catch (e) {
    throw new SaveCorruptError('the save has an unexpected shape', e);
  }
  return migrated;
}
