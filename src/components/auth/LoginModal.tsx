/**
 * GSPME - Espace de connexion de la page d'accueil : connexion (email + mot de passe)
 * et création d'une entreprise, via l'API SaaS.
 */
import React, { useState } from 'react';
import { ArrowRight, Building2, Eye, EyeOff, Loader2, Lock, Mail, X } from 'lucide-react';
import { api } from '../../services/api';
import { storage } from '../../services/storage';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Appelé une fois la session ouverte et les données chargées. */
  onAuthenticated: (role: string) => void;
  serverAvailable: boolean;
  /** Raison précise quand le serveur répond mais qu'un composant (base de données) est en panne. */
  serverIssue?: string;
  initialMode?: 'login' | 'register';
  notice?: string;
  /** Formule choisie sur la page d'accueil (transmise à l'inscription). */
  requestedPlan?: string;
}

const COUNTRIES: [string, string][] = [
  ['SN', 'Sénégal'], ['CI', "Côte d'Ivoire"], ['CM', 'Cameroun'], ['ML', 'Mali'], ['BJ', 'Bénin'],
  ['BF', 'Burkina Faso'], ['NE', 'Niger'], ['TG', 'Togo'], ['GN', 'Guinée'],
];
const input = 'w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#0F5132] focus:ring-1 focus:ring-[#0F5132]';

export function LoginModal({ isOpen, onClose, onAuthenticated, serverAvailable, serverIssue, initialMode = 'login', notice, requestedPlan }: LoginModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [f, setF] = useState({ companyName: '', name: '', email: '', password: '', countryCode: 'SN', city: '', phone: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') await api.login(f.email.trim(), f.password);
      else await api.register({ ...f, email: f.email.trim(), requestedPlan });
      const snapshot = await api.fetchSnapshot();
      storage.hydrateFromServer(snapshot);
      const me = snapshot.users.find(u => u.id === snapshot.activeUserId);
      setF(prev => ({ ...prev, password: '' }));
      onAuthenticated(me?.role || 'DIRECTEUR_GENERAL');
    } catch (err) {
      api.logout();
      setError((err as Error).message || 'Connexion impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'login' ? 'Connexion' : 'Création de compte'}
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 text-xs">
        <div className="relative bg-[#0F5132] text-white p-6 text-center space-y-1">
          <button onClick={onClose} aria-label="Fermer" className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
          <div className="w-11 h-11 rounded-xl overflow-hidden bg-white mx-auto">
            <img src="/gspme_logo.jpg" alt="GSPME" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-base font-extrabold tracking-tight pt-1">
            {mode === 'login' ? 'Connexion à votre espace' : 'Créez votre entreprise'}
          </h2>
          <p className="text-[11px] text-white/80">
            {mode === 'login' ? 'Accédez à votre ERP GSPME' : '14 jours d’essai · aucune carte bancaire'}
          </p>
        </div>

        <form onSubmit={submit} className="p-6 space-y-3">
          {notice && <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-semibold">{notice}</div>}
          {!serverAvailable && (
            <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
              {serverIssue
                ? `Le serveur est en ligne mais sa ${serverIssue}. L'administrateur doit vérifier la configuration. `
                : 'Le serveur de connexion est injoignable pour le moment. '}
              Vous pouvez tester l'ERP avec le bouton « Accéder à l'ERP (Démo) ».
            </div>
          )}

          {mode === 'register' && (
            <>
              <input required placeholder="Nom de l'entreprise" className={input} value={f.companyName} onChange={set('companyName')} />
              <input required placeholder="Votre nom complet" className={input} value={f.name} onChange={set('name')} />
              <div className="grid grid-cols-2 gap-2">
                <select className={input} value={f.countryCode} onChange={set('countryCode')} aria-label="Pays">
                  {COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                </select>
                <input placeholder="Ville" className={input} value={f.city} onChange={set('city')} />
              </div>
              <input placeholder="Téléphone" className={input} value={f.phone} onChange={set('phone')} />
            </>
          )}

          <div className="relative">
            <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input required type="email" autoComplete="username" placeholder="Adresse email (identifiant)" className={`${input} pl-9`} value={f.email} onChange={set('email')} />
          </div>
          <div className="relative">
            <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              required
              type={showPwd ? 'text' : 'password'}
              minLength={mode === 'register' ? 8 : undefined}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder={mode === 'register' ? 'Mot de passe (8 caractères min.)' : 'Mot de passe'}
              className={`${input} pl-9 pr-9`}
              value={f.password}
              onChange={set('password')}
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          {error && <div role="alert" className="text-red-600 font-semibold">{error}</div>}

          <button
            type="submit"
            disabled={busy || !serverAvailable}
            className="w-full py-2.5 bg-[#0F5132] hover:bg-[#0c4028] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'login' ? <ArrowRight className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
            {mode === 'login' ? 'Se connecter' : 'Créer mon entreprise'}
          </button>

          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="w-full text-center text-[#0F5132] font-semibold cursor-pointer"
          >
            {mode === 'login' ? 'Pas encore de compte ? Créer mon entreprise' : 'Déjà inscrit ? Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
