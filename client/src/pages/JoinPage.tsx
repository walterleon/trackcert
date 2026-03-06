import { useSearchParams } from 'react-router-dom';
import { Smartphone, Copy, CheckCheck } from 'lucide-react';
import { useState } from 'react';

export function JoinPage() {
  const [params] = useSearchParams();
  const code = params.get('code') ?? '';
  const pin = params.get('pin') ?? '';
  const [copied, setCopied] = useState(false);

  const deepLink = `rastreoya://join?code=${encodeURIComponent(code)}&pin=${encodeURIComponent(pin)}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`Código: ${code}\nPIN: ${pin}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!code || !pin) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400 p-6 text-center">
        Link de invitación inválido. Pedile un nuevo link al organizador de la campaña.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Smartphone className="w-8 h-8 text-blue-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-1">RastreoYa</h1>
        <p className="text-gray-400 text-sm mb-6">Unirse a la campaña</p>

        <div className="bg-gray-950 rounded-xl p-4 mb-4 text-left space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Código de campaña</p>
            <p className="font-mono text-lg font-bold text-white tracking-widest">{code}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">PIN de ingreso</p>
            <p className="font-mono text-lg font-bold text-white tracking-widest">{pin}</p>
          </div>
        </div>

        <a
          href={deepLink}
          className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl mb-3 transition-colors"
        >
          <Smartphone className="w-5 h-5" />
          Abrir en RastreoYa
        </a>

        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-2 w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 rounded-xl transition-colors text-sm"
        >
          {copied ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copiado' : 'Copiar código y PIN'}
        </button>

        <p className="text-xs text-gray-600 mt-4">
          ¿No tenés la app? Descargala en la tienda de tu dispositivo buscando <span className="text-gray-400">RastreoYa</span>.
        </p>
      </div>
    </div>
  );
}
