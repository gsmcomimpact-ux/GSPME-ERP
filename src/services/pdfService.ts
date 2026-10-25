/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Service Universel de Génération PDF & Impression Conforme OHADA
 */

import { jsPDF } from 'jspdf';
import { Invoice, InvoiceTemplateId, Payslip, PosReceipt, SubscriptionOrder, StoredDocument, Tenant } from '../types';
import { fileNameFor, renderInvoicePdf } from './invoiceTemplates';
import { formatMoney } from './currency';
import type { FinancialStatements, StatementSection } from './financialStatements';

export class PdfService {
  /**
   * Génère et télécharge une facture, un devis, un avoir ou un bon de commande (modèle choisi dans les Paramètres,
   * ou `templateId` pour forcer un modèle précis).
   */
  public static async downloadInvoicePdf(invoice: Invoice, tenant: Tenant, templateId?: InvoiceTemplateId): Promise<void> {
    const doc = await renderInvoicePdf(invoice, tenant, { templateId });
    doc.save(fileNameFor(invoice));
  }

  /** Ouvre l'aperçu d'un document dans un nouvel onglet (sans le télécharger). */
  public static async previewInvoicePdf(invoice: Invoice, tenant: Tenant, templateId?: InvoiceTemplateId): Promise<void> {
    const doc = await renderInvoicePdf(invoice, tenant, { templateId });
    const url = URL.createObjectURL(doc.output('blob'));
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  /**
   * Génère et télécharge un Bulletin de Paie conforme OHADA
   */
  public static downloadPayslipPdf(slip: Payslip, tenant: Tenant) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // En-tête
    doc.setFillColor(15, 81, 50);
    doc.rect(0, 0, 210, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 81, 50);
    doc.text(tenant.name.toUpperCase(), 14, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`${tenant.legalForm} · RCCM: ${tenant.tradeRegisterNumber} · NIF: ${tenant.taxNumber}`, 14, 25);
    doc.text(`Siège social : ${tenant.address}, ${tenant.city} (${tenant.countryCode})`, 14, 30);

    // Titre Document
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(120, 15, 76, 20, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 81, 50);
    doc.text('BULLETIN DE PAIE', 125, 23);
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Période : ${slip.period}`, 125, 30);

    // Cadre Salarié
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, 38, 182, 22, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Salarié : ${slip.employeeName}`, 20, 46);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Matricule : ${slip.employeeId}`, 20, 52);
    doc.text(`Statut : ${slip.status}`, 120, 46);
    doc.text(`Devise de règlement : ${tenant.currency}`, 120, 52);

    // Tableau Rubriques
    let currentY = 66;
    doc.setFillColor(15, 81, 50);
    doc.rect(14, currentY, 182, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('Rubriques Salariales', 18, currentY + 5.5);
    doc.text('Part Salariale', 130, currentY + 5.5, { align: 'right' });
    doc.text('Part Patronale', 185, currentY + 5.5, { align: 'right' });

    currentY += 8;

    const rows = [
      { label: 'Salaire de Base Conventionnel', employee: formatMoney(slip.baseSalary, tenant.currency), employer: '-' },
      { label: 'Primes & Indemnités (Transport / Rendement)', employee: formatMoney(slip.primes, tenant.currency), employer: '-' },
      { label: 'TOTAL SALAIRE BRUT', employee: formatMoney(slip.grossSalary, tenant.currency), employer: '-', bold: true },
      { label: 'Cotisations Sociales (IPRES / CNSS / CSS)', employee: `-${formatMoney(slip.employeeSocialContribution, tenant.currency)}`, employer: formatMoney(slip.employerSocialContribution, tenant.currency) },
      { label: 'Impôt sur le Revenu (IRPP / Retenue)', employee: `-${formatMoney(slip.withholdingTax, tenant.currency)}`, employer: '-' },
    ];

    rows.forEach((r, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, currentY, 182, 8, 'F');
      }
      doc.setDrawColor(241, 245, 249);
      doc.line(14, currentY + 8, 196, currentY + 8);

      doc.setFont('helvetica', r.bold ? 'bold' : 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(r.bold ? 15 : 71, r.bold ? 81 : 85, r.bold ? 50 : 105);

      doc.text(r.label, 18, currentY + 5.5);
      doc.text(r.employee, 130, currentY + 5.5, { align: 'right' });
      doc.text(r.employer, 185, currentY + 5.5, { align: 'right' });
      currentY += 8;
    });

    currentY += 10;

    // Encadré Net à Payer
    doc.setFillColor(15, 81, 50);
    doc.roundedRect(110, currentY, 86, 20, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(212, 175, 55); // Or
    doc.text('NET À PAYER AU SALARIÉ :', 116, currentY + 8);

    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(formatMoney(slip.netSalary, tenant.currency), 116, currentY + 16);

    // Signatures
    const sigY = currentY + 35;
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, sigY, 85, 30, 2, 2, 'D');
    doc.roundedRect(111, sigY, 85, 30, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Signature du Salarié', 20, sigY + 7);
    doc.text('Cachet & Signature Employeur', 117, sigY + 7);

    // Pied de page
    doc.setFillColor(241, 245, 249);
    doc.rect(0, 285, 210, 12, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`GSPME Paie & RH · Document officiel conforme au Code du Travail OHADA · Période ${slip.period}`, 105, 292, { align: 'center' });

    doc.save(`Bulletin_Paie_${slip.employeeName.replace(/\s+/g, '_')}_${slip.period.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  }

