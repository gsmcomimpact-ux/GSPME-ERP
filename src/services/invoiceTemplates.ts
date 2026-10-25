/**
 * GSPME - Modèles PDF des factures, devis, avoirs et bons de commande (5 designs).
 * Un seul moteur (pagination, TVA par taux, montant en lettres, logo) ; chaque modèle fournit son habillage.
 */
import { jsPDF } from 'jspdf';
import { Invoice, InvoiceTemplateId, Tenant } from '../types';
import { formatMoney } from './currency';
import { amountInWords } from './amountInWords';

export interface TemplateMeta {
  id: InvoiceTemplateId;
  name: string;
  description: string;
  /** Couleur d'accent (aperçu dans l'interface). */
  accent: string;
}

export const INVOICE_TEMPLATES: TemplateMeta[] = [
  { id: 'CLASSIQUE', name: 'Classique', description: "Bandeau vert, cadres arrondis : sobre et familier, le modèle par défaut.", accent: '#0F5132' },
  { id: 'MODERNE', name: 'Moderne', description: "Barre latérale colorée et grand titre : un rendu actuel, idéal pour les services.", accent: '#2563EB' },
  { id: 'MINIMALISTE', name: 'Minimaliste', description: "Noir et blanc, filets fins, beaucoup d'espace : économique à imprimer.", accent: '#111827' },
  { id: 'ELEGANT', name: 'Élégant', description: "Typographie à empattements, filets dorés et en-tête centré : pour une image haut de gamme.", accent: '#7C2D3A' },
  { id: 'CORPORATE', name: 'Corporate', description: "En-tête marine pleine largeur, lignes alternées : le style des grandes entreprises.", accent: '#0B2545' },
];

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

interface Logo { data: string; format: 'PNG' | 'JPEG'; w: number; h: number }

const W = 210;
const M = 14;
const RIGHT = W - M; // 196
const PAGE_BOTTOM = 272; // limite du contenu (le pied de page commence plus bas)

// Colonnes du tableau
const COL = { desc: M + 4, qty: 112, unit: 142, vat: 162, total: RIGHT - 4 };

interface DocLabels { title: string; party: string; dateLabel: string; dueLabel: string; isQuote: boolean; isCredit: boolean }

function labelsFor(inv: Invoice): DocLabels {
  switch (inv.type) {
    case 'DEVIS_PROFORMA': return { title: 'DEVIS', party: 'ADRESSÉ À', dateLabel: 'Date du devis', dueLabel: "Valable jusqu'au", isQuote: true, isCredit: false };
    case 'AVOIR_CLIENT': return { title: 'AVOIR', party: 'AVOIR POUR', dateLabel: "Date d'émission", dueLabel: 'Échéance', isQuote: false, isCredit: true };
    case 'BON_COMMANDE': return { title: 'BON DE COMMANDE', party: 'CLIENT', dateLabel: 'Date de commande', dueLabel: 'Livraison', isQuote: true, isCredit: false };
    default: return { title: 'FACTURE', party: 'FACTURÉ À', dateLabel: "Date d'émission", dueLabel: 'Échéance', isQuote: false, isCredit: false };
  }
}

const STATUS_LABEL: Record<string, string> = { BROUILLON: 'Brouillon', VALIDEE: 'Validée', PARTIELLE: 'Partiellement réglée', PAYEE: 'Réglée', ANNULEE: 'Annulée' };

// ----------------------------------------------------------------------------- Logo

/** Charge le logo (data URL ou URL relative) et le convertit pour jsPDF. Formats gérés : PNG et JPEG. */
async function loadLogo(doc: jsPDF, url?: string): Promise<Logo | null> {
  if (!url) return null;
  try {
    let data = url;
    if (!url.startsWith('data:')) {
      if (typeof fetch === 'undefined') return null;
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      data = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    }
    const m = /^data:image\/(png|jpe?g);base64,/i.exec(data);
    if (!m) return null; // WebP/SVG non pris en charge par jsPDF
    const format = m[1].toLowerCase() === 'png' ? 'PNG' : 'JPEG';
    const props = doc.getImageProperties(data);
    return { data, format, w: props.width, h: props.height };
  } catch {
    return null;
  }
}

/** Dessine le logo dans une boîte maxW × maxH en conservant les proportions ; renvoie la largeur utilisée. */
function drawLogo(doc: jsPDF, logo: Logo | null, x: number, y: number, maxW: number, maxH: number, align: 'left' | 'center' | 'right' = 'left'): number {
  if (!logo) return 0;
  const ratio = logo.w / logo.h;
  let w = maxH * ratio, h = maxH;
  if (w > maxW) { w = maxW; h = maxW / ratio; }
  const dx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  doc.addImage(logo.data, logo.format, dx, y, w, h);
  return w;
}

// ----------------------------------------------------------------------------- Contexte et thèmes

interface Ctx {
  doc: jsPDF;
  inv: Invoice;
  tenant: Tenant;
  logo: Logo | null;
  labels: DocLabels;
  theme: Theme;
  y: number;
  money: (n: number) => string;
}

interface Theme {
  id: InvoiceTemplateId;
  font: 'helvetica' | 'times';
  accent: RGB;
  accent2: RGB;
  text: RGB;
  muted: RGB;
  line: RGB;
  zebra: RGB | null;
  /** Habillage de la première page ; renvoie l'ordonnée de départ du contenu. */
  header: (c: Ctx) => number;
  /** En-tête compact des pages suivantes. */
  pageHeader: (c: Ctx) => number;
  /** En-tête de tableau. */
  tableHead: (c: Ctx, y: number) => number;
  totalsStyle: 'box' | 'filled' | 'plain' | 'gold' | 'navy';
  footer: (c: Ctx, page: number, pages: number) => void;
}

