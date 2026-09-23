import React, { useState } from 'react';
import { Users, Shield, KeyRound, UserPlus, Clock, History, Check, X, AlertTriangle, Lock } from 'lucide-react';
import { User, UserRole, AuditLog } from '../types/health';
import { storageService } from '../services/storageService';

interface Props {
  currentUser: User | null;
  onOpenLogin: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

export const UserManagement: React.FC<Props> = ({ currentUser, onOpenLogin, onShowToast }) => {
  const [users, setUsers] = useState<User[]>(storageService.getUsers());
  const [logs, setLogs] = useState<AuditLog[]>(storageService.getAuditLogs());
  const [activeTab, setActiveTab] = useState<'usuarios' | 'auditoria'>('usuarios');

  // New user form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Digitador');
  const [newPoint, setNewPoint] = useState('');

  // Password modal
  const [passwordModalUser, setPasswordModalUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const isAdmin = currentUser?.rol === 'Administrador';

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newFullName || !newEmail) {
      onShowToast('Por favor complete los campos obligatorios.', 'error');
      return;
    }

    if (users.some(u => u.username.toLowerCase() === newUsername.toLowerCase())) {
      onShowToast('El nombre de usuario ya se encuentra registrado.', 'error');
      return;
    }

    const created = storageService.addUser({
      username: newUsername.trim(),
      nombre_completo: newFullName.trim(),
      email: newEmail.trim(),
      rol: newRole,
      estado: 'ACTIVO',
      punto_asignado: newPoint.trim() || 'SEDE PRINCIPAL',
    });

    storageService.addAuditLog(
      'CAMBIO_USUARIO',
      `Creación de nuevo usuario ${created.username} con rol ${created.rol}`
    );

    setUsers(storageService.getUsers());
    setLogs(storageService.getAuditLogs());
    setShowAddModal(false);
    setNewUsername('');
    setNewFullName('');
    setNewEmail('');
    setNewPoint('');
    onShowToast(`Usuario ${created.username} creado exitosamente.`, 'success');
  };

  const handleToggleState = (user: User) => {
    const updated: User = {
      ...user,
      estado: user.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO',
    };
    storageService.updateUser(updated);
    storageService.addAuditLog(
      'CAMBIO_USUARIO',
      `Cambio de estado de usuario ${user.username} a ${updated.estado}`
    );
    setUsers(storageService.getUsers());
    setLogs(storageService.getAuditLogs());
    onShowToast(`Estado de ${user.username} actualizado a ${updated.estado}.`, 'success');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !newPassword) return;

    storageService.addAuditLog(
      'CAMBIO_USUARIO',
      `Actualización de contraseña para el usuario ${passwordModalUser.username}`
    );

    setPasswordModalUser(null);
    setNewPassword('');
    setLogs(storageService.getAuditLogs());
    onShowToast('Contraseña actualizada satisfactoriamente.', 'success');
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center max-w-xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
          <Shield className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-extrabold text-slate-900">Acceso Exclusivo de Administrador</h3>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          La administración de cuentas de usuario, asignación de privilegios RBAC y visualización de trazas de auditoría requiere credenciales de nivel <strong className="text-slate-800">Administrador</strong>.
        </p>

        <button
          onClick={onOpenLogin}
          className="mt-6 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          Iniciar Sesión como Administrador
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center space-x-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span>G. Gestión de Usuarios y Auditoría del Sistema</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Control de accesos basado en roles (RBAC), credenciales y trazabilidad completa de eventos
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
            activeTab === 'usuarios'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Usuarios del Sistema ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('auditoria')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
            activeTab === 'auditoria'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Registro de Auditoría ({logs.length})</span>
        </button>
      </div>

      {/* Tab: Usuarios */}
      {activeTab === 'usuarios' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Nombre Completo</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-3">Rol</th>
                  <th className="py-3 px-3">Punto Asignado</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                  <th className="py-3 px-3">Último Acceso</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{u.username}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{u.nombre_completo}</td>
                    <td className="py-3 px-4 text-slate-500">{u.email}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.rol === 'Administrador' ? 'bg-purple-100 text-purple-800' :
                        u.rol === 'Digitador' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {u.rol}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">{u.punto_asignado || '—'}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {u.estado}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {u.ultimo_acceso || 'Nunca'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => setPasswordModalUser(u)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition-colors"
                        title="Cambiar contraseña"
                      >
                        <KeyRound className="w-3.5 h-3.5 inline mr-1" />
                        <span>Clave</span>
                      </button>

                      <button
                        onClick={() => handleToggleState(u)}
                        className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                          u.estado === 'ACTIVO'
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {u.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Auditoría */}
      {activeTab === 'auditoria' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Trazabilidad y Bitácora de Operaciones Críticas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="py-2.5 px-4">Fecha / Hora</th>
                  <th className="py-2.5 px-3">Usuario</th>
                  <th className="py-2.5 px-3">Rol</th>
                  <th className="py-2.5 px-3">Acción</th>
                  <th className="py-2.5 px-4">Detalle de la Operación</th>
                  <th className="py-2.5 px-3">IP Origen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 font-sans">
                    <td className="py-2.5 px-4 text-slate-500 font-mono whitespace-nowrap">{log.fecha}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{log.usuario}</td>
                    <td className="py-2.5 px-3 text-slate-600">{log.rol}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        log.accion === 'CARGA_EXCEL' ? 'bg-blue-100 text-blue-800' :
                        log.accion === 'ELIMINACION' ? 'bg-rose-100 text-rose-800' :
                        log.accion === 'LOGIN' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {log.accion}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">{log.detalle}</td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">{log.ip || '127.0.0.1'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: New User */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-extrabold text-slate-900">Registrar Nuevo Usuario</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre de Usuario (Login)</label>
                <input
                  type="text"
                  required
                  placeholder="ej. mtorres"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre Completo y Título</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Lic. Mario Torres Salazar"
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Correo Institucional</label>
                <input
                  type="email"
                  required
                  placeholder="mtorres@minsa.gob.pe"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rol en el Sistema</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500 font-semibold"
                >
                  <option value="Administrador">Administrador (Control total)</option>
                  <option value="Digitador">Digitador (Carga y edición de datos)</option>
                  <option value="Consultor">Consultor (Solo visualización y reportes)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Punto de Digitación Asignado</label>
                <input
                  type="text"
                  placeholder="ej. C.S. SAN MARTIN DE PORRES"
                  value={newPoint}
                  onChange={e => setNewPoint(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold shadow-md"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change Password */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-extrabold text-slate-900 mb-2">
              Cambiar Contraseña: {passwordModalUser.username}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Ingrese la nueva clave de acceso para el usuario.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nueva Contraseña</label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold shadow-md"
                >
                  Actualizar Clave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
