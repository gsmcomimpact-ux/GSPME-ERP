/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Module K : Gestion de Projets & Chantiers (BTP, Transport, Services)
 */

import React, { useState } from 'react';
import {
  Briefcase,
  Plus,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertCircle,
  Calendar,
  DollarSign,
  Layers,
  Building
} from 'lucide-react';
import { Tenant, Project, Customer, Role } from '../../types';
import { formatMoney } from '../../services/currency';
import { Modal, SegmentedTabs } from '../common/UIComponents';
import { storage } from '../../services/storage';

interface ProjectsModuleProps {
  tenant: Tenant;
  projects: Project[];
  customers: Customer[];
  userRole: Role;
  searchFilter: string;
}

export function ProjectsModule({
  tenant,
  projects,
  customers,
  userRole,
  searchFilter,
}: ProjectsModuleProps) {
  const [activeTab, setActiveTab] = useState<'projets' | 'taches'>('projets');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Project['category']>('BTP_CONSTRUCTION');
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [manager, setManager] = useState('Omar Fall');
  const [budgetAllocated, setBudgetAllocated] = useState(50000000);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('2026-11-30');

  const totalBudgets = projects.reduce((acc, p) => acc + p.budgetAllocated, 0);
  const totalActualCosts = projects.reduce((acc, p) => acc + p.actualCost, 0);
  const totalInvoiced = projects.reduce((acc, p) => acc + p.invoicedAmount, 0);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === customerId);
    const count = projects.length + 1;

    const newProject: Project = {
      id: `prj-${Date.now()}`,
      tenantId: tenant.id,
      code: `PRJ-${category.slice(0, 3)}-2026-${String(count).padStart(2, '0')}`,
      title,
      category,
      customerId: cust?.id,
      customerName: cust?.name,
      manager,
      budgetAllocated,
      actualCost: 0,
      invoicedAmount: 0,
      progressPercent: 0,
      startDate,
      endDate,
      status: 'PLANIFIE',
      tasks: [
        { id: `t-${Date.now()}-1`, title: 'Cadrage initial et étude technique', assignedTo: manager, dueDate: startDate, completed: false, cost: 0 },
      ],
    };

    storage.addProject(newProject);
    setCreateModalOpen(false);
    setTitle('');
  };

  const handleToggleTask = (projectId: string, taskId: string) => {
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return;

    const updatedTasks = proj.tasks.map(t => (t.id === taskId ? { ...t, completed: !t.completed } : t));
    const completedCount = updatedTasks.filter(t => t.completed).length;
    const progress = Math.round((completedCount / updatedTasks.length) * 100);

    storage.updateProjectProgress(projectId, progress);
  };

  const query = searchFilter.toLowerCase();
  const filteredProjects = projects.filter(
    p =>
      p.title.toLowerCase().includes(query) ||
      p.code.toLowerCase().includes(query) ||
      (p.customerName && p.customerName.toLowerCase().includes(query))
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Gestion des Projets & Chantiers</h2>
          <p className="text-xs text-slate-500">
            Suivi des affaires BTP, missions de transport, coûts engagés et marge par projet
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-3.5 py-1.5 bg-[#0F5132] hover:bg-[#0c4028] text-white text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nouveau Projet</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
            Budgets Globaux Engagés
          </span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {formatMoney(totalBudgets, tenant.currency)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Sur {projects.length} affaires actives</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
            Coûts Réels Consommés
          </span>
          <div className="text-xl font-bold text-slate-800 mt-1">
            {formatMoney(totalActualCosts, tenant.currency)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Main d'œuvre, matériaux et fret</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
            Facturation Clients Réalisée
          </span>
          <div className="text-xl font-bold text-[#0F5132] mt-1">
            {formatMoney(totalInvoiced, tenant.currency)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Marge brute dégagée : {formatMoney(totalInvoiced - totalActualCosts, tenant.currency)}
          </div>
        </div>
      </div>

      <SegmentedTabs
        tabs={[
          { id: 'projets', label: 'Projets en Cours', count: filteredProjects.length },
          { id: 'taches', label: 'Tâches & Jalons Opérationnels' },
        ]}
        activeTab={activeTab}
        onChange={id => setActiveTab(id as any)}
      />

      {/* TAB: Projets */}
      {activeTab === 'projets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map(proj => {
            const margin = proj.invoicedAmount - proj.actualCost;
            return (
              <div
                key={proj.id}
                className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] text-slate-400 font-bold">{proj.code}</span>
                      <h4 className="text-sm font-bold text-slate-900 mt-0.5">{proj.title}</h4>
                      {proj.customerName && (
                        <p className="text-xs text-slate-500 font-medium">Client : {proj.customerName}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-[#0F5132] bg-[#0F5132]/10 px-2 py-0.5 rounded">
                      {proj.category.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500 font-medium">Avancement général</span>
                      <span className="font-bold text-slate-900">{proj.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#0F5132] h-full rounded-full transition-all"
                        style={{ width: `${proj.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Budget & Margin figures */}
                  <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Budget Alloué</span>
                      <span className="font-bold text-slate-800">
                        {formatMoney(proj.budgetAllocated, tenant.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Coût Réel</span>
                      <span className="font-bold text-slate-800">
                        {formatMoney(proj.actualCost, tenant.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Marge Brute</span>
                      <span className={`font-bold ${margin >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {formatMoney(margin, tenant.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div>Chef de projet : <strong>{proj.manager}</strong></div>
                  <div>Échéance : {proj.endDate}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB: Tâches */}
      {activeTab === 'taches' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs space-y-4 text-xs">
          <h3 className="font-bold text-slate-900 pb-2 border-b border-slate-100">
            Suivi des Tâches & Jalons par Projet
          </h3>

          <div className="space-y-4">
            {projects.map(proj => (
              <div key={proj.id} className="space-y-2">
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span>{proj.title} ({proj.code})</span>
                  <span className="text-slate-400 text-[11px]">{proj.tasks.length} tâche(s)</span>
                </div>
                <div className="space-y-1.5 pl-2">
                  {proj.tasks.map(t => (
                    <div
                      key={t.id}
                      className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between hover:bg-slate-100/70 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={t.completed}
                          onChange={() => handleToggleTask(proj.id, t.id)}
                          className="w-4 h-4 text-[#0F5132] rounded cursor-pointer"
                        />
                        <span className={`font-medium ${t.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {t.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                        <span>Assigné à : {t.assignedTo}</span>
                        <span>Date limite : {t.dueDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Nouveau Projet */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Créer un Nouveau Projet / Affaire"
        subtitle="Gestion des coûts et suivi de la rentabilité"
      >
        <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Intitulé du Projet *</label>
            <input
              type="text"
              placeholder="Ex: Construction Hangar Portuaire 1200m²"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Modèle de Secteur</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="BTP_CONSTRUCTION">BTP & Génie Civil</option>
                <option value="TRANSPORT_LOGISTIQUE">Transport & Fret Lourd</option>
                <option value="DISTRIBUTION">Commerce & Distribution</option>
                <option value="INGENIERIE_SERVICES">Ingénierie & Services</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Client Maître d'Ouvrage</label>
              <select
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Responsable / Chef de Projet</label>
              <input
                type="text"
                value={manager}
                onChange={e => setManager(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Budget Prévisionnel ({tenant.currency})</label>
              <input
                type="number"
                min="0"
                value={budgetAllocated}
                onChange={e => setBudgetAllocated(parseFloat(e.target.value) || 0)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date de démarrage</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date de livraison prévue</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
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
              Créer le Projet
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
