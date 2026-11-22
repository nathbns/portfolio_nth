// Chapitres d'une vidéo MP4 : lus dans la boîte « chpl » (format Nero, écrit
// par ffmpeg) sous moov/udta. Aucun outil externe n'est nécessaire.
import fs from "node:fs";

export interface Chapter {
  t: number; // début, en secondes
  title: string;
}

const cache = new Map<string, Chapter[]>();

function readAt(fd: number, pos: number, len: number): Buffer {
  const b = Buffer.alloc(len);
  const n = fs.readSync(fd, b, 0, len, pos);
  return n === len ? b : b.subarray(0, n);
}

interface Box {
  type: string;
  start: number; // début du contenu
  end: number;
}

function* boxes(read: (pos: number, len: number) => Buffer, start: number, end: number): Generator<Box> {
  let off = start;
  while (off + 8 <= end) {
    const h = read(off, 16);
    if (h.length < 8) return;
    let size = h.readUInt32BE(0);
    const type = h.toString("latin1", 4, 8);
    let hdr = 8;
    if (size === 1) {
      size = Number(h.readBigUInt64BE(8));
      hdr = 16;
    } else if (size === 0) size = end - off;
    if (size < hdr) return;
    yield { type, start: off + hdr, end: off + size };
    off += size;
  }
}

function parse(file: string): Chapter[] {
  const fd = fs.openSync(file, "r");
  try {
    const size = fs.fstatSync(fd).size;
    const moov = [...boxes((p, l) => readAt(fd, p, l), 0, size)].find((b) => b.type === "moov");
    if (!moov || moov.end - moov.start > 64 * 1024 * 1024) return [];
    const buf = readAt(fd, moov.start, moov.end - moov.start);
    const read = (p: number, l: number) => buf.subarray(p - moov.start, p - moov.start + l);
    const udta = [...boxes(read, moov.start, moov.end)].find((b) => b.type === "udta");
    if (!udta) return [];
    const chpl = [...boxes(read, udta.start, udta.end)].find((b) => b.type === "chpl");
    if (!chpl) return [];
    const d = read(chpl.start, chpl.end - chpl.start);
    // version (1) + drapeaux (3) + réservé (4), puis le nombre de chapitres
    const n = d[8];
    const out: Chapter[] = [];
    let pos = 9;
    for (let i = 0; i < n && pos + 9 <= d.length; i++) {
      const start = Number(d.readBigUInt64BE(pos)) / 1e7;
      const len = d[pos + 8];
      const title = d.toString("utf8", pos + 9, pos + 9 + len);
      out.push({ t: start, title });
      pos += 9 + len;
    }
    return out.filter((c, i) => i === 0 || c.t > out[i - 1].t);
  } catch {
    return [];
  } finally {
    fs.closeSync(fd);
  }
}

export function readChapters(file: string): Chapter[] {
  let key: string;
  try {
    key = file + ":" + fs.statSync(file).mtimeMs;
  } catch {
    return [];
  }
  const hit = cache.get(key);
  if (hit) return hit;
  const ch = parse(file);
  cache.set(key, ch);
  return ch;
}
