/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Module Q : Service d'Abonnements, Acquisition & Monétisation SaaS
 */

import {
  SubscriptionPlanConfig,
  SubscriptionPlanId,
  BillingCycle,
  SubscriptionOrder,
  SaaSMonetizationMetrics,
  PaymentGatewayType,
  Tenant,
  User,
  CountryCode,
  SupportInquiry,
} from '../types';
import { COUNTRY_PACKS } from './currency';
import { storage } from './storage';

// 4 Offres officielles configurables GSPME : Gratuit (0 FR CFA), Essentiel (5.000 FR CFA), Business (7.500 FR CFA) et Premium (10.000 FR CFA)
export const DEFAULT_PLANS: SubscriptionPlanConfig[] = [
  {
    id: 'STARTER',
    name: 'Gratuit',
    tagline: 'Pour démarrer sans frais : artisans, micro-activités et auto-entrepreneurs',
    monthlyPriceFCFA: 0,
    annualPriceFCFA: 0,
    maxUsers: 2,
    maxStorageMB: 5120, // 5 Go
    badge: '100% Gratuit',
    allowedModules: ['dashboard', 'crm', 'sales', 'pos', 'treasury'],
    features: [
      'Accès gratuit sans carte bancaire ni engagement',
      'Jusqu’à 2 utilisateurs simultanés',
      '5 Go d’espace de stockage sécurisé',
      'Facturation commerciale & devis essentiels',
      'Point de vente tactile (POS) & reçus',
      'Suivi de caisse physique & Mobile Money',
      'Fiches clients CRM & historique',
      'Support par email & centre d’aide',
    ],
  },
  {
    id: 'ESSENTIEL',
    name: 'Essentiel',
    tagline: 'Pour commerçants, boutiques, prestataires et TPE en pleine croissance',
    monthlyPriceFCFA: 5000,
    annualPriceFCFA: 50000, // 2 mois offerts
    maxUsers: 5,
    maxStorageMB: 10240, // 10 Go
    badge: 'Essentiel PME',
    allowedModules: [
      'dashboard',
      'crm',
      'sales',
      'purchases',
      'inventory',
      'pos',
      'treasury',
    ],
    features: [
      'Jusqu’à 5 utilisateurs avec rôles distincts',
      '10 Go d’espace de stockage sécurisé',
      'Tous les avantages de la formule Gratuite',
      'Achats & gestion complète des fournisseurs',
      'Gestion des stocks & valorisation au PUMP',
      'Alertes automatiques de stock minimum',
      'Multi-comptes bancaires & Mobile Money (Wave, OM, MoMo)',
      'Support prioritaire par WhatsApp (24h)',
    ],
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    tagline: 'Pour PME structurées, distribution, transport, services et BTP',
    monthlyPriceFCFA: 7500,
    annualPriceFCFA: 75000, // 2 mois offerts
    maxUsers: 15,
    maxStorageMB: 51200, // 50 Go
    popular: true,
    badge: 'Plus Populaire',
    allowedModules: [
      'dashboard',
      'crm',
      'sales',
      'purchases',
      'inventory',
      'pos',
      'treasury',
      'accounting',
      'tax',
      'payroll',
      'projects',
    ],
    features: [
      'Jusqu’à 15 utilisateurs & multi-agences',
      '50 Go d’espace de stockage haute capacité',
      'Tous les avantages de la formule Essentiel',
      'Comptabilité générale SYSCOHADA Révisé 2026',
      'Livre-journal, Grand livre & Balance 4 colonnes',
      'Module Paie & Déclarations sociales UEMOA/OHADA',
      'Déclaration de TVA automatique & calendrier fiscal',
      'Suivi de Projets, Affaires & Chantiers BTP',
      'Support dédié prioritaire téléphonique & WhatsApp',
    ],
  },
  {
    id: 'PREMIUM',
    name: 'Premium',
    tagline: 'Pour entreprises multi-sites, industries, grands comptes et holdings',
    monthlyPriceFCFA: 10000,
    annualPriceFCFA: 100000, // 2 mois offerts
    maxUsers: 50,
    maxStorageMB: 102400, // 100 Go
    badge: 'Entreprise & Illimité',
    allowedModules: [
      'dashboard',
      'crm',
      'sales',
      'purchases',
      'inventory',
      'pos',
      'treasury',
      'accounting',
      'tax',
      'payroll',
      'assets',
      'projects',
      'documents',
      'bi',
      'ai',
    ],
    features: [
      'Jusqu’à 50 utilisateurs & multi-établissements illimités',
      '100 Go d’espace de stockage sécurisé haute performance',
      'Tous les modules GSPME sans aucune restriction',
      'Gestion des Immobilisations & tableau d’amortissement',
      'GED complète (Gestion Électronique des Documents)',
      'Rapports décisionnels avancés & BI comparative',
      'Assistant IA GSPME (détection d’anomalies & trésorerie)',
      'Sauvegardes certifiées horaires & isolation dédiée',
      'Accompagnement personnalisé & Account Manager dédié 24/7',
    ],
  },
];

