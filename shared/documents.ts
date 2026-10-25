/**
 * GSPME - Règles de la GED partagées client / serveur : niveaux de confidentialité, types de fichiers, limites.
 */
export type SecurityLevel = 'PUBLIC_ENTREPRISE' | 'CONFIDENTIEL_DAF' | 'DIRECTION_SEULEMENT';

export const SECURITY_LEVELS: SecurityLevel[] = ['PUBLIC_ENTREPRISE', 'CONFIDENTIEL_DAF', 'DIRECTION_SEULEMENT'];
export const isSecurityLevel = (v: unknown): v is SecurityLevel => SECURITY_LEVELS.includes(v as SecurityLevel);

const LEVEL_ROLES: Record<SecurityLevel, string[] | 'ALL'> = {
  PUBLIC_ENTREPRISE: 'ALL',
  CONFIDENTIEL_DAF: ['DIRECTEUR_GENERAL', 'RESPONSABLE_FINANCIER', 'AUDITEUR_EXTERNE'],
  DIRECTION_SEULEMENT: ['DIRECTEUR_GENERAL'],
};

/** Ce rôle peut-il consulter / téléverser un document de ce niveau ? */
export function canAccessLevel(role: string, level: SecurityLevel): boolean {
  const allowed = LEVEL_ROLES[level];
  return allowed === 'ALL' || allowed.includes(role);
}

/** Peut-on ajouter / supprimer des documents ? (l'auditeur externe est en lecture seule) */
export const canWriteDocuments = (role: string): boolean => role !== 'AUDITEUR_EXTERNE';

/** 8 Mo par fichier : compatible avec les limites usuelles des hébergements mutualisés (max_allowed_packet). */
export const MAX_FILE_BYTES = 8 * 1024 * 1024;

/** Extensions autorisées et type MIME servi (jamais celui annoncé par le navigateur). Pas de HTML, SVG ni exécutables. */
export const ALLOWED_FILE_TYPES: Record<string, { mime: string; kind: 'PDF' | 'IMAGE' | 'EXCEL' | 'DOC' | 'AUTRE' }> = {
  pdf: { mime: 'application/pdf', kind: 'PDF' },
  png: { mime: 'image/png', kind: 'IMAGE' },
  jpg: { mime: 'image/jpeg', kind: 'IMAGE' },
  jpeg: { mime: 'image/jpeg', kind: 'IMAGE' },
  gif: { mime: 'image/gif', kind: 'IMAGE' },
  webp: { mime: 'image/webp', kind: 'IMAGE' },
  doc: { mime: 'application/msword', kind: 'DOC' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', kind: 'DOC' },
  odt: { mime: 'application/vnd.oasis.opendocument.text', kind: 'DOC' },
  txt: { mime: 'text/plain; charset=utf-8', kind: 'DOC' },
  xls: { mime: 'application/vnd.ms-excel', kind: 'EXCEL' },
  xlsx: { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', kind: 'EXCEL' },
  ods: { mime: 'application/vnd.oasis.opendocument.spreadsheet', kind: 'EXCEL' },
  csv: { mime: 'text/csv; charset=utf-8', kind: 'EXCEL' },
  ppt: { mime: 'application/vnd.ms-powerpoint', kind: 'DOC' },
  pptx: { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', kind: 'DOC' },
  zip: { mime: 'application/zip', kind: 'AUTRE' },
};

export const fileExtension = (name: string): string => (name.split('.').pop() || '').toLowerCase();

/** Valide le nom et la taille ; renvoie un message d'erreur ou null. */
export function validateFileMeta(name: string, size: number): string | null {
  if (!name || name.length > 200) return 'Nom de fichier invalide';
  const ext = fileExtension(name);
  if (!ALLOWED_FILE_TYPES[ext]) return `Type de fichier non autorisé (.${ext || '?'}). Formats acceptés : ${Object.keys(ALLOWED_FILE_TYPES).join(', ')}.`;
  if (size <= 0) return 'Le fichier est vide';
  if (size > MAX_FILE_BYTES) return `Fichier trop volumineux (${(size / 1048576).toFixed(1)} Mo) : 8 Mo maximum par fichier.`;
  return null;
}

/** Vérifie que le contenu correspond à l'extension (signatures) — empêche de déguiser un exécutable en PDF. */
export function matchesSignature(ext: string, head: Uint8Array): boolean {
  const starts = (...bytes: number[]) => bytes.every((b, i) => head[i] === b);
  switch (ext) {
    case 'pdf': return starts(0x25, 0x50, 0x44, 0x46);
    case 'png': return starts(0x89, 0x50, 0x4e, 0x47);
    case 'jpg': case 'jpeg': return starts(0xff, 0xd8, 0xff);
    case 'gif': return starts(0x47, 0x49, 0x46, 0x38);
    case 'webp': return starts(0x52, 0x49, 0x46, 0x46) && head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50;
    case 'docx': case 'xlsx': case 'pptx': case 'odt': case 'ods': case 'zip': return starts(0x50, 0x4b, 0x03, 0x04);
    case 'doc': case 'xls': case 'ppt': return starts(0xd0, 0xcf, 0x11, 0xe0);
    case 'txt': case 'csv': return !Array.from(head.subarray(0, 512)).includes(0); // texte : aucun octet nul
    default: return false;
  }
}

export const formatBytes = (n: number): string =>
  n >= 1073741824 ? `${(n / 1073741824).toFixed(2)} Go` : n >= 1048576 ? `${(n / 1048576).toFixed(1)} Mo` : n >= 1024 ? `${Math.round(n / 1024)} Ko` : `${n} o`;
