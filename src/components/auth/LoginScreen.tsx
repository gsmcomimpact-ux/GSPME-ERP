/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Écran d'Authentification Sécurisée & Sélection de Profil
 */

import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Building2,
  ShieldCheck,
  ArrowRight,
  UserCheck,
  CheckCircle2
} from 'lucide-react';
import { User, Tenant } from '../../types';

interface LoginScreenProps {
  users: User[];
  tenants: Tenant[];
  onLogin: (userId: string) => void;
  onCancel?: () => void;
}

export function LoginScreen({ users, tenants, onLogin, onCancel }: LoginScreenProps) {
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || '');
  const [password, setPassword] = useState('••••••••••••');

  const selectedUser = users.find(u => u.id === selectedUserId) || users[0];
  const userTenant = tenants.find(t => t.id === selectedUser?.tenantId) || tenants[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(selectedUserId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-xs">
        {/* Top Header */}
        <div className="bg-[#0F5132] text-white p-6 text-center space-y-1">
          <div className="w-10 h-10 rounded-xl bg-[#D4AF37] text-[#0F5132] font-black text-xl flex items-center justify-center mx-auto shadow-sm">
            G
          </div>
          <h2 className="text-base font-extrabold tracking-tight mt-2">GSPME · Connexion Sécurisée</h2>
          <p className="text-[11px] text-white/80">
            Plateforme SaaS de Gestion Intégrée des PME Africaines
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Sélectionner un Compte Collaborateur (Test Rôles RBAC)
            </label>
            <div className="space-y-2">
              {users.map(u => {
                const isSelected = u.id === selectedUserId;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUserId(u.id)}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0F5132] bg-[#0F5132]/5 ring-1 ring-[#0F5132]'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-[#0F5132] font-semibold">
                        {u.role.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{u.email}</div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-[#0F5132]" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Mot de Passe Sécurisé</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Chiffrement HTTPS / TLS 1.3 · Sessions isolées par tenant
            </span>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-[#0F5132] hover:bg-[#0c4028] text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <span>Se Connecter à l'Espace {userTenant?.name}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full text-center text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer pt-1"
            >
              Fermer et continuer en tant que {selectedUser.name}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