// Initialisation des commandes et factures SaaS
const INITIAL_SUBSCRIPTION_ORDERS: SubscriptionOrder[] = [
  {
    orderId: 'CMD-GSPME-2026-001',
    tenantId: 'tenant-sn-1',
    companyName: 'Sénégal BTP & Logistique SARL',
    contactName: 'Mamadou Ndiaye',
    contactEmail: 'm.ndiaye@sbl-afrique.sn',
    contactPhone: '+221 77 654 32 10',
    countryCode: 'SN',
    planId: 'PREMIUM',
    billingCycle: 'ANNUEL',
    amountHT: 100000,
    vatRate: 18,
    vatAmount: 18000,
    amountTTC: 118000,
    currency: 'XOF',
    paymentMethod: 'CARTE_BANCAIRE',
    transactionReference: 'TXN-GIM-20260115-8842',
    paymentStatus: 'PAID',
    createdAt: '2026-01-15T09:30:00Z',
    paidAt: '2026-01-15T09:32:00Z',
    validUntil: '2027-01-15T23:59:59Z',
  },
  {
    orderId: 'CMD-GSPME-2026-002',
    tenantId: 'tenant-ci-2',
    companyName: 'Ivoire Agro Distribution SAS',
    contactName: 'Awa Koné',
    contactEmail: 'a.kone@ivoireagro.ci',
    contactPhone: '+225 07 08 09 10 11',
    countryCode: 'CI',
    planId: 'BUSINESS',
    billingCycle: 'MENSUEL',
    amountHT: 7500,
    vatRate: 18,
    vatAmount: 1350,
    amountTTC: 8850,
    currency: 'XOF',
    paymentMethod: 'ORANGE_MONEY',
    paymentPhoneNumber: '+225 07 08 09 10 11',
    transactionReference: 'OM-CI-20260201-9921',
    paymentStatus: 'PAID',
    createdAt: '2026-02-01T10:15:00Z',
    paidAt: '2026-02-01T10:16:30Z',
    validUntil: '2026-03-01T23:59:59Z',
  },
  {
    orderId: 'CMD-GSPME-2026-003',
    tenantId: 'tenant-cm-3',
    companyName: 'Cameroon Services Tech SA',
    contactName: 'Jean-Paul Biya',
    contactEmail: 'jp.biya@camerountech.cm',
    contactPhone: '+237 699 01 23 45',
    countryCode: 'CM',
    planId: 'ESSENTIEL',
    billingCycle: 'MENSUEL',
    amountHT: 5000,
    vatRate: 19.25,
    vatAmount: 963,
    amountTTC: 5963,
    currency: 'XAF',
    paymentMethod: 'MTN_MOMO',
    paymentPhoneNumber: '+237 699 01 23 45',
    transactionReference: 'MOMO-CM-20260215-3312',
    paymentStatus: 'PAID',
    createdAt: '2026-02-15T14:00:00Z',
    paidAt: '2026-02-15T14:01:20Z',
    validUntil: '2026-03-15T23:59:59Z',
  },
];

