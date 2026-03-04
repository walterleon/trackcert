import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { apiRegister } from '../api/companyApi';
import { useAuthStore } from '../store/useAuthStore';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { token, company } = await apiRegister(name, email, password);
      setAuth(token, company);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <MapPin className="w-8 h-8 text-blue-400" />
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              RastreoYa
            </span>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-xl font-bold text-white mb-1">Crear cuenta</h1>
          <p className="text-gray-400 text-sm mb-6">Empezá gratis, sin tarjeta de crédito</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nombre de la empresa</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mi Empresa SRL"
                className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="empresa@ejemplo.com"
                className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-all"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta gratuita'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
              Iniciá sesión
            </Link>
          </p>
        </div>

        <p className="text-center text-gray-600 text-xs mt-4">
          Plan gratuito: 1 campaña, 3 repartidores, 10 fotos/día
        </p>
      </div>
    </div>
  );
}
