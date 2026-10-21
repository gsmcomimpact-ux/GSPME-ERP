/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Module Q : Site Public Commercial, Vitrine & Tarifs
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Send,
  Building2,
  Receipt,
  Boxes,
  Store,
  Wallet,
  Users2,
  BookOpenCheck,
  HelpCircle,
  ExternalLink,
  MessageSquare,
  Lock,
  Globe2,
  Zap,
  Smartphone,
  Menu,
  MessageCircle,
  FileText,
  CheckCircle2,
  Shield,
  CreditCard,
} from 'lucide-react';
import { SubscriptionPlanConfig, SubscriptionPlanId, BillingCycle, CountryCode } from '../../types';
import { subscriptionService } from '../../services/subscriptionService';
import { COUNTRY_PACKS, formatMoney } from '../../services/currency';

interface LandingPageProps {
  onSelectPlanToSubscribe: (planId: SubscriptionPlanId, cycle: BillingCycle) => void;
  onEnterDemoApp: () => void;
}

export function LandingPage({ onSelectPlanToSubscribe, onEnterDemoApp }: LandingPageProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MENSUEL');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [legalModal, setLegalModal] = useState<'CGU' | 'PRIVACY' | 'SECURITY' | null>(null);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToTop = () => {
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Formulaire de contact
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactCompany, setContactCompany] = useState('');
  const [contactCountry, setContactCountry] = useState<CountryCode>('SN');
  const [contactSubject, setContactSubject] = useState('Demande de démonstration personnalisée');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const plans = subscriptionService.getPlans();

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMessage) return;

    subscriptionService.submitSupportInquiry({
      name: contactName,
      email: contactEmail,
      phone: contactPhone,
      company: contactCompany,
      country: contactCountry,
      subject: contactSubject,
      message: contactMessage,
    });

    setContactSubmitted(true);
    setTimeout(() => {
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setContactCompany('');
      setContactMessage('');
      setContactSubmitted(false);
    }, 4000);
  };

  const faqs = [
    {
      q: 'GSPME est-il conforme au référentiel comptable SYSCOHADA Révisé ?',
      a: 'Oui, rigoureusement. GSPME intègre nativement le plan comptable général SYSCOHADA Révisé avec les classes 1 à 8, le principe de la partie double immuable, le grand-livre, la balance 4 colonnes, le bilan et le compte de résultat conformes aux normes OHADA.',
    },
    {
      q: 'Quels moyens de paiement sont acceptés pour la souscription et les factures ?',
      a: 'Nous supportons les moyens de paiement les plus populaires en Afrique : Wave (Sénégal, Côte d’Ivoire), Orange Money, MTN Moov Money, les cartes bancaires Visa / Mastercard du réseau GIM-UEMOA, ainsi que les virements bancaires d’entreprise.',
    },
    {
      q: 'Puis-je changer de formule d’abonnement en cours d’année ?',
      a: 'Absolument. Vous pouvez passer d’une formule Starter ou Essentiel à la formule Business ou Premium à tout moment depuis votre console d’administration. Le montant déjà réglé est calculé au prorata temporis.',
    },
    {
      q: 'Mes données d’entreprise sont-elles sécurisées et étanches ?',
      a: 'La sécurité est notre priorité absolue. Chaque entreprise dispose d’une isolation stricte (Row-Level Security) avec chiffrement des données au repos et en transit. Des sauvegardes automatiques horaires sont effectuées, et vous restez propriétaire exclusif de toutes vos données.',
    },
    {
      q: 'Proposez-vous un accompagnement pour migrer nos données existantes ?',
      a: 'Oui. Nos équipes régionales à Dakar, Abidjan et Douala vous accompagnent pour importer vos catalogues d’articles, balances d’ouverture, historiques clients et fournisseurs depuis vos anciens fichiers Excel.',
    },
    {
      q: 'Le logiciel fonctionne-t-il sur smartphone et tablette ?',
      a: 'Oui. L’interface de GSPME est conçue pour être 100% responsive. Elle est parfaitement optimisée pour les smartphones, tablettes de caisse et ordinateurs de bureau.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-800 font-sans selection:bg-[#0F5132] selection:text-white">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo cliquable -> Retour en haut */}
          <button
            onClick={scrollToTop}
            className="flex items-center gap-3 text-left group cursor-pointer focus:outline-hidden"
            title="GSPME-ERP Accueil"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white p-0.5 border border-slate-200/90 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
              <img
                src="/src/assets/images/gspme_logo.jpg"
                alt="GSPME-ERP"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div>
              <div className="font-black text-lg tracking-tight text-slate-900 group-hover:text-[#0F5132] transition-colors flex items-center">
                <span>GSPME</span>
                <span className="text-[#D4AF37]">-ERP</span>
              </div>
              <span className="text-[10px] text-slate-500 block -mt-0.5 font-medium">Croissance connectée en Afrique</span>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <button
              onClick={() => scrollToSection('fonctionnalites')}
              className="hover:text-[#0F5132] transition-colors cursor-pointer py-1"
            >
              Fonctionnalités
            </button>
            <button
              onClick={() => scrollToSection('avantages')}
              className="hover:text-[#0F5132] transition-colors cursor-pointer py-1"
            >
              Avantages Afrique
            </button>
            <button
              onClick={() => scrollToSection('tarifs')}
              className="hover:text-[#0F5132] transition-colors cursor-pointer py-1 font-bold text-slate-900"
            >
              Tarifs & Offres
            </button>
            <button
              onClick={() => scrollToSection('comparatif')}
              className="hover:text-[#0F5132] transition-colors cursor-pointer py-1"
            >
              Comparatif
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="hover:text-[#0F5132] transition-colors cursor-pointer py-1"
            >
              FAQ
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="hover:text-[#0F5132] transition-colors cursor-pointer py-1"
            >
              Support & Contact
            </button>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onEnterDemoApp}
              className="px-3 sm:px-3.5 py-2 text-xs font-bold text-[#0F5132] hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              title="Tester l'ERP en direct avec données démo"
            >
              <span>Accéder à l'ERP (Démo)</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </button>

            <button
              onClick={() => scrollToSection('tarifs')}
              className="hidden sm:inline-flex px-4 py-2 text-xs font-bold bg-[#0F5132] hover:bg-[#0c4028] text-white rounded-lg shadow-2xs transition-colors cursor-pointer items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Démarrer Gratuitement</span>
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2 shadow-xl animate-in slide-in-from-top-2 duration-150">
            <button
              onClick={() => scrollToSection('fonctionnalites')}
              className="w-full text-left py-2 px-3 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0F5132]"
            >
              Fonctionnalités & Modules
            </button>
            <button
              onClick={() => scrollToSection('avantages')}
              className="w-full text-left py-2 px-3 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0F5132]"
            >
              Avantages Afrique & OHADA
            </button>
            <button
              onClick={() => scrollToSection('tarifs')}
              className="w-full text-left py-2 px-3 rounded-lg text-xs font-bold text-[#0F5132] bg-emerald-50/60"
            >
              Tarifs (Gratuit, 5k, 7.5k, 10k FR CFA)
            </button>
            <button
              onClick={() => scrollToSection('comparatif')}
              className="w-full text-left py-2 px-3 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0F5132]"
            >
              Matrice Comparative des Formules
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="w-full text-left py-2 px-3 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0F5132]"
            >
              Foire Aux Questions (FAQ)
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="w-full text-left py-2 px-3 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#0F5132]"
            >
              Support Régional & Contact
            </button>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onEnterDemoApp();
                }}
                className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
              >
                <span>Connexion / Espace Entreprise</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => scrollToSection('tarifs')}
                className="w-full py-2.5 bg-[#0F5132] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
              >
                <span>Choisir une formule (Gratuit à 10.000 FR CFA)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 border-b border-slate-200 bg-gradient-to-b from-emerald-50/40 via-transparent to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-5">
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-white p-1 border border-slate-200 shadow-md hover:scale-105 transition-transform">
                <img
                  src="/src/assets/images/gspme_logo.jpg"
                  alt="GSPME-ERP - Croissance connectée en Afrique"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/70 border border-emerald-200 text-xs font-bold text-[#0F5132] mt-1">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Conforme OHADA / SYSCOHADA Révisé 2026 & Mobile Money</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              L'ERP tout-en-un conçu pour les <span className="text-[#0F5132]">PME Africaines</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Gérez vos ventes, stocks, caisses, trésorerie Wave & Orange Money, achats, paie et comptabilité
              générale depuis une plateforme SaaS unique, accessible sur mobile, tablette et ordinateur.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => scrollToSection('tarifs')}
                className="w-full sm:w-auto px-6 py-3 bg-[#0F5132] hover:bg-[#0c4028] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Découvrir nos offres & s'abonner</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onEnterDemoApp}
                className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold rounded-xl border border-slate-200 shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Tester l'application immédiatement</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            {/* Micro stats banner interactives */}
            <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <button
                onClick={() => scrollToSection('avantages')}
                className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-[#0F5132] transition-colors text-left cursor-pointer group"
              >
                <div className="text-lg font-black text-[#0F5132] group-hover:underline">100% OHADA</div>
                <div className="text-[11px] text-slate-500">Plan SYSCOHADA Révisé & Bilan</div>
              </button>
              <button
                onClick={() => scrollToSection('avantages')}
                className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-[#0F5132] transition-colors text-left cursor-pointer group"
              >
                <div className="text-lg font-black text-slate-900 group-hover:text-[#0F5132]">Mobile Money</div>
                <div className="text-[11px] text-slate-500">Wave, Orange Money & MTN direct</div>
              </button>
              <button
                onClick={() => scrollToSection('avantages')}
                className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-[#0F5132] transition-colors text-left cursor-pointer group"
              >
                <div className="text-lg font-black text-slate-900 group-hover:text-[#0F5132]">Multi-Pays</div>
                <div className="text-[11px] text-slate-500">UEMOA, CEMAC, Guinée, FCFA & GNF</div>
              </button>
              <button
                onClick={() => scrollToSection('tarifs')}
                className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-[#D4AF37] transition-colors text-left cursor-pointer group"
              >
                <div className="text-lg font-black text-[#D4AF37] group-hover:underline">Dès 0 FR CFA</div>
                <div className="text-[11px] text-slate-500">Formule Gratuite & offres dès 5.000 FR CFA</div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section Fonctionnalités Clés */}
      <section id="fonctionnalites" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-[#0F5132] uppercase tracking-wider">Modules Intégrés</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            Une couverture fonctionnelle complète pour chaque département
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Fini les fichiers Excel dispersés et les pertes de trésorerie. Tous vos flux sont interconnectés.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0F5132] flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Ventes & Facturation Normalisée</h3>
            <p className="text-slate-600 leading-relaxed">
              Devis, bons de commande, bons de livraison et factures certifiées conformes avec NINEA, NCC, NIU,
              mentions légales obligatoires et calcul automatique de la TVA locale.
            </p>
            <button
              onClick={() => scrollToSection('tarifs')}
              className="text-[#0F5132] font-bold inline-flex items-center gap-1 hover:underline pt-1 cursor-pointer"
            >
              <span>Disponible dans toutes les formules</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#D4AF37] flex items-center justify-center font-bold">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Trésorerie, Caisses & Mobile Money</h3>
            <p className="text-slate-600 leading-relaxed">
              Suivi en temps réel des caisses physiques du magasin, des comptes bancaires et des soldes marchands
              Wave / Orange Money avec rapprochement automatique des règlements.
            </p>
            <button
              onClick={() => scrollToSection('tarifs')}
              className="text-[#0F5132] font-bold inline-flex items-center gap-1 hover:underline pt-1 cursor-pointer"
            >
              <span>Inclus dès Starter</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Boxes className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Gestion des Stocks & Multi-Entrepôts</h3>
            <p className="text-slate-600 leading-relaxed">
              Valorisation au Coût Moyen Pondéré (PUMP), alertes de seuil minimum par SMS/WhatsApp, traçabilité
              des mouvements et transferts entre dépôts régionaux.
            </p>
            <button
              onClick={() => scrollToSection('tarifs')}
              className="text-[#0F5132] font-bold inline-flex items-center gap-1 hover:underline pt-1 cursor-pointer"
            >
              <span>Inclus dès Essentiel</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <Store className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Point de Vente (POS) & Caisse Tactile</h3>
            <p className="text-slate-600 leading-relaxed">
              Encaissement rapide au comptoir, tickets de caisse thermiques, gestion des tiroirs-caisses,
              paiements mixtes espèces/mobile money et clôture quotidienne en X et Z.
            </p>
            <button
              onClick={() => scrollToSection('tarifs')}
              className="text-[#0F5132] font-bold inline-flex items-center gap-1 hover:underline pt-1 cursor-pointer"
            >
              <span>Disponible dès Starter</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0F5132] flex items-center justify-center font-bold">
              <BookOpenCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Comptabilité Générale SYSCOHADA</h3>
            <p className="text-slate-600 leading-relaxed">
              Génération automatique des écritures à partir des factures et paiements. Livre-journal équilibré
              au franc près, grand-livre analytique, balance 4 colonnes, bilan et compte de résultat.
            </p>
            <button
              onClick={() => scrollToSection('tarifs')}
              className="text-[#0F5132] font-bold inline-flex items-center gap-1 hover:underline pt-1 cursor-pointer"
            >
              <span>Inclus dès Business</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <Users2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Paie & Ressources Humaines UEMOA</h3>
            <p className="text-slate-600 leading-relaxed">
              Bulletins de paie conformes aux codes du travail locaux, calcul exact des cotisations sociales
              (IPRES, CSS, CNSS) et génération des états déclaratifs mensuels.
            </p>
            <button
              onClick={() => scrollToSection('tarifs')}
              className="text-[#0F5132] font-bold inline-flex items-center gap-1 hover:underline pt-1 cursor-pointer"
            >
              <span>Inclus dès Business</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </section>

      {/* Section Avantages Afrique */}
      <section id="avantages" className="py-16 bg-gradient-to-b from-white to-slate-50/70 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-[#0F5132] uppercase tracking-wider">Pourquoi Choisir GSPME</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              Les atouts décisifs pour la réussite des PME en Afrique
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Une technologie d'entreprise adaptée aux réalités opérationnelles, réglementaires et financières locales.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-[#0F5132] flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5 text-[#0F5132]" />
              </div>
              <h3 className="text-base font-bold text-slate-900">SYSCOHADA Révisé 2026 Natif</h3>
              <p className="text-slate-600 leading-relaxed">
                Aucune adaptation approximative d’un logiciel étranger : plan comptable officiel (classes 1 à 8),
                partie double stricte, liasse fiscale et états financiers OHADA générés automatiquement.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-[#D4AF37] flex items-center justify-center font-bold">
                <Smartphone className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Mobile Money & Multi-Canaux</h3>
              <p className="text-slate-600 leading-relaxed">
                Intégration directe de Wave, Orange Money, MTN MoMo et des cartes bancaires régionales GIM-UEMOA.
                Encaissements clients, paiements fournisseurs et rapprochements sans friction.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center font-bold">
                <Globe2 className="w-5 h-5 text-blue-700" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Multi-Pays & Devises Régionales</h3>
              <p className="text-slate-600 leading-relaxed">
                Packs préconfigurés pour le Sénégal, la Côte d'Ivoire, le Cameroun, le Mali, le Bénin et la Guinée.
                Gestion native en Franc CFA (XOF / XAF), Franc Guinéen (GNF), Euro et Dollar.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100/70 text-indigo-700 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5 text-indigo-700" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Ultra-Rapide & Mobile First</h3>
              <p className="text-slate-600 leading-relaxed">
                Conçu pour fonctionner de manière fluide même avec les connexions mobiles courantes (3G/4G).
                Interface tactile optimisée pour smartphones, tablettes de caisse et ordinateurs.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100/70 text-purple-700 flex items-center justify-center font-bold">
                <Lock className="w-5 h-5 text-purple-700" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Souveraineté & Sécurité des Données</h3>
              <p className="text-slate-600 leading-relaxed">
                Isolation stricte par entreprise (Row-Level Security), sauvegardes horaires et réversibilité totale :
                vous pouvez exporter toutes vos données en un clic à tout moment.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-[#0F5132] flex items-center justify-center font-bold">
                <Users2 className="w-5 h-5 text-[#0F5132]" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Support Régional & Formation</h3>
              <p className="text-slate-600 leading-relaxed">
                Bureaux d’assistance et formateurs basés à Dakar, Abidjan et Douala. Accompagnement sur-mesure
                pour migrer vos catalogues Excel et former vos collaborateurs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section Tarifs & Abonnements Configurables */}
      <section id="tarifs" className="py-16 bg-slate-100/60 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-[#0F5132] uppercase tracking-wider">Tarification Claire & Transparente</span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-1">
              Des tarifs adaptés aux PME d'Afrique
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Pas de frais cachés. Paiement en FCFA par Mobile Money (Wave, Orange Money, MoMo) ou Carte Bancaire.
            </p>

            {/* Toggle Mensuel / Annuel */}
            <div className="mt-6 inline-flex items-center p-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <button
                onClick={() => setBillingCycle('MENSUEL')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === 'MENSUEL'
                    ? 'bg-[#0F5132] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Paiement Mensuel
              </button>
              <button
                onClick={() => setBillingCycle('ANNUEL')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  billingCycle === 'ANNUEL'
                    ? 'bg-[#0F5132] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Paiement Annuel</span>
                <span className="text-[10px] bg-[#D4AF37] text-slate-900 font-extrabold px-1.5 py-0.5 rounded">
                  2 mois offerts
                </span>
              </button>
            </div>
          </div>

          {/* Grille des 4 Offres Configurables */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map(plan => {
              const isPopular = plan.popular;
              const price = billingCycle === 'ANNUEL' ? plan.annualPriceFCFA : plan.monthlyPriceFCFA;
              const monthlyEquivalent = billingCycle === 'ANNUEL' ? Math.round(plan.annualPriceFCFA / 12) : plan.monthlyPriceFCFA;

              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl p-6 flex flex-col justify-between transition-all relative ${
                    isPopular
                      ? 'border-2 border-[#0F5132] shadow-lg ring-4 ring-[#0F5132]/5 scale-[1.02]'
                      : 'border border-slate-200 shadow-2xs hover:border-slate-300'
                  }`}
                >
                  {plan.badge && (
                    <div
                      className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-xs ${
                        isPopular ? 'bg-[#0F5132] text-white' : 'bg-[#D4AF37] text-slate-900'
                      }`}
                    >
                      {plan.badge}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black text-slate-900">{plan.name}</h3>
                      <span className="text-[11px] font-semibold text-slate-500">{plan.maxUsers} utilisateur{plan.maxUsers > 1 ? 's' : ''}</span>
                    </div>

                    <p className="text-xs text-slate-500 mt-1 min-h-[36px]">{plan.tagline}</p>

                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-900">
                          {price === 0 ? 'Gratuit' : formatMoney(price, 'XOF')}
                        </span>
                        {price > 0 && (
                          <span className="text-xs font-semibold text-slate-500">
                            /{billingCycle === 'ANNUEL' ? 'an' : 'mois'}
                          </span>
                        )}
                      </div>
                      {price === 0 ? (
                        <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                          0 FR CFA · Sans carte bancaire requise
                        </div>
                      ) : billingCycle === 'ANNUEL' ? (
                        <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                          Soit ~{formatMoney(monthlyEquivalent, 'XOF')}/mois (Économie de 2 mois)
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-6 space-y-2.5 text-xs text-slate-600">
                      {plan.features.map((feat, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-[#0F5132] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-100 space-y-2">
                    <button
                      onClick={() => onSelectPlanToSubscribe(plan.id, billingCycle)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs ${
                        isPopular
                          ? 'bg-[#0F5132] hover:bg-[#0c4028] text-white'
                          : price === 0
                          ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      <span>{price === 0 ? 'Démarrer Gratuitement' : `Souscrire ${plan.name}`}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={onEnterDemoApp}
                      className="w-full py-1.5 text-[11px] font-medium text-slate-500 hover:text-[#0F5132] transition-colors cursor-pointer text-center block"
                    >
                      Tester en démo interactive →
                    </button>

                    <div className="text-[10px] text-center text-slate-400">
                      {price === 0 ? 'Accès immédiat · 100% Sans engagement' : 'Activation immédiate · Sans engagement'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <button
              onClick={() => scrollToSection('comparatif')}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#0F5132] hover:underline cursor-pointer"
            >
              <span>Consulter le tableau comparatif complet de toutes les fonctionnalités</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Section Tableau Comparatif Détaillé */}
      <section id="comparatif" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold text-[#0F5132] uppercase tracking-wider">Matrice de Sélection</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            Comparatif détaillé des fonctionnalités
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Chaque formule répond précisément au stade de croissance de votre entreprise.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <tr>
                  <th className="py-4 px-5 font-bold text-sm">Fonctionnalité / Module</th>
                  <th className="py-4 px-4 font-bold text-center">Gratuit<br/><span className="text-[10px] text-emerald-600 font-bold">0 FR CFA</span></th>
                  <th className="py-4 px-4 font-bold text-center">Essentiel<br/><span className="text-[10px] text-slate-600 font-bold">5.000 FR CFA / mois</span></th>
                  <th className="py-4 px-4 font-bold text-center bg-emerald-50/50 text-[#0F5132]">Business<br/><span className="text-[10px] font-bold">7.500 FR CFA / mois</span></th>
                  <th className="py-4 px-4 font-bold text-center">Premium<br/><span className="text-[10px] text-slate-600 font-bold">10.000 FR CFA / mois</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                <tr>
                  <td className="py-3 px-5 font-semibold text-slate-900">Nombre d'utilisateurs inclus</td>
                  <td className="py-3 px-4 text-center font-bold">2 max</td>
                  <td className="py-3 px-4 text-center font-bold">5 max</td>
                  <td className="py-3 px-4 text-center font-bold bg-emerald-50/30 text-[#0F5132]">15 max</td>
                  <td className="py-3 px-4 text-center font-bold">50 (Extensible)</td>
                </tr>
                <tr>
                  <td className="py-3 px-5 font-semibold text-slate-900">Espace de stockage sécurisé</td>
                  <td className="py-3 px-4 text-center font-bold">5 Go</td>
                  <td className="py-3 px-4 text-center font-bold">10 Go</td>
                  <td className="py-3 px-4 text-center font-bold bg-emerald-50/30 text-[#0F5132]">50 Go</td>
                  <td className="py-3 px-4 text-center font-bold">100 Go</td>
                </tr>
                <tr>
                  <td className="py-3 px-5">Facturation & Devis essentiels</td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#0F5132] mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#0F5132] mx-auto" /></td>
                  <td className="py-3 px-4 text-center bg-emerald-50/30"><Check className="w-4 h-4 text-[#0F5132] mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#0F5132] mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-5">Caisse POS & Reçus thermiques</td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#0F5132] mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#0F5132] mx-auto" /></td>
                  <td className="py-3 px-4 text-center bg-emerald-50/30"><Check className="w-4 h-4 text-[#0F5132] mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#0F5132] mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-5">Gestion des Achats & Fournisseurs</td>
                  <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#0F5132] mx-auto" /></td>
                  <td className="py-3 px-4 text-center bg-emerald-50/30"><Check className="w-4 h-4 text-[#0F5132] mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#0F5132] mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-5">Gestion des Stocks & Entrepôts</td>
                  <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 px-4 text-center">1 entrepôt</td>
                  <td className="py-3 px-4 text-center bg-emerald-50/30">Multi-entrepôts</td>
                  <td className="py-3 px-4 text-center">Multi-entrepôts illimités</td>
                </tr>
                <tr>
                  <td className="py-3 px-5">Comptabilité SYSCOHADA & Grand-livre</td>
                  <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 px-4 text-center bg-emerald-50/30"><Check className="w-4 h-4 text-[#0F5132] mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#0F5132] mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-5">Module Paie & Déclarations IPRES/CSS/CNSS</td>
                  <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 px-4 text-center bg-emerald-50/30"><Check className="w-4 h-4 text-[#0F5132] mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#0F5132] mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-5">Suivi de Chantiers & Projets BTP</td>
                  <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 px-4 text-center bg-emerald-50/30"><Check className="w-4 h-4 text-[#0F5132] mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#0F5132] mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-5">GED, Immobilisations & Rapports BI</td>
                  <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 px-4 text-center bg-emerald-50/30"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#0F5132] mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-5">Assistant IA GSPME (Analyse financière)</td>
                  <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 px-4 text-center bg-emerald-50/30"><X className="w-4 h-4 text-slate-300 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-[#0F5132] mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-5 font-semibold text-slate-900">Support Client & Formation</td>
                  <td className="py-3 px-4 text-center">Email & Centre d'aide</td>
                  <td className="py-3 px-4 text-center">WhatsApp (24h)</td>
                  <td className="py-3 px-4 text-center bg-emerald-50/30">Téléphone & WhatsApp</td>
                  <td className="py-3 px-4 text-center font-bold text-[#0F5132]">Account Manager dédié 24/7</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="py-4 px-5 font-bold text-slate-900">Choisir cette formule</td>
                  <td className="py-4 px-4 text-center">
                    <button
                      onClick={() => onSelectPlanToSubscribe('STARTER', billingCycle)}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                    >
                      Démarrer Gratuit
                    </button>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <button
                      onClick={() => onSelectPlanToSubscribe('ESSENTIEL', billingCycle)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                    >
                      Souscrire Essentiel
                    </button>
                  </td>
                  <td className="py-4 px-4 text-center bg-emerald-50/50">
                    <button
                      onClick={() => onSelectPlanToSubscribe('BUSINESS', billingCycle)}
                      className="px-3 py-1.5 bg-[#0F5132] hover:bg-[#0c4028] text-white rounded-lg font-bold text-[11px] shadow-xs cursor-pointer"
                    >
                      Souscrire Business
                    </button>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <button
                      onClick={() => onSelectPlanToSubscribe('PREMIUM', billingCycle)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                    >
                      Souscrire Premium
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section FAQ Interactive */}
      <section id="faq" className="py-16 bg-slate-100/60 border-y border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold text-[#0F5132] uppercase tracking-wider">Réponses à vos Questions</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              Foire Aux Questions (FAQ)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Tout ce que vous devez savoir avant de commencer
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full py-4 px-5 text-left text-xs sm:text-sm font-bold text-slate-900 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#0F5132] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-left">
              <div className="text-xs font-bold text-slate-900">Vous avez une autre question spécifique à votre activité ?</div>
              <div className="text-[11px] text-slate-600">Nos experts sont à votre disposition par WhatsApp ou formulaire.</div>
            </div>
            <button
              onClick={() => scrollToSection('contact')}
              className="px-4 py-2 bg-[#0F5132] hover:bg-[#0c4028] text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
            >
              Poser ma question au support
            </button>
          </div>
        </div>
      </section>

      {/* Section Contact & Support */}
      <section id="contact" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Informations Régionales */}
          <div className="space-y-6">
            <div>
              <span className="text-xs font-bold text-[#0F5132] uppercase tracking-wider">Proximité & Support</span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                Une équipe technique présente sur le continent
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                Nos conseillers et formateurs certifiés sont disponibles pour vous guider, configurer votre entreprise
                et former vos comptables et commerciaux.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Bureau Dakar */}
              <div className="flex items-start gap-3 p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <MapPin className="w-4 h-4 text-[#0F5132] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-slate-900">Bureau Régional Dakar (Sénégal)</div>
                  <div className="text-slate-500">14 Boulevard de la République, Plateau, Dakar</div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[#0F5132] font-semibold">
                    <a
                      href="tel:+221338214400"
                      className="hover:underline flex items-center gap-1"
                      title="Appeler Dakar"
                    >
                      <Phone className="w-3 h-3" />
                      <span>+221 33 821 44 00</span>
                    </a>
                    <span>·</span>
                    <a
                      href="mailto:dakar@gspme-erp.com"
                      className="hover:underline flex items-center gap-1"
                      title="Envoyer un email à Dakar"
                    >
                      <Mail className="w-3 h-3" />
                      <span>dakar@gspme-erp.com</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Bureau Abidjan */}
              <div className="flex items-start gap-3 p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <MapPin className="w-4 h-4 text-[#0F5132] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-slate-900">Bureau Abidjan (Côte d'Ivoire)</div>
                  <div className="text-slate-500">Immeuble Kharrat, Boulevard Latrille, Cocody Deux-Plateaux</div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[#0F5132] font-semibold">
                    <a
                      href="tel:+2252722418000"
                      className="hover:underline flex items-center gap-1"
                      title="Appeler Abidjan"
                    >
                      <Phone className="w-3 h-3" />
                      <span>+225 27 22 41 80 00</span>
                    </a>
                    <span>·</span>
                    <a
                      href="mailto:abidjan@gspme-erp.com"
                      className="hover:underline flex items-center gap-1"
                      title="Envoyer un email à Abidjan"
                    >
                      <Mail className="w-3 h-3" />
                      <span>abidjan@gspme-erp.com</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Bureau Douala */}
              <div className="flex items-start gap-3 p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <MapPin className="w-4 h-4 text-[#0F5132] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-slate-900">Bureau Douala (Cameroun)</div>
                  <div className="text-slate-500">Avenue de Gaulle, Akwa, Douala</div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[#0F5132] font-semibold">
                    <a
                      href="tel:+237233421818"
                      className="hover:underline flex items-center gap-1"
                      title="Appeler Douala"
                    >
                      <Phone className="w-3 h-3" />
                      <span>+237 233 42 18 18</span>
                    </a>
                    <span>·</span>
                    <a
                      href="mailto:douala@gspme-erp.com"
                      className="hover:underline flex items-center gap-1"
                      title="Envoyer un email à Douala"
                    >
                      <Mail className="w-3 h-3" />
                      <span>douala@gspme-erp.com</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Assistance Directe WhatsApp */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Assistance Commerciale WhatsApp</div>
                    <div className="text-[11px] text-slate-600">Réponse sous quelques minutes</div>
                  </div>
                </div>
                <a
                  href="https://wa.me/221770000000?text=Bonjour%20GSPME%2C%20je%20souhaite%20une%20d%C3%A9monstration%20du%20logiciel%20SaaS"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-[#0F5132] hover:bg-[#0c4028] text-white font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Discuter</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Formulaire de Contact */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Demander une Démonstration ou Contacter le Support</h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Remplissez ce formulaire et un expert GSPME vous contactera sous 2 heures ouvrées.
            </p>

            {contactSubmitted ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto">
                  <Check className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-emerald-900">Message transmis avec succès !</div>
                <div className="text-[11px] text-emerald-700">
                  Notre équipe commerciale vous contactera rapidement par email ou WhatsApp.
                </div>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Votre Nom & Prénom *</label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={e => setContactName(e.target.value)}
                      placeholder="Ex: Ousmane Sow"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Email Professionnel *</label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                      placeholder="o.sow@entreprise.sn"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Téléphone (WhatsApp)</label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={e => setContactPhone(e.target.value)}
                      placeholder="+221 77 000 00 00"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Nom de l'entreprise</label>
                    <input
                      type="text"
                      value={contactCompany}
                      onChange={e => setContactCompany(e.target.value)}
                      placeholder="Ex: Teranga Distribution"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Pays d'activité</label>
                    <select
                      value={contactCountry}
                      onChange={e => setContactCountry(e.target.value as CountryCode)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]"
                    >
                      {Object.values(COUNTRY_PACKS).map(cp => (
                        <option key={cp.code} value={cp.code}>
                          {cp.countryName} ({cp.currency})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Objet</label>
                    <select
                      value={contactSubject}
                      onChange={e => setContactSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]"
                    >
                      <option value="Demande de démonstration">Demande de démonstration personnalisée</option>
                      <option value="Devis entreprise multi-sites">Devis sur-mesure (Multi-sites / Groupe)</option>
                      <option value="Support technique">Support technique / Paramétrage</option>
                      <option value="Partenariat intégrateur">Partenariat & intégrateur local</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Votre Message *</label>
                  <textarea
                    rows={3}
                    required
                    value={contactMessage}
                    onChange={e => setContactMessage(e.target.value)}
                    placeholder="Précisez vos besoins : volume de factures, nombre d'agences, gestion des stocks..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#0F5132] hover:bg-[#0c4028] text-white font-bold rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Envoyer ma demande</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs pt-12 pb-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-800">
            {/* Colonne 1: Présentation */}
            <div className="space-y-3">
              <button onClick={scrollToTop} className="flex items-center gap-2.5 cursor-pointer text-left">
                <div className="w-9 h-9 rounded-xl overflow-hidden bg-white p-0.5 border border-white/20 shadow-xs shrink-0">
                  <img
                    src="/src/assets/images/gspme_logo.jpg"
                    alt="GSPME-ERP"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
                <div>
                  <div className="font-black text-white text-base flex items-center">
                    <span>GSPME</span>
                    <span className="text-[#D4AF37]">-ERP</span>
                  </div>
                  <div className="text-[9px] text-slate-400">Croissance connectée</div>
                </div>
              </button>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Plateforme ERP tout-en-un pour les PME d'Afrique de l'Ouest et Centrale.
                Conforme au référentiel comptable SYSCOHADA Révisé 2026.
              </p>
              <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-2">
                <Globe2 className="w-3.5 h-3.5" />
                <span>Dakar · Abidjan · Douala</span>
              </div>
            </div>

            {/* Colonne 2: Navigation rapide */}
            <div className="space-y-2">
              <span className="font-bold text-white text-xs uppercase tracking-wider block mb-2">Plateforme</span>
              <div>
                <button onClick={() => scrollToSection('fonctionnalites')} className="hover:text-white transition-colors cursor-pointer text-[11px]">
                  Fonctionnalités & Modules
                </button>
              </div>
              <div>
                <button onClick={() => scrollToSection('avantages')} className="hover:text-white transition-colors cursor-pointer text-[11px]">
                  Atouts Afrique & OHADA
                </button>
              </div>
              <div>
                <button onClick={() => scrollToSection('tarifs')} className="hover:text-white transition-colors cursor-pointer text-[11px]">
                  Grille Tarifaire (Gratuit à 10.000 FR CFA)
                </button>
              </div>
              <div>
                <button onClick={() => scrollToSection('comparatif')} className="hover:text-white transition-colors cursor-pointer text-[11px]">
                  Tableau Comparatif Détaillé
                </button>
              </div>
            </div>

            {/* Colonne 3: Offres & Monétisation */}
            <div className="space-y-2">
              <span className="font-bold text-white text-xs uppercase tracking-wider block mb-2">Formules Disponibles</span>
              <div>
                <button onClick={() => { onSelectPlanToSubscribe('STARTER', 'MENSUEL'); }} className="hover:text-[#D4AF37] transition-colors cursor-pointer text-[11px]">
                  Formule Gratuite (0 FR CFA)
                </button>
              </div>
              <div>
                <button onClick={() => { onSelectPlanToSubscribe('ESSENTIEL', 'MENSUEL'); }} className="hover:text-[#D4AF37] transition-colors cursor-pointer text-[11px]">
                  Formule Essentiel (5.000 FR CFA / mois)
                </button>
              </div>
              <div>
                <button onClick={() => { onSelectPlanToSubscribe('BUSINESS', 'MENSUEL'); }} className="hover:text-[#D4AF37] transition-colors cursor-pointer text-[11px]">
                  Formule Business (7.500 FR CFA / mois)
                </button>
              </div>
              <div>
                <button onClick={() => { onSelectPlanToSubscribe('PREMIUM', 'MENSUEL'); }} className="hover:text-[#D4AF37] transition-colors cursor-pointer text-[11px]">
                  Formule Premium (10.000 FR CFA / mois)
                </button>
              </div>
            </div>

            {/* Colonne 4: Assistance & Espace Client */}
            <div className="space-y-3">
              <span className="font-bold text-white text-xs uppercase tracking-wider block mb-2">Support & Démo</span>
              <p className="text-[11px] text-slate-400">
                Besoin d'une démonstration sur mesure ou d'accéder à l'ERP ?
              </p>
              <div className="space-y-2">
                <button
                  onClick={onEnterDemoApp}
                  className="w-full py-2 bg-[#0F5132] hover:bg-[#0c4028] text-white font-bold rounded-lg transition-colors cursor-pointer text-center block text-[11px]"
                >
                  Accéder à l'ERP (Démo Live) →
                </button>
                <button
                  onClick={() => scrollToSection('contact')}
                  className="w-full py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors cursor-pointer text-center block text-[11px]"
                >
                  Contacter le support commercial
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <div>
              © 2026 GSPME Technologies. Tous droits réservés. Système de gestion certifié pour l'espace OHADA.
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => scrollToSection('faq')} className="hover:text-slate-300 cursor-pointer">
                FAQ & Aide
              </button>
              <span>·</span>
              <button onClick={() => setLegalModal('CGU')} className="hover:text-slate-300 cursor-pointer">
                Conditions d'Abonnement (CGU)
              </button>
              <span>·</span>
              <button onClick={() => setLegalModal('PRIVACY')} className="hover:text-slate-300 cursor-pointer">
                Protection des Données
              </button>
              <span>·</span>
              <button onClick={() => scrollToSection('contact')} className="hover:text-slate-300 cursor-pointer">
                Assistance Technique
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal Informations Juridiques / CGU / Sécurité */}
      {legalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#0F5132]" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {legalModal === 'CGU' && "Conditions Générales d'Abonnement GSPME"}
                  {legalModal === 'PRIVACY' && "Politique de Confidentialité & Protection des Données"}
                  {legalModal === 'SECURITY' && "Sécurité & Isolation Multi-Tenants"}
                </h3>
              </div>
              <button
                onClick={() => setLegalModal(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {legalModal === 'CGU' && (
                <>
                  <p>
                    <strong>1. Tarification & Devises :</strong> Les tarifs des forfaits GSPME (Gratuit 0 FR CFA, Essentiel 5.000 FR CFA / mois, Business 7.500 FR CFA / mois, Premium 10.000 FR CFA / mois) sont exprimés en Francs CFA (FR CFA) hors taxes. La formule Gratuite est sans frais et sans carte requise. La TVA applicable pour les offres payantes est calculée selon le pays d'immatriculation du client.
                  </p>
                  <p>
                    <strong>2. Engagement & Résiliation :</strong> Les abonnements mensuels sont sans engagement de durée et résiliables à tout moment depuis la console administrative. Les abonnements annuels font l'objet d'un paiement en une fois bénéficiant de 2 mois offerts.
                  </p>
                  <p>
                    <strong>3. Disponibilité du Service :</strong> GSPME garantit un taux de disponibilité mensuel supérieur à 99,5%, avec redondance des serveurs et sauvegardes automatiques quotidiennes.
                  </p>
                  <p>
                    <strong>4. Propriété des données :</strong> Le client demeure l'unique propriétaire légal de toutes les données comptables, commerciales et de paie enregistrées sur la plateforme. Une exportation intégrale en formats standardisés (Excel, CSV, PDF) est accessible à tout moment sans frais supplémentaires.
                  </p>
                </>
              )}

              {legalModal === 'PRIVACY' && (
                <>
                  <p>
                    <strong>1. Traitement des données :</strong> Vos informations d'entreprise (bilan, factures, coordonnées clients) sont strictement confidentielles et ne sont jamais partagées, cédées ni exploitées à des fins publicitaires.
                  </p>
                  <p>
                    <strong>2. Hébergement & Chiffrement :</strong> Toutes les données en transit sont chiffrées selon le protocole TLS 1.3, et les bases de données bénéficient d'un chiffrement AES-256 au repos.
                  </p>
                  <p>
                    <strong>3. Conformité Régionale :</strong> Traitement des données conforme aux réglementations de protection des données personnelles de la CEDEAO et de la zone UEMOA.
                  </p>
                </>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setLegalModal(null)}
                className="px-4 py-2 bg-[#0F5132] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-[#0c4028]"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
