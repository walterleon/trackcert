import { useEffect, useState, useCallback } from 'react';
import {
  CreditCard,
  Crown,
  Coins,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  XCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  apiGetPlans,
  apiGetPaymentStatus,
  apiGetPaymentHistory,
  apiSubscribePlan,
  apiChangePlan,
  apiBuyCredits,
  apiCancelSubscription,
  type PlanInfo,
  type CreditPack,
  type PaymentStatusResponse,
  type PaymentInfo,
} from '../api/companyApi';

function formatArs(amount: number): string {
  return '$' + Math.round(amount).toLocaleString('es-AR');
}

const PLAN_COLORS: Record<string, { badge: string; border: string }> = {
  gratis: {
    badge: 'bg-gray-700 text-gray-300',
    border: 'border-gray-600',
  },
  pro: {
    badge: 'bg-blue-500/20 text-blue-400',
    border: 'border-blue-500',
  },
  empresas: {
    badge: 'bg-purple-500/20 text-purple-400',
    border: 'border-purple-500',
  },
};

interface BillingSectionProps {
  token: string;
}

export function BillingSection({ token }: BillingSectionProps) {
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [status, setStatus] = useState<PaymentStatusResponse | null>(null);
  const [payments, setPayments] = useState<PaymentInfo[]>([]);
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentTotalPages, setPaymentTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [plansData, statusData, historyData] = await Promise.all([
        apiGetPlans(),
        apiGetPaymentStatus(token),
        apiGetPaymentHistory(token, 1),
      ]);
      setPlans(plansData.plans);
      setCreditPacks(plansData.creditPacks);
      setStatus(statusData);
      setPayments(historyData.payments);
      setPaymentTotalPages(Math.max(1, Math.ceil(historyData.total / historyData.pageSize)));
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos de facturacion.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadHistory = async (page: number) => {
    try {
      const data = await apiGetPaymentHistory(token, page);
      setPayments(data.payments);
      setPaymentPage(data.page);
      setPaymentTotalPages(Math.max(1, Math.ceil(data.total / data.pageSize)));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubscribe = async (planName: string) => {
    setActionLoading(`subscribe-${planName}`);
    setError('');
    try {
      const { checkoutUrl } = await apiSubscribePlan(token, planName);
      window.location.href = checkoutUrl;
    } catch (err: any) {
      setError(err.message);
      setActionLoading(null);
    }
  };

  const handleChangePlan = async (planName: string) => {
    setActionLoading(`change-${planName}`);
    setError('');
    try {
      const { checkoutUrl } = await apiChangePlan(token, planName);
      window.location.href = checkoutUrl;
    } catch (err: any) {
      setError(err.message);
      setActionLoading(null);
    }
  };

  const handleBuyCredits = async (packId: string) => {
    setActionLoading(`buy-${packId}`);
    setError('');
    try {
      const { checkoutUrl } = await apiBuyCredits(token, packId);
      window.location.href = checkoutUrl;
    } catch (err: any) {
      setError(err.message);
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('¿Estas seguro de que queres cancelar tu suscripcion? Tu plan pasara a Gratis al final del periodo.')) {
      return;
    }
    setActionLoading('cancel');
    setError('');
    try {
      await apiCancelSubscription(token);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  const currentPlan = status?.company?.planName ?? 'gratis';
  const credits = status?.company?.credits ?? 0;
  const bonusCredits = status?.company?.bonusCredits ?? 0;
  const totalCredits = credits + bonusCredits;
  const sub = status?.subscription;
  const hasActiveSub = sub && (sub.status === 'active' || sub.status === 'grace_period');
  const isGracePeriod = sub?.status === 'grace_period';
  let graceDaysLeft = 0;
  if (isGracePeriod && sub?.gracePeriodEnd) {
    graceDaysLeft = Math.max(0, Math.ceil((new Date(sub.gracePeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Plan Status */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-400" />
          Tu Plan
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <span className="text-sm text-gray-400">Plan actual</span>
            <div className="mt-1">
              <span className={`inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full font-semibold ${PLAN_COLORS[currentPlan]?.badge || PLAN_COLORS.gratis.badge}`}>
                {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
              </span>
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-400">Creditos mensuales</span>
            <p className="text-white font-semibold mt-1">{credits}</p>
          </div>
          <div>
            <span className="text-sm text-gray-400">Creditos bonus</span>
            <p className="text-white font-semibold mt-1">{bonusCredits}</p>
          </div>
          <div>
            <span className="text-sm text-gray-400">Total disponible</span>
            <p className="text-white font-bold text-lg mt-1">{totalCredits}</p>
          </div>
          {sub?.status === 'active' && sub.nextRenewalDate && (
            <div>
              <span className="text-sm text-gray-400">Proxima renovacion</span>
              <p className="text-white font-semibold mt-1">
                {format(new Date(sub.nextRenewalDate), 'd MMM yyyy', { locale: es })}
              </p>
            </div>
          )}
        </div>
        {isGracePeriod && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mt-4 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              Periodo de gracia: te quedan <strong>{graceDaysLeft} dias</strong> para renovar tu suscripcion antes de perder el plan.
            </span>
          </div>
        )}
      </div>

      {/* Plan Cards */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Planes disponibles</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.name === currentPlan;
            const colors = PLAN_COLORS[plan.name] || PLAN_COLORS.gratis;
            const isPayable = plan.name !== 'gratis';
            const isLoading =
              actionLoading === `subscribe-${plan.name}` ||
              actionLoading === `change-${plan.name}`;

            return (
              <div
                key={plan.name}
                className={`bg-gray-900 border rounded-xl p-5 ${isCurrent ? colors.border + ' border-2' : 'border-gray-800'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-bold text-lg">
                    {plan.name.charAt(0).toUpperCase() + plan.name.slice(1)}
                  </h3>
                  {isCurrent && (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${colors.badge}`}>
                      Actual
                    </span>
                  )}
                </div>

                <p className="text-2xl font-bold text-white mb-1">
                  {plan.priceArs === 0 ? 'Gratis' : `${formatArs(plan.priceArs)}/mes`}
                </p>

                <ul className="space-y-2 mt-4 text-sm text-gray-300">
                  <li className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-yellow-400" />
                    {plan.monthlyCredits} creditos/mes
                  </li>
                  <li className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-400" />
                    {plan.maxCampaigns} campana{plan.maxCampaigns !== 1 ? 's' : ''}
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-400" />
                    {plan.trailHours}h de recorrido
                  </li>
                </ul>

                {isPayable && !isCurrent && (
                  <button
                    onClick={() =>
                      hasActiveSub ? handleChangePlan(plan.name) : handleSubscribe(plan.name)
                    }
                    disabled={!!actionLoading}
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {hasActiveSub ? 'Cambiar plan' : 'Suscribirme'}
                  </button>
                )}

                {plan.name === 'gratis' && !isCurrent && (
                  <p className="mt-4 text-xs text-gray-500 text-center">
                    Cancela tu suscripcion para volver al plan gratis
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Credit Packs */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Coins className="w-5 h-5 text-yellow-400" />
          Comprar creditos extra
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {creditPacks.map((pack) => {
            const isLoading = actionLoading === `buy-${pack.id}`;
            return (
              <div
                key={pack.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5"
              >
                <p className="text-2xl font-bold text-white">{pack.size} creditos</p>
                <p className="text-lg text-gray-300 mt-1">{formatArs(pack.priceArs)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatArs(Math.round(pack.priceArs / pack.size))}/credito
                </p>
                <button
                  onClick={() => handleBuyCredits(pack.id)}
                  disabled={!!actionLoading}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Comprar
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment History */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-gray-400" />
          Historial de pagos
        </h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {payments.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm">Sin pagos aun</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400 text-left">
                      <th className="px-4 py-3 font-medium">Fecha</th>
                      <th className="px-4 py-3 font-medium">Tipo</th>
                      <th className="px-4 py-3 font-medium">Monto</th>
                      <th className="px-4 py-3 font-medium">Estado</th>
                      <th className="px-4 py-3 font-medium">Creditos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-gray-800/50 text-gray-300">
                        <td className="px-4 py-3">
                          {format(new Date(p.createdAt), 'd MMM yyyy', { locale: es })}
                        </td>
                        <td className="px-4 py-3">
                          {p.type === 'subscription' ? 'Suscripcion' : 'Creditos'}
                        </td>
                        <td className="px-4 py-3 text-white font-medium">
                          {formatArs(p.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <PaymentStatusBadge status={p.status} />
                        </td>
                        <td className="px-4 py-3">
                          {p.creditsGranted ? `+${p.creditsGranted}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {paymentTotalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
                  <button
                    onClick={() => loadHistory(paymentPage - 1)}
                    disabled={paymentPage <= 1}
                    className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed p-1"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-gray-400">
                    Pagina {paymentPage} de {paymentTotalPages}
                  </span>
                  <button
                    onClick={() => loadHistory(paymentPage + 1)}
                    disabled={paymentPage >= paymentTotalPages}
                    className="text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed p-1"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Cancel Subscription */}
      {hasActiveSub && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-2">Cancelar suscripcion</h2>
          <p className="text-sm text-gray-400 mb-4">
            Si cancelas, tu plan pasara a Gratis. Tus creditos bonus se mantienen.
          </p>
          <button
            onClick={handleCancel}
            disabled={!!actionLoading}
            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {actionLoading === 'cancel' && <Loader2 className="w-4 h-4 animate-spin" />}
            Cancelar suscripcion
          </button>
        </div>
      )}
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'approved':
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
          <CheckCircle className="w-3 h-3" />
          Aprobado
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400">
          <Clock className="w-3 h-3" />
          Pendiente
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400">
          <XCircle className="w-3 h-3" />
          Rechazado
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-400">
          {status}
        </span>
      );
  }
}