const setText = (d: jsPDF, c: RGB) => d.setTextColor(c[0], c[1], c[2]);
const setFill = (d: jsPDF, c: RGB) => d.setFillColor(c[0], c[1], c[2]);
const setDraw = (d: jsPDF, c: RGB) => d.setDrawColor(c[0], c[1], c[2]);
const clip = (t: string, max: number) => (t.length > max ? `${t.slice(0, max - 1)}…` : t);

/** Écrit un texte en réduisant la taille de police (jusqu'à minSize) puis en tronquant pour tenir dans maxW. */
function fitText(doc: jsPDF, text: string, x: number, y: number, maxW: number, size: number, opts?: { align?: 'left' | 'center' | 'right'; minSize?: number }): void {
  let fs = size;
  const min = opts?.minSize ?? 8;
  doc.setFontSize(fs);
  while (doc.getTextWidth(text) > maxW && fs > min) { fs -= 0.5; doc.setFontSize(fs); }
  let out = text;
  while (doc.getTextWidth(out) > maxW && out.length > 4) out = `${out.slice(0, -2)}…`;
  doc.text(out, x, y, opts?.align ? { align: opts.align } : undefined);
}

/** Lignes d'identité de l'entreprise (sans doublons ni valeurs vides). */
function companyLines(t: Tenant): string[] {
  return [
    [t.legalForm, t.tradeRegisterNumber && `RCCM : ${t.tradeRegisterNumber}`].filter(Boolean).join(' · '),
    t.taxNumber && `NIF / NCC : ${t.taxNumber}`,
    [t.address, [t.city, t.countryCode].filter(Boolean).join(', ')].filter(Boolean).join(' - '),
    [t.phone && `Tél : ${t.phone}`, t.email].filter(Boolean).join(' · '),
  ].filter(Boolean) as string[];
}

/** Bloc « client » commun aux modèles : nom, identifiant fiscal, règlement. */
function partyInfo(c: Ctx): { name: string; lines: string[] } {
  const { inv, labels } = c;
  const lines = [inv.customerTaxNumber ? `NIF / NCC : ${inv.customerTaxNumber}` : `Compte client : ${inv.customerId}`];
  if (!labels.isQuote) lines.push(`Règlement : ${inv.paymentMethod || 'Mobile Money / Virement'}`);
  return { name: inv.customerName, lines };
}

// ---- 1. CLASSIQUE
const classique: Theme = {
  id: 'CLASSIQUE', font: 'helvetica', accent: hex('#0F5132'), accent2: hex('#D4AF37'), text: [15, 23, 42], muted: [71, 85, 105], line: [226, 232, 240], zebra: [248, 250, 252],
  header(c) {
    const { doc, tenant, inv, labels, theme: t } = c;
    setFill(doc, t.accent); doc.rect(0, 0, W, 8, 'F');
    const lw = drawLogo(doc, c.logo, M, 12, 28, 18);
    const x = M + (lw ? lw + 4 : 0);
    doc.setFont(t.font, 'bold'); setText(doc, t.accent);
    fitText(doc, tenant.name.toUpperCase(), x, 22, 121 - x, 16);
    doc.setFont(t.font, 'normal'); doc.setFontSize(8.5); setText(doc, t.muted);
    companyLines(tenant).forEach((l, i) => fitText(doc, l, x, 27 + i * 5, 121 - x, 8.5, { minSize: 6.5 }));
    setFill(doc, [241, 245, 249]); doc.roundedRect(125, 14, 71, 32, 2, 2, 'F');
    doc.setFont(t.font, 'bold'); doc.setFontSize(labels.title.length > 12 ? 11 : 13); setText(doc, t.accent);
    doc.text(labels.title, 130, 22);
    doc.setFontSize(9); setText(doc, t.text); doc.text(`N° : ${inv.number}`, 130, 29);
    doc.setFont(t.font, 'normal'); doc.setFontSize(8.5); setText(doc, t.muted);
    doc.text(`${labels.dateLabel} : ${inv.date}`, 130, 35);
    doc.text(`${labels.dueLabel} : ${inv.dueDate}`, 130, 40.5);
    const p = partyInfo(c);
    setDraw(doc, t.line); setFill(doc, [255, 255, 255]); doc.roundedRect(M, 52, 182, 24, 2, 2, 'FD');
    doc.setFont(t.font, 'bold'); doc.setFontSize(8.5); setText(doc, t.accent); doc.text(`${labels.party} :`, 20, 58);
    doc.setFontSize(10); setText(doc, t.text); doc.text(clip(p.name, 48), 20, 64);
    doc.setFont(t.font, 'normal'); doc.setFontSize(8); setText(doc, t.muted);
    doc.text(p.lines[0], 20, 70);
    if (p.lines[1]) doc.text(p.lines[1], 120, 64);
    if (!labels.isQuote) doc.text(`Statut : ${STATUS_LABEL[inv.status] || inv.status}`, 120, 70);
    return 84;
  },
  pageHeader(c) {
    const { doc, tenant, inv, theme: t } = c;
    setFill(doc, t.accent); doc.rect(0, 0, W, 8, 'F');
    doc.setFont(t.font, 'bold'); doc.setFontSize(10); setText(doc, t.accent);
    doc.text(clip(tenant.name.toUpperCase(), 40), M, 17);
    doc.setFont(t.font, 'normal'); setText(doc, t.muted); doc.text(`${c.labels.title} ${inv.number} (suite)`, RIGHT, 17, { align: 'right' });
    return 24;
  },
  tableHead(c, y) {
    const { doc, theme: t } = c;
    setFill(doc, t.accent); doc.rect(M, y, 182, 8, 'F');
    doc.setFont(t.font, 'bold'); doc.setFontSize(8); setText(doc, [255, 255, 255]);
    doc.text('Désignation', COL.desc, y + 5.5); doc.text('Qté', COL.qty, y + 5.5, { align: 'center' });
    doc.text('Prix unit. HT', COL.unit, y + 5.5, { align: 'right' }); doc.text('TVA', COL.vat, y + 5.5, { align: 'right' }); doc.text('Total HT', COL.total, y + 5.5, { align: 'right' });
    return y + 8;
  },
  totalsStyle: 'box',
  footer(c, page, pages) {
    const { doc, theme: t } = c;
    setFill(doc, [241, 245, 249]); doc.rect(0, 285, W, 12, 'F');
    doc.setFont(t.font, 'normal'); doc.setFontSize(7.5); setText(doc, [100, 116, 139]);
    doc.text(`GSPME ERP · Conforme SYSCOHADA révisé · ${c.labels.title} ${c.inv.number}`, M, 292);
    doc.text(`Page ${page} / ${pages}`, RIGHT, 292, { align: 'right' });
  },
};

