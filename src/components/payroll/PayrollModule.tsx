/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Module Paie & Ressources Humaines (Normes UEMOA / OHADA)
 */

import React, { useState } from 'react';
import {
  Users2,
  Plus,
  FileSpreadsheet,
  Printer,
  DollarSign,
  Briefcase,
  Shield,
  CheckCircle,
  Calendar,
  Download,
} from 'lucide-react';
import { Tenant, Employee, Payslip, Role } from '../../types';
import { formatMoney } from '../../services/currency';
import { Modal, SegmentedTabs, StatusIndicator } from '../common/UIComponents';
import { storage } from '../../services/storage';
import { PdfService } from '../../services/pdfService';

interface PayrollModuleProps {
  tenant: Tenant;
  employees: Employee[];
  payslips: Payslip[];
  userRole: Role;
  searchFilter: string;
}

export function PayrollModule({
  tenant,
  employees,
  payslips,
  userRole,
  searchFilter,
}: PayrollModuleProps) {
  const [activeTab, setActiveTab] = useState<'bulletins' | 'employes'>('bulletins');
  const [createEmployeeModalOpen, setCreateEmployeeModalOpen] = useState(false);
  const [generatePayslipModalOpen, setGeneratePayslipModalOpen] = useState(false);
  const [selectedPayslipForPrint, setSelectedPayslipForPrint] = useState<Payslip | null>(null);

  // New Employee Form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('Exploitation & Travaux');
  const [contractType, setContractType] = useState<Employee['contractType']>('CDI');
  const [baseSalary, setBaseSalary] = useState(500000);
  const [transportAllowance, setTransportAllowance] = useState(50000);
  const [housingAllowance, setHousingAllowance] = useState(0);

  // Generate Payslip Form
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employees[0]?.id || '');
  const [period, setPeriod] = useState('Avril 2026');
  const [primesBonus, setPrimesBonus] = useState(0);

  const totalPayrollGross = payslips.reduce((acc, p) => acc + p.grossSalary, 0);
  const totalPayrollNet = payslips.reduce((acc, p) => acc + p.netSalary, 0);
  const totalSocialDeductions = payslips.reduce(
    (acc, p) => acc + p.employeeSocialContribution + p.employerSocialContribution,
    0
  );

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const count = employees.length + 1;
    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      tenantId: tenant.id,
      branchId: tenant.currentBranchId,
      employeeNumber: `EMP-${String(count).padStart(3, '0')}`,
      firstName,
      lastName,
      position,
      department,
      contractType,
      hireDate: new Date().toISOString().split('T')[0],
      baseSalary,
      transportAllowance,
      housingAllowance,
      familyStatus: 'CELIBATAIRE',
      numberOfChildren: 0,
      socialSecurityNumber: `${tenant.countryCode}-SS-${Math.floor(1000000 + Math.random() * 9000000)}`,
      vacationDaysBalance: 24,
    };

    storage.addEmployee(newEmp);
    setCreateEmployeeModalOpen(false);
    setFirstName('');
    setLastName('');
    setPosition('');
    setBaseSalary(500000);
  };

  const handleGeneratePayslip = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === selectedEmployeeId);
    if (!emp) return;

    const gross = emp.baseSalary + emp.transportAllowance + emp.housingAllowance + primesBonus;
    // Standard UEMOA/OHADA approximate deductions
    const employeeSocial = Math.round(gross * 0.056); // Retraite salariale ~5.6%
    const employerSocial = Math.round(gross * 0.084); // Charges patronales ~8.4%
    const withholdingTax = Math.round((gross - employeeSocial) * 0.12); // IRPP barème progressif simplifié
    const net = gross - employeeSocial - withholdingTax;

    const newSlip: Payslip = {
      id: `slip-${Date.now()}`,
      tenantId: tenant.id,
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      period,
      baseSalary: emp.baseSalary,
      primes: emp.transportAllowance + emp.housingAllowance + primesBonus,
      grossSalary: gross,
      employeeSocialContribution: employeeSocial,
      employerSocialContribution: employerSocial,
      withholdingTax,
      netSalary: net,
      status: 'VALIDE',
    };

    storage.addPayslip(newSlip);

    // Automated accounting entry in Journal PAIE
    storage.addJournalEntry({
      id: `entry-paie-${Date.now()}`,
      tenantId: tenant.id,
      journalCode: 'PAIE' as any,
      date: new Date().toISOString().split('T')[0],
      pieceNumber: `PAIE-${period.replace(/\s+/g, '-')}-${emp.employeeNumber}`,
      description: `Bulletin de paie ${newSlip.employeeName} (${period})`,
      validated: true,
      lines: [
        {
          id: 'lp-1',
          accountCode: '661',
          accountName: 'Rémunérations directes versées au personnel',
          debit: gross,
          credit: 0,
          reference: `PAIE-${period}`,
          description: `Salaire brut ${newSlip.employeeName}`,
        },
        {
          id: 'lp-2',
          accountCode: '422',
          accountName: 'Personnel - Rémunérations dues (Salaires nets)',
          debit: 0,
          credit: net,
          reference: `PAIE-${period}`,
          description: `Net à payer`,
        },
        {
          id: 'lp-3',
          accountCode: '431',
          accountName: 'Sécurité sociale (IPRES / CNPS)',
          debit: 0,
          credit: employeeSocial,
          reference: `PAIE-${period}`,
          description: `Retenues sociales salariales`,
        },
        {
          id: 'lp-4',
          accountCode: '4421',
          accountName: 'État - Impôts retenus à la source (IRPP)',
          debit: 0,
          credit: withholdingTax,
          reference: `PAIE-${period}`,
          description: `Retenue fiscale à la source`,
        },
      ],
    });

    setGeneratePayslipModalOpen(false);
  };

  const query = searchFilter.toLowerCase();
  const filteredEmployees = employees.filter(
    e =>
      e.firstName.toLowerCase().includes(query) ||
      e.lastName.toLowerCase().includes(query) ||
      e.position.toLowerCase().includes(query)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Paie & Ressources Humaines</h2>
          <p className="text-xs text-slate-500">
            Gestion du personnel, calcul des cotisations sociales et bulletins de salaire conformes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreateEmployeeModalOpen(true)}
            className="px-3 py-1.5 border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau Salarié</span>
          </button>
          <button
            onClick={() => setGeneratePayslipModalOpen(true)}
            className="px-3.5 py-1.5 bg-[#0F5132] hover:bg-[#0c4028] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Générer un Bulletin</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
            Masse Salariale Brute du Mois
          </span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {formatMoney(totalPayrollGross, tenant.currency)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Charges de personnel (Compte 661)</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
            Salaires Nets à Verser
          </span>
          <div className="text-xl font-bold text-[#0F5132] mt-1">
            {formatMoney(totalPayrollNet, tenant.currency)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Virement bancaire / espèces (Compte 422)</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
            Cotisations Sociales & Fiscales
          </span>
          <div className="text-xl font-bold text-amber-700 mt-1">
            {formatMoney(totalSocialDeductions, tenant.currency)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">À déclarer aux caisses de prévoyance</div>
        </div>
      </div>

      {/* Tabs */}
      <SegmentedTabs
        tabs={[
          { id: 'bulletins', label: 'Bulletins de Paie Émis', count: payslips.length },
          { id: 'employes', label: 'Registre du Personnel', count: filteredEmployees.length },
        ]}
        activeTab={activeTab}
        onChange={id => setActiveTab(id as any)}
      />

      {/* TAB: Bulletins */}
      {activeTab === 'bulletins' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-semibold">Collaborateur</th>
                  <th className="py-3 px-4 font-semibold">Période</th>
                  <th className="py-3 px-4 font-semibold text-right">Salaire Brut</th>
                  <th className="py-3 px-4 font-semibold text-right">Cotisation Sociale</th>
                  <th className="py-3 px-4 font-semibold text-right">Retenue Fiscale</th>
                  <th className="py-3 px-4 font-semibold text-right">Net à Payer</th>
                  <th className="py-3 px-4 font-semibold text-center">Statut</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payslips.map(slip => (
                  <tr key={slip.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{slip.employeeName}</td>
                    <td className="py-3 px-4 text-slate-600">{slip.period}</td>
                    <td className="py-3 px-4 text-right text-slate-700">
                      {formatMoney(slip.grossSalary, tenant.currency)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {formatMoney(slip.employeeSocialContribution, tenant.currency)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500">
                      {formatMoney(slip.withholdingTax, tenant.currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-[#0F5132]">
                      {formatMoney(slip.netSalary, tenant.currency)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusIndicator status={slip.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => PdfService.downloadPayslipPdf(slip, tenant)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer transition-colors"
                          title="Télécharger le bulletin en fichier PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedPayslipForPrint(slip)}
                          className="px-2 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                          title="Aperçu & Impression du Bulletin"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Bulletin</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Employés */}
      {activeTab === 'employes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map(emp => (
            <div
              key={emp.id}
              className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {emp.firstName} {emp.lastName}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">{emp.position}</p>
                  </div>
                  <span className="text-[10px] font-bold text-[#0F5132] bg-[#0F5132]/10 px-2 py-0.5 rounded">
                    {emp.contractType}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <div>Département : <strong>{emp.department}</strong></div>
                  <div>Matricule : <span className="font-mono">{emp.employeeNumber}</span></div>
                  <div>N° Sécurité Sociale : <span className="font-mono text-slate-400">{emp.socialSecurityNumber}</span></div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Salaire de Base</span>
                  <span className="font-bold text-slate-900">
                    {formatMoney(emp.baseSalary, tenant.currency)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedEmployeeId(emp.id);
                    setGeneratePayslipModalOpen(true);
                  }}
                  className="px-2.5 py-1 text-xs text-[#0F5132] font-semibold hover:bg-[#0F5132]/5 rounded cursor-pointer"
                >
                  + Bulletin
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Nouveau Salarié */}
      <Modal
        isOpen={createEmployeeModalOpen}
        onClose={() => setCreateEmployeeModalOpen(false)}
        title="Ajouter un Collaborateur au Registre du Personnel"
        subtitle="Informations contractuelles et paramètres de paie"
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Prénom *</label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nom de famille *</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Poste occupé *</label>
              <input
                type="text"
                placeholder="Ex: Comptable, Chauffeur grue, Commercial"
                value={position}
                onChange={e => setPosition(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Département</label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Exploitation & Travaux">Exploitation & Travaux</option>
                <option value="Direction Générale">Direction Générale</option>
                <option value="Finance & Comptabilité">Finance & Comptabilité</option>
                <option value="Logistique & Entrepôt">Logistique & Entrepôt</option>
                <option value="Commercial & Marketing">Commercial & Marketing</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Type Contrat</label>
              <select
                value={contractType}
                onChange={e => setContractType(e.target.value as any)}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="STAGE">Stage Professionnel</option>
                <option value="CONSULTANT">Consultant</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Salaire de Base ({tenant.currency}) *</label>
              <input
                type="number"
                min="0"
                value={baseSalary}
                onChange={e => setBaseSalary(parseFloat(e.target.value) || 0)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Indemnité Transport</label>
              <input
                type="number"
                min="0"
                value={transportAllowance}
                onChange={e => setTransportAllowance(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setCreateEmployeeModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0F5132] text-white font-semibold rounded-lg cursor-pointer"
            >
              Enregistrer Salarié
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Générer Bulletin */}
      <Modal
        isOpen={generatePayslipModalOpen}
        onClose={() => setGeneratePayslipModalOpen(false)}
        title="Émettre un Bulletin de Paie"
        subtitle="Calcul automatique des cotisations sociales et génération des écritures de paie"
      >
        <form onSubmit={handleGeneratePayslip} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Salarié bénéficiaire *</label>
            <select
              value={selectedEmployeeId}
              onChange={e => setSelectedEmployeeId(e.target.value)}
              required
              className="w-full p-2 border border-slate-300 rounded-lg bg-white"
            >
              {employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName} - {e.position} ({formatMoney(e.baseSalary, tenant.currency)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mois / Période *</label>
              <input
                type="text"
                value={period}
                onChange={e => setPeriod(e.target.value)}
                required
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Primes exceptionnelles / Heures sup</label>
              <input
                type="number"
                min="0"
                value={primesBonus}
                onChange={e => setPrimesBonus(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="p-3 bg-emerald-50 text-emerald-900 rounded-lg text-xs">
            Le système débitera automatiquement le compte <strong>661 (Rémunérations directes)</strong> et
            créditera le compte <strong>422 (Personnel - Rémunérations dues)</strong> au Journal de Paie.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setGeneratePayslipModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0F5132] text-white font-semibold rounded-lg cursor-pointer"
            >
              Calculer et Valider le Bulletin
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Impression Bulletin de Paie Officiel */}
      <Modal
        isOpen={!!selectedPayslipForPrint}
        onClose={() => setSelectedPayslipForPrint(null)}
        title="Bulletin de Paie Individuel"
        subtitle="Normes droit du travail et sécurité sociale UEMOA"
        maxWidth="2xl"
      >
        {selectedPayslipForPrint && (
          <div className="space-y-4">
            <div className="bg-white p-6 border border-slate-200 rounded-lg text-xs text-slate-800 space-y-4 shadow-xs">
              <div className="flex justify-between items-start pb-4 border-b border-slate-300">
                <div>
                  <h3 className="font-extrabold text-base text-[#0F5132]">{tenant.name}</h3>
                  <p className="text-slate-500">{tenant.address}, {tenant.city}</p>
                  <p className="text-[11px] font-mono text-slate-500">NINEA : {tenant.taxNumber}</p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm text-slate-900 uppercase">Bulletin de Paie</div>
                  <div className="text-slate-500 font-semibold">{selectedPayslipForPrint.period}</div>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded border border-slate-200 flex justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Salarié</span>
                  <div className="font-bold text-slate-900 text-sm">{selectedPayslipForPrint.employeeName}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Paiement</span>
                  <div className="text-slate-700">Virement Bancaire</div>
                </div>
              </div>

              {/* Table of items */}
              <table className="w-full text-left border border-slate-200">
                <thead className="bg-slate-100 font-semibold text-slate-700">
                  <tr>
                    <th className="p-2">Rubrique</th>
                    <th className="p-2 text-right">Gains Bruts</th>
                    <th className="p-2 text-right">Retenues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2">Salaire de Base</td>
                    <td className="p-2 text-right font-medium">
                      {formatMoney(selectedPayslipForPrint.baseSalary, tenant.currency)}
                    </td>
                    <td className="p-2 text-right">-</td>
                  </tr>
                  <tr>
                    <td className="p-2">Primes & Indemnités transport</td>
                    <td className="p-2 text-right font-medium">
                      {formatMoney(selectedPayslipForPrint.primes, tenant.currency)}
                    </td>
                    <td className="p-2 text-right">-</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-slate-600">Cotisations sociales salariales (IPRES/CNPS)</td>
                    <td className="p-2 text-right">-</td>
                    <td className="p-2 text-right text-rose-700 font-medium">
                      {formatMoney(selectedPayslipForPrint.employeeSocialContribution, tenant.currency)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 text-slate-600">Retenue fiscale à la source (IRPP)</td>
                    <td className="p-2 text-right">-</td>
                    <td className="p-2 text-right text-rose-700 font-medium">
                      {formatMoney(selectedPayslipForPrint.withholdingTax, tenant.currency)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="pt-3 border-t-2 border-slate-300 flex justify-between items-center text-sm font-extrabold">
                <span>NET À PAYER AU SALARIÉ :</span>
                <span className="text-[#0F5132] text-lg font-black">
                  {formatMoney(selectedPayslipForPrint.netSalary, tenant.currency)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 no-print">
              <button
                onClick={() => setSelectedPayslipForPrint(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Fermer
              </button>
              <button
                onClick={() => PdfService.downloadPayslipPdf(selectedPayslipForPrint, tenant)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                title="Générer et télécharger le bulletin PDF"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger Bulletin (PDF)</span>
              </button>
              <button
                onClick={() => PdfService.printCurrent()}
                className="px-4 py-2 bg-[#0F5132] hover:bg-[#0c4028] text-white font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
