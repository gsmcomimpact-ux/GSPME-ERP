/**
 * GSPME - Export de données : CSV (compatible Excel), ZIP, JSON, téléchargement navigateur.
 * Fonctions pures (hors `downloadBlob`) pour rester testables.
 */

export type CsvValue = string | number | boolean | null | undefined;

export interface CsvOptions {
  /** Séparateur de colonnes (« ; » par défaut : ouvre correctement dans Excel en version française). */
  separator?: string;
  /** Virgule décimale pour les nombres (Excel FR) ; sinon point (échanges machine). */
  decimalComma?: boolean;
}

/** Protège contre l'injection de formules (=, +, -, @) à l'ouverture dans Excel. */
function neutralizeFormula(text: string): string {
  return /^[=+\-@\t\r]/.test(text) && !/^-?\d+([.,]\d+)?$/.test(text) ? `'${text}` : text;
}

function formatCell(v: CsvValue, o: Required<CsvOptions>): string {
  if (v === null || v === undefined) return '';
  let text: string;
  if (typeof v === 'number') text = Number.isFinite(v) ? String(v) : '';
  else if (typeof v === 'boolean') text = v ? 'Oui' : 'Non';
  else text = neutralizeFormula(v);
  if (typeof v === 'number' && o.decimalComma) text = text.replace('.', ',');
  return /["\r\n]/.test(text) || text.includes(o.separator) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Construit un CSV avec BOM UTF-8 (accents corrects dans Excel) et fins de ligne CRLF. */
export function toCsv(rows: CsvValue[][], options: CsvOptions = {}): string {
  const o = { separator: options.separator ?? ';', decimalComma: options.decimalComma ?? false };
  return '﻿' + rows.map(r => r.map(c => formatCell(c, o)).join(o.separator)).join('\r\n') + '\r\n';
}

/** Aplatit un tableau d'objets en tableau de lignes ; objets/tableaux imbriqués → JSON. */
export function objectsToRows(items: Record<string, unknown>[], preferredOrder: string[] = []): CsvValue[][] {
  const keys: string[] = [];
  for (const k of preferredOrder) if (items.some(i => k in i)) keys.push(k);
  for (const item of items) for (const k of Object.keys(item)) if (!keys.includes(k)) keys.push(k);
  const cell = (v: unknown): CsvValue =>
    v !== null && typeof v === 'object' ? JSON.stringify(v) : (v as CsvValue);
  return [keys, ...items.map(i => keys.map(k => cell(i[k])))];
}

// ----------------------------------------------------------------------------- ZIP (sans compression)

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipFile {
  name: string;
  content: string | Uint8Array;
}

/** Archive ZIP « stockée » (sans compression), noms de fichiers en UTF-8. */
export function buildZip(files: ZipFile[], date: Date = new Date()): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  const u16 = (v: number) => [v & 0xff, (v >>> 8) & 0xff];
  const u32 = (v: number) => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];

  for (const f of files) {
    const name = enc.encode(f.name);
    const data = typeof f.content === 'string' ? enc.encode(f.content) : f.content;
    const crc = crc32(data);
    const common = [...u16(20), ...u16(0x0800), ...u16(0), ...u16(dosTime), ...u16(dosDate), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)];

    chunks.push(new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...common]), name, data);
    central.push(new Uint8Array([0x50, 0x4b, 0x01, 0x02, ...u16(20), ...common.slice(0, 26), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), name);
    offset += 30 + name.length + data.length;
  }

  const centralSize = central.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array([0x50, 0x4b, 0x05, 0x06, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(centralSize), ...u32(offset), ...u16(0)]);

  const all = [...chunks, ...central, end];
  const out = new Uint8Array(all.reduce((n, c) => n + c.length, 0));
  let pos = 0;
  for (const c of all) { out.set(c, pos); pos += c.length; }
  return out;
}

// ----------------------------------------------------------------------------- Téléchargement

export function downloadBlob(content: BlobPart, filename: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const downloadCsv = (rows: CsvValue[][], filename: string, options?: CsvOptions) =>
  downloadBlob(toCsv(rows, options), filename, 'text/csv;charset=utf-8');

/** Nom de fichier sûr : « Société Test SARL » → « societe-test-sarl ». */
export function slugify(text: string): string {
  return (
    text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'export'
  );
}
