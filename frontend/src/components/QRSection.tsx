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
      <div className="flex justify-center items-center h-48 bg-white border border-[#EAE8E4] rounded-2xl">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5E6F58]"></div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#EAE8E4] rounded-2xl p-8 flex flex-col md:flex-row items-center gap-8 shadow-[0_4px_20px_rgb(28,25,23,0.01)]">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#EAE8E4]">
        {qrCodeUrl ? (
          <img src={qrCodeUrl} alt="Menu QR Code" className="w-44 h-44 block" />
        ) : (
          <div className="w-44 h-44 flex items-center justify-center bg-[#F6F4F0] text-[#7A7571] rounded-xl">
            <QrCode size={44} />
          </div>
        )}
      </div>

      <div className="flex-1 text-center md:text-left space-y-4">
        <h2 className="text-xl font-bold text-[#1C1917]">Cafe QR Code</h2>
        <p className="text-sm text-[#7A7571] max-w-md leading-relaxed">
          Print this QR code and paste it on tables. Customers can scan it to instantly view your digital menu on their mobile devices without signing up.
        </p>

        <div className="bg-[#F6F4F0] border border-[#E5E2DC] px-4 py-2.5 rounded-xl flex items-center justify-between gap-2 overflow-x-auto">
          <span className="text-xs text-[#5E6F58] font-mono select-all truncate font-semibold">{publicUrl}</span>
          <button
            onClick={handleCopy}
            className="text-[#7A7571] hover:text-[#1C1917] p-1.5 hover:bg-[#FAF9F5] rounded-lg transition-all shrink-0"
            title="Copy Menu Link"
          >
            {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
          </button>
        </div>

        <div className="flex flex-wrap gap-3 justify-center md:justify-start">
          <button
            onClick={handleDownload}
            disabled={!qrCodeUrl}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#5E6F58] hover:bg-[#4E5D49] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
          >
            <Download size={14} />
            Download QR Code
          </button>
        </div>
      </div>
    </div>
  );
}
