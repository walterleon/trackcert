import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin, Camera, Share2, Shield, Smartphone, ArrowRight, CheckCircle2,
  Heart, Users, Package, ClipboardList, Route, Clock, Eye,
} from 'lucide-react';
import { apiGetPlans, type PlanInfo } from '../api/companyApi';

// ─── Use cases ──────────────────────────────────────────────────────────────

const useCases = [
  {
    icon: Package,
    title: 'Delivery y repartos',
    description: 'Controlá tu flota de repartidores en tiempo real. Sabé quién entregó qué, dónde y cuándo.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    icon: ClipboardList,
    title: 'Distribución de folletos',
    description: 'Verificá que tus promotores realmente recorrieron las zonas asignadas con el rastro GPS.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    icon: Users,
    title: 'Equipos en calle',
    description: 'Técnicos, vendedores, relevadores: seguí a tu equipo de campo sin apps complicadas.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    icon: Heart,
    title: 'Familias y cuidadores',
    description: 'Acompañá a personas con Alzheimer o adultos mayores. Sabé dónde están, con amor y respeto.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    badge: 'Siempre gratis',
  },
];

// ─── Features ───────────────────────────────────────────────────────────────

const features = [
  {
    icon: MapPin,
    title: 'Rastreo en tiempo real',
    description: 'Ubicación exacta de cada persona en un mapa interactivo con actualizaciones al instante.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Route,
    title: 'Rastro del recorrido',
    description: 'Visualizá el camino completo recorrido con polylines de colores sobre el mapa.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Camera,
    title: 'Fotos geolocalizadas',
    description: 'Fotos con ubicación y hora como comprobante, visibles al instante en tu panel.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    icon: Share2,
    title: 'Link de seguimiento',
    description: 'Compartí un link con PIN para que otros vean la ubicación en tiempo real.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Smartphone,
    title: 'App liviana',
    description: 'App Android sin complicaciones. Se une con un código y empieza a trackear en segundos.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
  },
  {
    icon: Clock,
    title: 'Detección de paradas',
    description: 'Sabé cuándo y dónde se detuvo cada persona, con tiempos exactos de espera.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
];

// ─── Steps ──────────────────────────────────────────────────────────────────

const steps = [
  { number: '1', title: 'Creá una campaña', description: 'Registrate gratis y creá tu primera campaña en segundos. Sin tarjeta de crédito.' },
  { number: '2', title: 'Sumá personas', description: 'Compartí el código de unión. Se conectan desde el celular en un toque.' },
  { number: '3', title: 'Seguí todo en vivo', description: 'Mirá la ubicación, recorrido y fotos desde tu panel o compartí el link de seguimiento.' },
];

// ─── Plan display config ────────────────────────────────────────────────────

const PLAN_DISPLAY: Record<string, { label: string; highlighted: boolean; cta: string; badge?: string }> = {
  gratis: { label: 'Gratis', highlighted: false, cta: 'Empezar gratis' },
  pro: { label: 'Pro', highlighted: true, cta: 'Comenzar con Pro', badge: 'Popular' },
  empresas: { label: 'Empresas', highlighted: false, cta: 'Contactar ventas' },
};

function formatPrice(amount: number, currency: 'ARS' | 'USD'): string {
  if (amount === 0) return '$0';
  if (currency === 'USD') return `US$${amount.toLocaleString('es-AR', { minimumFractionDigits: amount % 1 !== 0 ? 2 : 0 })}`;
  return `$${Math.round(amount).toLocaleString('es-AR')}`;
}

function planFeatures(p: PlanInfo): string[] {
  const list: string[] = [];
  list.push(p.maxCampaigns === -1 ? 'Campañas ilimitadas' : `${p.maxCampaigns} campaña${p.maxCampaigns > 1 ? 's' : ''}`);
  list.push(`${p.monthlyCredits} créditos/mes`);
  list.push(p.maxPhotos === -1 ? 'Fotos ilimitadas' : `${p.maxPhotos} fotos/mes`);
  const days = Math.round(p.trailHours / 24);
  list.push(`Historial de ${days > 1 ? `${days} días` : `${p.trailHours}h`}`);
  list.push('Link de seguimiento');
  list.push('Detección de paradas');
  return list;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function LandingPage() {
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');

  useEffect(() => {
    apiGetPlans()
      .then((data) => setPlans(data.plans))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ─── Navbar ──────────────────────────────────────────────────────── */}
      <nav className="border-b border-gray-800/50 backdrop-blur-sm bg-gray-950/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/20 rounded-lg">
              <MapPin className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              RastreoYa
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-2">
              Iniciar sesion
            </Link>
            <Link to="/register" className="text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg transition-colors">
              Registrate gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs text-blue-300 font-medium">Rastreo GPS simple y en tiempo real</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Sabe donde estan{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-blue-300 to-emerald-400">
                las personas que te importan
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Plataforma de rastreo GPS para empresas, equipos y familias. Segui la ubicacion y el recorrido de quien necesites, en tiempo real.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="group flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 text-base"
              >
                Empezar gratis
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                to="/login"
                className="flex items-center gap-2 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-600 font-medium px-8 py-3.5 rounded-xl transition-all text-base"
              >
                Ya tengo cuenta
              </Link>
            </div>
            <p className="mt-4 text-xs text-gray-600">Sin tarjeta de credito. Configuralo en 2 minutos.</p>
          </div>

          {/* Hero visual - Map mockup */}
          <div className="mt-16 max-w-4xl mx-auto">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-1 shadow-2xl shadow-black/50">
              <div className="bg-gray-800 rounded-xl overflow-hidden relative" style={{ height: '360px' }}>
                <div className="absolute inset-0 opacity-10">
                  <div className="grid grid-cols-12 grid-rows-8 h-full">
                    {Array.from({ length: 96 }).map((_, i) => (
                      <div key={i} className="border border-gray-600/30" />
                    ))}
                  </div>
                </div>
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 360" fill="none">
                  <path d="M100,280 C150,260 180,200 250,180 S350,140 400,160 S480,200 520,170 S600,100 680,120"
                    stroke="url(#routeGrad)" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.8" />
                  <path d="M200,300 C230,280 280,250 320,260 S400,280 450,240 S530,180 600,200"
                    stroke="#10b981" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6" />
                  <path d="M80,180 C130,160 200,140 260,150 S340,190 380,170 S440,130 500,140"
                    stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.5" strokeDasharray="8,4" />
                  <defs>
                    <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#60a5fa" />
                    </linearGradient>
                  </defs>
                  <circle cx="680" cy="120" r="8" fill="#3b82f6" opacity="0.9" />
                  <circle cx="680" cy="120" r="14" fill="#3b82f6" opacity="0.2">
                    <animate attributeName="r" from="10" to="20" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.3" to="0" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="600" cy="200" r="8" fill="#10b981" opacity="0.9" />
                  <circle cx="600" cy="200" r="14" fill="#10b981" opacity="0.2">
                    <animate attributeName="r" from="10" to="20" dur="2s" begin="0.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.3" to="0" dur="2s" begin="0.5s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="500" cy="140" r="7" fill="#f59e0b" opacity="0.9" />
                </svg>
                <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-lg">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Personas activas</p>
                  <p className="text-xl font-bold text-white mt-0.5">12</p>
                  <p className="text-[10px] text-emerald-400">8 en movimiento</p>
                </div>
                <div className="absolute bottom-4 right-4 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <p className="text-xs text-gray-300">Carlos M.</p>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Av. Corrientes 3200 - hace 5s</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Use Cases ───────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 border-t border-gray-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">Una plataforma, muchos usos</h2>
            <p className="mt-4 text-gray-400 text-lg max-w-2xl mx-auto">
              Desde repartos hasta el cuidado de un ser querido. RastreoYa se adapta.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {useCases.map((uc) => (
              <div
                key={uc.title}
                className={`relative bg-gray-900/50 border ${uc.border} rounded-xl p-6 hover:bg-gray-900/80 transition-colors`}
              >
                {uc.badge && (
                  <span className="absolute top-4 right-4 text-[10px] uppercase tracking-wider font-semibold text-rose-400 bg-rose-500/10 rounded-full px-3 py-1">
                    {uc.badge}
                  </span>
                )}
                <div className={`inline-flex p-2.5 rounded-lg ${uc.bg} mb-4`}>
                  <uc.icon className={`w-5 h-5 ${uc.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{uc.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{uc.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 border-t border-gray-800/50 bg-gray-900/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">Todo lo que necesitas</h2>
            <p className="mt-4 text-gray-400 text-lg max-w-2xl mx-auto">
              Herramientas simples y potentes para saber que pasa en el terreno.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
                <div className={`inline-flex p-2.5 rounded-lg ${f.bg} mb-4`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 border-t border-gray-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">Funcionando en 3 pasos</h2>
            <p className="mt-4 text-gray-400 text-lg">Configuralo en menos de 2 minutos.</p>
          </div>
          <div className="space-y-8">
            {steps.map((step, i) => (
              <div key={step.number} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-lg">
                  {step.number}
                </div>
                <div className={`flex-1 pb-8 ${i < steps.length - 1 ? 'border-b border-gray-800' : ''}`}>
                  <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                  <p className="text-gray-400 mt-1">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Story / Purpose ─────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 border-t border-gray-800/50 bg-gray-900/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <div className="inline-flex p-3 rounded-full bg-rose-500/10 mb-4">
              <Heart className="w-6 h-6 text-rose-400" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold">Por que hacemos esto</h2>
          </div>
          <div className="space-y-6 text-gray-400 leading-relaxed text-base sm:text-lg">
            <p>
              RastreoYa nacio para resolver un problema simple: saber si los folletos se repartieron de verdad.
              Pero mientras lo construiamos, descubrimos algo mas importante.
            </p>
            <p>
              Nos escribio una familia que cuida a un abuelo con Alzheimer. Necesitaban saber donde estaba
              cuando salia a caminar solo. No querian una app cara y complicada &mdash; solo saber que estaba bien.
            </p>
            <p className="text-white font-medium">
              Ese dia decidimos que el plan familiar seria gratis para siempre. Sin creditos, sin limites artificiales,
              sin letra chica. Porque cuidar a alguien que amas no deberia tener un precio.
            </p>
            <p>
              Hoy RastreoYa sirve a empresas de reparto, distribuidores de folletos, equipos de campo y familias
              por igual. La tecnologia es la misma &mdash; lo que cambia es el proposito.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Stats ───────────────────────────────────────────────────────── */}
      <section className="py-16 border-t border-gray-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {[
              { value: '99.9%', label: 'Uptime' },
              { value: '<1s', label: 'Latencia GPS' },
              { value: '24/7', label: 'Monitoreo' },
              { value: '$0', label: 'Para familias' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 border-t border-gray-800/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold">Planes simples, sin sorpresas</h2>
            <p className="mt-4 text-gray-400 text-lg">Empeza gratis y escala cuando lo necesites.</p>
            {/* Currency toggle */}
            <div className="mt-6 inline-flex items-center bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setCurrency('ARS')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  currency === 'ARS' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                ARS
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  currency === 'USD' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                USD
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {plans.map((plan) => {
              const display = PLAN_DISPLAY[plan.name] || { label: plan.name, highlighted: false, cta: 'Empezar' };
              const price = currency === 'ARS' ? plan.priceArs : plan.priceUsd;
              return (
                <div
                  key={plan.name}
                  className={`rounded-2xl p-8 border ${
                    display.highlighted
                      ? 'bg-gray-900 border-blue-500/50 shadow-lg shadow-blue-500/10 relative'
                      : 'bg-gray-900/50 border-gray-800'
                  }`}
                >
                  {display.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wider font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/30 rounded-full px-3 py-1">
                      {display.badge}
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-white">{display.label}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">{formatPrice(price, currency)}</span>
                    <span className="text-gray-500 text-sm">{price === 0 ? 'por siempre' : '/mes'}</span>
                  </div>
                  <ul className="mt-6 space-y-3">
                    {planFeatures(plan).map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    className={`mt-8 block text-center font-semibold py-2.5 rounded-lg transition-all ${
                      display.highlighted
                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    {display.cta}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Fallback if plans haven't loaded yet */}
          {plans.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <div className="inline-block w-6 h-6 border-2 border-gray-600 border-t-blue-400 rounded-full animate-spin" />
              <p className="mt-2 text-sm">Cargando planes...</p>
            </div>
          )}
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 border-t border-gray-800/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-blue-500/20 rounded-2xl p-10 sm:p-14">
            <Shield className="w-10 h-10 text-blue-400 mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold">Empeza a rastrear hoy</h2>
            <p className="mt-4 text-gray-400 max-w-lg mx-auto">
              Registrate en 30 segundos, crea tu primera campana y suma personas. Gratis, sin compromiso.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 mt-8 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 text-base"
            >
              Crear cuenta gratis
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-800/50 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-blue-500/20 rounded">
                <MapPin className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-sm font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                RastreoYa
              </span>
            </div>
            <p className="text-xs text-gray-600">
              &copy; {new Date().getFullYear()} RastreoYa. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
