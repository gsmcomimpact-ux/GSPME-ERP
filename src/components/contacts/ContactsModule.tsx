/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Tiers : création et répertoire des Clients et des Fournisseurs
 */

import React, { useMemo, useState } from 'react';
import { Plus, Search, Truck, UserPlus, Users } from 'lucide-react';
import { Customer, Role, Supplier, Tenant } from '../../types';
import { formatMoney } from '../../services/currency';
import { storage } from '../../services/storage';
import { EmptyState, Modal, SegmentedTabs } from '../common/UIComponents';

interface ContactsModuleProps {
  tenant: Tenant;
  customers: Customer[];
  suppliers: Supplier[];
  userRole: Role;
  searchFilter: string;
}

type Tab = 'customers' | 'suppliers';

const CUSTOMER_CATEGORIES: { id: Customer['category']; label: string }[] = [
  { id: 'PME', label: 'PME' },
  { id: 'GRAND_COMPTE', label: 'Grand compte' },
  { id: 'PARTENAIRE', label: 'Partenaire' },
  { id: 'INSTITUTIONNEL', label: 'Institutionnel' },
];
const SUPPLIER_CATEGORIES = [
  'Matériaux & Fournitures', 'Équipements', 'Transport & Logistique', 'Services', 'Énergie', 'Informatique & Télécom', 'Autre',
];

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const inputCls = 'w-full p-2 border border-slate-300 rounded-lg text-xs';
const labelCls = 'block font-semibold text-slate-700 mb-1 text-xs';

const emptyCustomer = {
  type: 'ENTREPRISE' as Customer['type'], name: '', companyName: '', category: 'PME' as Customer['category'],
  email: '', phone: '', city: '', taxNumber: '', creditLimit: 0, notes: '',
};
const emptySupplier = {
  name: '', category: SUPPLIER_CATEGORIES[0], email: '', phone: '', city: '', taxNumber: '',
  paymentTermsDays: 30, ratingScore: 3,
};

const norm = (s: string) => s.trim().toLowerCase();
const digits = (s: string) => s.replace(/\D/g, '');