// ---- 2. MODERNE
const moderne: Theme = {
  id: 'MODERNE', font: 'helvetica', accent: hex('#2563EB'), accent2: hex('#DBEAFE'), text: [17, 24, 39], muted: [107, 114, 128], line: [229, 231, 235], zebra: null,
  header(c) {
    const { doc, tenant, inv, labels, theme: t } = c;
    setFill(doc, t.accent); doc.rect(0, 0, 6, 297, 'F');
    const lw = drawLogo(doc, c.logo, M + 4, 12, 30, 18);
    const x = M + 4 + (lw ? lw + 4 : 0);
    doc.setFont(t.font, 'bold'); setText(doc, t.text); fitText(doc, tenant.name, x, 19, 112 - x, 14);
    doc.setFont(t.font, 'normal'); doc.setFontSize(8); setText(doc, t.muted);
    companyLines(tenant).forEach((l, i) => fitText(doc, l, x, 24.5 + i * 4.6, 112 - x, 8, { minSize: 6.5 }));
    doc.setFont(t.font, 'bold'); doc.setFontSize(labels.title.length > 10 ? 18 : 26); setText(doc, t.accent);
    doc.text(labels.title, RIGHT, 22, { align: 'right' });
    doc.setFontSize(10); setText(doc, t.text); doc.text(`N° ${inv.number}`, RIGHT, 29, { align: 'right' });
    doc.setFont(t.font, 'normal'); doc.setFontSize(8.5); setText(doc, t.muted);
    doc.text(`${labels.dateLabel} : ${inv.date}`, RIGHT, 35, { align: 'right' });
    doc.text(`${labels.dueLabel} : ${inv.dueDate}`, RIGHT, 40, { align: 'right' });
    setDraw(doc, t.accent); doc.setLineWidth(0.7); doc.line(M + 4, 50, RIGHT, 50); doc.setLineWidth(0.2);
    const p = partyInfo(c);
    doc.setFont(t.font, 'bold'); doc.setFontSize(8); setText(doc, t.accent); doc.text(labels.party, M + 4, 58);
    doc.setFontSize(11); setText(doc, t.text); doc.text(clip(p.name, 46), M + 4, 64.5);
    doc.setFont(t.font, 'normal'); doc.setFontSize(8.5); setText(doc, t.muted);
    p.lines.forEach((l, i) => doc.text(l, M + 4, 70 + i * 5));
    if (!labels.isQuote) {
      setFill(doc, t.accent2); doc.roundedRect(128, 54, 68, 18, 2, 2, 'F');
      doc.setFont(t.font, 'bold'); doc.setFontSize(7.5); setText(doc, t.accent); doc.text('STATUT', 133, 60);
      doc.setFontSize(10); setText(doc, t.text); doc.text(STATUS_LABEL[inv.status] || inv.status, 133, 67);
    }
    return 82;
  },
  pageHeader(c) {
    const { doc, tenant, inv, theme: t } = c;
    setFill(doc, t.accent); doc.rect(0, 0, 6, 297, 'F');
    doc.setFont(t.font, 'bold'); doc.setFontSize(10); setText(doc, t.text); doc.text(clip(tenant.name, 40), M + 4, 16);
    doc.setFont(t.font, 'normal'); setText(doc, t.muted); doc.text(`${c.labels.title} ${inv.number} (suite)`, RIGHT, 16, { align: 'right' });
    return 24;
  },
  tableHead(c, y) {
    const { doc, theme: t } = c;
    doc.setFont(t.font, 'bold'); doc.setFontSize(7.5); setText(doc, t.muted);
    doc.text('DÉSIGNATION', COL.desc, y + 4.5); doc.text('QTÉ', COL.qty, y + 4.5, { align: 'center' });
    doc.text('PRIX UNIT. HT', COL.unit, y + 4.5, { align: 'right' }); doc.text('TVA', COL.vat, y + 4.5, { align: 'right' }); doc.text('TOTAL HT', COL.total, y + 4.5, { align: 'right' });
    setDraw(doc, t.accent); doc.setLineWidth(0.5); doc.line(M + 4, y + 7, RIGHT, y + 7); doc.setLineWidth(0.2);
    return y + 8;
  },
  totalsStyle: 'filled',
  footer(c, page, pages) {
    const { doc, theme: t } = c;
    setDraw(doc, t.line); doc.line(M + 4, 285, RIGHT, 285);
    doc.setFont(t.font, 'normal'); doc.setFontSize(7.5); setText(doc, t.muted);
    doc.text(`${c.tenant.name} · ${c.labels.title} ${c.inv.number}`, M + 4, 291);
    doc.text(`Page ${page} / ${pages}`, RIGHT, 291, { align: 'right' });
  },
};

