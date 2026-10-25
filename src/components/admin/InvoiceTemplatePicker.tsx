/**
 * GSPME - Choix du modèle PDF des factures et devis (5 modèles) avec aperçu réel.
 */
import React, { useState } from 'react';
import { Check, Eye, FileText, Loader2 } from 'lucide-react';
import { InvoiceTemplateId, Tenant } from '../../types';
import { INVOICE_TEMPLATES, sampleInvoice } from '../../services/invoiceTemplates';
import { PdfService } from '../../services/pdfService';
import { storage } from '../../services/storage';

/** Miniature stylisée d'une page A4 pour chaque modèle. */
function Thumb({ id }: { id: InvoiceTemplateId }) {
  const line = (w: string, c = '#cbd5e1', h = 2) => <div style={{ width: w, height: h, background: c, borderRadius: 1 }} />;
  const rows = (c = '#e2e8f0') => (
    <div style={{ display: 'grid', gap: 3, marginTop: 4 }}>{[0, 1, 2].map(i => <div key={i} style={{ height: 6, background: i % 2 ? c : 'transparent', borderBottom: `1px solid ${c}` }} />)}</div>
  );
  const page: React.CSSProperties = { width: 112, height: 158, background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,.12)', position: 'relative', overflow: 'hidden', fontFamily: id === 'ELEGANT' ? 'Georgia, serif' : 'inherit' };
  if (id === 'CLASSIQUE') return (
    <div style={page}>
      <div style={{ height: 6, background: '#0F5132' }} />
      <div style={{ padding: 7, display: 'grid', gap: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><div style={{ display: 'grid', gap: 3 }}>{line('46px', '#0F5132', 4)}{line('58px')}{line('50px')}</div><div style={{ width: 34, height: 24, background: '#f1f5f9', borderRadius: 3 }} /></div>
        <div style={{ height: 18, border: '1px solid #e2e8f0', borderRadius: 3 }} />
        <div style={{ height: 8, background: '#0F5132' }} />{rows()}
        <div style={{ marginLeft: 'auto', width: 46, height: 22, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 3 }} />
      </div>
      <div style={{ position: 'absolute', bottom: 0, height: 8, width: '100%', background: '#f1f5f9' }} />
    </div>
  );
  if (id === 'MODERNE') return (
    <div style={page}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: '#2563EB' }} />
      <div style={{ padding: '8px 8px 8px 13px', display: 'grid', gap: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><div style={{ display: 'grid', gap: 3 }}>{line('40px', '#111827', 4)}{line('52px')}</div><div style={{ display: 'grid', gap: 3, justifyItems: 'end' }}>{line('44px', '#2563EB', 8)}{line('30px')}</div></div>
        <div style={{ height: 2, background: '#2563EB' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>{line('40px')}<div style={{ width: 38, height: 14, background: '#DBEAFE', borderRadius: 3 }} /></div>
        {line('100%', '#2563EB', 1)}{rows('#e5e7eb')}
        <div style={{ marginLeft: 'auto', width: 46, height: 26, background: '#DBEAFE', borderRadius: 4, display: 'grid', alignContent: 'end', padding: 2 }}><div style={{ height: 8, background: '#2563EB', borderRadius: 2 }} /></div>
      </div>
    </div>
  );
  if (id === 'MINIMALISTE') return (
    <div style={page}>
      <div style={{ padding: 9, display: 'grid', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><div style={{ display: 'grid', gap: 3 }}>{line('38px', '#111827', 8)}{line('26px', '#d4d4d4')}</div><div style={{ display: 'grid', gap: 3, justifyItems: 'end' }}>{line('40px', '#111827', 3)}{line('52px', '#d4d4d4')}</div></div>
        <div style={{ height: 1, background: '#111827' }} />
        <div style={{ display: 'flex', gap: 6 }}>{line('22px', '#d4d4d4')}{line('22px', '#d4d4d4')}{line('26px', '#d4d4d4')}</div>
        <div style={{ height: 1, background: '#111827', marginTop: 3 }} />{rows('#e5e5e5')}
        <div style={{ marginLeft: 'auto', width: 48, display: 'grid', gap: 3 }}>{line('100%', '#d4d4d4')}<div style={{ height: 1, background: '#111827' }} />{line('100%', '#111827', 4)}</div>
      </div>
    </div>
  );
  if (id === 'ELEGANT') return (
    <div style={page}>
      <div style={{ padding: 8, display: 'grid', gap: 5, justifyItems: 'center' }}>
        {line('56px', '#7C2D3A', 5)}{line('70px', '#d6c9c9')}
        <div style={{ width: '100%', borderTop: '2px solid #B08D57', borderBottom: '1px solid #B08D57', height: 3 }} />
        <div style={{ fontStyle: 'italic', fontWeight: 700, fontSize: 9, color: '#261E1E' }}>Facture</div>
        <div style={{ width: '100%', height: 16, border: '1px solid #B08D57', borderRadius: 2 }} />
        <div style={{ width: '100%', borderTop: '1px solid #B08D57', borderBottom: '1px solid #B08D57', height: 7 }} />{rows('#e8dfd0')}
        <div style={{ marginLeft: 'auto', width: 46, borderTop: '1px solid #B08D57', paddingTop: 3 }}>{line('100%', '#7C2D3A', 4)}</div>
      </div>
    </div>
  );
  return (
    <div style={page}>
      <div style={{ height: 36, background: '#0B2545', padding: '8px 7px', display: 'flex', justifyContent: 'space-between' }}><div style={{ display: 'grid', gap: 3 }}>{line('46px', '#fff', 4)}{line('58px', '#94a3b8')}</div>{line('28px', '#F59E0B', 7)}</div>
      <div style={{ height: 2, background: '#F59E0B' }} />
      <div style={{ padding: 7, display: 'grid', gap: 5 }}>
        <div style={{ height: 14, background: '#f1f5f9', borderLeft: '2px solid #F59E0B' }} />
        <div style={{ height: 8, background: '#0B2545' }} />{rows('#eef2f7')}
        <div style={{ marginLeft: 'auto', width: 46, height: 10, background: '#0B2545' }} />
      </div>
      <div style={{ position: 'absolute', bottom: 0, height: 9, width: '100%', background: '#0B2545', borderTop: '1px solid #F59E0B' }} />
    </div>
  );
}

interface InvoiceTemplatePickerProps {
  tenant: Tenant;
  readOnly?: boolean;
  onChanged?: (name: string) => void;
}

export function InvoiceTemplatePicker({ tenant, readOnly, onChanged }: InvoiceTemplatePickerProps) {
  const current: InvoiceTemplateId = tenant.invoiceTemplate || 'CLASSIQUE';
  const [busy, setBusy] = useState<string | null>(null);

  const preview = async (id: InvoiceTemplateId, type: 'FACTURE_VENTE' | 'DEVIS_PROFORMA') => {
    setBusy(`${id}-${type}`);
    try {
      await PdfService.previewInvoicePdf(sampleInvoice(tenant, type), tenant, id);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
      <div>
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2"><FileText className="w-4 h-4 text-[#0F5132]" /> Modèles de factures et de devis</h4>
        <p className="text-xs text-slate-500 mt-0.5">
          Choisissez l'habillage PDF de vos factures, devis, avoirs et bons de commande. Votre logo et vos informations légales y figurent automatiquement.
          Vous pouvez aussi changer de modèle au moment de l'export, depuis Ventes & Facturation.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {INVOICE_TEMPLATES.map(t => {
          const active = t.id === current;
          return (
            <div key={t.id} className={`rounded-xl border p-3 flex flex-col items-center gap-2 text-xs ${active ? 'border-[#0F5132] ring-2 ring-[#0F5132]/15 bg-emerald-50/30' : 'border-slate-200'}`}>
              <Thumb id={t.id} />
              <div className="text-center">
                <div className="font-bold text-slate-900 flex items-center justify-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.accent }} /> {t.name}
                  {active && <Check className="w-3.5 h-3.5 text-[#0F5132]" aria-label="Modèle actuel" />}
                </div>
                <div className="text-[10.5px] text-slate-500 leading-snug mt-1">{t.description}</div>
              </div>
              <div className="flex gap-1.5 w-full mt-auto">
                <button onClick={() => preview(t.id, 'FACTURE_VENTE')} disabled={busy !== null} className="flex-1 px-1.5 py-1 border border-slate-300 rounded-md hover:bg-slate-50 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-60" title="Aperçu avec une facture d'exemple">
                  {busy === `${t.id}-FACTURE_VENTE` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />} Facture
                </button>
                <button onClick={() => preview(t.id, 'DEVIS_PROFORMA')} disabled={busy !== null} className="flex-1 px-1.5 py-1 border border-slate-300 rounded-md hover:bg-slate-50 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-60" title="Aperçu avec un devis d'exemple">
                  {busy === `${t.id}-DEVIS_PROFORMA` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />} Devis
                </button>
              </div>
              <button
                disabled={active || readOnly}
                onClick={() => { storage.updateActiveTenant({ invoiceTemplate: t.id }); onChanged?.(t.name); }}
                className={`w-full py-1.5 rounded-md font-bold cursor-pointer ${active ? 'bg-emerald-100 text-emerald-800 cursor-default' : 'bg-[#0F5132] hover:bg-[#0c4028] text-white disabled:opacity-50 disabled:cursor-not-allowed'}`}
              >
                {active ? 'Modèle actuel' : 'Utiliser ce modèle'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
