/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Types et Modèles de Données Exhaustifs pour SaaS ERP PME Africaines (Modules A à P)
 */

export type Role = 
  | 'DIRECTEUR_GENERAL'
  | 'RESPONSABLE_FINANCIER'
  | 'COMMERCIAL_VENTES'
  | 'LOGISTIQUE_STOCKS'
  | 'GESTIONNAIRE_RH'
  | 'CHEF_DE_PROJET'
  | 'CAISSIER_VENDEUR'
  | 'AUDITEUR_EXTERNE'
  | 'SUPER_ADMIN_SAAS';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  tenantId: string;
  active: boolean;
  lastLogin: string;
}

export type CountryCode = 'SN' | 'CI' | 'CM' | 'ML' | 'BJ' | 'GN' | 'NE' | 'BF' | 'TG';

export interface CountryPack {
  code: CountryCode;
  countryName: string;
  currency: string;
  currencySymbol: string;
  taxNumberLabel: string; // NINEA (SN), NCC (CI), NIU (CM), IFU (BJ), NIF (ML/NE/BF/TG)
  tradeRegisterLabel: string; // RCCM
  vatRateDefault: number; // 18% UEMOA, 19.25% Cameroun
  socialSecurityName: string; // IPRES & CSS, CNPS, CNSS, INPS
  payrollTaxName: string; // IRPP, ITS, AIB, etc.
  mobileMoneyProviders: string[]; // Wave, Orange Money, MTN MoMo, Moov, Free
}

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  isHeadquarters: boolean;
}

export type InvoiceTemplateId = 'CLASSIQUE' | 'MODERNE' | 'MINIMALISTE' | 'ELEGANT' | 'CORPORATE';

export interface Tenant {
  id: string;
  name: string;
  tradeName?: string;
  legalForm: 'SARL' | 'SAS' | 'SA' | 'SUARL' | 'GIE' | 'ENTREPRISE_INDIVIDUELLE';
  logoUrl?: string; // Logo personnalisé de l'entreprise (Base64 data URL ou URL d'image)
  invoiceTemplate?: InvoiceTemplateId; // Modèle PDF des factures et devis (défaut : CLASSIQUE)
  countryCode: CountryCode;
  taxNumber: string;
  tradeRegisterNumber: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  currency: string;
  capitalSocial: number;
  branches: Branch[];
  currentBranchId: string;
  subscriptionPlan: 'STARTER' | 'ESSENTIEL' | 'BUSINESS' | 'PREMIUM' | 'PROFESSIONAL' | 'ENTERPRISE';
  subscriptionStatus: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED';
  billingCycle?: 'MENSUEL' | 'ANNUEL';
  subscriptionExpiresAt?: string;
  monthlySubscriptionAmount?: number;
  maxUsers: number;
  maxStorageMB: number;
  activeModules: string[];
}

// MODULE B — CRM & Clients
export interface CustomerInteraction {
  id: string;
  customerId: string;
  date: string;
  type: 'APPEL' | 'REUNION' | 'EMAIL' | 'WHATSAPP' | 'VISITE_CHANTIER';
  author: string;
  summary: string;
  nextFollowUpDate?: string;
}

export interface Opportunity {
  id: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  title: string;
  estimatedValue: number;
  stage: 'PROSPECTION' | 'QUALIFICATION' | 'PROPOSITION_DEVIS' | 'NEGOCIATION' | 'GAGNEE' | 'PERDUE';
  probabilityPercent: number;
  closingDate: string;
  assignedTo: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  companyName?: string;
  type: 'ENTREPRISE' | 'PARTICULIER';
  category: 'GRAND_COMPTE' | 'PME' | 'PARTENAIRE' | 'INSTITUTIONNEL';
  email: string;
  phone: string;
  city: string;
  taxNumber?: string;
  creditLimit: number;
  outstandingBalance: number;
  createdAt: string;
  notes?: string;
}

// MODULE C & D — Commercial & Achats
export interface SalesRep {
  id: string;
  tenantId: string;
  name: string;
  targetMonthlySales: number;
  commissionRatePercent: number;
  totalSalesAchieved: number;
}

