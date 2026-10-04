import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

function crc32(buf) {
  let table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crcBuf]);
}

function createPng(width, height, drawFn) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const off = 1 + x * 4;
      row[off] = r;
      row[off + 1] = g;
      row[off + 2] = b;
      row[off + 3] = a;
    }
    rawRows.push(row);
  }

  const deflated = zlib.deflateSync(Buffer.concat(rawRows), { level: 9 });
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// Lettermark "R" rasterizer with emergency badge
function renderResQIcon(x, y, w, h, isMaskable = false) {
  // Normalize to 0..1 coordinates
  const nx = x / w;
  const ny = y / h;

  // Background: Deep Navy #0F1F3D
  const bg = [15, 31, 61, 255];
  // Brand White #FFFFFF
  const white = [255, 255, 255, 255];
  // Emergency Teal / Indigo Accent #0D9488
  const teal = [13, 148, 136, 255];
  // Emergency Orange Accent #B54708
  const orange = [181, 71, 8, 255];

  // For maskable icon, keep graphic inside safe zone (0.2 to 0.8)
  const scale = isMaskable ? 0.6 : 0.72;
  const cx = 0.5;
  const cy = 0.5;

  const dx = (nx - cx) / scale;
  const dy = (ny - cy) / scale;

  // Check if within outer rounded badge bounds [-0.5..0.5]
  const inBadge = Math.abs(dx) <= 0.48 && Math.abs(dy) <= 0.48;

  // Let's render the "R" lettermark
  // Stem: dx between -0.32 and -0.16, dy between -0.36 and 0.36
  const inStem = dx >= -0.32 && dx <= -0.16 && dy >= -0.36 && dy <= 0.36;

  // Top Loop outer: dx from -0.16 to 0.22, dy from -0.36 to 0.02
  const inTopLoopOuter = dx >= -0.16 && dx <= 0.22 && dy >= -0.36 && dy <= 0.02 &&
    (dx <= 0.08 || Math.hypot(dx - 0.08, dy - (-0.17)) <= 0.19);

  // Top Loop inner hole: dx from -0.16 to 0.08, dy from -0.24 to -0.10
  const inTopLoopInner = dx >= -0.16 && dx <= 0.08 && dy >= -0.24 && dy <= -0.10 &&
    (dx <= -0.04 || Math.hypot(dx - (-0.04), dy - (-0.17)) <= 0.08);

  const inTopLoop = inTopLoopOuter && !inTopLoopInner;

  // Diagonal leg of R: dx from -0.10 to 0.24, dy from 0.0 to 0.36
  const legXAtY = -0.04 + (dy - 0.0) * 0.75;
  const inLeg = dy >= -0.02 && dy <= 0.36 && dx >= legXAtY - 0.08 && dx <= legXAtY + 0.10;

  // Emergency Beacon Dot (top right above R)
  const inBeacon = Math.hypot(dx - 0.26, dy - (-0.28)) <= 0.065;

  // Emergency Waterline Underline: dy between 0.40 and 0.44, dx between -0.32 and 0.28
  const inWaterline = dy >= 0.40 && dy <= 0.44 && dx >= -0.32 && dx <= 0.28;

  if (inBeacon) return orange;
  if (inWaterline) return teal;
  if (inStem || inTopLoop || inLeg) return white;

  return bg;
}

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PWA icons...');
const icon192 = createPng(192, 192, (x, y, w, h) => renderResQIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), icon192);
console.log('Created pwa-192x192.png');

const icon512 = createPng(512, 512, (x, y, w, h) => renderResQIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), icon512);
console.log('Created pwa-512x512.png');

const iconMaskable = createPng(512, 512, (x, y, w, h) => renderResQIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), iconMaskable);
console.log('Created pwa-maskable-512x512.png');

const appleTouchIcon = createPng(180, 180, (x, y, w, h) => renderResQIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouchIcon);
console.log('Created apple-touch-icon.png');

console.log('All PWA icons generated successfully.');
