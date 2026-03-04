import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, MapPin, Users, Camera, ChevronRight, Power, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { apiListCampaigns, apiUpdateCampaign, type Campaign } from '../api/companyApi';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function DashboardPage() {
  const { token } = useAuthStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    if (!token) return;
    try {
      const data = await apiListCampaigns(token);
      setCampaigns(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const toggleActive = async (campaign: Campaign) => {
    if (!token) return;
    try {
      await apiUpdateCampaign(token, campaign.id, { isActive: !campaign.isActive });
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaign.id ? { ...c, isActive: !c.isActive } : c))
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Mis Campañas</h1>
          <p className="text-gray-400 text-sm mt-1">
            {campaigns.length === 0 ? 'No tenés campañas aún' : `${campaigns.length} campaña(s) en total`}
          </p>
        </div>
        <Link
          to="/campaigns/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva campaña
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onToggle={() => toggleActive(campaign)}
              onClick={() => navigate(`/campaigns/${campaign.id}`)}
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

function CampaignCard({
  campaign,
  onToggle,
  onClick,
}: {
  campaign: Campaign;
  onToggle: () => void;
  onClick: () => void;
}) {
  return (
    <div
      className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold truncate group-hover:text-blue-400 transition-colors">
            {campaign.title}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Código: <span className="font-mono text-gray-400">{campaign.campaignCode}</span>
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          title={campaign.isActive ? 'Desactivar' : 'Activar'}
          className={`ml-2 p-1.5 rounded-lg transition-colors ${
            campaign.isActive
              ? 'text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20'
              : 'text-gray-500 bg-gray-800 hover:bg-gray-700'
          }`}
        >
          <Power className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
        {campaign._count && (
          <>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {campaign._count.drivers}
            </span>
            <span className="flex items-center gap-1">
              <Camera className="w-3 h-3" />
              {campaign._count.photos}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {campaign._count.locations}
            </span>
          </>
        )}
        <span className="ml-auto">
          {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true, locale: es })}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
            campaign.isActive
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-gray-800 text-gray-500'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${campaign.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
          {campaign.isActive ? 'Activa' : 'Inactiva'}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="p-4 bg-blue-500/10 rounded-full mb-4">
        <MapPin className="w-10 h-10 text-blue-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">Creá tu primera campaña</h3>
      <p className="text-gray-400 text-sm max-w-sm mb-6">
        Una campaña agrupa a tus repartidores o trabajadores de campo. Ellos ingresan con el código
        de campaña desde su celular.
      </p>
      <Link
        to="/campaigns/new"
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
      >
        <Plus className="w-4 h-4" />
        Crear campaña
      </Link>
    </div>
  );
}
