/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Moteur Comptable Référentiel OHADA / SYSCOHADA Révisé
 */

import { OHADAAccount, JournalEntry, Invoice, PurchaseInvoice, TreasuryTransaction } from '../types';

export const SYSCOHADA_PLAN_COMPTABLE: OHADAAccount[] = [
  // Classe 1 : Capitaux Propres et Dettes Financières
  { code: '101', name: 'Capital social', classe: 1, type: 'PASSIF', nature: 'BILAN' },
  { code: '111', name: 'Réserve légale', classe: 1, type: 'PASSIF', nature: 'BILAN' },
  { code: '121', name: 'Report à nouveau créditeur', classe: 1, type: 'PASSIF', nature: 'BILAN' },
  { code: '131', name: 'Résultat net de l’exercice (Bénéfice)', classe: 1, type: 'PASSIF', nature: 'BILAN' },
  { code: '162', name: 'Emprunts auprès des établissements de crédit', classe: 1, type: 'PASSIF', nature: 'BILAN' },

  // Classe 2 : Actif Immobilisé
  { code: '213', name: 'Terrains d’exploitation', classe: 2, type: 'ACTIF', nature: 'BILAN' },
  { code: '231', name: 'Bâtiments industriels et commerciaux', classe: 2, type: 'ACTIF', nature: 'BILAN' },
  { code: '241', name: 'Matériel et outillage industriel', classe: 2, type: 'ACTIF', nature: 'BILAN' },
  { code: '244', name: 'Matériel informatique et mobilier de bureau', classe: 2, type: 'ACTIF', nature: 'BILAN' },
  { code: '245', name: 'Matériel de transport (Véhicules & Camions)', classe: 2, type: 'ACTIF', nature: 'BILAN' },
  { code: '284', name: 'Amortissements du matériel', classe: 2, type: 'PASSIF', nature: 'BILAN' },

  // Classe 3 : Stocks
  { code: '311', name: 'Marchandises (Stock général)', classe: 3, type: 'ACTIF', nature: 'BILAN' },
  { code: '321', name: 'Matières premières et fournitures liées', classe: 3, type: 'ACTIF', nature: 'BILAN' },
  { code: '361', name: 'Produits finis', classe: 3, type: 'ACTIF', nature: 'BILAN' },

  // Classe 4 : Tiers
  { code: '4011', name: 'Fournisseurs - Dettes d’exploitation', classe: 4, type: 'PASSIF', nature: 'BILAN' },
  { code: '4081', name: 'Fournisseurs - Factures non parvenues', classe: 4, type: 'PASSIF', nature: 'BILAN' },
  { code: '4111', name: 'Clients - Créances d’exploitation', classe: 4, type: 'ACTIF', nature: 'BILAN' },
  { code: '4161', name: 'Créances clients douteuses ou litigieuses', classe: 4, type: 'ACTIF', nature: 'BILAN' },
  { code: '422', name: 'Personnel - Rémunérations dues (Salaires nets)', classe: 4, type: 'PASSIF', nature: 'BILAN' },
  { code: '431', name: 'Sécurité sociale (IPRES / CNPS / CSS)', classe: 4, type: 'PASSIF', nature: 'BILAN' },
  { code: '4421', name: 'État - Impôts retenus à la source (IRPP/VRS)', classe: 4, type: 'PASSIF', nature: 'BILAN' },
  { code: '4431', name: 'État - TVA facturée sur ventes', classe: 4, type: 'PASSIF', nature: 'BILAN' },
  { code: '4452', name: 'État - TVA récupérable sur achats', classe: 4, type: 'ACTIF', nature: 'BILAN' },
  { code: '4441', name: 'État - Impôt sur les sociétés (IS dû)', classe: 4, type: 'PASSIF', nature: 'BILAN' },

  // Classe 5 : Trésorerie
  { code: '5211', name: 'Banques locales en monnaie nationale', classe: 5, type: 'ACTIF', nature: 'BILAN' },
  { code: '5212', name: 'Banques devises étrangères', classe: 5, type: 'ACTIF', nature: 'BILAN' },
  { code: '5651', name: 'Monnaie électronique (Wave / Orange Money)', classe: 5, type: 'ACTIF', nature: 'BILAN' },
  { code: '5711', name: 'Caisse principale', classe: 5, type: 'ACTIF', nature: 'BILAN' },
  { code: '5712', name: 'Caisse menues dépenses / Point de vente', classe: 5, type: 'ACTIF', nature: 'BILAN' },
  { code: '585', name: 'Virements de fonds internes', classe: 5, type: 'ACTIF', nature: 'BILAN' },

  // Classe 6 : Charges des Activités Ordinaires
  { code: '601', name: 'Achats de marchandises', classe: 6, type: 'CHARGE', nature: 'GESTION' },
  { code: '602', name: 'Achats de matières premières', classe: 6, type: 'CHARGE', nature: 'GESTION' },
  { code: '605', name: 'Autres achats (Fournitures, carburant, eau, élec)', classe: 6, type: 'CHARGE', nature: 'GESTION' },
  { code: '612', name: 'Transports sur ventes et fret logistique', classe: 6, type: 'CHARGE', nature: 'GESTION' },
  { code: '622', name: 'Locations et charges locatives', classe: 6, type: 'CHARGE', nature: 'GESTION' },
  { code: '624', name: 'Entretien, réparations et maintenance', classe: 6, type: 'CHARGE', nature: 'GESTION' },
  { code: '625', name: 'Primes d’assurance', classe: 6, type: 'CHARGE', nature: 'GESTION' },
  { code: '628', name: 'Frais de télécommunications & Internet', classe: 6, type: 'CHARGE', nature: 'GESTION' },
  { code: '632', name: 'Rémunérations d’intermédiaires et honoraires', classe: 6, type: 'CHARGE', nature: 'GESTION' },
  { code: '641', name: 'Impôts et taxes directs (Patente, BRS, taxes)', classe: 6, type: 'CHARGE', nature: 'GESTION' },
  { code: '661', name: 'Rémunérations directes du personnel (Salaires)', classe: 6, type: 'CHARGE', nature: 'GESTION' },
  { code: '664', name: 'Charges sociales patronales', classe: 6, type: 'CHARGE', nature: 'GESTION' },
  { code: '671', name: 'Intérêts des emprunts et dettes bancaires', classe: 6, type: 'CHARGE', nature: 'GESTION' },
  { code: '681', name: 'Dotations aux amortissements d’exploitation', classe: 6, type: 'CHARGE', nature: 'GESTION' },

  // Classe 7 : Produits des Activités Ordinaires
  { code: '701', name: 'Ventes de marchandises', classe: 7, type: 'PRODUIT', nature: 'GESTION' },
  { code: '706', name: 'Services vendus et prestations d’ingénierie', classe: 7, type: 'PRODUIT', nature: 'GESTION' },
  { code: '707', name: 'Produits accessoires et refacturation frais', classe: 7, type: 'PRODUIT', nature: 'GESTION' },
  { code: '752', name: 'Gains de change et produits financiers', classe: 7, type: 'PRODUIT', nature: 'GESTION' },

  // Classe 8 : Hors Activités Ordinaires (HAOO)
  { code: '812', name: 'Valeurs comptables des cessions d’immos', classe: 8, type: 'CHARGE', nature: 'GESTION' },
  { code: '822', name: 'Produits des cessions d’immobilisations', classe: 8, type: 'PRODUIT', nature: 'GESTION' },
];

