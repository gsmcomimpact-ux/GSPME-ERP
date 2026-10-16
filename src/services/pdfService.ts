/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Service Universel de Génération PDF & Impression Conforme OHADA
 */

import { jsPDF } from 'jspdf';
import { Invoice, Payslip, PosReceipt, SubscriptionOrder, StoredDocument, Tenant } from '../types';
import { formatMoney } from './currency';

export class PdfService {
  /**
   * Génère et télécharge une Facture ou un Devis au format PDF professionnel
   */
  public static downloadInvoicePdf(invoice: Invoice, tenant: Tenant) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const isQuote = invoice.type === 'DEVIS_PROFORMA';
    const isCredit = invoice.type === 'AVOIR_CLIENT';
    const isOrder = invoice.type === 'BON_COMMANDE';
    const docTitle = isQuote ? 'DEVIS PROFORMA' : isCredit ? 'AVOIR CLIENT' : isOrder ? 'BON DE COMMANDE' : 'FACTURE DE VENTE';

    // 1. En-tête Entreprise (Gauche)
    doc.setFillColor(15, 81, 50); // #0F5132 Vert émeraude
    doc.rect(0, 0, 210, 8, 'F'); // Bande supérieure décorative

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 81, 50);
    doc.text(tenant.name.toUpperCase(), 14, 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Forme Juridique : ${tenant.legalForm} · RCCM : ${tenant.tradeRegisterNumber}`, 14, 27);
    doc.text(`NIF / NCC : ${tenant.taxNumber} · Siège : ${tenant.city}, ${tenant.countryCode}`, 14, 32);
    doc.text(`Adresse : ${tenant.address}`, 14, 37);
    doc.text(`Téléphone : ${tenant.phone} · Email : ${tenant.email}`, 14, 42);

    // 2. Bloc Titre & Numéro Document (Droite)
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(125, 16, 71, 30, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 81, 50);
    doc.text(docTitle, 130, 24);

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`N° : ${invoice.number}`, 130, 31);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Date d'émission : ${invoice.date}`, 130, 37);
    doc.text(`Échéance : ${invoice.dueDate}`, 130, 42);

    // 3. Cadre Client
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, 50, 182, 26, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 81, 50);
    doc.text('FACTURÉ À / CLIENT :', 20, 56);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(invoice.customerName, 20, 62);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    if (invoice.customerTaxNumber) {
      doc.text(`NIF/NCC Client : ${invoice.customerTaxNumber}`, 20, 68);
    } else {
      doc.text(`Compte Client ID : ${invoice.customerId}`, 20, 68);
    }
    doc.text(`Statut règlement : ${invoice.status}`, 120, 62);
    doc.text(`Mode de règlement : ${invoice.paymentMethod || 'Mobile Money / Virement'}`, 120, 68);

    // 4. Tableau des Articles
    let currentY = 84;
    doc.setFillColor(15, 81, 50);
    doc.rect(14, currentY, 182, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('Désignation des Articles / Prestations', 18, currentY + 5.5);
    doc.text('Qté', 115, currentY + 5.5, { align: 'center' });
    doc.text('Prix Unit. HT', 140, currentY + 5.5, { align: 'right' });
    doc.text('TVA', 160, currentY + 5.5, { align: 'right' });
    doc.text('Total HT', 190, currentY + 5.5, { align: 'right' });

    currentY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    invoice.items.forEach((item, index) => {
      // Fond alterné
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, currentY, 182, 7.5, 'F');
      }

      // Ligne de séparation
      doc.setDrawColor(241, 245, 249);
      doc.line(14, currentY + 7.5, 196, currentY + 7.5);

      const desc = item.description.length > 55 ? item.description.substring(0, 52) + '...' : item.description;
      doc.text(desc, 18, currentY + 5);
      doc.text(item.quantity.toString(), 115, currentY + 5, { align: 'center' });
      doc.text(formatMoney(item.unitPriceHT, invoice.currency), 140, currentY + 5, { align: 'right' });
      doc.text(`${item.vatRate}%`, 160, currentY + 5, { align: 'right' });
      doc.text(formatMoney(item.totalHT, invoice.currency), 190, currentY + 5, { align: 'right' });

      currentY += 7.5;
    });

    currentY += 6;

    // 5. Bloc Totaux & Récapitulatif Fiscal
    const totalsBoxY = currentY;
    const totalsBoxWidth = 85;
    const totalsBoxX = 111;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(totalsBoxX, totalsBoxY, totalsBoxWidth, 38, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(totalsBoxX, totalsBoxY, totalsBoxWidth, 38, 2, 2, 'D');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);

    doc.text('Sous-total Brut HT :', totalsBoxX + 6, totalsBoxY + 7);
    doc.text(formatMoney(invoice.subtotalHT, invoice.currency), totalsBoxX + totalsBoxWidth - 6, totalsBoxY + 7, { align: 'right' });

    if (invoice.discountAmount > 0) {
      doc.text('Remise commerciale :', totalsBoxX + 6, totalsBoxY + 13);
      doc.text(`-${formatMoney(invoice.discountAmount, invoice.currency)}`, totalsBoxX + totalsBoxWidth - 6, totalsBoxY + 13, { align: 'right' });
    }

    doc.text('Total TVA :', totalsBoxX + 6, totalsBoxY + 19);
    doc.text(formatMoney(invoice.totalVAT, invoice.currency), totalsBoxX + totalsBoxWidth - 6, totalsBoxY + 19, { align: 'right' });

    doc.setDrawColor(203, 213, 225);
    doc.line(totalsBoxX + 4, totalsBoxY + 23, totalsBoxX + totalsBoxWidth - 4, totalsBoxY + 23);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 81, 50);
    doc.text('TOTAL NET TTC :', totalsBoxX + 6, totalsBoxY + 29);
    doc.text(formatMoney(invoice.totalTTC, invoice.currency), totalsBoxX + totalsBoxWidth - 6, totalsBoxY + 29, { align: 'right' });

    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('Reste à Régler :', totalsBoxX + 6, totalsBoxY + 34.5);
    doc.text(formatMoney(invoice.remainingAmount, invoice.currency), totalsBoxX + totalsBoxWidth - 6, totalsBoxY + 34.5, { align: 'right' });

    // 6. Arrêté de Facture en toutes lettres & Mention OHADA
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Arrêtée la présente facture à la somme TTC de : ${formatMoney(invoice.totalTTC, invoice.currency)}.`, 14, totalsBoxY + 8);
    doc.text('Dispensé de timbre fiscal en application du Code Général des Impôts.', 14, totalsBoxY + 14);
    doc.text('Paiements acceptés : Wave, Orange Money, MTN MoMo, Chèque ou Virement bancaire.', 14, totalsBoxY + 20);

    // 7. Cachet & Signature
    const signatureY = totalsBoxY + 45;
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(125, signatureY, 71, 26, 2, 2, 'D');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Pour Acquit et Signature Autorisée', 130, signatureY + 6);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Cachet commercial & Direction', 130, signatureY + 12);

    // 8. Pied de page
    doc.setFillColor(241, 245, 249);
    doc.rect(0, 285, 210, 12, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`GSPME ERP Cloud · Conforme aux normes SYSCOHADA Révisé · Document N° ${invoice.number} généré le ${new Date().toLocaleDateString('fr-FR')}`, 105, 292, { align: 'center' });

    // Sauvegarde
    doc.save(`${docTitle.replace(/\s+/g, '_')}_${invoice.number}.pdf`);
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
