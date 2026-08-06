/**
 * A ZIP writer, because Word and Excel files are ZIP archives.
 *
 * There is no dependency here for a reason: a Worker has no filesystem and a
 * hard bundle-size budget, and the archives this application produces are a
 * handful of small XML parts. The format is stable and forty years old, so
 * writing the twelve fields by hand is less risk than carrying a library.
 *
 * Entries are deflated with the platform `CompressionStream` when it exists and
 * stored uncompressed when it does not, so the same code produces a valid
 * archive either way.
 */

const encoder = new TextEncoder();

/** CRC-32 (IEEE 802.3), the checksum every ZIP entry header carries. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === "undefined") return null;
  try {
    const stream = new Response(bytes).body?.pipeThrough(
      new CompressionStream("deflate-raw"),
    );
    if (!stream) return null;
    const buffer = await new Response(stream).arrayBuffer();
    const out = new Uint8Array(buffer);
    // A tiny entry can deflate larger than it started; storing is then better.
    return out.length < bytes.length ? out : null;
  } catch {
    return null;
  }
}

export interface ZipEntry {
  name: string;
  data: string | Uint8Array;
}

interface Staged {
  nameBytes: Uint8Array;
  body: Uint8Array;
  crc: number;
  rawSize: number;
  method: number;
}

/** MS-DOS packed date and time, the only timestamp the base format carries. */
function dosStamp(date: Date): { time: number; date: number } {
  return {
    time:
      (date.getUTCHours() << 11) |
      (date.getUTCMinutes() << 5) |
      (date.getUTCSeconds() >> 1),
    date:
      ((Math.max(date.getUTCFullYear(), 1980) - 1980) << 9) |
      ((date.getUTCMonth() + 1) << 5) |
      date.getUTCDate(),
  };
}

class ByteWriter {
  private chunks: Uint8Array[] = [];
  length = 0;

  push(bytes: Uint8Array): void {
    this.chunks.push(bytes);
    this.length += bytes.length;
  }

  u16(value: number): void {
    this.push(new Uint8Array([value & 0xff, (value >>> 8) & 0xff]));
  }

  u32(value: number): void {
    this.push(
      new Uint8Array([
        value & 0xff,
        (value >>> 8) & 0xff,
        (value >>> 16) & 0xff,
        (value >>> 24) & 0xff,
      ]),
    );
  }

  finish(): Uint8Array {
    const out = new Uint8Array(this.length);
    let offset = 0;
    for (const chunk of this.chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }
}

export async function zip(entries: ZipEntry[]): Promise<Uint8Array> {
  const stamp = dosStamp(new Date());

  const staged: Staged[] = await Promise.all(
    entries.map(async (entry) => {
      const raw =
        typeof entry.data === "string" ? encoder.encode(entry.data) : entry.data;
      const deflated = await deflateRaw(raw);
      return {
        nameBytes: encoder.encode(entry.name),
        body: deflated ?? raw,
        crc: crc32(raw),
        rawSize: raw.length,
        method: deflated ? 8 : 0,
      };
    }),
  );

  const out = new ByteWriter();
  const offsets: number[] = [];

  for (const item of staged) {
    offsets.push(out.length);

    out.u32(0x04034b50); // local file header
    out.u16(20); // version needed
    out.u16(0x0800); // UTF-8 filenames
    out.u16(item.method);
    out.u16(stamp.time);
    out.u16(stamp.date);
    out.u32(item.crc);
    out.u32(item.body.length);
    out.u32(item.rawSize);
    out.u16(item.nameBytes.length);
    out.u16(0); // extra field length
    out.push(item.nameBytes);
    out.push(item.body);
  }

  const centralStart = out.length;

  staged.forEach((item, index) => {
    out.u32(0x02014b50); // central directory header
    out.u16(20); // version made by
    out.u16(20); // version needed
    out.u16(0x0800);
    out.u16(item.method);
    out.u16(stamp.time);
    out.u16(stamp.date);
    out.u32(item.crc);
    out.u32(item.body.length);
    out.u32(item.rawSize);
    out.u16(item.nameBytes.length);
    out.u16(0); // extra
    out.u16(0); // comment
    out.u16(0); // disk number
    out.u16(0); // internal attributes
    out.u32(0); // external attributes
    out.u32(offsets[index]);
    out.push(item.nameBytes);
  });

  const centralSize = out.length - centralStart;

  out.u32(0x06054b50); // end of central directory
  out.u16(0);
  out.u16(0);
  out.u16(staged.length);
  out.u16(staged.length);
  out.u32(centralSize);
  out.u32(centralStart);
  out.u16(0);

  return out.finish();
}

/** XML text escaping, shared by the two OOXML writers. */
export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // Control characters are not legal in XML 1.0 and Word refuses the file.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}
