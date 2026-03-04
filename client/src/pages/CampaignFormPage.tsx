import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { apiCreateCampaign } from '../api/companyApi';
import { DashboardLayout } from '../components/layout/DashboardLayout';

export function CampaignFormPage() {
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const campaign = await apiCreateCampaign(token, {
        title: form.title,
        description: form.description || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      });
      navigate(`/campaigns/${campaign.id}`);
    } catch (err: any) {
      setError(err.message || 'Error al crear la campaña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al dashboard
        </button>

        <h1 className="text-2xl font-bold text-white mb-1">Nueva campaña</h1>
        <p className="text-gray-400 text-sm mb-6">
          Completá los datos y te generamos un código para que tus repartidores puedan unirse.
        </p>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Nombre de la campaña <span className="text-red-400">*</span>
              </label>
              <input
                name="title"
                required
                value={form.title}
                onChange={handleChange}
                placeholder="Ej: Reparto zona norte - Junio"
                className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Descripción (opcional)</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                placeholder="Distribución de folletería en barrios norte..."
                className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Fecha inicio (opcional)</label>
                <input
                  type="date"
                  name="startDate"
                  value={form.startDate}
                  onChange={handleChange}
                  className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Fecha fin (opcional)</label>
                <input
                  type="date"
                  name="endDate"
                  value={form.endDate}
                  onChange={handleChange}
                  className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
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
              {loading ? 'Creando campaña...' : 'Crear campaña'}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