// ---- 3. MINIMALISTE
const minimaliste: Theme = {
  id: 'MINIMALISTE', font: 'helvetica', accent: [17, 24, 39], accent2: [229, 231, 235], text: [17, 24, 39], muted: [115, 115, 115], line: [17, 24, 39], zebra: null,
  header(c) {
    const { doc, tenant, inv, labels, theme: t } = c;
    doc.setFont(t.font, 'normal'); doc.setFontSize(24); setText(doc, t.text); doc.text(labels.title.charAt(0) + labels.title.slice(1).toLowerCase(), M, 26);
    doc.setFontSize(10); setText(doc, t.muted); doc.text(`N° ${inv.number}`, M, 33);
    const lw = drawLogo(doc, c.logo, RIGHT, 10, 30, 14, 'right');
    const top = lw ? 28 : 16;
    doc.setFont(t.font, 'bold'); setText(doc, t.text); fitText(doc, tenant.name, RIGHT, top, 110, 10.5, { align: 'right' });
    doc.setFont(t.font, 'normal'); doc.setFontSize(7.5); setText(doc, t.muted);
    companyLines(tenant).forEach((l, i) => fitText(doc, l, RIGHT, top + 5 + i * 4, 120, 7.5, { align: 'right', minSize: 6 }));
    setDraw(doc, t.line); doc.setLineWidth(0.4); doc.line(M, 48, RIGHT, 48); doc.setLineWidth(0.2);
    const metas: [string, string][] = [[labels.dateLabel, inv.date], [labels.dueLabel, inv.dueDate]];
    if (!labels.isQuote) metas.push(['Statut', STATUS_LABEL[inv.status] || inv.status]);
    metas.forEach(([k, v], i) => {
      const x = M + i * 46;
      doc.setFont(t.font, 'normal'); doc.setFontSize(7); setText(doc, t.muted); doc.text(k.toUpperCase(), x, 55);
      doc.setFont(t.font, 'bold'); doc.setFontSize(9.5); setText(doc, t.text); doc.text(v, x, 60.5);
    });
    const p = partyInfo(c);
    doc.setFont(t.font, 'normal'); doc.setFontSize(7); setText(doc, t.muted); doc.text(labels.party, 150, 55);
    doc.setFont(t.font, 'bold'); doc.setFontSize(9.5); setText(doc, t.text); doc.text(clip(p.name, 28), 150, 60.5);
    doc.setFont(t.font, 'normal'); doc.setFontSize(7.5); setText(doc, t.muted); p.lines.forEach((l, i) => doc.text(clip(l, 34), 150, 65 + i * 4));
    return 78;
  },
  pageHeader(c) {
    const { doc, tenant, inv, theme: t } = c;
    doc.setFont(t.font, 'bold'); doc.setFontSize(9.5); setText(doc, t.text); doc.text(clip(tenant.name, 40), M, 16);
    doc.setFont(t.font, 'normal'); setText(doc, t.muted); doc.text(`${c.labels.title} ${inv.number} (suite)`, RIGHT, 16, { align: 'right' });
    return 24;
  },
  tableHead(c, y) {
    const { doc, theme: t } = c;
    doc.setFont(t.font, 'bold'); doc.setFontSize(7.5); setText(doc, t.text);
    doc.text('DÉSIGNATION', M, y + 4.5); doc.text('QTÉ', COL.qty, y + 4.5, { align: 'center' });
    doc.text('PRIX UNIT.', COL.unit, y + 4.5, { align: 'right' }); doc.text('TVA', COL.vat, y + 4.5, { align: 'right' }); doc.text('TOTAL HT', RIGHT, y + 4.5, { align: 'right' });
    setDraw(doc, t.line); doc.setLineWidth(0.4); doc.line(M, y + 7, RIGHT, y + 7); doc.setLineWidth(0.2);
    return y + 8;
  },
  totalsStyle: 'plain',
  footer(c, page, pages) {
    const { doc, theme: t } = c;
    setDraw(doc, [200, 200, 200]); doc.line(M, 286, RIGHT, 286);
    doc.setFont(t.font, 'normal'); doc.setFontSize(7); setText(doc, t.muted);
    doc.text(`${c.labels.title} ${c.inv.number}`, M, 291);
    doc.text(`${page} / ${pages}`, RIGHT, 291, { align: 'right' });
  },
};

