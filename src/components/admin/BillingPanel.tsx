/**
 * GSPME - Abonnement et paiement en ligne (Chariow) : choix de la formule, paiement, historique.
 */
import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import { Tenant, User } from '../../types';
import { api, type Payment } from '../../services/api';
import { storage } from '../../services/storage';
import { formatMoney } from '../../services/currency';
import { subscriptionService } from '../../services/subscriptionService';
import { checkoutLinkFor } from '../../../shared/paymentLinks';
import { PAID_PLANS, PLAN_CATALOG, priceOf, type Cycle, type PaidPlanId } from '../../../shared/plans';
import { Modal } from '../common/UIComponents';

interface BillingPanelProps {
  tenant: Tenant;
  currentUser: User;
  showToast: (message: string) => void;
}

const STATUS_LABEL: Record<Payment['status'], { label: string; cls: string }> = {
  PENDING: { label: 'En attente', cls: 'bg-amber-100 text-amber-800' },
  PAID: { label: 'Payé', cls: 'bg-emerald-100 text-emerald-800' },
  FAILED: { label: 'Échoué', cls: 'bg-red-100 text-red-800' },
  ABANDONED: { label: 'Abandonné', cls: 'bg-slate-200 text-slate-700' },
  REVIEW: { label: 'À vérifier', cls: 'bg-rose-100 text-rose-800' },
};

