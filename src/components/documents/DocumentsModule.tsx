/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Module M : Documents & Archivage Sécurisé (GED)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileText, Image as ImageIcon, FileSpreadsheet, File as FileIcon, Plus, Download, Shield, Lock, Eye, Trash2, UploadCloud, X,
} from 'lucide-react';
import { Tenant, StoredDocument, User } from '../../types';
import { Modal } from '../common/UIComponents';
import { storage } from '../../services/storage';
import { PdfService } from '../../services/pdfService';
import { fileStore, checkFile, kindOf, mimeOf } from '../../services/fileStore';
import { downloadBlob } from '../../services/exportService';
import { canAccessLevel, canWriteDocuments, formatBytes, MAX_FILE_BYTES, ALLOWED_FILE_TYPES } from '../../../shared/documents';

interface DocumentsModuleProps {
  tenant: Tenant;
  documents: StoredDocument[];
  currentUser: User;
  serverMode: boolean;
  searchFilter: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  STATUTS_SOCIETE: 'Statuts société',
  JUSTIFICATIF_FISCAL: 'Justificatif fiscal',
  CONTRAT: 'Contrat',
  PLAN_TECHNIQUE: 'Plan technique',
  FACTURE_SIGNEE: 'Facture signée',
  AUTRE: 'Autre',
};
const FILTERS = ['TOUS', 'STATUTS_SOCIETE', 'JUSTIFICATIF_FISCAL', 'CONTRAT', 'PLAN_TECHNIQUE', 'AUTRE'];
const LEVEL_LABELS: Record<string, string> = {
  PUBLIC_ENTREPRISE: 'Collaborateurs',
  CONFIDENTIEL_DAF: 'Direction & DAF',
  DIRECTION_SEULEMENT: 'Direction Générale',
};
const ACCEPT = Object.keys(ALLOWED_FILE_TYPES).map(e => `.${e}`).join(',');

function iconFor(t: StoredDocument['fileType']) {
  if (t === 'IMAGE') return <ImageIcon className="w-5 h-5" />;
  if (t === 'EXCEL') return <FileSpreadsheet className="w-5 h-5" />;
  if (t === 'AUTRE') return <FileIcon className="w-5 h-5" />;
  return <FileText className="w-5 h-5" />;
}

interface Pending { file: File; error: string | null; status: 'ready' | 'sending' | 'done' | 'failed' }