// ---- 4. ELEGANT
const elegant: Theme = {
  id: 'ELEGANT', font: 'times', accent: hex('#7C2D3A'), accent2: hex('#B08D57'), text: [38, 30, 30], muted: [110, 98, 98], line: hex('#B08D57'), zebra: null,
  header(c) {
    const { doc, tenant, inv, labels, theme: t } = c;
    const lw = drawLogo(doc, c.logo, W / 2, 9, 40, 17, 'center');
    const top = lw ? 34 : 22;
    doc.setFont(t.font, 'bold'); setText(doc, t.accent); fitText(doc, tenant.name, W / 2, top, 170, 21, { align: 'center', minSize: 12 });
    doc.setFont(t.font, 'italic'); doc.setFontSize(8.5); setText(doc, t.muted);
    companyLines(tenant).slice(1).forEach((l, i) => doc.text(clip(l, 90), W / 2, top + 6 + i * 4.4, { align: 'center' }));
    const ruleY = top + 6 + 3 * 4.4 + 2;
    setDraw(doc, t.accent2); doc.setLineWidth(0.7); doc.line(M, ruleY, RIGHT, ruleY); doc.setLineWidth(0.2); doc.line(M, ruleY + 1.4, RIGHT, ruleY + 1.4);
    doc.setFont(t.font, 'bolditalic'); doc.setFontSize(20); setText(doc, t.text);
    doc.text(labels.title.charAt(0) + labels.title.slice(1).toLowerCase(), W / 2, ruleY + 12, { align: 'center' });
    doc.setFont(t.font, 'normal'); doc.setFontSize(10); setText(doc, t.muted); doc.text(`N° ${inv.number}`, W / 2, ruleY + 18, { align: 'center' });
    const y0 = ruleY + 26;
    const p = partyInfo(c);
    setDraw(doc, t.accent2); doc.roundedRect(M, y0, 92, 25, 1, 1, 'D');
    doc.setFont(t.font, 'italic'); doc.setFontSize(8.5); setText(doc, t.accent); doc.text(labels.party.charAt(0) + labels.party.slice(1).toLowerCase(), M + 4, y0 + 6);
    doc.setFont(t.font, 'bold'); doc.setFontSize(11); setText(doc, t.text); doc.text(clip(p.name, 38), M + 4, y0 + 12.5);
    doc.setFont(t.font, 'normal'); doc.setFontSize(8.5); setText(doc, t.muted); p.lines.forEach((l, i) => doc.text(clip(l, 50), M + 4, y0 + 18 + i * 4.5));
    doc.setFontSize(9); setText(doc, t.muted);
    const meta: [string, string][] = [[labels.dateLabel, inv.date], [labels.dueLabel, inv.dueDate]];
    if (!labels.isQuote) meta.push(['Statut', STATUS_LABEL[inv.status] || inv.status]);
    meta.forEach(([k, v], i) => {
      doc.setFont(t.font, 'italic'); setText(doc, t.muted); doc.text(`${k} :`, 124, y0 + 6 + i * 7);
      doc.setFont(t.font, 'bold'); setText(doc, t.text); doc.text(v, RIGHT, y0 + 6 + i * 7, { align: 'right' });
    });
    return y0 + 33;
  },
  pageHeader(c) {
    const { doc, tenant, inv, theme: t } = c;
    doc.setFont(t.font, 'bold'); doc.setFontSize(11); setText(doc, t.accent); doc.text(clip(tenant.name, 40), M, 17);
    doc.setFont(t.font, 'italic'); doc.setFontSize(9); setText(doc, t.muted); doc.text(`${c.labels.title} ${inv.number} (suite)`, RIGHT, 17, { align: 'right' });
    setDraw(doc, t.accent2); doc.line(M, 20, RIGHT, 20);
    return 26;
  },
  tableHead(c, y) {
    const { doc, theme: t } = c;
    setDraw(doc, t.accent2); doc.setLineWidth(0.5); doc.line(M, y, RIGHT, y); doc.setLineWidth(0.2); doc.line(M, y + 8.4, RIGHT, y + 8.4);
    doc.setFont(t.font, 'bolditalic'); doc.setFontSize(9.5); setText(doc, t.accent);
    doc.text('Désignation', COL.desc, y + 5.6); doc.text('Qté', COL.qty, y + 5.6, { align: 'center' });
    doc.text('Prix unit. HT', COL.unit, y + 5.6, { align: 'right' }); doc.text('TVA', COL.vat, y + 5.6, { align: 'right' }); doc.text('Total HT', COL.total, y + 5.6, { align: 'right' });
    return y + 9;
  },
  totalsStyle: 'gold',
  footer(c, page, pages) {
    const { doc, theme: t } = c;
    setDraw(doc, t.accent2); doc.line(M, 283, RIGHT, 283);
    doc.setFont(t.font, 'italic'); doc.setFontSize(9); setText(doc, t.accent);
    doc.text(c.labels.isQuote ? 'Dans l\'attente de votre accord, nous vous remercions de votre confiance.' : 'Merci de votre confiance.', W / 2, 289, { align: 'center' });
    doc.setFontSize(7.5); setText(doc, t.muted); doc.text(`Page ${page} / ${pages}`, W / 2, 294, { align: 'center' });
  },
};

