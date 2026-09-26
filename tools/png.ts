// Minimal PNG encoder (RGB, for QA images such as spectrograms) and decoder (8-bit RGB or RGBA,
// non-interlaced: what Chromium screenshots are, for measuring rendered frames), using Node's zlib.
import { deflateSync, inflateSync } from 'node:zlib';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = (CRC_TABLE[(c ^ b) & 0xff] as number) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), Buffer.from(data)]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

export function encodePng(width: number, height: number, rgb: Uint8Array): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0;
    Buffer.from(rgb.buffer, rgb.byteOffset + y * width * 3, width * 3).copy(raw, y * (width * 3 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

export interface DecodedPng {
  width: number;
  height: number;
  /** RGB, 3 bytes per pixel (any alpha is dropped). */
  rgb: Uint8Array;
}

/** Paeth predictor (PNG filter type 4). */
function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

export function decodePng(file: Uint8Array): DecodedPng {
  const buf = Buffer.from(file.buffer, file.byteOffset, file.byteLength);
  let at = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat: Buffer[] = [];
  while (at < buf.length) {
    const len = buf.readUInt32BE(at);
    const type = buf.toString('ascii', at + 4, at + 8);
    const data = buf.subarray(at + 8, at + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const [depth, colour, , , interlace] = [data[8], data[9], data[10], data[11], data[12]];
      channels = colour === 2 ? 3 : colour === 6 ? 4 : 0;
      if (depth !== 8 || channels === 0 || interlace !== 0) {
        throw new Error(
          `decodePng: only 8-bit RGB/RGBA non-interlaced (got depth ${depth}, colour ${colour})`,
        );
      }
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    at += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const px = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const row = y * stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[src + i] as number;
      const a = i >= channels ? (px[row + i - channels] as number) : 0;
      const b = y > 0 ? (px[row - stride + i] as number) : 0;
      const c = i >= channels && y > 0 ? (px[row - stride + i - channels] as number) : 0;
      const pred =
        filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : filter === 4 ? paeth(a, b, c) : 0;
      px[row + i] = (x + pred) & 0xff;
    }
  }
  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0, j = 0; i < px.length; i += channels, j += 3) {
    rgb[j] = px[i] as number;
    rgb[j + 1] = px[i + 1] as number;
    rgb[j + 2] = px[i + 2] as number;
  }
  return { width, height, rgb };
}
