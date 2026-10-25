/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Module Q : Parcours d'Inscription, Commande & Paiement Sécurisé (Checkout & Onboarding)
 */

import React, { useState } from 'react';
import {
  X,
  Check,
  ShieldCheck,
  CreditCard,
  Smartphone,
  Building2,
  Lock,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  FileText,
  AlertCircle,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import {
  SubscriptionPlanId,
  BillingCycle,
  CountryCode,
  Tenant,
  User,
  SubscriptionOrder,
} from '../../types';
import { checkoutLinkFor } from '../../../shared/paymentLinks';
import { isPaidPlan } from '../../../shared/plans';
import { subscriptionService } from '../../services/subscriptionService';
import { COUNTRY_PACKS, formatMoney } from '../../services/currency';

interface OnboardingCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlanId?: SubscriptionPlanId;
  initialCycle?: BillingCycle;
  onSuccessProvisioned: (tenant: Tenant, user: User, order: SubscriptionOrder) => void;
}

export function OnboardingCheckoutModal({
  isOpen,
  onClose,
  initialPlanId = 'ESSENTIEL',
  initialCycle = 'MENSUEL',
  onSuccessProvisioned,
}: OnboardingCheckoutModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Étape 1 : Formule
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>(initialPlanId);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(initialCycle);

  // Étape 2 : Entreprise & Dirigeant
  const [companyName, setCompanyName] = useState('');
  const [legalForm, setLegalForm] = useState<'SARL' | 'SAS' | 'SA' | 'SUARL' | 'GIE' | 'ENTREPRISE_INDIVIDUELLE'>('SARL');
  const [countryCode, setCountryCode] = useState<CountryCode>('SN');
  const [taxNumber, setTaxNumber] = useState('');
  const [tradeRegisterNumber, setTradeRegisterNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [logoUrl, setLogoUrl] = useState<string>('');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setErrorMsg("Veuillez sélectionner un fichier d'image inférieur à 3 Mo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setLogoUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Étape 3 : Paiement

  // Traitement
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [completedOrder, setCompletedOrder] = useState<SubscriptionOrder | null>(null);
  const [provisionedTenant, setProvisionedTenant] = useState<Tenant | null>(null);
  const [provisionedUser, setProvisionedUser] = useState<User | null>(null);

  if (!isOpen) return null;

  const plans = subscriptionService.getPlans();
  const currentPlan = plans.find(p => p.id === selectedPlanId) || plans[1];
  const countryPack = COUNTRY_PACKS[countryCode];

  // Calculs financiers
  const priceHT = billingCycle === 'ANNUEL' ? currentPlan.annualPriceFCFA : currentPlan.monthlyPriceFCFA;
  const vatRate = countryPack.vatRateDefault || 18;
  const vatAmount = Math.round((priceHT * vatRate) / 100);
  const priceTTC = priceHT + vatAmount;

  const handleNextToStep2 = () => {
    setStep(2);
  };

  const handleNextToStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !adminName || !adminEmail || !adminPhone || !city) {
      setErrorMsg('Veuillez renseigner tous les champs obligatoires.');
      return;
    }
    setErrorMsg('');
    setStep(3);
  };

  const handleProcessPayment = async () => {
    if (priceHT > 0 && isPaidPlan(selectedPlanId)) {
      // Formule payante : le client est dirigé vers Chariow uniquement pour le paiement
      window.location.href = checkoutLinkFor(selectedPlanId, billingCycle);
      return;
    }
    setIsProcessing(true);
    setErrorMsg('');

    try {
      // Simulation réaliste de confirmation serveur de la passerelle de paiement
      await new Promise(resolve => setTimeout(resolve, 1400));

      const result = await subscriptionService.processCheckoutAndProvisionTenant({
        planId: selectedPlanId,
        billingCycle,
        companyName,
        legalForm,
        countryCode,
        taxNumber,
        tradeRegisterNumber,
        address: address || city,
        city,
        adminName,
        adminEmail,
        adminPhone,
        adminPassword,
        logoUrl: logoUrl || undefined,
        paymentMethod: 'GRATUIT',
        paymentPhoneNumber: undefined,
      });

      setCompletedOrder(result.order);
      setProvisionedTenant(result.tenant);
      setProvisionedUser(result.user);
      setStep(4);
    } catch (err: any) {
      setErrorMsg(err.message || 'Une erreur est survenue lors de la validation du paiement.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalAccess = () => {
    if (provisionedTenant && provisionedUser && completedOrder) {
      onSuccessProvisioned(provisionedTenant, provisionedUser, completedOrder);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="bg-[#0F5132] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-white p-0.5 border border-white/20 shadow-xs shrink-0">
              <img
                src="/gspme_logo.jpg"
                alt="GSPME-ERP"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight flex items-center gap-1.5">
                <span>Souscription GSPME-ERP</span>
              </h2>
              <p className="text-[11px] text-white/70">
                Étape {step} sur 4 · Configuration et activation immédiate
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-500">
          <div className={`flex items-center gap-1.5 ${step >= 1 ? 'text-[#0F5132]' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 1 ? 'bg-[#0F5132] text-white' : 'bg-slate-200'}`}>1</span>
            <span>Formule</span>
          </div>
          <span className="text-slate-300">→</span>
          <div className={`flex items-center gap-1.5 ${step >= 2 ? 'text-[#0F5132]' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 2 ? 'bg-[#0F5132] text-white' : 'bg-slate-200'}`}>2</span>
            <span>Entreprise</span>
          </div>
          <span className="text-slate-300">→</span>
          <div className={`flex items-center gap-1.5 ${step >= 3 ? 'text-[#0F5132]' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 3 ? 'bg-[#0F5132] text-white' : 'bg-slate-200'}`}>3</span>
            <span>Paiement</span>
          </div>
          <span className="text-slate-300">→</span>
          <div className={`flex items-center gap-1.5 ${step >= 4 ? 'text-[#0F5132]' : ''}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step >= 4 ? 'bg-[#0F5132] text-white' : 'bg-slate-200'}`}>4</span>
            <span>Accès ERP</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ÉTAPE 1 : CHOIX DE L'OFFRE */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Choisissez votre formule d'abonnement</h3>
                  <p className="text-xs text-slate-500">Offres 100% conformes OHADA, évolutives à tout moment</p>
                </div>

                <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('MENSUEL')}
                    className={`px-3 py-1 rounded font-bold transition-all cursor-pointer ${
                      billingCycle === 'MENSUEL' ? 'bg-[#0F5132] text-white shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Mensuel
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('ANNUEL')}
                    className={`px-3 py-1 rounded font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      billingCycle === 'ANNUEL' ? 'bg-[#0F5132] text-white shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    <span>Annuel</span>
                    <span className="text-[10px] bg-[#D4AF37] text-slate-900 px-1 rounded">-15%</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {plans.map(p => {
                  const isSelected = selectedPlanId === p.id;
                  const price = billingCycle === 'ANNUEL' ? p.annualPriceFCFA : p.monthlyPriceFCFA;

                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPlanId(p.id)}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#0F5132] bg-emerald-50/30 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-slate-900 text-base">{p.name}</span>
                          <span className="text-xs font-black text-[#0F5132]">
                            {price === 0 ? 'Gratuit' : formatMoney(price, 'XOF')}
                            {price > 0 && (
                              <span className="text-[10px] text-slate-500 font-normal">/{billingCycle === 'ANNUEL' ? 'an' : 'm'}</span>
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{p.tagline}</p>

                        <div className="mt-3 text-[11px] text-slate-600 space-y-1">
                          <div>• Jusqu’à <strong>{p.maxUsers} utilisateur{p.maxUsers > 1 ? 's' : ''}</strong></div>
                          <div>• Stockage : <strong>{(p.maxStorageMB / 1024).toFixed(0)} Go</strong></div>
                          <div>• {p.features[1] || 'Facturation certifiée'}</div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-500">
                          {isSelected ? 'Formule sélectionnée' : 'Cliquer pour choisir'}
                        </span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#0F5132] bg-[#0F5132] text-white' : 'border-slate-300'}`}>
                          {isSelected && <Check className="w-2.5 h-2.5" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleNextToStep2}
                  className="px-5 py-2.5 bg-[#0F5132] hover:bg-[#0c4028] text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Continuer : Coordonnées Entreprise</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 : INFORMATIONS ENTREPRISE & ADMINISTRATEUR */}
          {step === 2 && (
            <form onSubmit={handleNextToStep3} className="space-y-5 text-xs">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Informations de votre entreprise & Compte dirigeant</h3>
                <p className="text-slate-500">
                  Ces informations serviront à paramétrer vos factures certifiées, votre compte de taxes et votre accès sécurisé.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Raison sociale (Nom de l'entreprise) *</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Ex: Sahel Négoce & Logistique"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Forme juridique *</label>
                  <select
                    value={legalForm}
                    onChange={e => setLegalForm(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]"
                  >
                    <option value="SARL">SARL (Société à Responsabilité Limitée)</option>
                    <option value="SAS">SAS (Société par Actions Simplifiée)</option>
                    <option value="SUARL">SUARL (SARL Unipersonnelle)</option>
                    <option value="SA">SA (Société Anonyme)</option>
                    <option value="GIE">GIE (Groupement d'Intérêt Économique)</option>
                    <option value="ENTREPRISE_INDIVIDUELLE">Entreprise Individuelle (ETS)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pays d'implantation OHADA *</label>
                  <select
                    value={countryCode}
                    onChange={e => setCountryCode(e.target.value as CountryCode)}
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
                  <label className="block font-semibold text-slate-700 mb-1">Ville d'établissement *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Dakar, Abidjan, Douala..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {countryPack.taxNumberLabel} (Optionnel)
                  </label>
                  <input
                    type="text"
                    value={taxNumber}
                    onChange={e => setTaxNumber(e.target.value)}
                    placeholder="Ex: 00984210"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-900 block mb-2">Compte Administrateur (Directeur Général)</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nom complet du dirigeant *</label>
                    <input
                      type="text"
                      required
                      value={adminName}
                      onChange={e => setAdminName(e.target.value)}
                      placeholder="Ex: Ibrahima Diallo"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email de connexion *</label>
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={e => setAdminEmail(e.target.value)}
                      placeholder="i.diallo@entreprise.sn"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Numéro Téléphone Mobile *</label>
                    <input
                      type="tel"
                      required
                      value={adminPhone}
                      onChange={e => setAdminPhone(e.target.value)}
                      placeholder="+221 77 000 00 00"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]"
                    />
                  </div>
                </div>
              </div>

              {/* Logo Officiel de l'Entreprise */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      Logo Officiel de l'Entreprise (Optionnel)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Ce logo sera automatiquement imprimé sur vos devis, factures certifiées, reçus de caisse et bulletins de paie.
                    </span>
                  </div>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="text-red-600 hover:text-red-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Retirer</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                  {/* Aperçu du logo */}
                  <div className="w-20 h-20 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs relative">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo entreprise"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <div className="text-center p-2 text-slate-400">
                        <ImageIcon className="w-6 h-6 mx-auto mb-1 stroke-1 text-slate-300" />
                        <span className="text-[9px] block font-medium">Aucun logo</span>
                      </div>
                    )}
                  </div>

                  {/* Boutons d'action */}
                  <div className="flex-1 space-y-2 w-full text-left">
                    <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg font-semibold text-xs cursor-pointer shadow-2xs transition-colors">
                      <Upload className="w-4 h-4 text-[#0F5132]" />
                      <span>{logoUrl ? "Changer le logo" : "Téléverser mon logo (PNG, JPG, SVG, WebP)"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>

                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-500">
                      <span>Exemples rapides :</span>
                      <button
                        type="button"
                        onClick={() => setLogoUrl('/gspme_logo.jpg')}
                        className="text-[#0F5132] hover:underline font-bold cursor-pointer"
                      >
                        Logo GSPME
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Retour</span>
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0F5132] hover:bg-[#0c4028] text-white font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{priceHT === 0 ? "Passer à l'Activation Gratuite" : "Passer au Paiement Sécurisé"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* ÉTAPE 3 : PAIEMENT SÉCURISÉ & RÉCAPITULATIF COMMANDE */}
          {step === 3 && (
            <div className="space-y-6 text-xs">
              {/* Récapitulatif commande */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-900 text-sm pb-2 border-b border-slate-200">
                  <span>Récapitulatif de Commande SaaS</span>
                  <span className="text-[#0F5132]">Formule {currentPlan.name} ({billingCycle})</span>
                </div>

                <div className="space-y-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>Entreprise cliente :</span>
                    <strong className="text-slate-900">{companyName} ({countryPack.countryName})</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Sous-total HT :</span>
                    <span>{priceHT === 0 ? '0 FR CFA (Gratuit)' : formatMoney(priceHT, countryPack.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TVA ({vatRate}%) :</span>
                    <span>{priceHT === 0 ? '0 FR CFA' : formatMoney(vatAmount, countryPack.currency)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 font-extrabold text-slate-900 text-sm">
                    <span>Total Net à Régler (TTC) :</span>
                    <span className="text-[#0F5132] text-base">{priceHT === 0 ? '0 FR CFA (Gratuit)' : formatMoney(priceTTC, countryPack.currency)}</span>
                  </div>
                </div>
              </div>

              {/* Sélection du moyen de paiement africain ou Offre Gratuite */}
              {priceHT === 0 ? (
                <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-2.5">
                  <div className="w-12 h-12 rounded-full bg-[#0F5132] text-white flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Formule 100% Gratuite</h4>
                    <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                      Aucune carte bancaire ni compte Mobile Money n'est requis. Cliquez sur <strong>Activer mon compte Gratuit</strong> pour créer votre entreprise et démarrer immédiatement.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                  <Lock className="w-6 h-6 text-[#0F5132] mx-auto" />
                  <p className="font-bold text-slate-900 text-sm">Paiement sécurisé sur Chariow</p>
                  <p className="text-slate-600 leading-relaxed">
                    Vous allez être redirigé vers la page de paiement Chariow (Wave, Orange Money, MTN, Moov, carte bancaire).
                    Aucune donnée de paiement n'est saisie sur GSPME.
                  </p>
                </div>
              )}

              <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Retour</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleProcessPayment}
                  className="px-6 py-2.5 bg-[#0F5132] hover:bg-[#0c4028] disabled:bg-slate-400 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{priceHT === 0 ? "Activation de votre compte..." : "Confirmation serveur en cours..."}</span>
                    </>
                  ) : priceHT === 0 ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Activer mon compte Gratuit (0 FR CFA) & Démarrer</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Payer sur Chariow ({formatMoney(priceTTC, countryPack.currency)})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ÉTAPE 4 : CONFIRMATION & ACCÈS DIRECT À L'ESPACE CLIENT */}
          {step === 4 && completedOrder && provisionedTenant && (
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#0F5132] flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Félicitations ! Votre espace GSPME est activé
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Le paiement a été confirmé avec succès par le serveur. Votre entreprise a été provisionnée
                  avec tous les paramétrages OHADA conformes.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 max-w-md mx-auto text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Référence Commande :</span>
                  <strong className="font-mono text-slate-900">{completedOrder.orderId}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Entreprise :</span>
                  <strong className="text-slate-900">{provisionedTenant.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Formule Activée :</span>
                  <strong className="text-[#0F5132]">{completedOrder.planId} ({completedOrder.billingCycle})</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Valide jusqu'au :</span>
                  <strong className="text-slate-900">
                    {new Date(completedOrder.validUntil).toLocaleDateString('fr-FR')}
                  </strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Paiement :</span>
                  <span className="font-semibold text-emerald-800">
                    {completedOrder.amountTTC === 0
                      ? 'Formule Gratuite (0 FR CFA) - Activée'
                      : `${formatMoney(completedOrder.amountTTC, completedOrder.currency)} via ${completedOrder.paymentMethod}`}
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleFinalAccess}
                  className="px-8 py-3 bg-[#0F5132] hover:bg-[#0c4028] text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Accéder immédiatement à mon ERP GSPME</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
