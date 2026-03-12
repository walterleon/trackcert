import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Building2, Map, Users, MapPin, Camera, RefreshCw, Save, X,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import {
  apiAdminGetStats,
  apiAdminGetCompanies,
  apiAdminGetCampaigns,
  apiAdminUpdateCompany,
  type AdminStats,
  type AdminCompany,
  type AdminCampaign,
} from '../api/companyApi';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const PLANS = ['free', 'starter', 'growth', 'pro'];

export function AdminPage() {
  const { token, company } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'companies' | 'campaigns'>('overview');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ planName: string; credits: number; role: string }>({ planName: '', credits: 0, role: '' });
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Guard: only SUPER_ADMIN
  useEffect(() => {
    if (company?.role !== 'SUPER_ADMIN') {
      navigate('/dashboard', { replace: true });
    }
  }, [company, navigate]);

  const loadData = async () => {
    if (!token) return;
    try {
      const [s, c, cam] = await Promise.all([
        apiAdminGetStats(token),
        apiAdminGetCompanies(token),
        apiAdminGetCampaigns(token),
      ]);
      setStats(s);
      setCompanies(c);
      setCampaigns(cam);
    } catch (err: any) {
      console.error('Admin load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [token]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const startEdit = (c: AdminCompany) => {
    setEditingId(c.id);
    setEditForm({ planName: c.planName, credits: c.credits, role: c.role });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    if (!token || !editingId) return;
    setSaving(true);
    try {
      await apiAdminUpdateCompany(token, editingId, editForm);
      setCompanies((prev) =>
        prev.map((c) => (c.id === editingId ? { ...c, ...editForm } : c))
      );
      setEditingId(null);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-1/3" />
          <div className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-800 rounded-xl" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-xl">
            <Shield className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Panel de Administración</h1>
            <p className="text-gray-500 text-sm">Vista general de la plataforma</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <StatCard icon={<Building2 className="w-5 h-5" />} label="Empresas" value={stats.companies} color="blue" />
          <StatCard icon={<Map className="w-5 h-5" />} label="Campañas" value={stats.campaigns} color="emerald" />
          <StatCard icon={<Users className="w-5 h-5" />} label="Drivers" value={stats.drivers} color="amber" />
          <StatCard icon={<MapPin className="w-5 h-5" />} label="Ubicaciones" value={stats.locations} color="purple" />
          <StatCard icon={<Camera className="w-5 h-5" />} label="Fotos" value={stats.photos} color="pink" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-800 pb-1">
        {(['overview', 'companies', 'campaigns'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab
                ? 'bg-gray-800 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'overview' ? 'Resumen' : tab === 'companies' ? `Empresas (${companies.length})` : `Campañas activas (${campaigns.length})`}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent companies */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Últimas empresas registradas</h3>
            <div className="space-y-2">
              {companies.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
                  <div>
                    <p className="text-white text-sm font-medium">{c.name}</p>
                    <p className="text-gray-500 text-xs">{c.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 capitalize">{c.planName}</span>
                    <p className="text-gray-600 text-xs mt-0.5">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active campaigns */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Campañas activas ahora</h3>
            <div className="space-y-2">
              {campaigns.slice(0, 5).map((cam) => (
                <div key={cam.id} className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
                  <div>
                    <p className="text-white text-sm font-medium">{cam.title}</p>
                    <p className="text-gray-500 text-xs">{cam.company.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 text-xs font-medium">{cam._count.drivers} drivers</p>
                    <p className="text-gray-600 text-xs">{cam._count.locations.toLocaleString()} puntos</p>
                  </div>
                </div>
              ))}
              {campaigns.length === 0 && (
                <p className="text-gray-600 text-sm text-center py-4">Sin campañas activas</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Companies tab */}
      {activeTab === 'companies' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase">
                  <th className="text-left px-4 py-3">Empresa</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-center px-4 py-3">Plan</th>
                  <th className="text-center px-4 py-3">Créditos</th>
                  <th className="text-center px-4 py-3">Campañas</th>
                  <th className="text-center px-4 py-3">Rol</th>
                  <th className="text-left px-4 py-3">Registro</th>
                  <th className="text-center px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-gray-400">{c.email}</td>
                    <td className="px-4 py-3 text-center">
                      {editingId === c.id ? (
                        <select
                          value={editForm.planName}
                          onChange={(e) => setEditForm({ ...editForm, planName: e.target.value })}
                          className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1"
                        >
                          {PLANS.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                          c.planName === 'pro' ? 'bg-purple-500/10 text-purple-400' :
                          c.planName === 'growth' ? 'bg-blue-500/10 text-blue-400' :
                          c.planName === 'starter' ? 'bg-emerald-500/10 text-emerald-400' :
                          'bg-gray-800 text-gray-400'
                        }`}>
                          {c.planName}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {editingId === c.id ? (
                        <input
                          type="number"
                          value={editForm.credits}
                          onChange={(e) => setEditForm({ ...editForm, credits: Number(e.target.value) })}
                          className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1 w-20 text-center"
                        />
                      ) : (
                        <span className="text-gray-300 font-mono">{c.credits}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-300">{c._count.campaigns}</td>
                    <td className="px-4 py-3 text-center">
                      {editingId === c.id ? (
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1"
                        >
                          <option value="COMPANY">COMPANY</option>
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        </select>
                      ) : (
                        <span className={`text-xs ${c.role === 'SUPER_ADMIN' ? 'text-purple-400 font-medium' : 'text-gray-500'}`}>
                          {c.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: es })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {editingId === c.id ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={saveEdit}
                            disabled={saving}
                            className="p-1 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors disabled:opacity-50"
                            title="Guardar"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1 text-gray-500 hover:bg-gray-700 rounded transition-colors"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(c)}
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Editar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Campaigns tab */}
      {activeTab === 'campaigns' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase">
                  <th className="text-left px-4 py-3">Campaña</th>
                  <th className="text-left px-4 py-3">Empresa</th>
                  <th className="text-left px-4 py-3">Código</th>
                  <th className="text-center px-4 py-3">Drivers</th>
                  <th className="text-center px-4 py-3">Ubicaciones</th>
                  <th className="text-left px-4 py-3">Creada</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((cam) => (
                  <tr key={cam.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{cam.title}</p>
                      {cam.description && (
                        <p className="text-gray-500 text-xs truncate max-w-xs">{cam.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{cam.company.name}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-gray-300 text-xs bg-gray-800 px-2 py-0.5 rounded">{cam.campaignCode}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-emerald-400 font-medium">{cam._count.drivers}</td>
                    <td className="px-4 py-3 text-center text-gray-300 font-mono">{cam._count.locations.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDistanceToNow(new Date(cam.createdAt), { addSuffix: true, locale: es })}
                    </td>
                  </tr>
                ))}
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-600 py-8">Sin campañas activas</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: number; color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    purple: 'bg-purple-500/10 text-purple-400',
    pink: 'bg-pink-500/10 text-pink-400',
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className={`inline-flex p-2 rounded-lg mb-2 ${colorMap[color]}`}>{icon}</div>
      <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