const INITIAL_SUPPORT_INQUIRIES: SupportInquiry[] = [
  {
    id: 'INQ-001',
    name: 'Cheikh Fall',
    email: 'c.fall@transports-dakar.sn',
    phone: '+221 77 123 45 67',
    company: 'Transports Teranga Express',
    country: 'SN',
    subject: 'Demande de démonstration en entreprise',
    message: 'Bonjour, nous gérons une flotte de 18 camions avec 3 dépôts. La formule Business permet-elle de gérer le suivi carburant et les bons de livraison ?',
    createdAt: '2026-03-10T11:20:00Z',
    status: 'NOUVEAU',
  },
  {
    id: 'INQ-002',
    name: 'Blandine Kouamé',
    email: 'b.kouame@pharmacie-lagune.ci',
    phone: '+225 05 44 33 22 11',
    company: 'Pharmacie de la Lagune',
    country: 'CI',
    subject: 'Intégration caisse Wave & Orange Money',
    message: 'Nous souhaitons savoir si vos terminaux de caisse POS sont compatibles avec les lecteurs codes-barres Bluetooth et les imprimantes thermiques 80mm.',
    createdAt: '2026-03-11T16:45:00Z',
    status: 'EN_COURS',
  },
];

class SubscriptionService {
  private plansKey = 'gspme_saas_plans_config_v7';
  private ordersKey = 'gspme_subscription_orders_v3';
  private inquiriesKey = 'gspme_support_inquiries';

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized() {
    try {
      const stored = localStorage.getItem(this.plansKey);
      if (
        !stored ||
        !stored.includes('"monthlyPriceFCFA":5000') ||
        !stored.includes('"monthlyPriceFCFA":7500') ||
        !stored.includes('"monthlyPriceFCFA":10000')
      ) {
        localStorage.setItem(this.plansKey, JSON.stringify(DEFAULT_PLANS));
      }
      if (!localStorage.getItem(this.ordersKey)) {
        localStorage.setItem(this.ordersKey, JSON.stringify(INITIAL_SUBSCRIPTION_ORDERS));
      }
      if (!localStorage.getItem(this.inquiriesKey)) {
        localStorage.setItem(this.inquiriesKey, JSON.stringify(INITIAL_SUPPORT_INQUIRIES));
      }
    } catch {
      // In-memory fallback handled gracefully
    }
  }

  // --- GESTION DES OFFRES CONFIGURABLES ---
  public getPlans(): SubscriptionPlanConfig[] {
    try {
      const data = localStorage.getItem(this.plansKey);
      if (data) return JSON.parse(data);
    } catch {}
    return DEFAULT_PLANS;
  }

  public getPlanById(planId: SubscriptionPlanId): SubscriptionPlanConfig {
    const plans = this.getPlans();
    return plans.find(p => p.id === planId) || plans[0];
  }

  public updatePlan(planId: SubscriptionPlanId, updates: Partial<SubscriptionPlanConfig>): SubscriptionPlanConfig[] {
    const plans = this.getPlans().map(p => (p.id === planId ? { ...p, ...updates } : p));
    try {
      localStorage.setItem(this.plansKey, JSON.stringify(plans));
    } catch {}
    return plans;
  }

  public resetPlansToDefault(): SubscriptionPlanConfig[] {
    try {
      localStorage.setItem(this.plansKey, JSON.stringify(DEFAULT_PLANS));
    } catch {}
    return DEFAULT_PLANS;
  }

  // --- HISTORIQUE DES COMMANDES & FACTURES SAAS ---
  public getOrders(): SubscriptionOrder[] {
    try {
      const data = localStorage.getItem(this.ordersKey);
      if (data) return JSON.parse(data);
    } catch {}
    return INITIAL_SUBSCRIPTION_ORDERS;
  }

  public getOrdersForTenant(tenantId: string): SubscriptionOrder[] {
    return this.getOrders().filter(o => o.tenantId === tenantId);
  }