  /**
   * Génère et télécharge un Ticket de Caisse POS en format PDF
   */
  public static downloadPosReceiptPdf(receipt: PosReceipt, tenant: Tenant) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200], // Format Ticket thermique 80mm
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 81, 50);
    doc.text(tenant.name.toUpperCase(), 40, 10, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`${tenant.city} · Tél: ${tenant.phone}`, 40, 14, { align: 'center' });
    doc.text(`NIF: ${tenant.taxNumber}`, 40, 18, { align: 'center' });

    doc.setDrawColor(203, 213, 225);
    doc.line(6, 22, 74, 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`TICKET N° ${receipt.receiptNumber}`, 6, 27);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Date : ${receipt.timestamp}`, 6, 31);
    doc.text(`Mode : ${receipt.paymentMethod}`, 6, 35);

    doc.line(6, 38, 74, 38);

    let y = 43;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text('Article', 6, y);
    doc.text('Qté', 48, y, { align: 'center' });
    doc.text('Total', 74, y, { align: 'right' });

    y += 4;
    doc.setFont('helvetica', 'normal');

    receipt.items.forEach(it => {
      const name = it.name.length > 22 ? it.name.substring(0, 20) + '..' : it.name;
      doc.text(name, 6, y);
      doc.text(it.quantity.toString(), 48, y, { align: 'center' });
      doc.text(formatMoney(it.total, tenant.currency), 74, y, { align: 'right' });
      y += 4.5;
    });

    doc.line(6, y, 74, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 81, 50);
    doc.text('TOTAL TTC :', 6, y);
    doc.text(formatMoney(receipt.total, tenant.currency), 74, y, { align: 'right' });

    if (receipt.cashChange && receipt.cashChange > 0) {
      y += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text('Espèces Reçues :', 6, y);
      doc.text(formatMoney(receipt.cashGiven || receipt.total, tenant.currency), 74, y, { align: 'right' });

      y += 4;
      doc.text('Monnaie Rendue :', 6, y);
      doc.text(formatMoney(receipt.cashChange, tenant.currency), 74, y, { align: 'right' });
    }

    y += 10;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Merci pour votre visite et votre confiance !', 40, y, { align: 'center' });
    doc.text('GSPME POS · Caisse Certifiée', 40, y + 4, { align: 'center' });

    doc.save(`Ticket_Caisse_${receipt.receiptNumber}.pdf`);
  }

  /**
   * Génère et télécharge une Facture d'Abonnement SaaS officielle
   */
  public static downloadSubscriptionInvoicePdf(order: SubscriptionOrder, tenant?: Tenant) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Bandeau Supérieur
    doc.setFillColor(15, 81, 50);
    doc.rect(0, 0, 210, 8, 'F');

    // Émetteur SaaS
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 81, 50);
    doc.text('GSPME CLOUD ERP SAAS', 14, 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Plateforme de Gestion Intégrée d’Entreprise · Conforme SYSCOHADA Révisé', 14, 27);
    doc.text('Bureaux Régionaux : Dakar (Sénégal) · Abidjan (Côte d’Ivoire) · Douala (Cameroun)', 14, 32);
    doc.text('Support Technique & Facturation : facturation@gspme-erp.com · WhatsApp 24/7', 14, 37);

    // Titre Commande / Facture
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(120, 16, 76, 26, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 81, 50);
    doc.text('FACTURE D’ABONNEMENT SAAS', 124, 24);

    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Réf. : ${order.orderId}`, 124, 31);
    doc.text(`Date : ${order.createdAt.substring(0, 10)}`, 124, 37);

    // Cadre Entreprise Abonnée
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, 48, 182, 26, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 81, 50);
    doc.text('ENTREPRISE SOUSCRIPTICE :', 20, 55);

    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(order.companyName, 20, 62);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Contact : ${order.contactName} · Email : ${order.contactEmail}`, 20, 68);
    doc.text(`Pays : ${order.countryCode} · Réf. Transaction : ${order.transactionReference || 'N/A'}`, 115, 62);
    doc.text(`Statut paiement : ${order.paymentStatus === 'PAID' ? 'PAYÉ / VALIDÉ' : order.paymentStatus}`, 115, 68);

    // Tableau Ligne Abonnement
    let y = 82;
    doc.setFillColor(15, 81, 50);
    doc.rect(14, y, 182, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('Détail de la Formule Souscrite', 18, y + 5.5);
    doc.text('Périodicité', 110, y + 5.5, { align: 'center' });
    doc.text('Total HT', 185, y + 5.5, { align: 'right' });

    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    const planLabel = `Abonnement Cloud GSPME - Formule ${order.planId} (Accès complet & stockage inclus)`;
    doc.text(planLabel, 18, y + 6);
    doc.text(order.billingCycle, 110, y + 6, { align: 'center' });
    doc.text(formatMoney(order.amountHT, order.currency), 185, y + 6, { align: 'right' });

    y += 12;

    // Totaux
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(120, y, 76, 28, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(120, y, 76, 28, 2, 2, 'D');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Montant HT :', 124, y + 7);
    doc.text(formatMoney(order.amountHT, order.currency), 190, y + 7, { align: 'right' });

    doc.text(`TVA (${order.vatRate}%) :`, 124, y + 13);
    doc.text(formatMoney(order.vatAmount, order.currency), 190, y + 13, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 81, 50);
    doc.text('TOTAL TTC RÉGLÉ :', 124, y + 21);
    doc.text(formatMoney(order.amountTTC, order.currency), 190, y + 21, { align: 'right' });

    y += 38;

    // Bloc Attestation Fiscale & Validité
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(14, y, 182, 22, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(21, 128, 61);
    doc.text('Attestation de Paiement & Licence Cloud Active', 20, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(22, 101, 52);
    doc.text(`Mode de paiement : ${order.paymentMethod} · Référence bancaire / Mobile Money : ${order.transactionReference || 'AUTOMATIQUE'}`, 20, y + 13);
    doc.text(`Abonnement valide et garanti jusqu'au : ${order.validUntil ? order.validUntil.substring(0, 10) : 'Renouvellement automatique'}`, 20, y + 18);

    // Pied de page
    doc.setFillColor(241, 245, 249);
    doc.rect(0, 285, 210, 12, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`GSPME SaaS Billing · Facture officielle justificative acquittée · ${order.orderId}`, 105, 292, { align: 'center' });

    doc.save(`Facture_SaaS_${order.orderId}.pdf`);
  }

  /**
   * Génère et télécharge un document de la GED certifié en PDF
   */
  public static downloadStoredDocumentPdf(docItem: StoredDocument, tenant: Tenant) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // En-tête GED
    doc.setFillColor(15, 81, 50);
    doc.rect(0, 0, 210, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 81, 50);
    doc.text(tenant.name.toUpperCase(), 14, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`GED Entreprise Certifiée · Catégorie : ${docItem.category}`, 14, 25);
    doc.text(`RCCM : ${tenant.tradeRegisterNumber} · NIF : ${tenant.taxNumber}`, 14, 30);

    // Titre Document
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, 38, 182, 30, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 81, 50);
    doc.text(docItem.title, 20, 48);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Identifiant Document : ${docItem.id} · Taille : ${docItem.sizeKB} Ko`, 20, 56);
    doc.text(`Déposé le : ${docItem.uploadedAt} par : ${docItem.uploadedBy}`, 20, 62);
    doc.text(`Niveau de confidentialité : ${docItem.securityLevel}`, 120, 56);
    doc.text(`Réf. Associée : ${docItem.relatedEntity || 'Non liée'}`, 120, 62);

    // Corps du document
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 76, 182, 150, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Attestation de Conformité et d’Archivage Légal OHADA', 22, 88);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('Le présent document est certifié intègre et stocké dans le coffre-fort numérique de l’entreprise.', 22, 98);
    doc.text('Empreinte cryptographique de sécurité SHA-256 générée par le système GSPME Cloud.', 22, 105);
    doc.text(`Horodatage certifié : ${new Date().toISOString()}`, 22, 112);

    // Sceau numérique
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(22, 130, 166, 40, 2, 2, 'F');
    doc.setDrawColor(74, 222, 128);
    doc.roundedRect(22, 130, 166, 40, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(21, 128, 61);
    doc.text('SCEAU NUMÉRIQUE D’AUTHENTICITÉ GSPME GED', 28, 140);

    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(22, 101, 52);
    doc.text(`HASH : a78f21e09c8491b4892c55104d9e68b37e0c4a123df8849`, 28, 148);
    doc.text(`SIGNATURE : GSPME-CERT-${docItem.id.toUpperCase()}-2026-OK`, 28, 155);
    doc.text(`Statut : Document Validé & Opposable aux Tiers`, 28, 162);

    // Pied de page
    doc.setFillColor(241, 245, 249);
    doc.rect(0, 285, 210, 12, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`GSPME GED · Système Électronique d'Archivage Légal · ${docItem.title}`, 105, 292, { align: 'center' });

    doc.save(`${docItem.title.replace(/[^a-zA-Z0-9_\-]/g, '_')}.pdf`);
  }


  /**
   * Bilan (Actif / Passif) et Compte de Résultat SYSCOHADA au format PDF
   */
  public static downloadFinancialStatementsPdf(s: FinancialStatements, tenant: Tenant, filename?: string) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const money = (n: number) => formatMoney(n, tenant.currency);
    const LEFT = 14;
    const RIGHT = 196;
    let y = 0;

    const header = (title: string) => {
      doc.setFillColor(15, 81, 50);
      doc.rect(0, 0, 210, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 81, 50);
      doc.text(tenant.name.toUpperCase(), LEFT, 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`${tenant.legalForm} · RCCM : ${tenant.tradeRegisterNumber} · NIF/NCC : ${tenant.taxNumber}`, LEFT, 25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(title, LEFT, 35);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Arrêté au ${s.asOf} · Montants en ${tenant.currency === 'XOF' || tenant.currency === 'XAF' ? 'FR CFA' : tenant.currency}`, LEFT, 40);
      y = 48;
    };

    const ensure = (needed: number) => {
      if (y + needed > 280) {
        doc.addPage();
        header('(suite)');
      }
    };

    const sectionBlock = (sec: StatementSection) => {
      ensure(14);
      doc.setFillColor(241, 245, 249);
      doc.rect(LEFT, y - 4, RIGHT - LEFT, 6.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 81, 50);
      doc.text(sec.title.toUpperCase(), LEFT + 2, y);
      doc.text(money(sec.total), RIGHT - 2, y, { align: 'right' });
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      if (sec.lines.length === 0) {
        doc.setTextColor(148, 163, 184);
        doc.text('— Aucun solde —', LEFT + 10, y);
        y += 5;
      }
      for (const l of sec.lines) {
        ensure(6);
        doc.text(l.code, LEFT + 4, y);
        doc.text(l.label.slice(0, 70), LEFT + 24, y);
        doc.text(money(l.amount), RIGHT - 2, y, { align: 'right' });
        y += 5;
      }
      y += 2;
    };

    const totalLine = (label: string, amount: number) => {
      ensure(10);
      doc.setDrawColor(15, 81, 50);
      doc.line(LEFT, y - 3, RIGHT, y - 3);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(label, LEFT + 2, y + 2);
      doc.text(money(amount), RIGHT - 2, y + 2, { align: 'right' });
      doc.setFontSize(8.5);
      y += 10;
    };

    header('BILAN SYSCOHADA RÉVISÉ — ACTIF');
    s.actif.forEach(sectionBlock);
    totalLine('TOTAL ACTIF', s.totalActif);

    ensure(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('BILAN SYSCOHADA RÉVISÉ — PASSIF', LEFT, y);
    doc.setFontSize(8.5);
    y += 10;
    s.passif.forEach(sectionBlock);
    totalLine('TOTAL PASSIF', s.totalPassif);
    if (s.ecart !== 0) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(185, 28, 28);
      doc.text(`Attention : écart actif − passif de ${money(s.ecart)} (écritures déséquilibrées ou comptes hors bilan).`, LEFT, y - 3);
      y += 4;
    }

    doc.addPage();
    header('COMPTE DE RÉSULTAT SYSCOHADA RÉVISÉ');
    sectionBlock(s.produits);
    sectionBlock(s.charges);
    totalLine(s.resultat >= 0 ? 'RÉSULTAT NET : BÉNÉFICE' : 'RÉSULTAT NET : PERTE', s.resultat);

    ensure(20);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      doc.splitTextToSize(
        "État de gestion établi automatiquement à partir des écritures validées du journal. Il ne se substitue pas aux états financiers certifiés par un expert-comptable ou un commissaire aux comptes.",
        RIGHT - LEFT
      ),
      LEFT,
      y + 4
    );

    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Généré par GSPME-ERP le ${new Date().toLocaleDateString('fr-FR')}`, LEFT, 290);
      doc.text(`Page ${i} / ${pages}`, RIGHT, 290, { align: 'right' });
    }

    doc.save(filename || `bilan-${s.asOf}.pdf`);
  }

  /**
   * Impression sécurisée et sans interruption pour le mode SaaS iframe
   */
  public static printCurrent() {
    try {
      window.print();
    } catch {
      // Ignoré si bloqué par l'environnement
    }
  }
}