export interface SalesOrder {
  id: string;
  tenantId: string;
  number: string; // Ex: CMD-2026-0089
  customerId: string;
  customerName: string;
  date: string;
  deliveryDate: string;
  status: 'BROUILLON' | 'CONFIRMEE' | 'LIVREE' | 'FACTUREE' | 'ANNULEE';
  items: InvoiceItem[];
  totalHT: number;
  totalTTC: number;
  salesRepId?: string;
}

export interface DeliveryNote {
  id: string;
  tenantId: string;
  number: string; // Ex: BL-2026-0044
  orderId?: string;
  customerId: string;
  customerName: string;
  date: string;
  warehouseId: string;
  carrierName?: string;
  status: 'EN_PREPARATION' | 'EXPEDIE' | 'LIVRE';
  items: { productId: string; productName: string; quantity: number; unit: string }[];
}

export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  email: string;
  phone: string;
  city: string;
  taxNumber?: string;
  paymentTermsDays: number;
  balancePayable: number;
  ratingScore: number; // 1-5 étoiles
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  number: string;
  supplierId: string;
  supplierName: string;
  date: string;
  expectedDate: string;
  status: 'DEMANDE_PRIX' | 'APPROUVEE' | 'RECEPTIONNEE' | 'FACTUREE';
  totalHT: number;
  totalTTC: number;
}

// MODULE E — Stocks & Lots
export interface Product {
  id: string;
  tenantId: string;
  sku: string;
  barcode?: string;
  name: string;
  category: string;
  unit: 'unité' | 'kg' | 'tonne' | 'carton' | 'mètre' | 'litre' | 'forfait';
  purchasePriceHT: number;
  sellingPriceHT: number;
  vatRate: number;
  stockMinAlert: number;
  currentStock: number;
  valuationMethod: 'PUMP' | 'FIFO';
  warehouseStock: Record<string, number>;
  lotNumber?: string;
  expiryDate?: string;
}

export interface Warehouse {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  location: string;
  managerName: string;
  isDefault: boolean;
}

export interface StockMovement {
  id: string;
  tenantId: string;
  date: string;
  productId: string;
  productName: string;
  warehouseId: string;
  type: 'ENTREE_ACHAT' | 'SORTIE_VENTE' | 'TRANSFERT_INTER_DEPOT' | 'AJUSTEMENT_INVENTAIRE' | 'RETOUR_CLIENT';
  quantity: number;
  unitCost: number;
  referenceDoc: string;
  performedBy: string;
  notes?: string;
}

// MODULE F — Caisse & Point de Vente (POS)
export interface PosSession {
  id: string;
  tenantId: string;
  branchId: string;
  cashierName: string;
  openingTime: string;
  closingTime?: string;
  openingCashAmount: number;
  expectedClosingAmount?: number;
  actualClosingCashAmount?: number;
  cashDifference?: number;
  status: 'OUVERTE' | 'CLOTUREE';
  totalSales: number;
  transactionsCount: number;
}

export interface PosReceipt {
  id: string;
  sessionId: string;
  receiptNumber: string;
  timestamp: string;
  items: { name: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'ESPECES' | 'WAVE' | 'ORANGE_MONEY' | 'CARTE' | 'MIXTE';
  cashGiven?: number;
  cashChange?: number;
}

// MODULE G & H — Facturation & Comptabilité
export type InvoiceStatus = 'BROUILLON' | 'VALIDEE' | 'PARTIELLE' | 'PAYEE' | 'ANNULEE';

export interface InvoiceItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPriceHT: number;
  vatRate: number;
  discountPercent?: number;
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
}

export interface Invoice {
  id: string;
  tenantId: string;
  branchId: string;
  number: string;
  type: 'FACTURE_VENTE' | 'DEVIS_PROFORMA' | 'AVOIR_CLIENT' | 'BON_COMMANDE';
  customerId: string;
  customerName: string;
  customerTaxNumber?: string;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  subtotalHT: number;
  totalVAT: number;
  discountAmount: number;
  totalTTC: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  notes?: string;
  paymentMethod?: string;
  paymentReference?: string;
  accountingJournalCode?: string;
  accountingEntryGenerated: boolean;
}

export interface PurchaseInvoice {
  id: string;
  tenantId: string;
  number: string;
  supplierId: string;
  supplierName: string;
  date: string;
  dueDate: string;
  status: 'BROUILLON' | 'VALIDEE' | 'PAYEE';
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
  paidAmount: number;
  expenseCategory: string;
  ohadaAccount: string;
}

