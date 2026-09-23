// プラグインのアイコン（56x56 PNG）を外部ライブラリなしで生成する
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const SIZE = 56;
const BG = [52, 152, 219];
const FG = [255, 255, 255];

// 角丸の四角形の中に、表示を表す「目」と、必須を表す「チェック」を描く
function colorAt(x, y) {
  const r = 12;
  const cx = Math.min(Math.max(x, r), SIZE - 1 - r);
  const cy = Math.min(Math.max(y, r), SIZE - 1 - r);
  if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) return null;

  // 目: 横長の楕円の輪郭 + 瞳
  const ex = (x - 28) / 18;
  const ey = (y - 22) / 10;
  const d = ex * ex + ey * ey;
  if ((d <= 1 && d >= 0.62) || (x - 28) ** 2 + (y - 22) ** 2 <= 16) return FG;

  // チェック: 2本の太い線分
  const onSegment = (x1, y1, x2, y2, w) => {
    const t = Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / ((x2 - x1) ** 2 + (y2 - y1) ** 2)));
    return (x - (x1 + t * (x2 - x1))) ** 2 + (y - (y1 + t * (y2 - y1))) ** 2 <= w * w;
  };
  if (onSegment(18, 41, 25, 47, 2.6) || onSegment(25, 47, 38, 34, 2.6)) return FG;

  return BG;
}

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  for (let x = 0; x < SIZE; x++) {
    const c = colorAt(x, y);
    const o = y * (SIZE * 4 + 1) + 1 + x * 4;
    if (c) raw.set([...c, 255], o);
  }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr.set([8, 6, 0, 0, 0], 8); // 8bit RGBA

writeFileSync(
  'plugin/image/icon.png',
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]),
);
console.log('plugin/image/icon.png を生成しました');
