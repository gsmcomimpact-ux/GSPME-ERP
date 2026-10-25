/**
 * GSPME - Bandeau d'échéance : essai qui se termine, abonnement à renouveler ou en retard de paiement.
 */
import { AlertTriangle, Clock } from 'lucide-react';
import { Tenant } from '../../types';

interface SubscriptionBannerProps {
  tenant: Tenant;
  onManage: () => void;
}

const GRACE_DAYS = 5;

export function SubscriptionBanner({ tenant, onManage }: SubscriptionBannerProps) {
  const expires = tenant.subscriptionExpiresAt ? new Date(tenant.subscriptionExpiresAt) : null;
  if (!expires || Number.isNaN(expires.getTime())) return null;
  const days = Math.ceil((expires.getTime() - Date.now()) / 86_400_000);
  const date = expires.toLocaleDateString('fr-FR');

  let tone: 'danger' | 'warn' | null = null;
  let message = '';
  let cta = 'Renouveler';
  if (tenant.subscriptionStatus === 'PAST_DUE') {
    tone = 'danger';
    message = `Votre abonnement a expiré le ${date}. Renouvelez-le avant ${GRACE_DAYS} jours de grâce pour conserver votre formule.`;
  } else if (tenant.subscriptionStatus === 'TRIAL' && days <= 7) {
    tone = 'warn';
    message = days >= 0 ? `Votre essai gratuit se termine dans ${days} jour${days > 1 ? 's' : ''} (${date}).` : `Votre essai gratuit est terminé.`;
    cta = 'Choisir une formule';
  } else if (tenant.subscriptionStatus === 'ACTIVE' && tenant.subscriptionPlan !== 'STARTER' && days <= 7 && days >= 0) {
    tone = 'warn';
    message = `Votre abonnement expire dans ${days} jour${days > 1 ? 's' : ''} (${date}).`;
  }
  if (!tone) return null;

  return (
    <div
      role="status"
      className={`mb-4 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border text-xs font-semibold ${
        tone === 'danger' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}
    >
      <span className="flex items-center gap-2">
        {tone === 'danger' ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
        {message}
      </span>
      <button onClick={onManage} className="px-3 py-1.5 bg-[#0F5132] hover:bg-[#0c4028] text-white font-bold rounded-lg cursor-pointer">
        {cta}
      </button>
    </div>
  );
}
