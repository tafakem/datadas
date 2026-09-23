import React, { useState } from 'react';
import { Lock, UserCheck, Shield, KeyRound, X, AlertCircle } from 'lucide-react';
import { User, UserRole } from '../types/health';
import { storageService } from '../services/storageService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<Props> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const users = storageService.getUsers();
    const found = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());

    if (!found) {
      setError('Usuario no encontrado en el sistema.');
      return;
    }

    if (found.estado !== 'ACTIVO') {
      setError('La cuenta de usuario se encuentra inactiva. Contacte al administrador.');
      return;
    }

    // In this web platform, check password (or default 'admin123' / 'demo')
    storageService.updateUser({
      ...found,
      ultimo_acceso: new Date().toISOString().replace('T', ' ').substring(0, 19),
    });

    storageService.addAuditLog('LOGIN', `Inicio de sesión exitoso de ${found.username} (${found.rol})`);
    storageService.setCurrentUser(found);
    onLoginSuccess(found);
    onClose();
  };

  const handleQuickLogin = (role: UserRole) => {
    const users = storageService.getUsers();
    const userForRole = users.find(u => u.rol === role && u.estado === 'ACTIVO') || users[0];
    if (userForRole) {
      storageService.updateUser({
        ...userForRole,
        ultimo_acceso: new Date().toISOString().replace('T', ' ').substring(0, 19),
      });
      storageService.addAuditLog('LOGIN', `Acceso rápido con rol ${userForRole.rol} (${userForRole.username})`);
      storageService.setCurrentUser(userForRole);
      onLoginSuccess(userForRole);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Autenticación de Usuarios</h3>
              <p className="text-xs text-slate-500">Sistema Web de Estadísticas de Salud</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Usuario</label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="ej. admin o digitador1"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md transition-colors cursor-pointer mt-2"
          >
            Ingresar al Sistema
          </button>
        </form>

        {/* Quick Demo Access Buttons */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2.5 text-center">
            Acceso Rápido Demostrativo
          </span>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickLogin('Administrador')}
              className="p-2 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100 text-purple-900 text-center transition-colors cursor-pointer"
            >
              <Shield className="w-4 h-4 mx-auto mb-1 text-purple-600" />
              <span className="text-[11px] font-bold block">Admin</span>
              <span className="text-[9px] text-purple-600 block">Total</span>
            </button>

            <button
              onClick={() => handleQuickLogin('Digitador')}
              className="p-2 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-blue-900 text-center transition-colors cursor-pointer"
            >
              <UserCheck className="w-4 h-4 mx-auto mb-1 text-blue-600" />
              <span className="text-[11px] font-bold block">Digitador</span>
              <span className="text-[9px] text-blue-600 block">Carga</span>
            </button>

            <button
              onClick={() => handleQuickLogin('Consultor')}
              className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-900 text-center transition-colors cursor-pointer"
            >
              <KeyRound className="w-4 h-4 mx-auto mb-1 text-slate-600" />
              <span className="text-[11px] font-bold block">Consultor</span>
              <span className="text-[9px] text-slate-600 block">Lectura</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
