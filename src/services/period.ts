/**
 * GSPME - Filtre de période (mois / trimestre / exercice) ancré sur l'activité la plus récente.
 */
export type PeriodFilter = 'MOIS' | 'TRIMESTRE' | 'ANNEE';

export interface PeriodRange {
  label: string;
  contains: (date: string) => boolean;
}

export function computePeriod(dates: string[], filter: PeriodFilter): PeriodRange {
  const valid = dates.filter(d => d && !Number.isNaN(new Date(d).getTime())).sort();
  const anchor = valid.length ? new Date(valid[valid.length - 1]) : new Date();
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const startMonth = filter === 'MOIS' ? month : filter === 'TRIMESTRE' ? Math.floor(month / 3) * 3 : 0;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  const label =
    filter === 'MOIS'
      ? anchor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      : filter === 'TRIMESTRE'
      ? `T${Math.floor(month / 3) + 1} ${year}`
      : `Exercice ${year}`;
  return {
    label,
    contains: d => {
      const t = new Date(d);
      return !Number.isNaN(t.getTime()) && t >= start && t <= end;
    },
  };
}