// ---- 5. CORPORATE
const corporate: Theme = {
  id: 'CORPORATE', font: 'helvetica', accent: hex('#0B2545'), accent2: hex('#F59E0B'), text: [15, 23, 42], muted: [71, 85, 105], line: [203, 213, 225], zebra: [238, 242, 247],
  header(c) {
    const { doc, tenant, inv, labels, theme: t } = c;
    setFill(doc, t.accent); doc.rect(0, 0, W, 46, 'F');
    setFill(doc, t.accent2); doc.rect(0, 46, W, 1.6, 'F');
    let x = M;
    if (c.logo) { setFill(doc, [255, 255, 255]); doc.roundedRect(M, 9, 32, 22, 1.5, 1.5, 'F'); const lw = drawLogo(doc, c.logo, M + 2, 11, 28, 18); x = M + Math.max(lw, 28) + 8; }
    doc.setFont(t.font, 'bold'); setText(doc, [255, 255, 255]); fitText(doc, tenant.name.toUpperCase(), x, 17, 140 - x, 14.5);
    doc.setFont(t.font, 'normal'); doc.setFontSize(7.8); setText(doc, [203, 213, 225]);
    companyLines(tenant).forEach((l, i) => fitText(doc, l, x, 23 + i * 4.6, 140 - x, 7.8, { minSize: 6.2 }));
    doc.setFont(t.font, 'bold'); doc.setFontSize(labels.title.length > 10 ? 15 : 21); setText(doc, t.accent2); doc.text(labels.title, RIGHT, 18, { align: 'right' });
    doc.setFontSize(10); setText(doc, [255, 255, 255]); doc.text(`N° ${inv.number}`, RIGHT, 26, { align: 'right' });
    doc.setFont(t.font, 'normal'); doc.setFontSize(8.5); setText(doc, [203, 213, 225]);
    doc.text(`${labels.dateLabel} : ${inv.date}`, RIGHT, 33, { align: 'right' });
    doc.text(`${labels.dueLabel} : ${inv.dueDate}`, RIGHT, 38.5, { align: 'right' });
    const p = partyInfo(c);
    setFill(doc, [241, 245, 249]); doc.rect(M, 56, 100, 24, 'F');
    setFill(doc, t.accent2); doc.rect(M, 56, 1.8, 24, 'F');
    doc.setFont(t.font, 'bold'); doc.setFontSize(7.5); setText(doc, t.accent); doc.text(labels.party, M + 6, 62);
    doc.setFontSize(10.5); setText(doc, t.text); doc.text(clip(p.name, 38), M + 6, 68);
    doc.setFont(t.font, 'normal'); doc.setFontSize(8); setText(doc, t.muted); p.lines.forEach((l, i) => doc.text(clip(l, 54), M + 6, 73 + i * 4.5));
    if (!labels.isQuote) {
      doc.setFont(t.font, 'bold'); doc.setFontSize(7.5); setText(doc, t.accent); doc.text('STATUT DU DOCUMENT', 128, 62);
      doc.setFontSize(11); setText(doc, t.text); doc.text(STATUS_LABEL[inv.status] || inv.status, 128, 69);
    }
    return 88;
  },
  pageHeader(c) {
    const { doc, tenant, inv, theme: t } = c;
    setFill(doc, t.accent); doc.rect(0, 0, W, 16, 'F'); setFill(doc, t.accent2); doc.rect(0, 16, W, 1.2, 'F');
    doc.setFont(t.font, 'bold'); doc.setFontSize(10); setText(doc, [255, 255, 255]); doc.text(clip(tenant.name.toUpperCase(), 40), M, 10.5);
    doc.setFont(t.font, 'normal'); doc.text(`${c.labels.title} ${inv.number} (suite)`, RIGHT, 10.5, { align: 'right' });
    return 25;
  },
  tableHead(c, y) {
    const { doc, theme: t } = c;
    setFill(doc, t.accent); doc.rect(M, y, 182, 8, 'F');
    doc.setFont(t.font, 'bold'); doc.setFontSize(8); setText(doc, [255, 255, 255]);
    doc.text('DÉSIGNATION', COL.desc, y + 5.5); doc.text('QTÉ', COL.qty, y + 5.5, { align: 'center' });
    doc.text('PRIX UNIT. HT', COL.unit, y + 5.5, { align: 'right' }); doc.text('TVA', COL.vat, y + 5.5, { align: 'right' }); doc.text('TOTAL HT', COL.total, y + 5.5, { align: 'right' });
    return y + 8;
  },
  totalsStyle: 'navy',
  footer(c, page, pages) {
    const { doc, theme: t } = c;
    setFill(doc, t.accent); doc.rect(0, 284, W, 13, 'F'); setFill(doc, t.accent2); doc.rect(0, 284, W, 1, 'F');
    doc.setFont(t.font, 'normal'); doc.setFontSize(7.5); setText(doc, [203, 213, 225]);
    doc.text(`${c.tenant.name} · ${[c.tenant.phone, c.tenant.email].filter(Boolean).join(' · ')}`, M, 292);
    doc.text(`Page ${page} / ${pages}`, RIGHT, 292, { align: 'right' });
  },
};

const THEMES: Record<InvoiceTemplateId, Theme> = { CLASSIQUE: classique, MODERNE: moderne, MINIMALISTE: minimaliste, ELEGANT: elegant, CORPORATE: corporate };

// ----------------------------------------------------------------------------- Corps commun

function drawItems(c: Ctx): void {
  const { doc, inv, theme: t } = c;
  const descX = t.id === 'MINIMALISTE' ? M : COL.desc;
  const totalX = t.id === 'MINIMALISTE' ? RIGHT : COL.total;
  let y = t.tableHead(c, c.y);
  doc.setFont(t.font, 'normal'); doc.setFontSize(8.5);

  inv.items.forEach((item, index) => {
    const lines = doc.splitTextToSize(item.description || '-', 84) as string[];
    const shown = lines.slice(0, 3);
    const rowH = Math.max(7.5, shown.length * 4 + 3.5);
    if (y + rowH > PAGE_BOTTOM) {
      doc.addPage();
      y = t.tableHead(c, t.pageHeader(c));
      doc.setFont(t.font, 'normal'); doc.setFontSize(8.5);
    }
    if (t.zebra && index % 2 === 1) { setFill(doc, t.zebra); doc.rect(M, y, 182, rowH, 'F'); }
    setDraw(doc, t.id === 'ELEGANT' ? [226, 220, 210] : t.id === 'MINIMALISTE' ? [220, 220, 220] : t.line);
    doc.line(M, y + rowH, RIGHT, y + rowH);
    doc.setFont(t.font, 'normal'); setText(doc, t.text);
    doc.text(shown, descX, y + 5);
    doc.text(String(item.quantity), COL.qty, y + 5, { align: 'center' });
    doc.text(c.money(item.unitPriceHT), COL.unit, y + 5, { align: 'right' });
    doc.text(`${item.vatRate} %`, COL.vat, y + 5, { align: 'right' });
    doc.setFont(t.font, 'bold'); doc.text(c.money(item.totalHT), totalX, y + 5, { align: 'right' });
    y += rowH;
  });
  c.y = y + 6;
}

