/**
 * GSPME - Portail d'accès SaaS : connexion / création d'entreprise via l'API,
 * avec repli sur le mode démo local si aucun serveur n'est joignable.
 */
import React, { useEffect, useState } from 'react';
import { ArrowRight, Building2, Loader2, LogOut } from 'lucide-react';
import { api } from '../../services/api';
import { storage } from '../../services/storage';

type Phase = 'checking' | 'login' | 'ready';
const COUNTRIES = [
  ['SN', 'Sénégal'], ['CI', "Côte d'Ivoire"], ['CM', 'Cameroun'], ['ML', 'Mali'], ['BJ', 'Bénin'],
  ['BF', 'Burkina Faso'], ['NE', 'Niger'], ['TG', 'Togo'], ['GN', 'Guinée'],
];

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>('checking');
  const [serverMode, setServerMode] = useState(false);

  const openSession = async () => {
    storage.hydrateFromServer(await api.fetchSnapshot());
    setServerMode(true);
    setPhase('ready');
  };

  const logout = () => {
    api.logout();
    storage.clearLocal();
    setServerMode(false);
    setPhase('login');
  };

  useEffect(() => {
    api.setUnauthorizedHandler(logout);
    (async () => {
      if (!(await api.isServerAvailable())) return setPhase('ready'); // mode démo
      if (api.isEnabled()) {
        try {
          return await openSession();
        } catch {
          api.logout();
        }
      }
      setPhase('login');
    })();
  }, []);

  if (phase === 'ready') {
    return (
      <>
        {children}
        {serverMode && (
          <button
            onClick={logout}
            title="Se déconnecter"
            className="fixed bottom-3 left-3 z-40 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 text-white text-[11px] font-semibold hover:bg-slate-900 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Déconnexion
          </button>
        )}
      </>
    );
  }

  if (phase === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
        <Loader2 className="w-6 h-6 animate-spin text-[#0F5132]" />
      </div>
    );
  }

  return <AuthForm onAuthenticated={openSession} onDemo={() => setPhase('ready')} />;
}

function AuthForm({
  onAuthenticated,
  onDemo,
}: {
  onAuthenticated: () => Promise<void>;
  onDemo: () => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [f, setF] = useState({
    companyName: '', name: '', email: '', password: '', countryCode: 'SN', city: '', phone: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') await api.login(f.email, f.password);
      else await api.register(f);
      await onAuthenticated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full p-2.5 border border-slate-300 rounded-lg text-xs';
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAF9F6]">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-xs">
        <div className="bg-[#0F5132] text-white p-6 text-center space-y-1">
          <div className="w-10 h-10 rounded-xl bg-[#D4AF37] text-[#0F5132] font-black text-xl flex items-center justify-center mx-auto">
            G
          </div>
          <h1 className="text-base font-extrabold tracking-tight mt-2">GSPME · ERP des PME Africaines</h1>
          <p className="text-[11px] text-white/80">
            {mode === 'login' ? 'Connexion à votre espace' : 'Créez votre entreprise · 14 jours d’essai'}
          </p>
        </div>

        <form onSubmit={submit} className="p-6 space-y-3">
          {mode === 'register' && (
            <>
              <input required placeholder="Nom de l'entreprise" className={input} value={f.companyName} onChange={set('companyName')} />
              <input required placeholder="Votre nom complet" className={input} value={f.name} onChange={set('name')} />
              <div className="grid grid-cols-2 gap-2">
                <select className={input} value={f.countryCode} onChange={set('countryCode')}>
                  {COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                </select>
                <input placeholder="Ville" className={input} value={f.city} onChange={set('city')} />
              </div>
              <input placeholder="Téléphone" className={input} value={f.phone} onChange={set('phone')} />
            </>
          )}
          <input required type="email" autoComplete="email" placeholder="Email" className={input} value={f.email} onChange={set('email')} />
          <input
            required type="password" minLength={mode === 'register' ? 8 : undefined}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder={mode === 'register' ? 'Mot de passe (8 caractères min.)' : 'Mot de passe'}
            className={input} value={f.password} onChange={set('password')}
          />
          {error && <div role="alert" className="text-red-600 font-semibold">{error}</div>}
          <button
            type="submit" disabled={busy}
            className="w-full py-2.5 bg-[#0F5132] hover:bg-[#0c4028] disabled:opacity-60 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            {mode === 'login' ? <ArrowRight className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
            {mode === 'login' ? 'Se connecter' : 'Créer mon entreprise'}
          </button>
          <button
            type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="w-full text-center text-[#0F5132] font-semibold cursor-pointer"
          >
            {mode === 'login' ? 'Pas de compte ? Créer une entreprise' : 'Déjà inscrit ? Se connecter'}
          </button>
          <button type="button" onClick={onDemo} className="w-full text-center text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer">
            Explorer la démo (données fictives, non enregistrées sur le serveur)
          </button>
        </form>
      </div>
    </div>
  );
}
