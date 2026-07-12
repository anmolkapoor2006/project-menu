import { useState, useEffect } from 'react';
import api from '../api/api';
import { Download, Copy, Check, QrCode } from 'lucide-react';

interface QRSectionProps {
  restaurantId: string;
}

export default function QRSection({ restaurantId }: QRSectionProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [publicUrl, setPublicUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchQR() {
      try {
        const response = await api.get(`/api/restaurants/${restaurantId}/qrcode`);
        setQrCodeUrl(response.data.qrCodeUrl);
        setPublicUrl(response.data.publicUrl);
      } catch (err) {
        console.error('Failed to load QR code', err);
      } finally {
        setLoading(false);
      }
    }
    if (restaurantId) {
      fetchQR();
    }
  }, [restaurantId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = 'menu-qrcode.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row items-center gap-8 shadow-md">
      <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200">
        {qrCodeUrl ? (
          <img src={qrCodeUrl} alt="Menu QR Code" className="w-48 h-48 block" />
        ) : (
          <div className="w-48 h-48 flex items-center justify-center bg-slate-100 text-slate-400">
            <QrCode size={48} />
          </div>
        )}
      </div>

      <div className="flex-1 text-center md:text-left space-y-4">
        <h2 className="text-xl font-bold text-white">Your Menu QR Code</h2>
        <p className="text-sm text-slate-400 max-w-md">
          Print this QR code and place it on tables. Customers can scan it to instantly view your digital menu on their mobile devices without signing up.
        </p>

        <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-lg flex items-center justify-between gap-2 overflow-x-auto">
          <span className="text-xs text-indigo-400 font-mono select-all truncate">{publicUrl}</span>
          <button
            onClick={handleCopy}
            className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded transition-all shrink-0"
            title="Copy Menu Link"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          </button>
        </div>

        <div className="flex flex-wrap gap-3 justify-center md:justify-start">
          <button
            onClick={handleDownload}
            disabled={!qrCodeUrl}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
          >
            <Download size={16} />
            Download QR Code
          </button>
        </div>
      </div>
    </div>
  );
}
