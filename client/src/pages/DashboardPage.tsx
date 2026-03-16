import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, MapPin, Users, Camera, ChevronRight, Power, AlertCircle, Coins, CreditCard, LayoutList, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { apiListCampaigns, apiUpdateCampaign, apiGetPaymentStatus, type Campaign } from '../api/companyApi';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { BillingSection } from '../components/BillingSection';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

type DashboardTab = 'campaigns' | 'billing';

export function DashboardPage() {
  const { token, company, setAuth } = useAuthStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<DashboardTab>('campaigns');
  const [paymentAlert, setPaymentAlert] = useState<{ type: 'success' | 'failure' | 'pending'; message: string } | null>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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

  // Handle payment redirect params
  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment && token) {
      const messages: Record<string, { type: 'success' | 'failure' | 'pending'; message: string }> = {
        success: { type: 'success', message: 'Pago procesado con exito. Tus creditos se actualizaran en breve.' },
        failure: { type: 'failure', message: 'El pago no pudo completarse. Intenta de nuevo.' },
        pending: { type: 'pending', message: 'Tu pago esta pendiente de confirmacion. Te notificaremos cuando se acredite.' },
      };
      setPaymentAlert(messages[payment] || null);
      setTab('billing');

      // Refresh payment status to update credits
      apiGetPaymentStatus(token).then((status) => {
        if (company) {
          setAuth(token, {
            ...company,
            credits: status.company.credits,
            bonusCredits: status.company.bonusCredits,
            planName: status.company.planName,
          });
        }
      }).catch(() => { /* silent */ });

      // Remove query param
      searchParams.delete('payment');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, token]);

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

  const totalCredits = (company?.credits ?? 0) + (company?.bonusCredits ?? 0);
  const noCredits = company?.role !== 'SUPER_ADMIN' && totalCredits <= 0;

  return (
    <DashboardLayout>
      {/* Payment alert from redirect */}
      {paymentAlert && (
        <div
          className={`flex items-center gap-3 rounded-lg px-4 py-3 mb-4 ${
            paymentAlert.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30'
              : paymentAlert.type === 'failure'
              ? 'bg-red-500/10 border border-red-500/30'
              : 'bg-yellow-500/10 border border-yellow-500/30'
          }`}
        >
          {paymentAlert.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
          {paymentAlert.type === 'failure' && <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
          {paymentAlert.type === 'pending' && <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0" />}
          <p className={`text-sm ${
            paymentAlert.type === 'success' ? 'text-emerald-400' : paymentAlert.type === 'failure' ? 'text-red-400' : 'text-yellow-400'
          }`}>
            {paymentAlert.message}
          </p>
          <button
            onClick={() => setPaymentAlert(null)}
            className="ml-auto text-gray-500 hover:text-gray-300"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {noCredits && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 mb-4">
          <Coins className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-amber-400 text-sm font-medium">Sin creditos disponibles</p>
            <p className="text-amber-400/70 text-xs">Tus repartidores siguen enviando datos, pero no podes ver el mapa ni los recorridos hasta recargar creditos.</p>
          </div>
          <button
            onClick={() => setTab('billing')}
            className="bg-amber-500 hover:bg-amber-400 text-black px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0"
          >
            Ver planes
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-800 mb-6">
        <button
          onClick={() => setTab('campaigns')}
          className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'campaigns'
              ? 'border-blue-500 text-white'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          <LayoutList className="w-4 h-4" />
          Campanas
        </button>
        <button
          onClick={() => setTab('billing')}
          className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'billing'
              ? 'border-blue-500 text-white'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Plan y Facturacion
        </button>
      </div>

      {tab === 'campaigns' ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Mis Campanas</h1>
              <p className="text-gray-400 text-sm mt-1">
                {campaigns.length === 0 ? 'No tenes campanas aun' : `${campaigns.length} campana(s) en total`}
              </p>
            </div>
            <Link
              to="/campaigns/new"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva campana
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
        </>
      ) : (
        token && <BillingSection token={token} />
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
