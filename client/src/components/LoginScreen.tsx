import { useState } from 'react';
import { apiClient } from '../api/client';
import { useTrackingStore } from '../store/useTrackingStore';
import { MapPin } from 'lucide-react';

export const LoginScreen = () => {
    const [campaignId, setCampaignId] = useState('');
    const [code, setCode] = useState('');
    const [alias, setAlias] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const setSession = useTrackingStore(state => state.setSession);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const data = await apiClient.validateCampaign(campaignId, code, alias);
            if (data.success) {
                setSession(data.driverId, campaignId);
            }
        } catch (err) {
            setError('Connection failed or Invalid Credentials. Try "demo" as ID.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700">
                <div className="flex justify-center mb-6">
                    <div className="p-3 bg-blue-500/20 rounded-full">
                        <MapPin className="w-10 h-10 text-blue-400" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-center text-white mb-2">TrackCert Driver</h2>
                <p className="text-center text-gray-400 mb-6">Enter campaign details to start</p>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Campaign ID</label>
                        <Input
                            placeholder="e.g. CMP-123"
                            value={campaignId}
                            onChange={e => setCampaignId(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Validation Code</label>
                        <Input
                            type="password"
                            placeholder="••••••"
                            value={code}
                            onChange={e => setCode(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Your Alias</label>
                        <Input
                            placeholder="e.g. John Doe"
                            value={alias}
                            onChange={e => setAlias(e.target.value)}
                        />
                    </div>

                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50"
                    >
                        {loading ? 'Validating...' : 'Join Campaign'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        {...props}
        className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
    />
);