export function getAccountByCode(code: string): OHADAAccount | undefined {
  return SYSCOHADA_PLAN_COMPTABLE.find(a => a.code === code);
}

/**
 * Automates creation of double-entry OHADA journal entry for a validated customer invoice
 */
export function createSalesJournalEntry(invoice: Invoice, tenantId: string): JournalEntry {
  const lines = [
    // Débit du compte Client 4111 pour le montant TTC
    {
      id: `line-${Date.now()}-1`,
      accountCode: '4111',
      accountName: 'Clients - Créances d’exploitation',
      debit: invoice.totalTTC,
      credit: 0,
      reference: invoice.number,
      description: `Facture client ${invoice.customerName} - ${invoice.number}`,
    },
    // Crédit du compte Ventes 701 pour le montant HT
    {
      id: `line-${Date.now()}-2`,
      accountCode: '701',
      accountName: 'Ventes de marchandises',
      debit: 0,
      credit: invoice.subtotalHT - (invoice.discountAmount || 0),
      reference: invoice.number,
      description: `Produits de vente HT ${invoice.number}`,
    },
  ];

  // Crédit de la TVA facturée 4431 si applicable
  if (invoice.totalVAT > 0) {
    lines.push({
      id: `line-${Date.now()}-3`,
      accountCode: '4431',
      accountName: 'État - TVA facturée sur ventes',
      debit: 0,
      credit: invoice.totalVAT,
      reference: invoice.number,
      description: `TVA collectée facturée ${invoice.number}`,
    });
  }

  return {
    id: `entry-${Date.now()}`,
    tenantId,
    journalCode: 'VT',
    date: invoice.date,
    pieceNumber: invoice.number,
    description: `Facturation Vente Client: ${invoice.customerName} (${invoice.number})`,
    lines,
    validated: true,
  };
}

/**
 * Automates creation of double-entry OHADA journal entry for a customer receipt
 */
export function createPaymentJournalEntry(
  invoice: Invoice,
  paymentAmount: number,
  accountType: 'BANQUE' | 'CAISSE' | 'MOBILE_MONEY',
  paymentRef: string,
  tenantId: string
): JournalEntry {
  const treasuryCode = accountType === 'BANQUE' ? '5211' : accountType === 'MOBILE_MONEY' ? '5651' : '5711';
  const treasuryName = accountType === 'BANQUE' 
    ? 'Banques locales' 
    : accountType === 'MOBILE_MONEY' 
    ? 'Monnaie électronique (Wave / OM)' 
    : 'Caisse principale';
  const journal = accountType === 'BANQUE' ? 'BQ' : 'CA';

  return {
    id: `entry-pay-${Date.now()}`,
    tenantId,
    journalCode: journal,
    date: new Date().toISOString().split('T')[0],
    pieceNumber: paymentRef || `REG-${invoice.number}`,
    description: `Règlement facture ${invoice.number} - ${invoice.customerName}`,
    lines: [
      {
        id: `line-pay-1`,
        accountCode: treasuryCode,
        accountName: treasuryName,
        debit: paymentAmount,
        credit: 0,
        reference: paymentRef,
        description: `Encaissement sur ${invoice.number}`,
      },
      {
        id: `line-pay-2`,
        accountCode: '4111',
        accountName: 'Clients - Créances d’exploitation',
        debit: 0,
        credit: paymentAmount,
        reference: invoice.number,
        description: `Apurement créance ${invoice.customerName}`,
      },
    ],
    validated: true,
  };
}