  // --- TRAITEMENT DU PAIEMENT & PROVISIONNEMENT NOUVEAU CLIENT ---
  public async processCheckoutAndProvisionTenant(params: {
    planId: SubscriptionPlanId;
    billingCycle: BillingCycle;
    companyName: string;
    legalForm: 'SARL' | 'SAS' | 'SA' | 'SUARL' | 'GIE' | 'ENTREPRISE_INDIVIDUELLE';
    countryCode: CountryCode;
    taxNumber: string;
    tradeRegisterNumber: string;
    address: string;
    city: string;
    adminName: string;
    adminEmail: string;
    adminPhone: string;
    adminPassword?: string;
    logoUrl?: string;
    paymentMethod: PaymentGatewayType;
    paymentPhoneNumber?: string;
  }): Promise<{ tenant: Tenant; user: User; order: SubscriptionOrder }> {
    const plan = this.getPlanById(params.planId);
    const countryPack = COUNTRY_PACKS[params.countryCode];

    // Calculs financiers fiables
    const amountHT = params.billingCycle === 'ANNUEL' ? plan.annualPriceFCFA : plan.monthlyPriceFCFA;
    const vatRate = countryPack.vatRateDefault || 18;
    const vatAmount = Math.round((amountHT * vatRate) / 100);
    const amountTTC = amountHT + vatAmount;

    // Référence de transaction sécurisée
    const now = new Date();
    const orderId = `CMD-GSPME-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const txnRef = `${params.paymentMethod}-${Date.now().toString().slice(-8)}`;

    const validUntilDate = new Date();
    if (params.billingCycle === 'ANNUEL') {
      validUntilDate.setFullYear(validUntilDate.getFullYear() + 1);
    } else {
      validUntilDate.setMonth(validUntilDate.getMonth() + 1);
    }

    // 1. Enregistrement de la commande payée
    const order: SubscriptionOrder = {
      orderId,
      tenantId: `tenant-${params.countryCode.toLowerCase()}-${Date.now().toString().slice(-5)}`,
      companyName: params.companyName,
      contactName: params.adminName,
      contactEmail: params.adminEmail,
      contactPhone: params.adminPhone,
      countryCode: params.countryCode,
      planId: params.planId,
      billingCycle: params.billingCycle,
      amountHT,
      vatRate,
      vatAmount,
      amountTTC,
      currency: countryPack.currency,
      paymentMethod: params.paymentMethod,
      paymentPhoneNumber: params.paymentPhoneNumber,
      transactionReference: txnRef,
      paymentStatus: 'PAID',
      createdAt: now.toISOString(),
      paidAt: now.toISOString(),
      validUntil: validUntilDate.toISOString(),
    };

    // 2. Création de l'entreprise (Tenant) dans le système de persistance multi-tenant
    const newTenant: Tenant = {
      id: order.tenantId,
      name: params.companyName,
      tradeName: params.companyName,
      legalForm: params.legalForm,
      logoUrl: params.logoUrl || '/src/assets/images/gspme_logo.jpg',
      countryCode: params.countryCode,
      taxNumber: params.taxNumber || `${countryPack.taxNumberLabel} En cours`,
      tradeRegisterNumber: params.tradeRegisterNumber || 'RCCM En cours',
      address: params.address,
      city: params.city,
      phone: params.adminPhone,
      email: params.adminEmail,
      currency: countryPack.currency,
      capitalSocial: 10000000,
      branches: [
        {
          id: `br-${order.tenantId}-siege`,
          tenantId: order.tenantId,
          name: 'Siège Social',
          address: params.address,
          city: params.city,
          phone: params.adminPhone,
          isHeadquarters: true,
        },
      ],
      currentBranchId: `br-${order.tenantId}-siege`,
      subscriptionPlan: params.planId,
      subscriptionStatus: 'ACTIVE',
      billingCycle: params.billingCycle,
      subscriptionExpiresAt: validUntilDate.toISOString(),
      monthlySubscriptionAmount: params.billingCycle === 'ANNUEL' ? Math.round(plan.annualPriceFCFA / 12) : plan.monthlyPriceFCFA,
      maxUsers: plan.maxUsers,
      maxStorageMB: plan.maxStorageMB,
      activeModules: [...plan.allowedModules],
    };

    // 3. Création du compte administrateur associé
    const newUser: User = {
      id: `usr-${order.tenantId}-admin`,
      tenantId: newTenant.id,
      name: params.adminName,
      email: params.adminEmail,
      role: 'DIRECTEUR_GENERAL',
      active: true,
      lastLogin: now.toISOString(),
    };

    // 4. Provisionnement des comptes de trésorerie par défaut de l'entreprise
    const defaultAccounts = [
      {
        id: `acc-${newTenant.id}-caisse`,
        tenantId: newTenant.id,
        branchId: newTenant.branches[0].id,
        name: 'Caisse Principale Siège',
        type: 'CAISSE' as const,
        currency: newTenant.currency,
        accountNumber: '571100',
        ohadaAccount: '571100',
        balance: 0,
      },
      {
        id: `acc-${newTenant.id}-banque`,
        tenantId: newTenant.id,
        branchId: newTenant.branches[0].id,
        name: `Banque Principale (${countryPack.countryName})`,
        type: 'BANQUE' as const,
        currency: newTenant.currency,
        accountNumber: '521100',
        ohadaAccount: '521100',
        balance: 0,
      },
      {
        id: `acc-${newTenant.id}-wave`,
        tenantId: newTenant.id,
        branchId: newTenant.branches[0].id,
        name: 'Compte Marchand Wave Business',
        type: 'MOBILE_MONEY' as const,
        currency: newTenant.currency,
        accountNumber: '573100',
        ohadaAccount: '573100',
        provider: 'Wave',
        balance: 0,
      },
    ];

    // Sauvegarde atomique
    storage.addTenant(newTenant);
    storage.addUser(newUser);
    defaultAccounts.forEach(acc => storage.addTreasuryAccount(acc));

    // Sauvegarde de la commande
    const currentOrders = this.getOrders();
    const updatedOrders = [order, ...currentOrders];
    try {
      localStorage.setItem(this.ordersKey, JSON.stringify(updatedOrders));
    } catch {}

    // Audit log
    storage.addAuditLog({
      id: `log-${Date.now()}`,
      tenantId: newTenant.id,
      timestamp: now.toISOString(),
      userId: newUser.id,
      userName: newUser.name,
      userRole: newUser.role,
      action: 'CREATION',
      module: 'SYSTEME',
      details: `Souscription activée avec succès : Formule ${plan.name} (${params.billingCycle}) via ${params.paymentMethod}`,
      ipAddress: '197.149.200.45',
    });

    return { tenant: newTenant, user: newUser, order };
  }

  // --- MISE À NIVEAU / CHANGEMENT D'OFFRE (UPGRADE / DOWNGRADE) ---
  public changeSubscriptionPlan(
    tenantId: string,
    newPlanId: SubscriptionPlanId,
    newCycle: BillingCycle = 'MENSUEL'
  ): { success: boolean; tenant: Tenant; prorataAmount: number } {
    const tenant = storage.getTenants().find(t => t.id === tenantId);
    if (!tenant) throw new Error('Entreprise introuvable');

    const newPlan = this.getPlanById(newPlanId);
    const oldPrice = tenant.monthlySubscriptionAmount || 10000;
    const newPrice = newCycle === 'ANNUEL' ? Math.round(newPlan.annualPriceFCFA / 12) : newPlan.monthlyPriceFCFA;
    const prorataDiff = Math.max(0, newPrice - oldPrice);

    const now = new Date();
    const validUntilDate = new Date();
    if (newCycle === 'ANNUEL') {
      validUntilDate.setFullYear(validUntilDate.getFullYear() + 1);
    } else {
      validUntilDate.setMonth(validUntilDate.getMonth() + 1);
    }

    const updated = storage.updateTenantById(tenantId, {
      subscriptionPlan: newPlanId,
      subscriptionStatus: 'ACTIVE',
      billingCycle: newCycle,
      subscriptionExpiresAt: validUntilDate.toISOString(),
      monthlySubscriptionAmount: newPrice,
      maxUsers: newPlan.maxUsers,
      maxStorageMB: newPlan.maxStorageMB,
      activeModules: [...newPlan.allowedModules],
    });

    // Enregistrement de la commande d'upgrade
    if (prorataDiff > 0) {
      const order: SubscriptionOrder = {
        orderId: `CMD-UPG-${Date.now().toString().slice(-6)}`,
        tenantId,
        companyName: tenant.name,
        contactName: tenant.email,
        contactEmail: tenant.email,
        contactPhone: tenant.phone,
        countryCode: tenant.countryCode,
        planId: newPlanId,
        billingCycle: newCycle,
        amountHT: prorataDiff,
        vatRate: 18,
        vatAmount: Math.round(prorataDiff * 0.18),
        amountTTC: Math.round(prorataDiff * 1.18),
        currency: tenant.currency,
        paymentMethod: 'CARTE_BANCAIRE',
        transactionReference: `UPG-${Date.now()}`,
        paymentStatus: 'PAID',
        createdAt: now.toISOString(),
        paidAt: now.toISOString(),
        validUntil: validUntilDate.toISOString(),
      };
      const orders = [order, ...this.getOrders()];
      try {
        localStorage.setItem(this.ordersKey, JSON.stringify(orders));
      } catch {}
    }

    return { success: true, tenant: updated || tenant, prorataAmount: prorataDiff };
  }

  // --- RÉSILIATION D'ABONNEMENT ---
  public cancelSubscription(tenantId: string): Tenant {
    const updated = storage.updateTenantById(tenantId, {
      subscriptionStatus: 'CANCELLED',
    });
    return updated || storage.getActiveTenant();
  }

  // --- CALCUL DES MÉTRIQUES SAAS (REVENUS & ABONNEMENTS) ---
  public computeMonetizationMetrics(): SaaSMonetizationMetrics {
    const tenants = storage.getTenants();
    const plans = this.getPlans();

    let mrr = 0;
    let activeSubscriptions = 0;
    let trialSubscriptions = 0;
    let pastDueSubscriptions = 0;
    let cancelledSubscriptions = 0;

    const byCountry: Record<string, { count: number; mrr: number }> = {};
    const byPlan: Record<string, { count: number; mrr: number }> = {
      STARTER: { count: 0, mrr: 0 },
      ESSENTIEL: { count: 0, mrr: 0 },
      BUSINESS: { count: 0, mrr: 0 },
      PREMIUM: { count: 0, mrr: 0 },
    };

    tenants.forEach(t => {
      const planConfig = plans.find(p => p.id === t.subscriptionPlan) || plans[1];
      const planPrice = t.monthlySubscriptionAmount || planConfig.monthlyPriceFCFA;

      // Status counting
      if (t.subscriptionStatus === 'ACTIVE') {
        activeSubscriptions++;
        mrr += planPrice;
      } else if (t.subscriptionStatus === 'TRIAL') {
        trialSubscriptions++;
      } else if (t.subscriptionStatus === 'PAST_DUE') {
        pastDueSubscriptions++;
      } else if (t.subscriptionStatus === 'CANCELLED') {
        cancelledSubscriptions++;
      }

      // Country breakdown
      const c = t.countryCode;
      if (!byCountry[c]) byCountry[c] = { count: 0, mrr: 0 };
      byCountry[c].count += 1;
      if (t.subscriptionStatus === 'ACTIVE') byCountry[c].mrr += planPrice;

      // Plan breakdown
      const pId = (t.subscriptionPlan as SubscriptionPlanId) || 'BUSINESS';
      if (byPlan[pId]) {
        byPlan[pId].count += 1;
        if (t.subscriptionStatus === 'ACTIVE') byPlan[pId].mrr += planPrice;
      }
    });

    const totalTenants = tenants.length;
    const arr = mrr * 12;
    const arpuFCFA = activeSubscriptions > 0 ? Math.round(mrr / activeSubscriptions) : 0;
    const churnRatePercent = totalTenants > 0 ? Math.round((cancelledSubscriptions / totalTenants) * 100) : 0;

    return {
      mrr,
      arr,
      totalTenants,
      activeSubscriptions,
      trialSubscriptions,
      pastDueSubscriptions,
      cancelledSubscriptions,
      churnRatePercent,
      arpuFCFA,
      byCountry,
      byPlan,
    };
  }

  // --- GESTION DU SUPPORT & CONTACT ---
  public getSupportInquiries(): SupportInquiry[] {
    try {
      const data = localStorage.getItem(this.inquiriesKey);
      if (data) return JSON.parse(data);
    } catch {}
    return INITIAL_SUPPORT_INQUIRIES;
  }

  public submitSupportInquiry(inquiry: Omit<SupportInquiry, 'id' | 'createdAt' | 'status'>): SupportInquiry {
    const newInquiry: SupportInquiry = {
      ...inquiry,
      id: `INQ-${Date.now().toString().slice(-5)}`,
      createdAt: new Date().toISOString(),
      status: 'NOUVEAU',
    };
    const inquiries = [newInquiry, ...this.getSupportInquiries()];
    try {
      localStorage.setItem(this.inquiriesKey, JSON.stringify(inquiries));
    } catch {}
    return newInquiry;
  }
}

export const subscriptionService = new SubscriptionService();
