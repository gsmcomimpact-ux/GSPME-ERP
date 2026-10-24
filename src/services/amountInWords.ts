/**
 * GSPME - Montant en toutes lettres (français) pour l'arrêté des factures (usage OHADA).
 */
const UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

function below100(n: number, final = true): string {
  if (n < 17) return UNITS[n];
  if (n < 20) return `dix-${UNITS[n - 10]}`;
  if (n < 70) {
    const t = Math.floor(n / 10), u = n % 10;
    if (u === 0) return TENS[t];
    return `${TENS[t]}${u === 1 ? ' et un' : `-${UNITS[u]}`}`;
  }
  if (n < 80) return n === 71 ? 'soixante et onze' : `soixante-${below100(n - 60)}`;
  if (n === 80) return final ? 'quatre-vingts' : 'quatre-vingt';
  return `quatre-vingt-${below100(n - 80)}`;
}

function below1000(n: number, final: boolean): string {
  const h = Math.floor(n / 100), r = n % 100;
  const parts: string[] = [];
  if (h > 0) {
    parts.push(h === 1 ? 'cent' : `${UNITS[h]} cent${r === 0 && final ? 's' : ''}`);
  }
  if (r > 0) parts.push(below100(r, final));
  return parts.join(' ');
}

/** 0 → « zéro », 1 250 000 → « un million deux cent cinquante mille ». Entiers jusqu'à 999 999 999 999. */
export function numberToFrench(value: number): string {
  let n = Math.round(Math.abs(value));
  if (n === 0) return 'zéro';
  const scales: [number, string][] = [[1_000_000_000, 'milliard'], [1_000_000, 'million'], [1000, 'mille']];
  const parts: string[] = [];
  for (const [size, name] of scales) {
    const count = Math.floor(n / size);
    if (count > 0) {
      if (name === 'mille') parts.push(count === 1 ? 'mille' : `${below1000(count, false)} mille`);
      else parts.push(`${below1000(count, true)} ${name}${count > 1 ? 's' : ''}`);
      n %= size;
    }
  }
  if (n > 0) parts.push(below1000(n, true));
  return parts.join(' ');
}

const CURRENCY_NAMES: Record<string, [string, string]> = {
  XOF: ['franc CFA', 'francs CFA'], XAF: ['franc CFA', 'francs CFA'], GNF: ['franc guinéen', 'francs guinéens'], EUR: ['euro', 'euros'], USD: ['dollar', 'dollars'],
};

export function amountInWords(amount: number, currency: string): string {
  const words = numberToFrench(amount);
  const [singular, plural] = CURRENCY_NAMES[currency] || [currency, currency];
  const text = `${words} ${Math.round(Math.abs(amount)) < 2 ? singular : plural}`; // 0 et 1 : singulier
  return text.charAt(0).toUpperCase() + text.slice(1);
}
