/**
 * Logique pure de suivi des tâches et dépenses d'un projet (testable sans navigateur).
 * Le coût réel du projet est cumulé à chaque dépense ; il n'est jamais recalculé à partir de zéro,
 * ce qui conserve le coût déjà engagé des projets existants.
 */
import { Project, ProjectExpense, ProjectTask } from '../types';

const newId = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const round = (n: number) => Math.round(n * 100) / 100;

export const progressOf = (tasks: ProjectTask[]): number =>
  tasks.length ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0;

export function addTask(p: Project, t: { title: string; assignedTo: string; dueDate: string; budget?: number }): Project {
  const tasks = [...p.tasks, { id: newId('t'), title: t.title.trim(), assignedTo: t.assignedTo.trim() || p.manager, dueDate: t.dueDate, completed: false, cost: 0, budget: t.budget && t.budget > 0 ? t.budget : undefined }];
  return { ...p, tasks, progressPercent: progressOf(tasks) };
}

export function toggleTask(p: Project, taskId: string): Project {
  const tasks = p.tasks.map(t => (t.id === taskId ? { ...t, completed: !t.completed } : t));
  const done = tasks.length > 0 && tasks.every(t => t.completed);
  return { ...p, tasks, progressPercent: progressOf(tasks), status: done ? 'LIVRE' : p.status === 'LIVRE' ? 'EN_COURS' : p.status === 'PLANIFIE' && tasks.some(t => t.completed) ? 'EN_COURS' : p.status };
}

/** Supprime une tâche ; ses dépenses restent au projet mais ne sont plus rattachées. */
export function removeTask(p: Project, taskId: string): Project {
  const tasks = p.tasks.filter(t => t.id !== taskId);
  const expenses = (p.expenses || []).map(e => (e.taskId === taskId ? { ...e, taskId: undefined } : e));
  return { ...p, tasks, expenses, progressPercent: progressOf(tasks) };
}

export function addExpense(p: Project, e: { date: string; label: string; amount: number; taskId?: string; supplier?: string }): Project {
  if (!(e.amount > 0)) throw new Error('Le montant doit être supérieur à 0');
  if (!e.label.trim()) throw new Error('Le libellé est obligatoire');
  const expense: ProjectExpense = { id: newId('exp'), date: e.date, label: e.label.trim(), amount: round(e.amount), taskId: e.taskId || undefined, supplier: e.supplier?.trim() || undefined };
  const tasks = p.tasks.map(t => (t.id === expense.taskId ? { ...t, cost: round((t.cost || 0) + expense.amount) } : t));
  return { ...p, tasks, expenses: [expense, ...(p.expenses || [])], actualCost: round(p.actualCost + expense.amount), status: p.status === 'PLANIFIE' ? 'EN_COURS' : p.status };
}

export function removeExpense(p: Project, expenseId: string): Project {
  const exp = (p.expenses || []).find(e => e.id === expenseId);
  if (!exp) return p;
  const tasks = p.tasks.map(t => (t.id === exp.taskId ? { ...t, cost: Math.max(0, round((t.cost || 0) - exp.amount)) } : t));
  return { ...p, tasks, expenses: (p.expenses || []).filter(e => e.id !== expenseId), actualCost: Math.max(0, round(p.actualCost - exp.amount)) };
}

/** Niveau d'alerte budget : OK < 80 % ≤ ATTENTION ≤ 100 % < DEPASSE. */
export function budgetLevel(p: Pick<Project, 'budgetAllocated' | 'actualCost'>): 'OK' | 'ATTENTION' | 'DEPASSE' {
  if (p.budgetAllocated <= 0) return p.actualCost > 0 ? 'DEPASSE' : 'OK';
  const r = p.actualCost / p.budgetAllocated;
  return r > 1 ? 'DEPASSE' : r >= 0.8 ? 'ATTENTION' : 'OK';
}
