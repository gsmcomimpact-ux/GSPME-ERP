/**
 * GSPME - États financiers SYSCOHADA calculés depuis le journal : balance, compte de résultat, bilan.
 */
import { JournalEntry } from '../types';
import { SYSCOHADA_PLAN_COMPTABLE } from './accountingEngine';
import type { CsvValue } from './exportService';

export interface BalanceLine {
  code: string;
  name: string;
  classe: number;
  debit: number;
  credit: number;
  soldeDebiteur: number;
  soldeCrediteur: number;
}

export interface StatementLine {
  code: string;
  label: string;
  amount: number;
}

export interface StatementSection {
  title: string;
  lines: StatementLine[];
  total: number;
}

export interface FinancialStatements {
  asOf: string;
  balance: BalanceLine[];
  /** Compte de résultat : charges (classe 6) et produits (classe 7). */
  charges: StatementSection;
  produits: StatementSection;
  resultat: number;
  actif: StatementSection[];
  passif: StatementSection[];
  totalActif: number;
  totalPassif: number;
  /** Écart actif − passif (doit être nul quand le journal est équilibré). */
  ecart: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const sum = (lines: StatementLine[]) => round2(lines.reduce((s, l) => s + l.amount, 0));

export function computeBalance(entries: JournalEntry[]): BalanceLine[] {
  const totals = new Map<string, { name: string; debit: number; credit: number; classe: number }>();
  for (const entry of entries) {
    if (entry.validated === false) continue; // seules les écritures validées sont comptabilisées
    for (const line of entry.lines) {
      let t = totals.get(line.accountCode);
      if (!t) {
        const found = SYSCOHADA_PLAN_COMPTABLE.find(a => a.code === line.accountCode);
        t = { name: line.accountName || found?.name || 'Compte auxiliaire', debit: 0, credit: 0, classe: found?.classe || parseInt(line.accountCode[0], 10) || 4 };
        totals.set(line.accountCode, t);
      }
      t.debit += line.debit;
      t.credit += line.credit;
    }
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, t]) => {
      const debit = round2(t.debit);
      const credit = round2(t.credit);
      return {
        code, name: t.name, classe: t.classe, debit, credit,
        soldeDebiteur: debit > credit ? round2(debit - credit) : 0,
        soldeCrediteur: credit > debit ? round2(credit - debit) : 0,
      };
    });
}

export function computeStatements(entries: JournalEntry[], asOf: string = new Date().toISOString().slice(0, 10)): FinancialStatements {
  const balance = computeBalance(entries);
  const byClass = (c: number) => balance.filter(b => b.classe === c);
  const line = (b: BalanceLine, amount: number): StatementLine => ({ code: b.code, label: b.name, amount: round2(amount) });
  const section = (title: string, lines: StatementLine[]): StatementSection => {
    const kept = lines.filter(l => l.amount !== 0);
    return { title, lines: kept, total: sum(kept) };
  };

  const charges = section('Charges (classe 6)', byClass(6).map(b => line(b, b.debit - b.credit)));
  const produits = section('Produits (classe 7)', byClass(7).map(b => line(b, b.credit - b.debit)));
  const resultat = round2(produits.total - charges.total);

  const actif = [
    section('Actif immobilisé (classe 2, net d\'amortissements)', byClass(2).map(b => line(b, b.debit - b.credit))),
    section('Stocks (classe 3)', byClass(3).map(b => line(b, b.debit - b.credit))),
    section('Créances et emplois assimilés (classe 4)', byClass(4).filter(b => b.soldeDebiteur > 0).map(b => line(b, b.soldeDebiteur))),
    section('Trésorerie-Actif (classe 5)', byClass(5).filter(b => b.soldeDebiteur > 0).map(b => line(b, b.soldeDebiteur))),
  ];
  const passif = [
    section('Capitaux propres et ressources assimilées (classe 1)', byClass(1).map(b => line(b, b.credit - b.debit))),
    section('Résultat net de l\'exercice', resultat !== 0 ? [{ code: '13', label: resultat >= 0 ? 'Résultat bénéficiaire' : 'Résultat déficitaire', amount: resultat }] : []),
    section('Dettes et ressources assimilées (classe 4)', byClass(4).filter(b => b.soldeCrediteur > 0).map(b => line(b, b.soldeCrediteur))),
    section('Trésorerie-Passif (classe 5)', byClass(5).filter(b => b.soldeCrediteur > 0).map(b => line(b, b.soldeCrediteur))),
  ];

  const totalActif = round2(actif.reduce((s, x) => s + x.total, 0));
  const totalPassif = round2(passif.reduce((s, x) => s + x.total, 0));
  return { asOf, balance, charges, produits, resultat, actif, passif, totalActif, totalPassif, ecart: round2(totalActif - totalPassif) };
}

// ----------------------------------------------------------------------------- Lignes CSV

export function balanceToRows(balance: BalanceLine[]): CsvValue[][] {
  const t = balance.reduce(
    (a, b) => ({ d: a.d + b.debit, c: a.c + b.credit, sd: a.sd + b.soldeDebiteur, sc: a.sc + b.soldeCrediteur }),
    { d: 0, c: 0, sd: 0, sc: 0 }
  );
  return [
    ['N° compte', 'Intitulé', 'Classe', 'Mouvements débit', 'Mouvements crédit', 'Solde débiteur', 'Solde créditeur'],
    ...balance.map(b => [b.code, b.name, b.classe, b.debit, b.credit, b.soldeDebiteur, b.soldeCrediteur] as CsvValue[]),
    ['TOTAUX', '', '', round2(t.d), round2(t.c), round2(t.sd), round2(t.sc)],
  ];
}

export function journalToRows(entries: JournalEntry[]): CsvValue[][] {
  const rows: CsvValue[][] = [['Date', 'Journal', 'N° pièce', 'Libellé écriture', 'N° compte', 'Intitulé compte', 'Libellé ligne', 'Débit', 'Crédit', 'Validée']];
  for (const e of [...entries].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const l of e.lines) {
      rows.push([e.date, e.journalCode, e.pieceNumber, e.description, l.accountCode, l.accountName, l.description, l.debit, l.credit, e.validated]);
    }
  }
  return rows;
}

export function statementsToRows(s: FinancialStatements, tenantName: string, currency: string): CsvValue[][] {
  const rows: CsvValue[][] = [
    [`BILAN ET COMPTE DE RÉSULTAT SYSCOHADA — ${tenantName}`],
    [`Arrêté au ${s.asOf} · Montants en ${currency}`],
    [],
    ['BILAN — ACTIF'],
    ['N° compte', 'Libellé', 'Montant'],
  ];
  const dump = (sections: StatementSection[]) => {
    for (const sec of sections) {
      rows.push([sec.title.toUpperCase(), '', sec.total]);
      for (const l of sec.lines) rows.push([l.code, l.label, l.amount]);
    }
  };
  dump(s.actif);
  rows.push(['TOTAL ACTIF', '', s.totalActif], [], ['BILAN — PASSIF'], ['N° compte', 'Libellé', 'Montant']);
  dump(s.passif);
  rows.push(['TOTAL PASSIF', '', s.totalPassif], ['Écart actif − passif', '', s.ecart], [], ['COMPTE DE RÉSULTAT'], ['N° compte', 'Libellé', 'Montant']);
  dump([s.charges, s.produits]);
  rows.push(['RÉSULTAT NET DE L\'EXERCICE', '', s.resultat]);
  return rows;
}
