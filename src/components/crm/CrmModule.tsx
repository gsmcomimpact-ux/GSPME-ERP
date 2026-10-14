/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Module B : Gestion des Clients, CRM, Pipeline & Relances
 */

import React, { useState } from 'react';
import {
  Users2,
  Plus,
  PhoneCall,
  Calendar,
  DollarSign,
  TrendingUp,
  MessageSquare,
  AlertCircle,
  Clock,
  ArrowRight,
  Send,
  Building
} from 'lucide-react';
import { Tenant, Customer, Opportunity, CustomerInteraction, Role } from '../../types';
import { formatMoney } from '../../services/currency';
import { Modal, SegmentedTabs } from '../common/UIComponents';
import { storage } from '../../services/storage';

interface CrmModuleProps {
  tenant: Tenant;
  customers: Customer[];
  opportunities: Opportunity[];
  userRole: Role;
  searchFilter: string;
}

export function CrmModule({
  tenant,
  customers,
  opportunities,
  userRole,
  searchFilter,
}: CrmModuleProps) {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'clients' | 'interactions'>('pipeline');
  const [newOppModalOpen, setNewOppModalOpen] = useState(false);
  const [newInteractionModalOpen, setNewInteractionModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');

  // New Opportunity Form
  const [oppTitle, setOppTitle] = useState('');
  const [oppCustId, setOppCustId] = useState(customers[0]?.id || '');
  const [oppValue, setOppValue] = useState(15000000);
  const [oppStage, setOppStage] = useState<Opportunity['stage']>('QUALIFICATION');
  const [oppClosingDate, setOppClosingDate] = useState('2026-05-30');

  // New Interaction Form
  const [interType, setInterType] = useState<CustomerInteraction['type']>('WHATSAPP');
  const [interSummary, setInterSummary] = useState('');
  const [interNextFollowup, setInterNextFollowup] = useState('2026-04-20');

  const pipelineStages: { stage: Opportunity['stage']; label: string; color: string }[] = [
    { stage: 'PROSPECTION', label: 'Prospection', color: 'bg-slate-100 text-slate-800' },
    { stage: 'QUALIFICATION', label: 'Qualification', color: 'bg-blue-50 text-blue-800' },
    { stage: 'PROPOSITION_DEVIS', label: 'Devis Émis', color: 'bg-amber-50 text-amber-800' },
    { stage: 'NEGOCIATION', label: 'Négociation', color: 'bg-purple-50 text-purple-800' },
    { stage: 'GAGNEE', label: 'Gagnée (Facturable)', color: 'bg-emerald-50 text-emerald-800' },
  ];

  const totalWeightedPipeline = opportunities
    .filter(o => o.stage !== 'PERDUE')
    .reduce((acc, o) => acc + (o.estimatedValue * (o.probabilityPercent / 100)), 0);

  const handleCreateOpportunity = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === oppCustId);
    if (!cust) return;

    const prob =
      oppStage === 'PROSPECTION' ? 20 :
      oppStage === 'QUALIFICATION' ? 40 :
      oppStage === 'PROPOSITION_DEVIS' ? 60 :
      oppStage === 'NEGOCIATION' ? 80 : 100;

    const newOpp: Opportunity = {
      id: `opp-${Date.now()}`,
      tenantId: tenant.id,
      customerId: cust.id,
      customerName: cust.name,
      title: oppTitle,
      estimatedValue: oppValue,
      stage: oppStage,
      probabilityPercent: prob,
      closingDate: oppClosingDate,
      assignedTo: 'Équipe Commerciale',
    };

    storage.addOpportunity(newOpp);
    setNewOppModalOpen(false);
    setOppTitle('');
  };

  const handleCreateInteraction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!interSummary) return;

    const newInter: CustomerInteraction = {
      id: `inter-${Date.now()}`,
      customerId: selectedCustomerId,
      date: new Date().toISOString().split('T')[0],
      type: interType,
      author: 'Commercial SBL',
      summary: interSummary,
      nextFollowUpDate: interNextFollowup,
    };

    storage.addInteraction(newInter);
    setNewInteractionModalOpen(false);
    setInterSummary('');
  };

  const query = searchFilter.toLowerCase();
  const filteredCustomers = customers.filter(
    c =>
      c.name.toLowerCase().includes(query) ||
      c.city.toLowerCase().includes(query) ||
      (c.taxNumber && c.taxNumber.toLowerCase().includes(query))
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Gestion des Clients & CRM</h2>
          <p className="text-xs text-slate-500">
            Pipeline des ventes, suivi des opportunités, échanges clients et gestion des encours
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setNewInteractionModalOpen(true)}
            className="px-3 py-1.5 border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
            <span>Noter un Échange / Relance</span>
          </button>
          <button
            onClick={() => setNewOppModalOpen(true)}
            className="px-3.5 py-1.5 bg-[#0F5132] hover:bg-[#0c4028] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouvelle Opportunité</span>
          </button>
        </div>
      </div>

      {/* KPI Pipeline Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
            Valeur Pondérée du Pipeline
          </span>
          <div className="text-xl font-bold text-[#0F5132] mt-1">
            {formatMoney(totalWeightedPipeline, tenant.currency)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Basée sur les probabilités de clôture</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
            Opportunités Actives
          </span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {opportunities.filter(o => o.stage !== 'PERDUE').length} affaires en cours
          </div>
          <div className="text-xs text-slate-500 mt-0.5">En phase d'étude ou négociation</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
            Total Créances Clients
          </span>
          <div className="text-xl font-bold text-amber-700 mt-1">
            {formatMoney(
              customers.reduce((acc, c) => acc + c.outstandingBalance, 0),
              tenant.currency
            )}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Sous surveillance de recouvrement</div>
        </div>
      </div>

      <SegmentedTabs
        tabs={[
          { id: 'pipeline', label: 'Pipeline Commercial (Kanban)', count: opportunities.length },
          { id: 'clients', label: 'Répertoire Clients & Limites de Crédit', count: filteredCustomers.length },
          { id: 'interactions', label: 'Historique des Échanges & Relances' },
        ]}
        activeTab={activeTab}
        onChange={id => setActiveTab(id as any)}
      />

      {/* TAB 1: Pipeline Kanban */}
      {activeTab === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {pipelineStages.map(col => {
            const stageOpps = opportunities.filter(o => o.stage === col.stage);
            const stageTotal = stageOpps.reduce((s, o) => s + o.estimatedValue, 0);

            return (
              <div key={col.stage} className="bg-slate-100/70 p-3 rounded-xl border border-slate-200/60 flex flex-col justify-between min-h-[380px]">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-xs text-slate-800">{col.label}</span>
                    <span className="text-[10px] font-semibold bg-white text-slate-600 px-1.5 py-0.2 rounded-full">
                      {stageOpps.length}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 mb-3">
                    {formatMoney(stageTotal, tenant.currency)}
                  </div>

                  <div className="space-y-2.5">
                    {stageOpps.map(opp => (
                      <div
                        key={opp.id}
                        className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs text-xs space-y-2 hover:border-[#0F5132]/40 transition-colors"
                      >
                        <div className="font-bold text-slate-900 leading-tight">{opp.title}</div>
                        <div className="text-[11px] text-slate-500">{opp.customerName}</div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <span className="font-bold text-[#0F5132]">
                            {formatMoney(opp.estimatedValue, tenant.currency)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {opp.probabilityPercent}%
                          </span>
                        </div>

                        {col.stage !== 'GAGNEE' && (
                          <div className="flex justify-end gap-1 pt-1">
                            <button
                              onClick={() => {
                                const nextStage =
                                  opp.stage === 'PROSPECTION' ? 'QUALIFICATION' :
                                  opp.stage === 'QUALIFICATION' ? 'PROPOSITION_DEVIS' :
                                  opp.stage === 'PROPOSITION_DEVIS' ? 'NEGOCIATION' : 'GAGNEE';
                                storage.updateOpportunityStage(opp.id, nextStage as any);
                              }}
                              className="text-[10px] text-[#0F5132] font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>Avancer</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setOppStage(col.stage);
                    setNewOppModalOpen(true);
                  }}
                  className="w-full mt-3 py-1.5 text-center text-xs text-slate-500 hover:text-slate-800 hover:bg-white rounded transition-colors cursor-pointer"
                >
                  + Ajouter affaire
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: Répertoire Clients & Solde */}
      {activeTab === 'clients' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-semibold">Client & Raison Sociale</th>
                  <th className="py-3 px-4 font-semibold">Catégorie</th>
                  <th className="py-3 px-4 font-semibold">Ville & Téléphone</th>
                  <th className="py-3 px-4 font-semibold">NINEA / NCC</th>
                  <th className="py-3 px-4 font-semibold text-right">Limite de Crédit</th>
                  <th className="py-3 px-4 font-semibold text-right">Encours Dû</th>
                  <th className="py-3 px-4 font-semibold text-center">Statut Risque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map(c => {
                  const creditExceeded = c.outstandingBalance > c.creditLimit;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div>{c.name}</div>
                        {c.companyName && <div className="text-[11px] text-slate-500">{c.companyName}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {c.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{c.city}</div>
                        <div className="text-[10px] text-slate-400">{c.phone}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{c.taxNumber || '-'}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        {formatMoney(c.creditLimit, tenant.currency)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        <span className={c.outstandingBalance > 0 ? 'text-amber-800' : 'text-slate-400'}>
                          {formatMoney(c.outstandingBalance, tenant.currency)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                            creditExceeded
                              ? 'bg-rose-100 text-rose-800'
                              : c.outstandingBalance > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {creditExceeded ? 'Dépassement' : c.outstandingBalance > 0 ? 'En cours' : 'À jour'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Interactions */}
      {activeTab === 'interactions' && (
        <div className="space-y-3">
          {customers.map(c => {
            const customerInteractions = storage.getInteractions(c.id);
            if (customerInteractions.length === 0) return null;

            return (
              <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="font-bold text-slate-900">{c.name} ({c.city})</div>
                  <span className="text-[11px] text-slate-400">{customerInteractions.length} interaction(s)</span>
                </div>
                <div className="space-y-2">
                  {customerInteractions.map(it => (
                    <div key={it.id} className="p-3 bg-slate-50 rounded-lg flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                            {it.type}
                          </span>
                          <span>{it.date}</span>
                          <span>par {it.author}</span>
                        </div>
                        <p className="mt-1 text-slate-800 font-medium">{it.summary}</p>
                      </div>
                      {it.nextFollowUpDate && (
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-400 block">Prochaine relance</span>
                          <span className="text-amber-800 font-bold">{it.nextFollowUpDate}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Nouvelle Opportunité */}
      <Modal
        isOpen={newOppModalOpen}
        onClose={() => setNewOppModalOpen(false)}
        title="Créer une Opportunité Commerciale"
        subtitle="Ajout au pipeline de prospection"
      >
        <form onSubmit={handleCreateOpportunity} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Titre de l'affaire *</label>
            <input
              type="text"
              placeholder="Ex: Fourniture acier autoroute tronçon 2"
              value={oppTitle}
              onChange={e => setOppTitle(e.target.value)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Client concerné *</label>
              <select
                value={oppCustId}
                onChange={e => setOppCustId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Montant Estimé ({tenant.currency}) *</label>
              <input
                type="number"
                min="0"
                value={oppValue}
                onChange={e => setOppValue(parseFloat(e.target.value) || 0)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Étape initiale</label>
              <select
                value={oppStage}
                onChange={e => setOppStage(e.target.value as any)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="PROSPECTION">Prospection (20%)</option>
                <option value="QUALIFICATION">Qualification (40%)</option>
                <option value="PROPOSITION_DEVIS">Devis Émis (60%)</option>
                <option value="NEGOCIATION">Négociation (80%)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date estimée de clôture</label>
              <input
                type="date"
                value={oppClosingDate}
                onChange={e => setOppClosingDate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setNewOppModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0F5132] text-white font-semibold rounded-lg cursor-pointer"
            >
              Créer l'Opportunité
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Nouvelle Interaction */}
      <Modal
        isOpen={newInteractionModalOpen}
        onClose={() => setNewInteractionModalOpen(false)}
        title="Enregistrer un Échange ou une Relance Client"
        subtitle="Traçabilité des contacts commerciaux et suivi régulier"
      >
        <form onSubmit={handleCreateInteraction} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Client *</label>
            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg bg-white"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Canal de communication</label>
              <select
                value={interType}
                onChange={e => setInterType(e.target.value as any)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="WHATSAPP">WhatsApp Business</option>
                <option value="APPEL">Appel téléphonique</option>
                <option value="REUNION">Réunion physique / Chantier</option>
                <option value="EMAIL">Email officiel</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date prochaine relance</label>
              <input
                type="date"
                value={interNextFollowup}
                onChange={e => setInterNextFollowup(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Compte-rendu de l'échange *</label>
            <textarea
              rows={3}
              placeholder="Ex: Échange avec le DAF pour confirmation du paiement de l'acompte..."
              value={interSummary}
              onChange={e => setInterSummary(e.target.value)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setNewInteractionModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0F5132] text-white font-semibold rounded-lg cursor-pointer"
            >
              Enregistrer l'Échange
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