export type TreasuryAccountType = 'BANQUE' | 'CAISSE' | 'MOBILE_MONEY';

export interface TreasuryAccount {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  type: TreasuryAccountType;
  accountNumber?: string;
  currency: string;
  balance: number;
  ohadaAccount: string;
  provider?: string;
}

export interface TreasuryTransaction {
  id: string;
  tenantId: string;
  accountId: string;
  accountName: string;
  date: string;
  type: 'ENCAISSEMENT' | 'DECAISSEMENT' | 'VIREMENT_INTERNE';
  amount: number;
  category: string;
  reference: string;
  beneficiaryOrPayer: string;
  paymentMethod: 'VIREMENT' | 'CHEQUE' | 'ESPECES' | 'MOBILE_MONEY';
  reconciled: boolean;
}

export interface OHADAAccount {
  code: string;
  name: string;
  classe: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  type: 'ACTIF' | 'PASSIF' | 'CHARGE' | 'PRODUIT';
  nature: 'BILAN' | 'GESTION';
}

export interface JournalEntryLine {
  id: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  reference: string;
  description: string;
  reconciledMatch?: string; // Lettrage comptable
}

export interface JournalEntry {
  id: string;
  tenantId: string;
  journalCode: 'VT' | 'AC' | 'BQ' | 'CA' | 'OD' | 'PAIE' | 'IMMO';
  date: string;
  pieceNumber: string;
  description: string;
  lines: JournalEntryLine[];
  validated: boolean;
  lockedPeriod?: boolean;
}

// MODULE J — RH & Paie
export interface Employee {
  id: string;
  tenantId: string;
  branchId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  contractType: 'CDI' | 'CDD' | 'STAGE' | 'CONSULTANT';
  hireDate: string;
  baseSalary: number;
  transportAllowance: number;
  housingAllowance: number;
  familyStatus: 'CELIBATAIRE' | 'MARIE' | 'DIVORCE';
  numberOfChildren: number;
  bankAccountRib?: string;
  socialSecurityNumber?: string;
  vacationDaysBalance: number;
}

export interface Payslip {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  period: string;
  baseSalary: number;
  primes: number;
  grossSalary: number;
  employeeSocialContribution: number;
  employerSocialContribution: number;
  withholdingTax: number;
  netSalary: number;
  status: 'BROUILLON' | 'VALIDE' | 'PAYE';
}

// MODULE K — Gestion de Projets
export interface ProjectTask {
  id: string;
  title: string;
  assignedTo: string;
  dueDate: string;
  completed: boolean;
  cost: number;
}

export interface Project {
  id: string;
  tenantId: string;
  code: string; // Ex: PRJ-BTP-2026-01
  title: string;
  category: 'BTP_CONSTRUCTION' | 'TRANSPORT_LOGISTIQUE' | 'DISTRIBUTION' | 'INGENIERIE_SERVICES';
  customerId?: string;
  customerName?: string;
  manager: string;
  budgetAllocated: number;
  actualCost: number;
  invoicedAmount: number;
  progressPercent: number;
  startDate: string;
  endDate: string;
  status: 'PLANIFIE' | 'EN_COURS' | 'LIVRE' | 'SUSPENDU';
  tasks: ProjectTask[];
}

// MODULE L — Immobilisations & Amortissements
export interface FixedAsset {
  id: string;
  tenantId: string;
  code: string; // Ex: IMMO-0012
  name: string;
  category: 'VEHICULES_TRANSPORT' | 'MATERIEL_INDUSTRIEL' | 'BATIMENTS' | 'INFORMATIQUE_BUREAUTIQUE';
  acquisitionDate: string;
  commissioningDate: string;
  acquisitionCost: number;
  salvageValue: number;
  durationYears: number;
  depreciationMethod: 'LINEAIRE' | 'DEGRESSIF';
  accumulatedDepreciation: number;
  netBookValue: number;
  ohadaAccountAsset: string; // Ex: 245
  ohadaAccountDeprec: string; // Ex: 284
  status: 'EN_SERVICE' | 'CEDE' | 'REBUTE';
}

