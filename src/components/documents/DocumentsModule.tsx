/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Module M : Documents & Archivage Sécurisé (GED)
 */

import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Download,
  Lock,
  Shield,
  FileCheck,
  FolderOpen,
  Eye
} from 'lucide-react';
import { Tenant, StoredDocument, Role } from '../../types';
import { Modal } from '../common/UIComponents';
import { storage } from '../../services/storage';

interface DocumentsModuleProps {
  tenant: Tenant;
  documents: StoredDocument[];
  userRole: Role;
  searchFilter: string;
}

export function DocumentsModule({
  tenant,
  documents,
  userRole,
  searchFilter,
}: DocumentsModuleProps) {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('TOUS');

  // Form State
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<StoredDocument['category']>('CONTRAT');
  const [docSecurity, setDocSecurity] = useState<StoredDocument['securityLevel']>('PUBLIC_ENTREPRISE');
  const [docRelated, setDocRelated] = useState('');

  const categories = ['TOUS', 'STATUTS_SOCIETE', 'JUSTIFICATIF_FISCAL', 'CONTRAT', 'PLAN_TECHNIQUE'];

  const handleUploadDocument = (e: React.FormEvent) => {
    e.preventDefault();
    const newDoc: StoredDocument = {
      id: `doc-${Date.now()}`,
      tenantId: tenant.id,
      title: docTitle,
      category: docCategory,
      fileType: 'PDF',
      sizeKB: Math.floor(500 + Math.random() * 3000),
      uploadedAt: new Date().toISOString().split('T')[0],
      uploadedBy: 'Collaborateur GSPME',
      relatedEntity: docRelated,
      securityLevel: docSecurity,
    };

    storage.addDocument(newDoc);
    setCreateModalOpen(false);
    setDocTitle('');
  };

  const handleDownload = (doc: StoredDocument) => {
    storage.logAudit('EXPORT', 'DOCUMENTS', `Consultation et téléchargement document : ${doc.title}`);
    alert(`Téléchargement de : ${doc.title} (Fichier PDF certifié)`);
  };

  const query = searchFilter.toLowerCase();
  const filteredDocs = documents.filter(d => {
    const matchesCat = selectedCategory === 'TOUS' || d.category === selectedCategory;
    const matchesSearch = d.title.toLowerCase().includes(query) || (d.relatedEntity && d.relatedEntity.toLowerCase().includes(query));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Documents & Archivage Sécurisé (GED)</h2>
          <p className="text-xs text-slate-500">
            Conservation légale, contrats signés, pièces justificatives fiscales et plans techniques
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-3.5 py-1.5 bg-[#0F5132] hover:bg-[#0c4028] text-white text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Archiver un Document</span>
        </button>
      </div>

      {/* Categories Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap cursor-pointer transition-colors ${
              selectedCategory === cat
                ? 'bg-[#0F5132] text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map(doc => (
          <div
            key={doc.id}
            className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-4 hover:border-[#0F5132]/30 transition-all"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {doc.category.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="mt-3">
                <h4 className="text-sm font-bold text-slate-900 leading-snug">{doc.title}</h4>
                <div className="mt-2 space-y-0.5 text-xs text-slate-500">
                  <div>Taille : {doc.sizeKB} Ko · Format {doc.fileType}</div>
                  <div>Archivé le : {doc.uploadedAt} par {doc.uploadedBy}</div>
                  {doc.relatedEntity && (
                    <div className="text-[11px] text-slate-600 font-mono mt-1">
                      Lien : {doc.relatedEntity}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-emerald-800 flex items-center gap-1">
                <Shield className="w-3 h-3 text-[#D4AF37]" />
                <span>{doc.securityLevel.replace(/_/g, ' ')}</span>
              </span>

              <button
                onClick={() => handleDownload(doc)}
                className="px-2.5 py-1 text-xs text-[#0F5132] font-semibold hover:bg-[#0F5132]/10 rounded flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: Archiver un Document */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Archiver un Document Sécurisé"
        subtitle="Indexation dans le référentiel documentaire de l'entreprise"
      >
        <form onSubmit={handleUploadDocument} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Titre ou Objet du document *</label>
            <input
              type="text"
              placeholder="Ex: Quitus fiscal annuel, Contrat cadre fournisseur..."
              value={docTitle}
              onChange={e => setDocTitle(e.target.value)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Catégorie</label>
              <select
                value={docCategory}
                onChange={e => setDocCategory(e.target.value as any)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="CONTRAT">Contrat commercial</option>
                <option value="JUSTIFICATIF_FISCAL">Justificatif fiscal & social</option>
                <option value="STATUTS_SOCIETE">Statuts de la société</option>
                <option value="PLAN_TECHNIQUE">Plan technique ou d'ingénierie</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Niveau de Confidentialité</label>
              <select
                value={docSecurity}
                onChange={e => setDocSecurity(e.target.value as any)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="PUBLIC_ENTREPRISE">Accessible aux collaborateurs</option>
                <option value="CONFIDENTIEL_DAF">Direction & DAF uniquement</option>
                <option value="DIRECTION_SEULEMENT">Direction Générale seule</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Rattachement / Référence Pièce (Optionnel)</label>
            <input
              type="text"
              placeholder="Ex: FAC-2026-0041, Client CSE SA"
              value={docRelated}
              onChange={e => setDocRelated(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-600 text-[11px]">
            Conforme à la politique d'intégrité numérique et de conservation légale des pièces comptables
            (10 ans selon l'Acte Uniforme OHADA).
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0F5132] text-white font-semibold rounded-lg cursor-pointer"
            >
              Enregistrer l'Archive
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
