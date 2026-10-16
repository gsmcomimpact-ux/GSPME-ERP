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
    currencySymbol: 'FR CFA',
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
    currencySymbol: 'FR CFA',
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
    currencySymbol: 'FR CFA',
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
    currencySymbol: 'FR CFA',
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
    currencySymbol: 'FR CFA',
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
    currencySymbol: 'FR CFA',
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
    currencySymbol: 'FR CFA',
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
    currencySymbol: 'FR CFA',
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
    return '0 FR CFA';
  }

  const isZeroDecimal = ['XOF', 'XAF', 'GNF'].includes(currency);
  const roundedAmount = isZeroDecimal ? Math.round(amount) : amount;
  const parts = Math.abs(roundedAmount).toFixed(isZeroDecimal ? 0 : 2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = amount < 0 ? '-' : '';
  const formattedNumber = isZeroDecimal ? `${sign}${integerPart}` : `${sign}${integerPart},${parts[1]}`;

  if (currency === 'XOF' || currency === 'XAF' || currency === 'FCFA' || currency === 'FR CFA') {
    return `${formattedNumber} FR CFA`;
  }
  if (currency === 'GNF') return `${formattedNumber} GNF`;
  if (currency === 'NGN') return `₦${formattedNumber}`;
  if (currency === 'GHS') return `GH₵${formattedNumber}`;
  if (currency === 'EUR') return `${formattedNumber} €`;
  if (currency === 'USD') return `${formattedNumber} $`;
  return `${formattedNumber} ${currency}`;
}

export function formatNumber(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return '0';
  const parts = Math.abs(Math.round(val)).toString().split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = val < 0 ? '-' : '';
  return parts.length > 1 ? `${sign}${integerPart},${parts[1]}` : `${sign}${integerPart}`;
}