// MODULE M — Documents & GED
export interface StoredDocument {
  id: string;
  tenantId: string;
  title: string;
  category: 'CONTRAT' | 'JUSTIFICATIF_FISCAL' | 'FACTURE_SIGNEE' | 'PLAN_TECHNIQUE' | 'STATUTS_SOCIETE' | 'AUTRE';
  fileType: 'PDF' | 'IMAGE' | 'EXCEL' | 'DOC' | 'AUTRE';
  sizeKB: number;
  uploadedAt: string;
  uploadedBy: string;
  relatedEntity?: string; // Ex: "FAC-2026-0041"
  securityLevel: 'PUBLIC_ENTREPRISE' | 'CONFIDENTIEL_DAF' | 'DIRECTION_SEULEMENT';
  downloadUrl?: string;
  /** Fichier archivé (absent pour les fiches de démonstration). */
  fileId?: string;
  fileName?: string;
  mime?: string;
  /** Empreinte SHA-256 du fichier au moment du dépôt (preuve d'intégrité). */
  sha256?: string;
  uploadedById?: string;
}

// MODULE N — Rapports BI
export interface BiReportMetrics {
  totalRevenueHT: number;
  totalExpensesHT: number;
  netOperatingResult: number;
  ebitdaRatePercent: number;
  operatingCashFlow: number;
  clientReceivablesOutstanding: number;
  supplierDebtOutstanding: number;
  inventoryTurnoverRatio: number;
}

// MODULE O — IA Assistant Insights
export interface AiInsight {
  id: string;
  timestamp: string;
  type: 'ANOMALIE_TRESORERIE' | 'OPPORTUNITE_MARGE' | 'PREVISION_DECAISSEMENT' | 'ALERTE_RECOUVREMENT';
  severity: 'INFO' | 'ATTENTION' | 'CRITIQUE';
  title: string;
  analysis: string;
  recommendedAction: string;
  sourceDataReference: string;
}

// MODULE P — Plateforme Super Admin
export interface PlatformMetric {
  totalTenantsCount: number;
  activeUsersCount: number;
  totalMonthlyVolumeTransacted: number;
  platformUptimePercent: number;
  systemIncidentsCount: number;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: 'CREATION' | 'MODIFICATION' | 'SUPPRESSION' | 'VALIDATION' | 'CONNEXION' | 'EXPORT' | 'CLOTURE';
  module: 'VENTES' | 'ACHATS' | 'STOCKS' | 'TRESORERIE' | 'COMPTABILITE' | 'PAIE' | 'PROJETS' | 'IMMOBILISATIONS' | 'DOCUMENTS' | 'POS' | 'SYSTEME';
  details: string;
  ipAddress: string;
}

// MODULE Q — Site Public, Acquisition Clients & Monétisation SaaS
export type SubscriptionPlanId = 'STARTER' | 'ESSENTIEL' | 'BUSINESS' | 'PREMIUM';
export type BillingCycle = 'MENSUEL' | 'ANNUEL';
export type PaymentGatewayType = 'WAVE' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'MOOV_MONEY' | 'CARTE_BANCAIRE' | 'VIREMENT' | 'GRATUIT';

export interface SubscriptionPlanConfig {
  id: SubscriptionPlanId;
  name: string;
  tagline: string;
  monthlyPriceFCFA: number;
  annualPriceFCFA: number;
  maxUsers: number;
  maxStorageMB: number;
  popular?: boolean;
  badge?: string;
  allowedModules: string[];
  features: string[];
}

export interface SubscriptionOrder {
  orderId: string;
  tenantId: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  countryCode: CountryCode;
  planId: SubscriptionPlanId;
  billingCycle: BillingCycle;
  amountHT: number;
  vatRate: number;
  vatAmount: number;
  amountTTC: number;
  currency: string;
  paymentMethod: PaymentGatewayType;
  paymentPhoneNumber?: string;
  transactionReference: string;
  paymentStatus: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
  createdAt: string;
  paidAt?: string;
  validUntil: string;
}

export interface SaaSMonetizationMetrics {
  mrr: number;
  arr: number;
  totalTenants: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  pastDueSubscriptions: number;
  cancelledSubscriptions: number;
  churnRatePercent: number;
  arpuFCFA: number;
  byCountry: Record<string, { count: number; mrr: number }>;
  byPlan: Record<string, { count: number; mrr: number }>;
}

export interface SupportInquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  country: CountryCode;
  subject: string;
  message: string;
  createdAt: string;
  status: 'NOUVEAU' | 'EN_COURS' | 'TRAITE';
}
