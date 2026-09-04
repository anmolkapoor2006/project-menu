import { useState, useEffect } from 'react';
import api from '../api/api';
import { Download, Copy, Check, QrCode, ExternalLink } from 'lucide-react';

interface QRSectionProps {
  restaurantId: string;
}

export default function QRSection({ restaurantId }: QRSectionProps) {
  const cached = (() => {
    try {
      const data = sessionStorage.getItem(`qrcode_${restaurantId}`);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  })();

  const [qrCodeUrl, setQrCodeUrl] = useState(cached?.qrCodeUrl || '');
  const [publicUrl, setPublicUrl] = useState(cached?.publicUrl || '');
  const [loading, setLoading] = useState(!cached);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchQR() {
      try {
        const response = await api.get(`/api/restaurants/${restaurantId}/qrcode`);
        setQrCodeUrl(response.data.qrCodeUrl);
        setPublicUrl(response.data.publicUrl);
        sessionStorage.setItem(`qrcode_${restaurantId}`, JSON.stringify({
          qrCodeUrl: response.data.qrCodeUrl,
          publicUrl: response.data.publicUrl,
        }));
      } catch (err) {
        console.error('Failed to load QR code', err);
      } finally {
        setLoading(false);
      }
    }
    if (restaurantId) fetchQR();
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
      <div className="bg-white rounded-3xl border border-[var(--cream-border)] p-8 flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--sage)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-[var(--cream-border)] shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--cream-dark)]">
        <h2 className="text-lg font-semibold text-[var(--text)]">Your Menu QR Code</h2>
        <p className="text-xs text-[var(--muted)] mt-0.5">Print and place on tables — customers scan to order</p>
      </div>

      <div className="p-6 flex flex-col md:flex-row items-center gap-8">
        {/* QR Display */}
        <div className="bg-[var(--cream)] p-5 rounded-2xl border border-[var(--cream-border)] shrink-0">
          {qrCodeUrl ? (
            <img src={qrCodeUrl} alt="Menu QR Code" className="w-52 h-52 block" />
          ) : (
            <div className="w-52 h-52 flex items-center justify-center text-[var(--muted)]">
              <QrCode size={52} />
            </div>
          )}
        </div>

        {/* Info & Actions */}
        <div className="flex-1 space-y-5 text-center md:text-left">
          <div>
            <h3 className="text-xl font-display font-medium text-[var(--text)]">Share your menu link</h3>
            <p className="text-sm text-[var(--muted)] mt-1 leading-relaxed max-w-sm">
              Customers scan this QR code to instantly browse your menu and place orders — no app download required.
            </p>
          </div>

          {/* URL pill */}
          <div className="bg-[var(--cream)] border border-[var(--cream-border)] px-4 py-3 rounded-2xl flex items-center justify-between gap-3 overflow-hidden">
            <span className="text-xs text-[var(--sage)] font-mono font-semibold truncate">{publicUrl}</span>
            <button
              onClick={handleCopy}
              title="Copy"
              className="shrink-0 p-1.5 rounded-lg hover:bg-[var(--cream-dark)] text-[var(--muted)] hover:text-[var(--text)] transition-all"
            >
              {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 justify-center md:justify-start">
            <button
              onClick={handleDownload}
              disabled={!qrCodeUrl}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--sage)] hover:bg-[var(--sage-mid)] text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-sm shadow-[var(--sage)]/20"
            >
              <Download size={15} /> Download QR
            </button>
            {publicUrl && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 border border-[var(--cream-border)] hover:bg-[var(--cream)] text-[var(--muted)] hover:text-[var(--text)] rounded-xl text-sm font-semibold transition-all"
              >
                <ExternalLink size={15} /> Preview Menu
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