/** TVA ventilée par taux : base HT et montant de TVA. */
function vatBreakdown(inv: Invoice): { rate: number; base: number; vat: number }[] {
  const map = new Map<number, { base: number; vat: number }>();
  for (const it of inv.items) {
    const e = map.get(it.vatRate) || { base: 0, vat: 0 };
    e.base += it.totalHT; e.vat += it.totalVAT;
    map.set(it.vatRate, e);
  }
  return [...map.entries()].sort((a, b) => b[0] - a[0]).map(([rate, v]) => ({ rate, ...v }));
}

function drawTotals(c: Ctx): void {
  const { doc, inv, theme: t, labels } = c;
  const vats = vatBreakdown(inv).filter(v => v.vat !== 0 || inv.items.length === 1);
  const rows: [string, string][] = [['Sous-total HT', c.money(inv.subtotalHT)]];
  if (inv.discountAmount > 0) rows.push(['Remise commerciale', `-${c.money(inv.discountAmount)}`]);
  vats.forEach(v => rows.push([`TVA ${v.rate} %`, c.money(v.vat)]));
  if (vats.length === 0) rows.push(['TVA', c.money(inv.totalVAT)]);
  const settle: [string, string][] = [];
  if (!labels.isQuote && !labels.isCredit && inv.paidAmount > 0) settle.push(['Déjà réglé', c.money(inv.paidAmount)]);
  if (!labels.isQuote && !labels.isCredit) settle.push(['Reste à régler', c.money(inv.remainingAmount)]);

  const boxW = 86, x = RIGHT - boxW;
  const height = 8 + rows.length * 6 + 14 + settle.length * 6;
  if (c.y + height + 52 > PAGE_BOTTOM + 8) { doc.addPage(); c.y = t.pageHeader(c); }
  const y0 = c.y;

  // Fond du bloc selon le modèle
  if (t.totalsStyle === 'box') { setFill(doc, [248, 250, 252]); setDraw(doc, t.line); doc.roundedRect(x, y0, boxW, height, 2, 2, 'FD'); }
  if (t.totalsStyle === 'filled') { setFill(doc, t.accent2); doc.roundedRect(x, y0, boxW, height, 2.5, 2.5, 'F'); }
  if (t.totalsStyle === 'navy') { setFill(doc, [241, 245, 249]); doc.rect(x, y0, boxW, height, 'F'); }

  let y = y0 + 7;
  doc.setFont(t.font, 'normal'); doc.setFontSize(8.5); setText(doc, t.totalsStyle === 'filled' ? [51, 65, 85] : t.muted);
  rows.forEach(([k, v]) => { doc.text(k, x + 5, y); doc.text(v, RIGHT - 5, y, { align: 'right' }); y += 6; });

  // Ligne TOTAL TTC
  const label = labels.isCredit ? 'TOTAL AVOIR TTC' : 'TOTAL TTC';
  if (t.totalsStyle === 'navy') {
    setFill(doc, t.accent); doc.rect(x, y - 3, boxW, 11, 'F');
    doc.setFont(t.font, 'bold'); doc.setFontSize(10.5); setText(doc, [255, 255, 255]);
  } else if (t.totalsStyle === 'filled') {
    setFill(doc, t.accent); doc.roundedRect(x + 2, y - 3, boxW - 4, 11, 2, 2, 'F');
    doc.setFont(t.font, 'bold'); doc.setFontSize(10.5); setText(doc, [255, 255, 255]);
  } else {
    setDraw(doc, t.totalsStyle === 'gold' ? t.accent2 : t.totalsStyle === 'plain' ? t.line : [203, 213, 225]);
    doc.setLineWidth(t.totalsStyle === 'plain' ? 0.4 : 0.3); doc.line(x + 4, y - 3.5, RIGHT - 4, y - 3.5); doc.setLineWidth(0.2);
    doc.setFont(t.font, 'bold'); doc.setFontSize(t.totalsStyle === 'gold' ? 12 : 10.5); setText(doc, t.totalsStyle === 'plain' ? t.text : t.accent);
  }
  doc.text(label, x + 5, y + 4); doc.text(c.money(inv.totalTTC), RIGHT - 5, y + 4, { align: 'right' });
  y += 14;

  settle.forEach(([k, v], i) => {
    doc.setFont(t.font, i === settle.length - 1 ? 'bold' : 'normal'); doc.setFontSize(8.5);
    setText(doc, t.totalsStyle === 'filled' ? [30, 41, 59] : i === settle.length - 1 ? t.text : t.muted);
    doc.text(k, x + 5, y); doc.text(v, RIGHT - 5, y, { align: 'right' }); y += 6;
  });

  // Colonne de gauche : montant en lettres, notes et mentions
  let ly = y0 + 4;
  doc.setFont(t.font, 'bold'); doc.setFontSize(8); setText(doc, t.muted);
  doc.text(labels.isQuote ? 'Montant du devis en toutes lettres :' : 'Arrêté le présent document à la somme de :', M, ly);
  doc.setFont(t.font, t.font === 'times' ? 'italic' : 'normal'); doc.setFontSize(8.5); setText(doc, t.text);
  const words = doc.splitTextToSize(`${amountInWords(inv.totalTTC, inv.currency)} (TTC).`, boxW + 10) as string[];
  doc.text(words, M, ly + 5); ly += 5 + words.length * 4.2 + 3;
  doc.setFont(t.font, 'normal'); doc.setFontSize(7.8); setText(doc, t.muted);
  const mentions = labels.isQuote
    ? [`Devis valable jusqu'au ${inv.dueDate}.`, 'Acompte à la commande selon accord entre les parties.']
    : labels.isCredit ? ['Avoir à déduire de vos prochains règlements.'] : ['Paiements acceptés : Wave, Orange Money, MTN MoMo, chèque ou virement.', 'Pénalités de retard exigibles selon les conditions convenues.'];
  mentions.forEach(m => { const ml = doc.splitTextToSize(m, 92) as string[]; doc.text(ml, M, ly); ly += ml.length * 3.8 + 1.2; });
  if (inv.notes) {
    ly += 2;
    doc.setFont(t.font, 'bold'); doc.text('Notes :', M, ly); ly += 4.2;
    doc.setFont(t.font, 'normal'); const nl = (doc.splitTextToSize(inv.notes, 92) as string[]).slice(0, 5); doc.text(nl, M, ly); ly += nl.length * 4;
  }

  c.y = Math.max(y, ly) + 8;
}