export function DocumentsModule({ tenant, documents, currentUser, serverMode, searchFilter }: DocumentsModuleProps) {
  const role = currentUser.role;
  const canWrite = canWriteDocuments(role);
  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState<string>('TOUS');
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [usage, setUsage] = useState<{ usedBytes: number; quotaBytes: number } | null>(null);
  const [preview, setPreview] = useState<{ title: string; url: string; kind: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<StoredDocument['category']>('CONTRAT');
  const [docSecurity, setDocSecurity] = useState<StoredDocument['securityLevel']>('PUBLIC_ENTREPRISE');
  const [docRelated, setDocRelated] = useState('');

  const refreshUsage = useCallback(() => {
    fileStore.usage(serverMode).then(setUsage).catch(() => setUsage(null));
  }, [serverMode]);
  useEffect(refreshUsage, [refreshUsage, documents.length]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  const addFiles = async (list: FileList | File[]) => {
    const files = Array.from(list);
    const checked: Pending[] = [];
    for (const file of files) checked.push({ file, error: await checkFile(file), status: 'ready' });
    setPending(p => [...p, ...checked]);
  };

  const resetModal = () => { setModalOpen(false); setPending([]); setDocTitle(''); setDocRelated(''); };

  const handleArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    const todo = pending.filter(p => !p.error && p.status !== 'done');
    if (!todo.length) { setNotice({ kind: 'err', text: 'Ajoutez au moins un fichier valide.' }); return; }
    let ok = 0;
    const failures: string[] = [];
    for (const item of todo) {
      setPending(p => p.map(x => (x.file === item.file ? { ...x, status: 'sending' } : x)));
      try {
        const info = await fileStore.save(item.file, docSecurity, serverMode);
        const title = docTitle.trim() && todo.length === 1 ? docTitle.trim() : item.file.name.replace(/\.[^.]+$/, '');
        storage.addDocument({
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          tenantId: tenant.id,
          title,
          category: docCategory,
          fileType: kindOf(item.file.name),
          sizeKB: Math.max(1, Math.round(info.size / 1024)),
          uploadedAt: new Date().toISOString().split('T')[0],
          uploadedBy: currentUser.name,
          uploadedById: currentUser.id,
          relatedEntity: docRelated.trim() || undefined,
          securityLevel: docSecurity,
          fileId: info.id,
          fileName: info.name,
          mime: info.mime,
          sha256: info.sha256,
        });
        ok++;
        setPending(p => p.map(x => (x.file === item.file ? { ...x, status: 'done' } : x)));
      } catch (err) {
        failures.push(`${item.file.name} : ${(err as Error).message}`);
        setPending(p => p.map(x => (x.file === item.file ? { ...x, status: 'failed', error: (err as Error).message } : x)));
      }
    }
    refreshUsage();
    if (!failures.length) {
      setNotice({ kind: 'ok', text: `${ok} document${ok > 1 ? 's' : ''} archivé${ok > 1 ? 's' : ''} avec succès.` });
      resetModal();
    } else {
      setNotice({ kind: 'err', text: `${ok} archivé(s), ${failures.length} échec(s) — ${failures[0]}` });
    }
  };

  const unlocked = (d: StoredDocument) => canAccessLevel(role, d.securityLevel);
  const isOwner = (d: StoredDocument) => role === 'DIRECTEUR_GENERAL' || (!!d.uploadedById && d.uploadedById === currentUser.id);
  const canDelete = (d: StoredDocument) => canWrite && isOwner(d);

  const handleDownload = async (doc: StoredDocument) => {
    setBusyId(doc.id);
    try {
      if (!doc.fileId) {
        storage.logAudit('EXPORT', 'DOCUMENTS', `Téléchargement fiche document : ${doc.title}`);
        PdfService.downloadStoredDocumentPdf(doc, tenant);
      } else {
        const blob = await fileStore.get(doc.fileId, serverMode);
        storage.logAudit('EXPORT', 'DOCUMENTS', `Téléchargement document : ${doc.title}`);
        downloadBlob(blob, doc.fileName || doc.title, doc.mime || mimeOf(doc.fileName || ''));
      }
    } catch (err) {
      setNotice({ kind: 'err', text: (err as Error).message });
    } finally { setBusyId(null); }
  };

  const handlePreview = async (doc: StoredDocument) => {
    if (!doc.fileId) return;
    setBusyId(doc.id);
    try {
      const blob = await fileStore.get(doc.fileId, serverMode, true);
      const typed = new Blob([blob], { type: doc.mime || mimeOf(doc.fileName || '') });
      storage.logAudit('EXPORT', 'DOCUMENTS', `Consultation document : ${doc.title}`);
      setPreview({ title: doc.title, url: URL.createObjectURL(typed), kind: doc.fileType });
    } catch (err) {
      setNotice({ kind: 'err', text: (err as Error).message });
    } finally { setBusyId(null); }
  };

  const handleDelete = async (doc: StoredDocument) => {
    if (!window.confirm(`Supprimer définitivement « ${doc.title} » ?`)) return;
    setBusyId(doc.id);
    try {
      if (doc.fileId) await fileStore.remove(doc.fileId, serverMode);
      storage.removeDocument(doc.id);
      setNotice({ kind: 'ok', text: 'Document supprimé.' });
      refreshUsage();
    } catch (err) {
      setNotice({ kind: 'err', text: (err as Error).message });
    } finally { setBusyId(null); }
  };

  const query = searchFilter.toLowerCase();
  const filteredDocs = documents.filter(d => {
    const matchesCat = category === 'TOUS' || d.category === category;
    const matchesSearch = d.title.toLowerCase().includes(query) || (d.relatedEntity && d.relatedEntity.toLowerCase().includes(query));
    return matchesCat && matchesSearch;
  });
  const pct = usage ? Math.min(100, Math.round((usage.usedBytes / usage.quotaBytes) * 100)) : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Documents & Archivage Sécurisé (GED)</h2>
          <p className="text-xs text-slate-500">
            Conservation légale, contrats signés, pièces justificatives fiscales et plans techniques
          </p>
        </div>
        {canWrite && (
          <button
            onClick={() => setModalOpen(true)}
            className="px-3.5 py-1.5 bg-[#0F5132] hover:bg-[#0c4028] text-white text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Archiver un Document</span>
          </button>
        )}
      </div>

      {notice && (
        <div role="status" className={`flex items-start justify-between gap-2 text-xs p-3 rounded-lg border ${notice.kind === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} aria-label="Fermer" className="cursor-pointer"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {usage && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 text-xs">
          <div className="flex justify-between text-slate-600 mb-1.5">
            <span>Espace d'archivage utilisé{serverMode ? '' : ' (mode démo, ce navigateur)'}</span>
            <span className="font-semibold">{formatBytes(usage.usedBytes)} / {formatBytes(usage.quotaBytes)}</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${pct > 90 ? 'bg-rose-500' : 'bg-[#0F5132]'}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {FILTERS.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap cursor-pointer transition-colors ${
              category === cat ? 'bg-[#0F5132] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat === 'TOUS' ? 'TOUS' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {filteredDocs.length === 0 && (
        <div className="text-center text-xs text-slate-500 bg-white border border-dashed border-slate-300 rounded-xl p-8">
          Aucun document. {canWrite ? 'Cliquez sur « Archiver un Document » pour déposer vos fichiers.' : ''}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map(doc => {
          const open = unlocked(doc);
          return (
            <div key={doc.id} data-testid="doc-card" className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-4 hover:border-[#0F5132]/30 transition-all">
              <div>
                <div className="flex items-start justify-between">
                  <div className={`p-2.5 rounded-lg ${open ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                    {open ? iconFor(doc.fileType) : <Lock className="w-5 h-5" />}
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {CATEGORY_LABELS[doc.category] || doc.category}
                  </span>
                </div>
                <div className="mt-3">
                  <h4 className="text-sm font-bold text-slate-900 leading-snug break-words">{doc.title}</h4>
                  <div className="mt-2 space-y-0.5 text-xs text-slate-500">
                    <div>Taille : {formatBytes(doc.sizeKB * 1024)} · Format {doc.fileType}</div>
                    <div>Archivé le : {doc.uploadedAt} par {doc.uploadedBy}</div>
                    {doc.relatedEntity && <div className="text-[11px] text-slate-600 font-mono mt-1">Lien : {doc.relatedEntity}</div>}
                    {doc.sha256 && <div className="text-[10px] font-mono text-slate-400" title={doc.sha256}>SHA-256 : {doc.sha256.slice(0, 12)}…</div>}
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold text-emerald-800 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-[#D4AF37]" />
                  <span>{LEVEL_LABELS[doc.securityLevel] || doc.securityLevel}</span>
                </span>
                {open ? (
                  <div className="flex items-center gap-0.5">
                    {doc.fileId && (doc.fileType === 'PDF' || doc.fileType === 'IMAGE') && (
                      <button onClick={() => handlePreview(doc)} disabled={busyId === doc.id} aria-label={`Aperçu ${doc.title}`} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded cursor-pointer">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => handleDownload(doc)} disabled={busyId === doc.id} className="px-2 py-1 text-xs text-[#0F5132] font-semibold hover:bg-[#0F5132]/10 rounded flex items-center gap-1 cursor-pointer transition-colors">
                      <Download className="w-3.5 h-3.5" />
                      <span>Télécharger</span>
                    </button>
                    {canDelete(doc) && (
                      <button onClick={() => handleDelete(doc)} disabled={busyId === doc.id} aria-label={`Supprimer ${doc.title}`} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-500 flex items-center gap-1"><Lock className="w-3 h-3" />Accès restreint</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={modalOpen} onClose={resetModal} title="Archiver des Documents" subtitle="Dépôt sécurisé dans le référentiel documentaire de l'entreprise">
        <form onSubmit={handleArchive} className="space-y-4 text-xs">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); void addFiles(e.dataTransfer.files); }}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-xl p-5 text-center transition-colors ${dragging ? 'border-[#0F5132] bg-emerald-50' : 'border-slate-300 hover:border-[#0F5132]/60'}`}
          >
            <UploadCloud className="w-6 h-6 mx-auto text-[#0F5132]" />
            <p className="mt-1.5 font-semibold text-slate-700">Glissez vos fichiers ici ou cliquez pour parcourir</p>
            <p className="text-[11px] text-slate-500 mt-0.5">PDF, images, Word, Excel, PowerPoint, TXT, CSV, ZIP — {formatBytes(MAX_FILE_BYTES)} max par fichier</p>
            <input
              ref={inputRef}
              data-testid="ged-file-input"
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              onChange={e => { if (e.target.files) void addFiles(e.target.files); e.target.value = ''; }}
            />
          </div>

          {pending.length > 0 && (
            <ul className="space-y-1.5" data-testid="ged-pending">
              {pending.map((p, i) => (
                <li key={i} className={`flex items-center justify-between gap-2 p-2 rounded-lg border ${p.error ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 truncate">{p.file.name}</div>
                    <div className={p.error ? 'text-rose-700' : 'text-slate-500'}>
                      {p.error || `${formatBytes(p.file.size)} · ${p.status === 'sending' ? 'envoi en cours…' : p.status === 'done' ? 'archivé ✓' : 'prêt'}`}
                    </div>
                  </div>
                  {p.status !== 'sending' && p.status !== 'done' && (
                    <button type="button" aria-label={`Retirer ${p.file.name}`} onClick={() => setPending(list => list.filter((_, j) => j !== i))} className="cursor-pointer text-slate-500"><X className="w-3.5 h-3.5" /></button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Titre du document {pending.filter(p => !p.error).length > 1 ? '(ignoré : le nom de chaque fichier sert de titre)' : '(optionnel)'}</label>
            <input type="text" placeholder="Ex: Quitus fiscal annuel, Contrat cadre fournisseur..." value={docTitle} onChange={e => setDocTitle(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Catégorie</label>
              <select value={docCategory} onChange={e => setDocCategory(e.target.value as StoredDocument['category'])} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                <option value="CONTRAT">Contrat commercial</option>
                <option value="JUSTIFICATIF_FISCAL">Justificatif fiscal & social</option>
                <option value="STATUTS_SOCIETE">Statuts de la société</option>
                <option value="PLAN_TECHNIQUE">Plan technique ou d'ingénierie</option>
                <option value="FACTURE_SIGNEE">Facture signée</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Niveau de Confidentialité</label>
              <select value={docSecurity} onChange={e => setDocSecurity(e.target.value as StoredDocument['securityLevel'])} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                <option value="PUBLIC_ENTREPRISE">Accessible aux collaborateurs</option>
                <option value="CONFIDENTIEL_DAF">Direction & DAF uniquement</option>
                <option value="DIRECTION_SEULEMENT">Direction Générale seule</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Rattachement / Référence Pièce (Optionnel)</label>
            <input type="text" placeholder="Ex: FAC-2026-0041, Client CSE SA" value={docRelated} onChange={e => setDocRelated(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg" />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-600 text-[11px]">
            Chaque fichier reçoit une empreinte SHA-256 prouvant son intégrité. Conservation légale des pièces comptables : 10 ans (Acte Uniforme OHADA).
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={resetModal} className="px-4 py-2 border border-slate-200 rounded-lg cursor-pointer">Annuler</button>
            <button type="submit" disabled={!pending.some(p => !p.error && p.status !== 'done') || pending.some(p => p.status === 'sending')} className="px-4 py-2 bg-[#0F5132] text-white font-semibold rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
              Enregistrer l'Archive
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!preview} onClose={() => setPreview(null)} title={preview?.title || ''} subtitle="Aperçu du document archivé" maxWidth="4xl">
        {preview && (preview.kind === 'IMAGE'
          ? <img src={preview.url} alt={preview.title} className="max-h-[70vh] mx-auto rounded" />
          : <iframe src={preview.url} title={preview.title} className="w-full h-[70vh] rounded border border-slate-200" />)}
      </Modal>
    </div>
  );
}
