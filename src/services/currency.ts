/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Packs Pays & Devises Africaines (UEMOA, CEMAC, Guinée, Ghana, Nigeria)
 */

import { CountryCode, CountryPack } from '../types';

export const COUNTRY_PACKS: Record<CountryCode, CountryPack> = {
  SN: {
    code: 'SN',
    countryName: 'Sénégal',
    currency: 'XOF',
    currencySymbol: 'FCFA',
    taxNumberLabel: 'NINEA',
    tradeRegisterLabel: 'RCCM Dakar',
    vatRateDefault: 18,
    socialSecurityName: 'IPRES & CSS',
    payrollTaxName: 'IRPP (Retenue source)',
    mobileMoneyProviders: ['Wave', 'Orange Money', 'Free Money'],
  },
  CI: {
    code: 'CI',
    countryName: "Côte d'Ivoire",
    currency: 'XOF',
    currencySymbol: 'FCFA',
    taxNumberLabel: 'NCC (Compte Contribuable)',
    tradeRegisterLabel: 'RCCM Abidjan',
    vatRateDefault: 18,
    socialSecurityName: 'CNPS',
    payrollTaxName: 'IS & IGR',
    mobileMoneyProviders: ['Wave', 'Orange Money', 'MTN MoMo', 'Moov Money'],
  },
  CM: {
    code: 'CM',
    countryName: 'Cameroun',
    currency: 'XAF',
    currencySymbol: 'FCFA',
    taxNumberLabel: 'NIU (Identifiant Unique)',
    tradeRegisterLabel: 'RCCM Douala',
    vatRateDefault: 19.25,
    socialSecurityName: 'CNPS Cameroun',
    payrollTaxName: 'IRPP & CAC',
    mobileMoneyProviders: ['MTN MoMo', 'Orange Money'],
  },
  ML: {
    code: 'ML',
    countryName: 'Mali',
    currency: 'XOF',
    currencySymbol: 'FCFA',
    taxNumberLabel: 'NIF',
    tradeRegisterLabel: 'RCCM Bamako',
    vatRateDefault: 18,
    socialSecurityName: 'INPS',
    payrollTaxName: 'ITS',
    mobileMoneyProviders: ['Orange Money', 'Moov Africa Malitel', 'Wave'],
  },
  BJ: {
    code: 'BJ',
    countryName: 'Bénin',
    currency: 'XOF',
    currencySymbol: 'FCFA',
    taxNumberLabel: 'IFU (Identifiant Fiscal Unique)',
    tradeRegisterLabel: 'RCCM Cotonou',
    vatRateDefault: 18,
    socialSecurityName: 'CNSS',
    payrollTaxName: 'AIB & IPTS',
    mobileMoneyProviders: ['MTN MoMo', 'Moov Money', 'Celtiis Cash'],
  },
  BF: {
    code: 'BF',
    countryName: 'Burkina Faso',
    currency: 'XOF',
    currencySymbol: 'FCFA',
    taxNumberLabel: 'IFU Ouaga',
    tradeRegisterLabel: 'RCCM Ouagadougou',
    vatRateDefault: 18,
    socialSecurityName: 'CNSS Burkina',
    payrollTaxName: 'IUTS',
    mobileMoneyProviders: ['Orange Money', 'Moov Money'],
  },
  NE: {
    code: 'NE',
    countryName: 'Niger',
    currency: 'XOF',
    currencySymbol: 'FCFA',
    taxNumberLabel: 'NIF Niger',
    tradeRegisterLabel: 'RCCM Niamey',
    vatRateDefault: 19,
    socialSecurityName: 'CNSS Niger',
    payrollTaxName: 'ISB',
    mobileMoneyProviders: ['Airtel Money', 'Moov Money'],
  },
  TG: {
    code: 'TG',
    countryName: 'Togo',
    currency: 'XOF',
    currencySymbol: 'FCFA',
    taxNumberLabel: 'NIF Togo',
    tradeRegisterLabel: 'RCCM Lomé',
    vatRateDefault: 18,
    socialSecurityName: 'CNSS Togo',
    payrollTaxName: 'IRTR',
    mobileMoneyProviders: ['T-Money', 'Moov Money Flooz'],
  },
  GN: {
    code: 'GN',
    countryName: 'Guinée',
    currency: 'GNF',
    currencySymbol: 'GNF',
    taxNumberLabel: 'NIF Conakry',
    tradeRegisterLabel: 'RCCM Conakry',
    vatRateDefault: 18,
    socialSecurityName: 'CNSS Guinée',
    payrollTaxName: 'RTS',
    mobileMoneyProviders: ['Orange Money', 'MTN MoMo'],
  },
};

export function formatMoney(amount: number, currency: string = 'XOF'): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0 FCFA';
  }

  const isZeroDecimal = ['XOF', 'XAF', 'GNF'].includes(currency);
  const formattedNumber = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: isZeroDecimal ? 0 : 2,
    minimumFractionDigits: isZeroDecimal ? 0 : 2,
  }).format(amount);

  if (currency === 'XOF' || currency === 'XAF') return `${formattedNumber} FCFA`;
  if (currency === 'GNF') return `${formattedNumber} GNF`;
  if (currency === 'NGN') return `₦${formattedNumber}`;
  if (currency === 'GHS') return `GH₵${formattedNumber}`;
  if (currency === 'EUR') return `${formattedNumber} €`;
  if (currency === 'USD') return `${formattedNumber} $`;
  return `${formattedNumber} ${currency}`;
}

export function formatNumber(val: number): string {
  return new Intl.NumberFormat('fr-FR').format(val);
}
