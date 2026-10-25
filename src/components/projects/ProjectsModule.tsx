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
  Building,
  Trash2,
  Receipt
} from 'lucide-react';
import { Tenant, Project, Customer, Role } from '../../types';
import { formatMoney } from '../../services/currency';
import { Modal, SegmentedTabs } from '../common/UIComponents';
import { storage } from '../../services/storage';
import { addExpense, addTask, budgetLevel, removeExpense, removeTask, toggleTask } from '../../services/projectCosts';

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
  const [expenseProjectId, setExpenseProjectId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<{ projectId: string; title: string; assignedTo: string; dueDate: string; budget: string } | null>(null);
  const [expForm, setExpForm] = useState({ label: '', amount: '', date: new Date().toISOString().split('T')[0], taskId: '', supplier: '' });
  const [formError, setFormError] = useState('');
  const canEdit = userRole !== 'AUDITEUR_EXTERNE';
  const expenseProject = projects.find(p => p.id === expenseProjectId) || null;

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Project['category']>('BTP_CONSTRUCTION');
  const [customerId, setCustomerId] = useState('');
  const [manager, setManager] = useState('');
  const [budgetAllocated, setBudgetAllocated] = useState(0);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]);

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
      tasks: [],
      expenses: [],
    };

    storage.addProject(newProject);
    setCreateModalOpen(false);
    setTitle('');
  };

  const handleToggleTask = (projectId: string, taskId: string) => {
    const proj = projects.find(p => p.id === projectId);
    if (proj && canEdit) storage.updateProject(toggleTask(proj, taskId));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm) return;
    const proj = projects.find(p => p.id === taskForm.projectId);
    if (!proj || !taskForm.title.trim()) return;
    storage.updateProject(addTask(proj, { title: taskForm.title, assignedTo: taskForm.assignedTo, dueDate: taskForm.dueDate, budget: parseFloat(taskForm.budget) || undefined }));
    setTaskForm(null);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseProject) return;
    try {
      storage.updateProject(addExpense(expenseProject, { date: expForm.date, label: expForm.label, amount: parseFloat(expForm.amount) || 0, taskId: expForm.taskId || undefined, supplier: expForm.supplier }));
      setExpForm(f => ({ ...f, label: '', amount: '', supplier: '' }));
      setFormError('');
    } catch (err) {
      setFormError((err as Error).message);
    }
  };

  const handleDeleteProject = (proj: Project) => {
    if (window.confirm(`Supprimer le projet « ${proj.title} » avec ses tâches et dépenses ?`)) storage.deleteProject(proj.id);
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
      {activeTab === 'projets' && filteredProjects.length === 0 && (
        <div className="text-center text-xs text-slate-500 bg-white border border-dashed border-slate-300 rounded-xl p-8">
          Aucun projet. Cliquez sur « Nouveau Projet » pour créer votre première affaire, puis ajoutez ses tâches et ses dépenses.
        </div>
      )}
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

                {budgetLevel(proj) !== 'OK' && (
                  <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg ${budgetLevel(proj) === 'DEPASSE' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>
                    <AlertCircle className="w-3.5 h-3.5" />
                    {budgetLevel(proj) === 'DEPASSE' ? 'Budget dépassé' : 'Plus de 80 % du budget consommé'}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500">
                  <div>
                    <div>Chef de projet : <strong>{proj.manager}</strong></div>
                    <div>Échéance : {proj.endDate} · {proj.tasks.length} tâche(s)</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => { setExpenseProjectId(proj.id); setFormError(''); }} className="px-2.5 py-1.5 bg-[#0F5132]/10 text-[#0F5132] font-semibold rounded-lg flex items-center gap-1 cursor-pointer">
                      <Receipt className="w-3.5 h-3.5" />Dépenses
                    </button>
                    {canEdit && (
                      <button onClick={() => handleDeleteProject(proj)} aria-label={`Supprimer ${proj.title}`} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
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

          {projects.length === 0 && <p className="text-slate-500">Créez d'abord un projet pour y ajouter des tâches.</p>}
          <div className="space-y-5">
            {projects.map(proj => (
              <div key={proj.id} className="space-y-2">
                <div className="font-bold text-slate-800 flex items-center justify-between gap-2">
                  <span>{proj.title} ({proj.code})</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-[11px]">{proj.tasks.length} tâche(s)</span>
                    {canEdit && (
                      <button
                        onClick={() => setTaskForm({ projectId: proj.id, title: '', assignedTo: proj.manager, dueDate: proj.endDate, budget: '' })}
                        className="px-2.5 py-1 bg-[#0F5132] text-white rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />Ajouter une tâche
                      </button>
                    )}
                  </div>
                </div>

                {taskForm?.projectId === proj.id && (
                  <form onSubmit={handleAddTask} className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg items-end">
                    <div className="col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">Tâche *</label>
                      <input autoFocus required value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Ex: Terrassement" className="w-full p-1.5 border border-slate-300 rounded" />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Responsable</label>
                      <input value={taskForm.assignedTo} onChange={e => setTaskForm({ ...taskForm, assignedTo: e.target.value })} className="w-full p-1.5 border border-slate-300 rounded" />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Date limite</label>
                      <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} className="w-full p-1.5 border border-slate-300 rounded" />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Budget prévu</label>
                      <input type="number" min="0" value={taskForm.budget} onChange={e => setTaskForm({ ...taskForm, budget: e.target.value })} className="w-full p-1.5 border border-slate-300 rounded" />
                    </div>
                    <div className="col-span-2 md:col-span-5 flex justify-end gap-2">
                      <button type="button" onClick={() => setTaskForm(null)} className="px-3 py-1.5 border border-slate-200 rounded-lg cursor-pointer">Annuler</button>
                      <button type="submit" className="px-3 py-1.5 bg-[#0F5132] text-white font-semibold rounded-lg cursor-pointer">Enregistrer la tâche</button>
                    </div>
                  </form>
                )}

                {proj.tasks.length === 0 && taskForm?.projectId !== proj.id && <p className="pl-2 text-slate-400">Aucune tâche pour ce projet.</p>}
                <div className="space-y-1.5 pl-2">
                  {proj.tasks.map(t => (
                    <div key={t.id} data-testid="task-row" className="p-2.5 bg-slate-50 rounded-lg flex flex-wrap items-center justify-between gap-2 hover:bg-slate-100/70 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={t.completed}
                          disabled={!canEdit}
                          onChange={() => handleToggleTask(proj.id, t.id)}
                          aria-label={`Terminer ${t.title}`}
                          className="w-4 h-4 text-[#0F5132] rounded cursor-pointer"
                        />
                        <span className={`font-medium ${t.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>{t.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                        <span>{t.assignedTo}</span>
                        <span>Limite : {t.dueDate}</span>
                        <span className={t.budget && t.cost > t.budget ? 'text-rose-600 font-bold' : 'font-semibold text-slate-700'}>
                          Dépensé : {formatMoney(t.cost || 0, tenant.currency)}{t.budget ? ` / ${formatMoney(t.budget, tenant.currency)}` : ''}
                        </span>
                        {canEdit && (
                          <button onClick={() => storage.updateProject(removeTask(proj, t.id))} aria-label={`Supprimer la tâche ${t.title}`} className="text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                        )}
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
                <option value="">— Aucun client —</option>
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
                placeholder="Nom du responsable"
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
                value={budgetAllocated || ''}
                placeholder="0"
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

      {/* MODAL: Dépenses du projet */}
      <Modal
        isOpen={!!expenseProject}
        onClose={() => setExpenseProjectId(null)}
        title={expenseProject ? `Dépenses — ${expenseProject.title}` : ''}
        subtitle="Montants dépensés, rattachés ou non à une tâche"
        maxWidth="2xl"
      >
        {expenseProject && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg">
              <div><span className="text-[10px] text-slate-400 block">Budget</span><strong>{formatMoney(expenseProject.budgetAllocated, tenant.currency)}</strong></div>
              <div><span className="text-[10px] text-slate-400 block">Dépensé</span><strong>{formatMoney(expenseProject.actualCost, tenant.currency)}</strong></div>
              <div>
                <span className="text-[10px] text-slate-400 block">Reste</span>
                <strong className={expenseProject.budgetAllocated - expenseProject.actualCost < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                  {formatMoney(expenseProject.budgetAllocated - expenseProject.actualCost, tenant.currency)}
                </strong>
              </div>
            </div>
            {budgetLevel(expenseProject) !== 'OK' && (
              <div className={`px-3 py-2 rounded-lg font-semibold ${budgetLevel(expenseProject) === 'DEPASSE' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>
                {budgetLevel(expenseProject) === 'DEPASSE' ? 'Le budget du projet est dépassé.' : 'Plus de 80 % du budget est consommé.'}
              </div>
            )}

            {canEdit && (
              <form onSubmit={handleAddExpense} className="grid grid-cols-2 gap-2 p-3 border border-slate-200 rounded-lg">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Libellé de la dépense *</label>
                  <input value={expForm.label} onChange={e => setExpForm({ ...expForm, label: e.target.value })} placeholder="Ex: Achat de ciment, location engin…" className="w-full p-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Montant ({tenant.currency}) *</label>
                  <input type="number" min="0" step="any" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })} aria-label="Montant de la dépense" className="w-full p-2 border border-slate-300 rounded-lg font-bold" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input type="date" value={expForm.date} onChange={e => setExpForm({ ...expForm, date: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tâche concernée</label>
                  <select value={expForm.taskId} onChange={e => setExpForm({ ...expForm, taskId: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg bg-white">
                    <option value="">— Général au projet —</option>
                    {expenseProject.tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fournisseur (optionnel)</label>
                  <input value={expForm.supplier} onChange={e => setExpForm({ ...expForm, supplier: e.target.value })} className="w-full p-2 border border-slate-300 rounded-lg" />
                </div>
                {formError && <div role="alert" className="col-span-2 text-rose-700">{formError}</div>}
                <div className="col-span-2 flex justify-end">
                  <button type="submit" className="px-4 py-2 bg-[#0F5132] text-white font-semibold rounded-lg cursor-pointer">Ajouter la dépense</button>
                </div>
              </form>
            )}

            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {(expenseProject.expenses || []).length === 0 && <p className="text-slate-400">Aucune dépense saisie.</p>}
              {(expenseProject.expenses || []).map(ex => (
                <div key={ex.id} data-testid="expense-row" className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 truncate">{ex.label}</div>
                    <div className="text-[11px] text-slate-500">
                      {ex.date}{ex.supplier ? ` · ${ex.supplier}` : ''}{ex.taskId ? ` · ${expenseProject.tasks.find(t => t.id === ex.taskId)?.title || ''}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <strong>{formatMoney(ex.amount, tenant.currency)}</strong>
                    {canEdit && <button onClick={() => storage.updateProject(removeExpense(expenseProject, ex.id))} aria-label={`Supprimer la dépense ${ex.label}`} className="text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