export function BillingPanel({ tenant, currentUser, showToast }: BillingPanelProps) {
    const [cycle, setCycle] = useState<Cycle>('MENSUEL');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selected, setSelected] = useState<PaidPlanId | null>(null);
  const [phone, setPhone] = useState(tenant.phone || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [returning, setReturning] = useState(false);
  const polling = useRef(false);

  const canPay = currentUser.role === 'DIRECTEUR_GENERAL';
  const plans = subscriptionService.getPlans();
  const status = tenant.subscriptionStatus;
  const expires = tenant.subscriptionExpiresAt ? new Date(tenant.subscriptionExpiresAt) : null;
  const daysLeft = expires ? Math.ceil((expires.getTime() - Date.now()) / 86_400_000) : null;

  const loadPayments = () => api.listPayments().then(setPayments).catch(() => undefined);

  useEffect(() => {
    loadPayments();
  }, []);

  // Retour depuis la page de paiement Chariow : on attend la confirmation (webhook) puis on recharge l'entreprise
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('paiement') !== 'retour' || polling.current) return;
    polling.current = true;
    window.history.replaceState({}, '', window.location.pathname);
    setReturning(true);
    let tries = 0;
    const timer = setInterval(async () => {
      tries++;
      const list = await api.listPayments().catch(() => [] as Payment[]);
      setPayments(list);
      const latest = list[0];
      if (latest && latest.status !== 'PENDING') {
        clearInterval(timer);
        setReturning(false);
        if (latest.status === 'PAID') {
          await storage.refreshFromServer().catch(() => undefined);
          showToast('Paiement confirmé : votre abonnement est activé.');
        } else if (latest.status === 'REVIEW') {
          showToast('Paiement reçu mais à vérifier : notre équipe vous contactera.');
        } else {
          showToast('Le paiement n\'a pas abouti. Vous pouvez réessayer.');
        }
      } else if (tries >= 30) {
        clearInterval(timer);
        setReturning(false);
        showToast('Confirmation en attente : votre abonnement s\'activera dès réception du paiement.');
      }
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const pay = async () => {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      const { checkoutUrl } = await api.startCheckout({ plan: selected, cycle, phone });
      window.location.href = checkoutUrl;
    } catch {
      // Le client est dirigé vers Chariow dans tous les cas : la page de paiement ne dépend pas de ce serveur
      window.location.href = checkoutLinkFor(selected, cycle);
    }
  };


  return (
    <div className="space-y-5">
      {/* Situation de l'abonnement */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 text-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Votre abonnement</div>
          <div className="text-base font-black text-slate-900">
            {PLAN_CATALOG[(tenant.subscriptionPlan as keyof typeof PLAN_CATALOG)]?.name || tenant.subscriptionPlan}
            <span
              className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded ${
                status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : status === 'TRIAL' ? 'bg-sky-100 text-sky-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {status === 'TRIAL' ? 'ESSAI' : status === 'PAST_DUE' ? 'PAIEMENT EN RETARD' : status === 'CANCELLED' ? 'SUSPENDU' : 'ACTIF'}
            </span>
          </div>
          <div className="text-slate-500 mt-0.5">
            {expires
              ? `${status === 'PAST_DUE' ? 'Expiré' : 'Valide'} ${status === 'PAST_DUE' ? 'depuis le' : "jusqu'au"} ${expires.toLocaleDateString('fr-FR')}${daysLeft !== null && daysLeft >= 0 ? ` (${daysLeft} jour${daysLeft > 1 ? 's' : ''})` : ''}`
              : 'Formule gratuite, sans échéance'}
          </div>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(['MENSUEL', 'ANNUEL'] as const).map(c => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer ${cycle === c ? 'bg-white text-[#0F5132] shadow-xs' : 'text-slate-600'}`}
            >
              {c === 'MENSUEL' ? 'Mensuel' : 'Annuel (2 mois offerts)'}
            </button>
          ))}
        </div>
      </div>

      {returning && (
        <div role="status" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold">
          <Loader2 className="w-4 h-4 animate-spin" />
          Vérification de votre paiement en cours… cette page se met à jour automatiquement.
        </div>
      )}

      {!canPay && (
        <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs">
          Seule la direction de l'entreprise peut souscrire ou renouveler un abonnement.
        </div>
      )}

      {/* Formules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PAID_PLANS.map(id => {
          const plan = plans.find(p => p.id === id);
          const spec = PLAN_CATALOG[id];
          const isCurrent = tenant.subscriptionPlan === id && status === 'ACTIVE';
          const price = priceOf(id, cycle);
          return (
            <div key={id} className={`bg-white rounded-xl border p-5 flex flex-col justify-between text-xs ${isCurrent ? 'border-[#0F5132] ring-2 ring-[#0F5132]/10' : 'border-slate-200/80'}`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900">{spec.name}</h4>
                  {plan?.badge && <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">{plan.badge}</span>}
                </div>
                <div>
                  <span className="text-xl font-black text-[#0F5132]">{formatMoney(price, 'XOF')}</span>
                  <span className="text-slate-500"> / {cycle === 'MENSUEL' ? 'mois' : 'an'}</span>
                </div>
                <ul className="space-y-1.5 text-slate-600">
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-600" />Jusqu'à <strong>{spec.maxUsers} utilisateurs</strong></li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-600" />Stockage <strong>{Math.round(spec.maxStorageMB / 1024)} Go</strong></li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-600" /><strong>{spec.allowedModules.length} modules</strong> inclus</li>
                </ul>
              </div>
              <button
                disabled={!canPay}
                onClick={() => {
                  setError('');
                  setSelected(id);
                }}
                className="mt-4 w-full py-2 bg-[#0F5132] hover:bg-[#0c4028] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                {isCurrent ? 'Renouveler' : `Payer ${spec.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Historique */}
      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden text-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-900">Historique des paiements</div>
        {payments.length === 0 ? (
          <div className="p-4 text-center text-slate-400">Aucun paiement pour le moment.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="text-slate-500 border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Date</th>
                <th className="py-2.5 px-4 font-semibold">Formule</th>
                <th className="py-2.5 px-4 text-right font-semibold">Montant</th>
                <th className="py-2.5 px-4 text-center font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map(p => (
                <tr key={p.id}>
                  <td className="py-2.5 px-4">{new Date(p.paidAt || p.createdAt).toLocaleString('fr-FR')}</td>
                  <td className="py-2.5 px-4 font-semibold">{PLAN_CATALOG[p.plan as keyof typeof PLAN_CATALOG]?.name || p.plan} <span className="text-slate-400 font-normal">({p.cycle.toLowerCase()})</span></td>
                  <td className="py-2.5 px-4 text-right font-bold">{formatMoney(p.amount, p.currency)}</td>
                  <td className="py-2.5 px-4 text-center">
                    <span title={p.note} className={`text-[10px] font-bold px-2 py-0.5 rounded ${STATUS_LABEL[p.status].cls}`}>{STATUS_LABEL[p.status].label}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={!!selected} onClose={() => !busy && setSelected(null)} title="Paiement de l'abonnement" subtitle="Vous serez redirigé vers la page de paiement sécurisée">
        {selected && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Formule {PLAN_CATALOG[selected].name}</div>
                <div className="text-slate-500">{cycle === 'MENSUEL' ? '1 mois' : '12 mois'} · {tenant.name}</div>
              </div>
              <div className="text-base font-black text-[#0F5132]">{formatMoney(priceOf(selected, cycle), 'XOF')}</div>
            </div>
            <div>
              <label htmlFor="pay-phone" className="block font-semibold text-slate-700 mb-1">Téléphone (Mobile Money / contact de paiement) *</label>
              <input id="pay-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ex : 07 12 34 56 78"
                className="w-full p-2.5 border border-slate-300 rounded-lg" />
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              Paiement sécurisé par Chariow : Wave, Orange Money, MTN, Moov et carte selon votre pays. GSPME ne voit ni ne conserve vos moyens de paiement.
            </div>
            {error && <div role="alert" className="text-red-600 font-semibold">{error}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setSelected(null)} disabled={busy} className="px-3 py-2 border border-slate-300 rounded-lg text-slate-700 cursor-pointer">Annuler</button>
              <button onClick={pay} disabled={busy} className="px-4 py-2 bg-[#0F5132] hover:bg-[#0c4028] disabled:opacity-60 text-white font-bold rounded-lg flex items-center gap-2 cursor-pointer">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Payer {formatMoney(priceOf(selected, cycle), 'XOF')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