export function ContactsModule({ tenant, customers, suppliers, userRole, searchFilter }: ContactsModuleProps) {
  const [tab, setTab] = useState<Tab>('customers');
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [cust, setCust] = useState(emptyCustomer);
  const [supp, setSupp] = useState(emptySupplier);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  const readOnly = userRole === 'AUDITEUR_EXTERNE';
  const q = norm(`${searchFilter} ${query}`);

  const filteredCustomers = useMemo(
    () => customers.filter(c => !q || norm(`${c.name} ${c.companyName || ''} ${c.email} ${c.phone} ${c.city} ${c.taxNumber || ''}`).includes(q)),
    [customers, q]
  );
  const filteredSuppliers = useMemo(
    () => suppliers.filter(s => !q || norm(`${s.name} ${s.category} ${s.email} ${s.phone} ${s.city} ${s.taxNumber || ''}`).includes(q)),
    [suppliers, q]
  );

  const openModal = () => {
    setError('');
    setCust(emptyCustomer);
    setSupp(emptySupplier);
    setModalOpen(true);
  };

  const finish = (message: string) => {
    setModalOpen(false);
    setFlash(message);
    setTimeout(() => setFlash(''), 4000);
  };

  const submitCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const name = cust.name.trim();
    if (!name) return setError('Le nom du client est obligatoire.');
    if (cust.email && !EMAIL_RE.test(cust.email.trim())) return setError("L'adresse email n'est pas valide.");
    if (customers.some(c => norm(c.name) === norm(name) && digits(c.phone) === digits(cust.phone))) {
      return setError('Un client avec ce nom et ce téléphone existe déjà.');
    }
    const customer: Customer = {
      id: `cust-${Date.now()}`,
      tenantId: tenant.id,
      name,
      companyName: cust.type === 'ENTREPRISE' ? cust.companyName.trim() || undefined : undefined,
      type: cust.type,
      category: cust.category,
      email: cust.email.trim(),
      phone: cust.phone.trim(),
      city: cust.city.trim(),
      taxNumber: cust.taxNumber.trim() || undefined,
      creditLimit: Math.max(0, Number(cust.creditLimit) || 0),
      outstandingBalance: 0,
      createdAt: new Date().toISOString().split('T')[0],
      notes: cust.notes.trim() || undefined,
    };
    storage.addCustomer(customer);
    finish(`Client « ${name} » créé.`);
  };

  const submitSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    const name = supp.name.trim();
    if (!name) return setError('Le nom du fournisseur est obligatoire.');
    if (supp.email && !EMAIL_RE.test(supp.email.trim())) return setError("L'adresse email n'est pas valide.");
    if (suppliers.some(s => norm(s.name) === norm(name) && digits(s.phone) === digits(supp.phone))) {
      return setError('Un fournisseur avec ce nom et ce téléphone existe déjà.');
    }
    const supplier: Supplier = {
      id: `supp-${Date.now()}`,
      tenantId: tenant.id,
      name,
      category: supp.category,
      email: supp.email.trim(),
      phone: supp.phone.trim(),
      city: supp.city.trim(),
      taxNumber: supp.taxNumber.trim() || undefined,
      paymentTermsDays: Math.max(0, Math.round(Number(supp.paymentTermsDays) || 0)),
      balancePayable: 0,
      ratingScore: Math.min(5, Math.max(1, Number(supp.ratingScore) || 3)),
    };
    storage.addSupplier(supplier);
    finish(`Fournisseur « ${name} » créé.`);
  };

  const isCustomers = tab === 'customers';

  return (
    <div className="space-y-5 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">Clients & Fournisseurs</h1>
          <p className="text-slate-500">Créez et retrouvez vos tiers : ils sont ensuite disponibles dans les ventes, achats et la comptabilité.</p>
        </div>
        {!readOnly && (
          <button
            onClick={openModal}
            className="px-3.5 py-2 bg-[#0F5132] hover:bg-[#0c4028] text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            {isCustomers ? <UserPlus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isCustomers ? 'Nouveau client' : 'Nouveau fournisseur'}
          </button>
        )}
      </div>

      {flash && (
        <div role="status" className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
          {flash}
        </div>
      )}

      <SegmentedTabs
        tabs={[
          { id: 'customers', label: 'Clients', count: customers.length },
          { id: 'suppliers', label: 'Fournisseurs', count: suppliers.length },
        ]}
        activeTab={tab}
        onChange={id => setTab(id as Tab)}
      />

      <div className="relative max-w-sm">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={isCustomers ? 'Rechercher un client…' : 'Rechercher un fournisseur…'}
          className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg bg-white"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
        {isCustomers ? (
          filteredCustomers.length === 0 ? (
            <EmptyState
              title="Aucun client"
              description="Créez votre premier client pour pouvoir lui émettre des devis et des factures."
              actionLabel={readOnly ? undefined : 'Nouveau client'}
              onAction={openModal}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Client</th>
                    <th className="py-3 px-4 font-semibold">Type / Catégorie</th>
                    <th className="py-3 px-4 font-semibold">Contact</th>
                    <th className="py-3 px-4 font-semibold">N° fiscal</th>
                    <th className="py-3 px-4 font-semibold text-right">Limite de crédit</th>
                    <th className="py-3 px-4 font-semibold text-right">Encours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div>{c.name}</div>
                        {c.companyName && <div className="text-[11px] font-normal text-slate-500">{c.companyName}</div>}
                      </td>
                      <td className="py-3 px-4">{c.type === 'ENTREPRISE' ? 'Entreprise' : 'Particulier'} · {c.category.replace('_', ' ')}</td>
                      <td className="py-3 px-4">
                        <div>{c.phone || '—'}</div>
                        <div className="text-[11px] text-slate-500">{[c.email, c.city].filter(Boolean).join(' · ')}</div>
                      </td>
                      <td className="py-3 px-4 font-mono">{c.taxNumber || '—'}</td>
                      <td className="py-3 px-4 text-right">{formatMoney(c.creditLimit, tenant.currency)}</td>
                      <td className="py-3 px-4 text-right font-semibold">{formatMoney(c.outstandingBalance, tenant.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredSuppliers.length === 0 ? (
          <EmptyState
            title="Aucun fournisseur"
            description="Créez votre premier fournisseur pour enregistrer des factures d'achat."
            actionLabel={readOnly ? undefined : 'Nouveau fournisseur'}
            onAction={openModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-semibold">Fournisseur</th>
                  <th className="py-3 px-4 font-semibold">Catégorie</th>
                  <th className="py-3 px-4 font-semibold">Contact</th>
                  <th className="py-3 px-4 font-semibold">N° fiscal</th>
                  <th className="py-3 px-4 font-semibold text-center">Délai</th>
                  <th className="py-3 px-4 font-semibold text-center">Note</th>
                  <th className="py-3 px-4 font-semibold text-right">Solde à payer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                    <td className="py-3 px-4">{s.category}</td>
                    <td className="py-3 px-4">
                      <div>{s.phone || '—'}</div>
                      <div className="text-[11px] text-slate-500">{[s.email, s.city].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">{s.taxNumber || '—'}</td>
                    <td className="py-3 px-4 text-center">{s.paymentTermsDays} j</td>
                    <td className="py-3 px-4 text-center">{'★'.repeat(s.ratingScore)}<span className="text-slate-300">{'★'.repeat(5 - s.ratingScore)}</span></td>
                    <td className="py-3 px-4 text-right font-semibold">{formatMoney(s.balancePayable, tenant.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isCustomers ? 'Nouveau client' : 'Nouveau fournisseur'}
        subtitle={isCustomers ? 'Fiche client et limite de crédit' : 'Fiche fournisseur et conditions de règlement'}
      >
        {isCustomers ? (
          <form onSubmit={submitCustomer} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Type *</label>
                <select className={inputCls} value={cust.type} onChange={e => setCust({ ...cust, type: e.target.value as Customer['type'] })}>
                  <option value="ENTREPRISE">Entreprise</option>
                  <option value="PARTICULIER">Particulier</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Catégorie</label>
                <select className={inputCls} value={cust.category} onChange={e => setCust({ ...cust, category: e.target.value as Customer['category'] })}>
                  {CUSTOMER_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>{cust.type === 'ENTREPRISE' ? 'Nom du contact *' : 'Nom complet *'}</label>
              <input required className={inputCls} value={cust.name} onChange={e => setCust({ ...cust, name: e.target.value })} />
            </div>
            {cust.type === 'ENTREPRISE' && (
              <div>
                <label className={labelCls}>Raison sociale</label>
                <input className={inputCls} value={cust.companyName} onChange={e => setCust({ ...cust, companyName: e.target.value })} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Téléphone</label>
                <input className={inputCls} value={cust.phone} onChange={e => setCust({ ...cust, phone: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" className={inputCls} value={cust.email} onChange={e => setCust({ ...cust, email: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Ville</label>
                <input className={inputCls} value={cust.city} onChange={e => setCust({ ...cust, city: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>N° fiscal (NINEA, NCC, NIF…)</label>
                <input className={inputCls} value={cust.taxNumber} onChange={e => setCust({ ...cust, taxNumber: e.target.value })} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Limite de crédit ({tenant.currency})</label>
              <input type="number" min={0} className={inputCls} value={cust.creditLimit} onChange={e => setCust({ ...cust, creditLimit: Number(e.target.value) })} />
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <textarea rows={2} className={inputCls} value={cust.notes} onChange={e => setCust({ ...cust, notes: e.target.value })} />
            </div>
            <FormFooter error={error} onCancel={() => setModalOpen(false)} label="Créer le client" />
          </form>
        ) : (
          <form onSubmit={submitSupplier} className="space-y-3 text-xs">
            <div>
              <label className={labelCls}>Nom / Raison sociale *</label>
              <input required className={inputCls} value={supp.name} onChange={e => setSupp({ ...supp, name: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Catégorie</label>
              <select className={inputCls} value={supp.category} onChange={e => setSupp({ ...supp, category: e.target.value })}>
                {SUPPLIER_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Téléphone</label>
                <input className={inputCls} value={supp.phone} onChange={e => setSupp({ ...supp, phone: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" className={inputCls} value={supp.email} onChange={e => setSupp({ ...supp, email: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Ville</label>
                <input className={inputCls} value={supp.city} onChange={e => setSupp({ ...supp, city: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>N° fiscal (NINEA, NCC, NIF…)</label>
                <input className={inputCls} value={supp.taxNumber} onChange={e => setSupp({ ...supp, taxNumber: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Délai de paiement (jours)</label>
                <input type="number" min={0} className={inputCls} value={supp.paymentTermsDays} onChange={e => setSupp({ ...supp, paymentTermsDays: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelCls}>Note (1 à 5)</label>
                <input type="number" min={1} max={5} className={inputCls} value={supp.ratingScore} onChange={e => setSupp({ ...supp, ratingScore: Number(e.target.value) })} />
              </div>
            </div>
            <FormFooter error={error} onCancel={() => setModalOpen(false)} label="Créer le fournisseur" />
          </form>
        )}
      </Modal>
    </div>
  );
}

function FormFooter({ error, onCancel, label }: { error: string; onCancel: () => void; label: string }) {
  return (
    <>
      {error && <div role="alert" className="text-red-600 font-semibold">{error}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-3 py-2 border border-slate-300 rounded-lg text-slate-700 cursor-pointer">
          Annuler
        </button>
        <button type="submit" className="px-3.5 py-2 bg-[#0F5132] hover:bg-[#0c4028] text-white font-bold rounded-lg cursor-pointer">
          {label}
        </button>
      </div>
    </>
  );
}
