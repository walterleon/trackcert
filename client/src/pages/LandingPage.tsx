import { Link } from 'react-router-dom';
import { MapPin, Truck, Camera, Share2, Shield, Zap, BarChart3, Smartphone, ArrowRight, CheckCircle2 } from 'lucide-react';

const features = [
  {
    icon: MapPin,
    title: 'Rastreo en tiempo real',
    description: 'Seguí la ubicación exacta de cada repartidor en un mapa interactivo con actualizaciones al instante.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Truck,
    title: 'Rastro del recorrido',
    description: 'Visualizá el camino completo de cada repartidor con polylines de colores sobre el mapa.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Camera,
    title: 'Fotos de entrega',
    description: 'Los repartidores sacan fotos como comprobante de entrega, visibles al instante en tu panel.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    icon: Share2,
    title: 'Link de seguimiento',
    description: 'Compartí un link con PIN para que tus clientes vean el estado del envío en tiempo real.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Smartphone,
    title: 'App para repartidores',
    description: 'App Android liviana. El repartidor se une con un código y empieza a trackear en segundos.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
  },
  {
    icon: Shield,
    title: 'Sin instalación compleja',
    description: 'No necesitás servidores ni configuración. Registrate, creá una campaña y listo.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
];

const steps = [
  { number: '1', title: 'Creá una campaña', description: 'Registrate gratis y creá tu primera campaña de reparto en segundos.' },
  { number: '2', title: 'Sumá repartidores', description: 'Compartí el link de unión. Tus repartidores se unen desde el celular con un código.' },
  { number: '3', title: 'Seguí todo en vivo', description: 'Mirá la ubicación, recorrido y fotos de cada entrega desde tu panel.' },
];

const plans = [
  {
    name: 'Gratis',
    price: '$0',
    period: 'por siempre',
    features: ['1 campaña activa', '3 repartidores', '10 fotos por día', 'Rastreo en tiempo real', 'Link de seguimiento'],
    cta: 'Empezar gratis',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$4.999',
    period: '/mes',
    features: ['Campañas ilimitadas', 'Repartidores ilimitados', 'Fotos ilimitadas', 'Historial de recorridos', 'Soporte prioritario'],
    cta: 'Comenzar prueba',
    highlighted: true,
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
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
            <Link
              to="/login"
              className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-2"
            >
              Iniciar sesion
            </Link>
            <Link
              to="/register"
              className="text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Registrate gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs text-blue-300 font-medium">Rastreo GPS en tiempo real para repartos</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Sabe donde estan{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-blue-300 to-emerald-400">
                tus repartidores
              </span>{' '}
              en todo momento
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Plataforma de rastreo GPS para empresas de reparto. Segui la ubicacion, el recorrido y las entregas de tu flota en tiempo real.
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
                {/* Simulated map grid */}
                <div className="absolute inset-0 opacity-10">
                  <div className="grid grid-cols-12 grid-rows-8 h-full">
                    {Array.from({ length: 96 }).map((_, i) => (
                      <div key={i} className="border border-gray-600/30" />
                    ))}
                  </div>
                </div>
                {/* Simulated route line */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 360" fill="none">
                  <path
                    d="M100,280 C150,260 180,200 250,180 S350,140 400,160 S480,200 520,170 S600,100 680,120"
                    stroke="url(#routeGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.8"
                  />
                  <path
                    d="M200,300 C230,280 280,250 320,260 S400,280 450,240 S530,180 600,200"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.6"
                  />
                  <defs>
                    <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#60a5fa" />
                    </linearGradient>
                  </defs>
                  {/* Driver dots */}
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
                </svg>
                {/* Floating cards */}
                <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-lg">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Repartidores activos</p>
                  <p className="text-xl font-bold text-white mt-0.5">12</p>
                  <p className="text-[10px] text-emerald-400">8 en ruta</p>
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

      {/* Features */}
      <section className="py-20 sm:py-28 border-t border-gray-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">Todo lo que necesitas para controlar tu flota</h2>
            <p className="mt-4 text-gray-400 text-lg max-w-2xl mx-auto">
              Herramientas simples y potentes para saber que pasa con cada reparto.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors"
              >
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

      {/* How it works */}
      <section className="py-20 sm:py-28 border-t border-gray-800/50 bg-gray-900/30">
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

      {/* Stats */}
      <section className="py-16 border-t border-gray-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {[
              { value: '99.9%', label: 'Uptime' },
              { value: '<1s', label: 'Latencia GPS' },
              { value: '24/7', label: 'Monitoreo' },
              { value: '0', label: 'Costo inicial' },
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

      {/* Pricing */}
      <section className="py-20 sm:py-28 border-t border-gray-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">Planes simples, sin sorpresas</h2>
            <p className="mt-4 text-gray-400 text-lg">Empeza gratis y escala cuando lo necesites.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 border ${
                  plan.highlighted
                    ? 'bg-gray-900 border-blue-500/50 shadow-lg shadow-blue-500/10'
                    : 'bg-gray-900/50 border-gray-800'
                }`}
              >
                {plan.highlighted && (
                  <span className="inline-block text-[10px] uppercase tracking-wider font-semibold text-blue-400 bg-blue-500/10 rounded-full px-3 py-1 mb-4">
                    Popular
                  </span>
                )}
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-500 text-sm">{plan.period}</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`mt-8 block text-center font-semibold py-2.5 rounded-lg transition-all ${
                    plan.highlighted
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28 border-t border-gray-800/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-blue-500/20 rounded-2xl p-10 sm:p-14">
            <BarChart3 className="w-10 h-10 text-blue-400 mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold">Empeza a rastrear tu flota hoy</h2>
            <p className="mt-4 text-gray-400 max-w-lg mx-auto">
              Registrate en 30 segundos, crea tu primera campana y suma repartidores. Sin tarjeta, sin compromiso.
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

      {/* Footer */}
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
