/**
 * GSPME SaaS - Archivage de fichiers de la GED (stockage en base, cloisonné par entreprise).
 *  POST   /api/files          : dépôt (corps brut, nom dans x-file-name, niveau dans x-security-level)
 *  GET    /api/files/:id      : téléchargement (droits vérifiés sur le niveau de confidentialité)
 *  DELETE /api/files/:id      : suppression
 *  GET    /api/files-usage    : espace utilisé / quota de la formule
 */
import { createHash, randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { all, one, run } from './db.ts';
import type { AuthedRequest } from './auth.ts';
import {
  ALLOWED_FILE_TYPES, MAX_FILE_BYTES, canAccessLevel, canWriteDocuments, fileExtension, isSecurityLevel,
  matchesSignature, validateFileMeta, type SecurityLevel,
} from '../shared/documents.ts';

type UserRow = { id: string; tenant_id: string; name: string; role: string; active: number };
type FileRow = { id: string; tenant_id: string; name: string; mime: string; size: number; sha256: string; security_level: SecurityLevel; uploaded_by_id: string; uploaded_by: string; data: Buffer };

async function currentUser(req: Request): Promise<UserRow | undefined> {
  const { auth } = req as AuthedRequest;
  const u = await one<UserRow>('SELECT * FROM users WHERE id = ?', [auth.sub]);
  return u && u.active ? u : undefined;
}

async function quotaBytes(tenantId: string): Promise<number> {
  const t = await one<{ data: string }>('SELECT data FROM tenants WHERE id = ?', [tenantId]);
  const mb = t ? Number(JSON.parse(t.data).maxStorageMB) : 0;
  return (Number.isFinite(mb) && mb > 0 ? mb : 1024) * 1024 * 1024;
}

const usedBytes = async (tenantId: string): Promise<number> =>
  Number((await one<{ n: number | null }>('SELECT COALESCE(SUM(size), 0) AS n FROM files WHERE tenant_id = ?', [tenantId]))?.n || 0);

export async function uploadFile(req: Request, res: Response) {
  const user = await currentUser(req);
  if (!user) { res.status(401).json({ error: 'Compte désactivé' }); return; }
  if (!canWriteDocuments(user.role)) { res.status(403).json({ error: 'Accès en lecture seule' }); return; }

  let name = '';
  try { name = decodeURIComponent(String(req.header('x-file-name') || '')).replace(/[\\/\0]/g, '_').trim(); } catch { /* nom invalide */ }
  const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const level = req.header('x-security-level') || 'PUBLIC_ENTREPRISE';
  if (!isSecurityLevel(level)) { res.status(400).json({ error: 'Niveau de confidentialité invalide' }); return; }
  if (!canAccessLevel(user.role, level)) { res.status(403).json({ error: 'Vous ne pouvez pas déposer un document à ce niveau de confidentialité' }); return; }

  const problem = validateFileMeta(name, body.length);
  if (problem) { res.status(body.length > MAX_FILE_BYTES ? 413 : 400).json({ error: problem }); return; }
  const ext = fileExtension(name);
  if (!matchesSignature(ext, body.subarray(0, 16))) { res.status(400).json({ error: `Le contenu du fichier ne correspond pas à son extension (.${ext}).` }); return; }

  const used = await usedBytes(user.tenant_id);
  const quota = await quotaBytes(user.tenant_id);
  if (used + body.length > quota) {
    res.status(413).json({ error: `Espace de stockage de votre formule dépassé (${(quota / 1073741824).toFixed(0)} Go). Supprimez des fichiers ou passez à une formule supérieure.` });
    return;
  }

  const id = `file-${randomUUID()}`;
  const sha256 = createHash('sha256').update(body).digest('hex');
  const mime = ALLOWED_FILE_TYPES[ext].mime;
  await run('INSERT INTO files (id, tenant_id, name, mime, size, sha256, security_level, uploaded_by_id, uploaded_by, data) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [id, user.tenant_id, name, mime, body.length, sha256, level, user.id, user.name, body]);
  res.status(201).json({ id, name, mime, size: body.length, sha256, securityLevel: level });
}

export async function downloadFile(req: Request, res: Response) {
  const user = await currentUser(req);
  if (!user) { res.status(401).json({ error: 'Compte désactivé' }); return; }
  const f = await one<FileRow>('SELECT * FROM files WHERE id = ? AND tenant_id = ?', [req.params.id as string, user.tenant_id]);
  if (!f) { res.status(404).json({ error: 'Fichier introuvable' }); return; }
  if (!canAccessLevel(user.role, f.security_level)) { res.status(403).json({ error: 'Accès réservé : niveau de confidentialité supérieur' }); return; }
  const inline = req.query.inline === '1' && /^(application\/pdf|image\/(png|jpeg|gif|webp))/.test(f.mime);
  res.setHeader('Content-Type', f.mime);
  res.setHeader('Content-Length', String(f.size));
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(f.name)}`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-File-SHA256', f.sha256);
  res.end(f.data);
}

export async function deleteFile(req: Request, res: Response) {
  const user = await currentUser(req);
  if (!user) { res.status(401).json({ error: 'Compte désactivé' }); return; }
  if (!canWriteDocuments(user.role)) { res.status(403).json({ error: 'Accès en lecture seule' }); return; }
  const f = await one<Omit<FileRow, 'data'>>('SELECT id, tenant_id, security_level, uploaded_by_id FROM files WHERE id = ? AND tenant_id = ?', [req.params.id as string, user.tenant_id]);
  if (!f) { res.status(404).json({ error: 'Fichier introuvable' }); return; }
  if (!canAccessLevel(user.role, f.security_level)) { res.status(403).json({ error: 'Accès réservé : niveau de confidentialité supérieur' }); return; }
  if (user.role !== 'DIRECTEUR_GENERAL' && f.uploaded_by_id !== user.id) { res.status(403).json({ error: 'Seuls la direction et l\'auteur du dépôt peuvent supprimer ce fichier' }); return; }
  await run('DELETE FROM files WHERE id = ?', [f.id]);
  res.json({ ok: true });
}

export async function filesUsage(req: Request, res: Response) {
  const user = await currentUser(req);
  if (!user) { res.status(401).json({ error: 'Compte désactivé' }); return; }
  const [used, quota, rows] = await Promise.all([usedBytes(user.tenant_id), quotaBytes(user.tenant_id), all<{ n: number }>('SELECT COUNT(*) AS n FROM files WHERE tenant_id = ?', [user.tenant_id])]);
  res.json({ usedBytes: used, quotaBytes: quota, count: Number(rows[0]?.n || 0), maxFileBytes: MAX_FILE_BYTES });
}
