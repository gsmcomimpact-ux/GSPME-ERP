/**
 * GSPME - Écran affiché quand un module n'est pas inclus dans la formule de l'entreprise.
 */
import { Lock } from 'lucide-react';
import { minPlanForModule } from '../../../shared/plans';
import { formatMoney } from '../../services/currency';

interface UpgradeNoticeProps {
  moduleLabel: string;
  moduleId: string;
  canUpgrade: boolean;
  onUpgrade: () => void;
  onBack: () => void;
}

export function UpgradeNotice({ moduleLabel, moduleId, canUpgrade, onUpgrade, onBack }: UpgradeNoticeProps) {
  const plan = minPlanForModule(moduleId);
  return (
    <div className="max-w-xl mx-auto mt-10 bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-2xs">
      <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
        <Lock className="w-6 h-6" />
      </div>
      <h2 className="text-base font-extrabold text-slate-900">« {moduleLabel} » n'est pas inclus dans votre formule</h2>
      <p className="text-xs text-slate-500">
        {plan
          ? `Ce module est disponible à partir de la formule ${plan.name} (${formatMoney(plan.monthlyPriceFCFA, 'XOF')} / mois).`
          : 'Ce module est réservé à une formule supérieure.'}
      </p>
      <div className="flex items-center justify-center gap-2 pt-2">
        <button onClick={onBack} className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer">
          Retour au tableau de bord
        </button>
        {canUpgrade && (
          <button onClick={onUpgrade} className="px-4 py-2 bg-[#0F5132] hover:bg-[#0c4028] text-white rounded-lg text-xs font-bold cursor-pointer">
            Voir les formules
          </button>
        )}
      </div>
    </div>
  );
}