function drawSignatures(c: Ctx): void {
  const { doc, theme: t, labels } = c;
  if (c.y + 30 > PAGE_BOTTOM + 8) { doc.addPage(); c.y = t.pageHeader(c); }
  const y = c.y;
  const boxes = labels.isQuote
    ? [{ x: M, label: 'Bon pour accord (le client)', sub: 'Date, nom, signature et cachet' }, { x: 108, label: `Le fournisseur`, sub: 'Cachet commercial & direction' }]
    : [{ x: 108, label: 'Pour acquit et signature autorisée', sub: 'Cachet commercial & direction' }];
  setDraw(doc, t.id === 'ELEGANT' ? t.accent2 : t.id === 'MINIMALISTE' ? [190, 190, 190] : t.line);
  boxes.forEach(b => {
    doc.roundedRect(b.x, y, 88, 26, 1.5, 1.5, 'D');
    doc.setFont(t.font, 'bold'); doc.setFontSize(8); setText(doc, t.muted); doc.text(b.label, b.x + 4, y + 6);
    doc.setFont(t.font, 'italic'); doc.setFontSize(7.2); doc.text(b.sub, b.x + 4, y + 11);
  });
  c.y = y + 30;
}

// ----------------------------------------------------------------------------- API publique

export interface RenderOptions { templateId?: InvoiceTemplateId }

export function fileNameFor(inv: Invoice): string {
  return `${labelsFor(inv).title.replace(/\s+/g, '_')}_${inv.number}.pdf`;
}

/** Génère le PDF d'une facture / d'un devis / d'un avoir / d'un bon de commande avec le modèle demandé. */
export async function renderInvoicePdf(invoice: Invoice, tenant: Tenant, options: RenderOptions = {}): Promise<jsPDF> {
  const templateId = options.templateId || tenant.invoiceTemplate || 'CLASSIQUE';
  const theme = THEMES[templateId] || THEMES.CLASSIQUE;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setLineWidth(0.2);
  const ctx: Ctx = {
    doc, inv: invoice, tenant, theme, labels: labelsFor(invoice), y: 0,
    logo: await loadLogo(doc, tenant.logoUrl),
    money: n => formatMoney(n, invoice.currency),
  };
  ctx.y = theme.header(ctx);
  drawItems(ctx);
  drawTotals(ctx);
  drawSignatures(ctx);

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) { doc.setPage(p); theme.footer(ctx, p, pages); }
  doc.setProperties({ title: `${ctx.labels.title} ${invoice.number}`, creator: 'GSPME-ERP', subject: tenant.name });
  return doc;
}

/** Facture fictive pour l'aperçu des modèles. */
export function sampleInvoice(tenant: Tenant, type: Invoice['type'] = 'FACTURE_VENTE'): Invoice {
  const mk = (id: string, description: string, quantity: number, unit: number, vatRate = 18) => {
    const ht = quantity * unit;
    const vat = Math.round(ht * vatRate / 100);
    return { id, description, quantity, unitPriceHT: unit, vatRate, totalHT: ht, totalVAT: vat, totalTTC: ht + vat };
  };
  const items = [
    mk('1', 'Prestation de conseil et paramétrage du logiciel de gestion', 1, 250000),
    mk('2', 'Formation de l\'équipe (2 demi-journées)', 2, 75000),
    mk('3', 'Licence annuelle GSPME Business', 1, 75000),
    mk('4', 'Fournitures : rouleaux de caisse thermique', 20, 1500),
  ];
  const subtotal = items.reduce((s, i) => s + i.totalHT, 0);
  const vat = items.reduce((s, i) => s + i.totalVAT, 0);
  const isQuote = type === 'DEVIS_PROFORMA';
  return {
    id: 'sample', tenantId: tenant.id, branchId: tenant.currentBranchId, number: isQuote ? 'DEV-2026-0012' : 'FAC-2026-0042', type,
    customerId: 'cus-demo', customerName: 'Société Exemple SARL', customerTaxNumber: 'NINEA 123 456 789',
    date: '2026-10-24', dueDate: isQuote ? '2026-11-24' : '2026-11-23', status: isQuote ? 'BROUILLON' : 'PARTIELLE',
    items, subtotalHT: subtotal, totalVAT: vat, discountAmount: 0, totalTTC: subtotal + vat, paidAmount: isQuote ? 0 : 200000,
    remainingAmount: isQuote ? subtotal + vat : subtotal + vat - 200000, currency: tenant.currency || 'XOF',
    notes: isQuote ? 'Devis établi sur la base des informations transmises par le client.' : 'Merci de rappeler le numéro de document lors du règlement.', paymentMethod: 'Wave / Virement', accountingEntryGenerated: false,
  };
}
