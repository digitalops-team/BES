"use client";

import { useState } from 'react';
import { Users, Shield, Building2 } from 'lucide-react';
import { useAdmin } from './hooks/useAdmin';
import { UserList } from './components/UserList';
import { UserForm } from './components/UserForm';
import { CompanyDirectoryList } from './components/CompanyDirectoryList';
import { CompanyAssignmentModal } from './components/CompanyAssignmentModal';

type Tab = 'usuarios' | 'empresas';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('usuarios');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  
  const {
    usuarios,
    empresasAdmin,
    loadingAsig,
    createUser,
    deleteUser,
    toggleUserForCompany
  } = useAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Shield className="w-7 h-7 text-indigo-400" />
          Administración
        </h2>
        <p className="text-gray-400 text-sm mt-1">Gestión de usuarios y asignación de empresas.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-[#111827] p-1.5 rounded-2xl border border-white/5 w-fit">
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'usuarios' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-gray-400 hover:text-white'}`}
        >
          <Users className="w-4 h-4" /> Usuarios
        </button>
        <button
          onClick={() => setActiveTab('empresas')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'empresas' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-gray-400 hover:text-white'}`}
        >
          <Building2 className="w-4 h-4" /> Directorio de Empresas
        </button>
      </div>

      {activeTab === 'usuarios' && (
        <>
          {showCreateForm && (
            <UserForm 
              onSubmit={createUser} 
              onCancel={() => setShowCreateForm(false)} 
            />
          )}
          <UserList 
            usuarios={usuarios}
            onDelete={deleteUser}
            onAssign={() => setActiveTab('empresas')}
            onCreateOpen={() => setShowCreateForm(!showCreateForm)}
          />
        </>
      )}

      {activeTab === 'empresas' && (
        <CompanyDirectoryList 
          empresas={empresasAdmin}
          onAssignClick={(emp) => setSelectedCompany(emp)}
          onRevokeUser={(empresaId, userId) => toggleUserForCompany(empresaId, userId, true)}
        />
      )}

      <CompanyAssignmentModal
        isOpen={!!selectedCompany}
        onClose={() => setSelectedCompany(null)}
        selectedCompany={selectedCompany}
        usuarios={usuarios}
        loading={loadingAsig}
        onToggle={toggleUserForCompany}
      />
    </div>
  );
}
