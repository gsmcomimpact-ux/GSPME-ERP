/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Module O : Assistant IA de Gestion & Analyse Décisionnelle (conversationnel)
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Send, BrainCircuit, ShieldCheck, RotateCcw, AlertTriangle } from 'lucide-react';
import { Tenant, Invoice, Product, TreasuryAccount, Customer, PurchaseInvoice, Project, SalesOrder, Role } from '../../types';
import { formatMoney } from '../../services/currency';
import { api } from '../../services/api';
import { buildAlerts } from '../../services/dashboardInsights';
import { AssistantData, SUGGESTIONS, buildContext, localAnswer } from '../../services/assistantEngine';

interface AiAssistantProps {
  tenant: Tenant;
  invoices: Invoice[];
  purchases?: PurchaseInvoice[];
  products: Product[];
  treasuryAccounts: TreasuryAccount[];
  customers: Customer[];
  projects?: Project[];
  salesOrders?: SalesOrder[];
  serverMode: boolean;
  userRole: Role;
}

interface ChatMessage { sender: 'user' | 'assistant'; text: string; time: string; source?: 'ia' | 'local' }

const now = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** Rendu minimal (gras, listes) sans HTML injecté. */
function RichText({ text }: { text: string }) {
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <React.Fragment key={i}>{part}</React.Fragment>));
  return (
    <>
      {text.split('\n').map((line, i) => (
        <div key={i} className={line.trim() === '' ? 'h-2' : ''}>
          {inline(line.replace(/^\s*[-*]\s+/, '• ').replace(/^#{1,3}\s+/, ''))}
        </div>
      ))}
    </>
  );
}

export function AiAssistantModule({ tenant, invoices, purchases = [], products, treasuryAccounts, customers, projects = [], salesOrders = [], serverMode }: AiAssistantProps) {
  const greeting = (): ChatMessage => ({
    sender: 'assistant',
    text: `Bonjour ! Je suis l'assistant de gestion de **${tenant.name}**. Je m'appuie sur vos données réelles (factures, trésorerie, stocks, projets) pour répondre à vos questions, rédiger des courriers ou proposer un plan d'action. Que souhaitez-vous savoir ?`,
    time: now(),
  });
  const [messages, setMessages] = useState<ChatMessage[]>([greeting()]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [aiOn, setAiOn] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (serverMode) api.assistantAvailable().then(setAiOn); else setAiOn(false); }, [serverMode]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);

  const fmt = (n: number) => formatMoney(n, tenant.currency);
  const data: AssistantData = useMemo(() => ({ tenant, invoices, purchases, products, treasuryAccounts, customers, projects }), [tenant, invoices, purchases, products, treasuryAccounts, customers, projects]);
  const alerts = useMemo(() => buildAlerts({ invoices, products, salesOrders, projects }, n => formatMoney(n, tenant.currency)), [invoices, products, salesOrders, projects, tenant.currency]);

  const send = async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || busy) return;
    const history = [...messages, { sender: 'user' as const, text: question, time: now() }];
    setMessages(history);
    setInput('');
    setBusy(true);

    let reply = '';
    let source: ChatMessage['source'] = 'local';
    if (aiOn) {
      try {
        const convo = history.filter((m, i) => i > 0 || m.sender === 'user').map(m => ({ role: m.sender, content: m.text }));
        reply = await api.askAssistant(convo, buildContext(data, fmt));
        source = 'ia';
      } catch {
        reply = '';
      }
    }
    if (!reply) reply = localAnswer(question, data, fmt) + (aiOn ? "\n\n_(Le service d'IA est momentanément indisponible : réponse issue de l'analyse intégrée.)_" : '');
    setMessages(prev => [...prev, { sender: 'assistant', text: reply, time: now(), source }]);
    setBusy(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Assistant de gestion IA</span>
            <span className="text-[10px] font-bold text-[#0F5132] bg-[#0F5132]/10 px-2 py-0.5 rounded flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#D4AF37]" />
              <span>GSPME Copilot</span>
            </span>
          </h2>
          <p className="text-xs text-slate-500">Posez vos questions en langage courant : trésorerie, impayés, stocks, projets, courriers…</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Réponses fondées sur vos données · rien n'est inventé</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Alertes détectées</span>
              <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-semibold">{alerts.length}</span>
            </h3>
            <div className="mt-3 space-y-2.5">
              {alerts.length === 0 && <p className="text-xs text-slate-500">Aucune alerte pour le moment.</p>}
              {alerts.slice(0, 6).map(a => (
                <button key={a.id} onClick={() => send(`Explique-moi cette alerte et propose une action : ${a.title} – ${a.text}`)}
                  className={`w-full text-left p-3 rounded-xl border text-xs cursor-pointer ${a.tone === 'rose' ? 'bg-rose-50/50 border-rose-200' : a.tone === 'amber' ? 'bg-amber-50/50 border-amber-200' : 'bg-blue-50/50 border-blue-200'}`}>
                  <div className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{a.title}</div>
                  <p className="text-[11px] text-slate-700 mt-1 leading-relaxed">{a.text}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs text-xs space-y-2">
            <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">Questions suggérées</span>
            <div className="space-y-1.5">
              {SUGGESTIONS.map(p => (
                <button key={p} onClick={() => send(p)} disabled={busy}
                  className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-[#0F5132]/5 text-slate-700 hover:text-[#0F5132] text-xs transition-colors cursor-pointer disabled:opacity-60">
                  → {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex flex-col h-[640px]">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0F5132] text-[#D4AF37] flex items-center justify-center"><Sparkles className="w-4 h-4" /></div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 leading-tight">Conversation</h3>
                <span className="text-[10px] text-emerald-700 flex items-center gap-1 font-medium" data-testid="ai-mode">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {aiOn ? `IA générative active · données de ${tenant.name}` : `Analyse intégrée · données de ${tenant.name}`}
                </span>
              </div>
            </div>
            <button onClick={() => setMessages([greeting()])} className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer">
              <RotateCcw className="w-3 h-3" />Nouvelle conversation
            </button>
          </div>

          <div className="p-4 overflow-y-auto space-y-3 flex-1">
            {messages.map((m, idx) => (
              <div key={idx} data-testid={`ai-msg-${m.sender}`} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[88%] p-3 rounded-xl text-xs leading-relaxed ${m.sender === 'user' ? 'bg-[#0F5132] text-white rounded-tr-none' : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none shadow-2xs'}`}>
                  <RichText text={m.text} />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">{m.time}</span>
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-slate-400 p-2 bg-slate-50 rounded-lg max-w-xs">
                <BrainCircuit className="w-4 h-4 animate-pulse text-[#0F5132]" />
                <span>Analyse en cours…</span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="p-3 border-t border-slate-100 bg-slate-50/50">
            <form onSubmit={e => { e.preventDefault(); void send(); }} className="flex items-center gap-2">
              <input
                type="text"
                aria-label="Votre question"
                placeholder="Écrivez votre question…"
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={busy}
                maxLength={1500}
                className="flex-1 p-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0F5132]"
              />
              <button type="submit" aria-label="Envoyer" disabled={busy || !input.trim()} className="p-2.5 bg-[#0F5132] hover:bg-[#0c4028] disabled:bg-slate-300 text-white rounded-lg cursor-pointer transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
