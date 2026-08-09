import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import io from 'socket.io-client';
import api from '../api/api';
import { API_BASE_URL } from '../config';
import {
  Store, Phone, MapPin, Search, AlertCircle, Loader2,
  ShoppingCart, Plus, Minus, X, Check, Utensils, ClipboardList,
  MessageCircle, Bell, QrCode, ExternalLink, Clock, CheckCircle2, ArrowLeft, ChevronRight
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface MenuItem {
  id: string; name: string; description: string | null; price: string;
  imageUrl: string | null; isVeg: boolean; isAvailable: boolean;
  badge: string | null; prepTime?: string | null;
}
interface MenuCategory { id: string; name: string; items: MenuItem[]; }
interface Restaurant {
  id: string; name: string; logoUrl: string | null; address: string | null;
  contactNumber: string | null; upiId?: string | null; upiPayeeName?: string | null;
  upiQrImageUrl?: string | null; isAcceptingOrders: boolean; categories: MenuCategory[];
}
interface CartItem { menuItem: MenuItem; quantity: number; notes: string; }

// ─── View states ──────────────────────────────────────────────────────────────
type View = 'menu' | 'cart' | 'checkout' | 'confirmation';

// ─── Component ────────────────────────────────────────────────────────────────
export default function PublicMenu() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();

  // Data
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logoError, setLogoError] = useState(false);

  // View
  const [view, setView] = useState<View>('menu');

  // Menu browsing
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVeg, setFilterVeg] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [activeCategory, setActiveCategory] = useState('');

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // Checkout form
  const [customerName, setCustomerName] = useState('');
  const [nameError, setNameError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COUNTER' | 'UPI'>('COUNTER');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Order confirmation
  const [lastPlacedOrder, setLastPlacedOrder] = useState<any>(null);

  // UPI
  const [upiQrCodeUrl, setUpiQrCodeUrl] = useState('');
  const [upiDeepLink, setUpiDeepLink] = useState('');

  // Staff call
  const [showCallStaffModal, setShowCallStaffModal] = useState(false);
  const [callStaffTable, setCallStaffTable] = useState('');
  const [callStaffType, setCallStaffType] = useState('Call Waiter');
  const [callingStaff, setCallingStaff] = useState(false);
  const [staffCalledMsg, setStaffCalledMsg] = useState('');

  // Toast
  const [confirmedToast, setConfirmedToast] = useState('');


  const categoryRefs = useRef<{ [id: string]: HTMLElement | null }>({});

  useEffect(() => {
    const locked = view === 'cart' || showCallStaffModal;
    if (locked) {
      const y = window.scrollY;
      document.body.style.cssText = `position:fixed;top:-${y}px;width:100%;overflow:hidden`;
    } else {
      const y = parseInt(document.body.style.top || '0', 10);
      document.body.style.cssText = '';
      if (y) window.scrollTo(0, -y);
    }
    return () => { document.body.style.cssText = ''; };
  }, [view, showCallStaffModal]);

  // ── Load menu ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      if (!slug) return;
      try {
        const res = await api.get(`/api/public/menu/${slug}`);
        const rest = res.data.restaurant;
        setRestaurant(rest);
        if (rest.categories?.length) setActiveCategory(rest.categories[0].id);

        const src = searchParams.get('src') || 'direct_link';
        await api.post(`/api/public/menu/${slug}/view-event?src=${src}`);

        const isFresh = searchParams.get('reset') === 'true' || searchParams.get('fresh') === 'true';
        if (isFresh) localStorage.removeItem(`last_order_${slug}`);

        const existingId = !isFresh && (searchParams.get('orderId') || localStorage.getItem(`last_order_${slug}`));
        if (existingId) {
          try {
            const orderRes = await api.get(`/api/public/orders/${existingId}`);
            if (orderRes.data.order) { setLastPlacedOrder(orderRes.data.order); setView('confirmation'); }
          } catch { /* no existing order */ }
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Menu could not be loaded.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, searchParams]);

  // ── Socket for order updates ───────────────────────────────────────────────
  useEffect(() => {
    if (!restaurant?.id || !lastPlacedOrder?.id) return;
    const socket = io(API_BASE_URL);
    socket.on('connect', () => socket.emit('join_restaurant', restaurant.id));
    socket.on('order_updated', (updated: any) => {
      if (updated.id !== lastPlacedOrder.id) return;
      const prev = lastPlacedOrder.status;
      setLastPlacedOrder(updated);
      if (prev === 'PAYMENT_PENDING_VERIFICATION' && updated.status === 'RECEIVED') {
        setConfirmedToast('✅ Payment confirmed — your order is received!');
        setTimeout(() => setConfirmedToast(''), 8000);
      }
    });
    return () => { socket.disconnect(); };
  }, [restaurant?.id, lastPlacedOrder?.id]);

  // ── Generate UPI QR ───────────────────────────────────────────────────────
  useEffect(() => {
    async function gen() {
      const upiId = restaurant?.upiId;
      if (!upiId) return;
      const payee = restaurant?.upiPayeeName || restaurant?.name || 'Cafe';
      const amount = cart.reduce((s, i) => s + parseFloat(i.menuItem.price) * i.quantity, 0).toFixed(2);
      const link = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payee)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Cafe Order')}`;
      setUpiDeepLink(link);
      try {
        const url = await QRCode.toDataURL(link, { width: 300, margin: 2, color: { dark: '#1A1208', light: '#ffffff' } });
        setUpiQrCodeUrl(url);
      } catch (e) { console.error(e); }
    }
    gen();
  }, [restaurant, cart]);

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const addToCart = (item: MenuItem) =>
    setCart((p) => {
      const ex = p.find((i) => i.menuItem.id === item.id);
      if (ex) return p.map((i) => i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...p, { menuItem: item, quantity: 1, notes: '' }];
    });

  const updateQty = (itemId: string, delta: number) =>
    setCart((p) => p.map((i) => i.menuItem.id === itemId ? { ...i, quantity: i.quantity + delta } : i).filter((i) => i.quantity > 0));

  const updateNotes = (itemId: string, notes: string) =>
    setCart((p) => p.map((i) => i.menuItem.id === itemId ? { ...i, notes } : i));

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + parseFloat(i.menuItem.price) * i.quantity, 0);

  // ── Category scroll ───────────────────────────────────────────────────────
  const scrollToCategory = (id: string) => {
    setActiveCategory(id);
    const el = categoryRefs.current[id];
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110, behavior: 'smooth' });
  };

  // ── Place order ───────────────────────────────────────────────────────────
  const handlePlaceOrder = async (method: 'COUNTER' | 'UPI') => {
    if (!customerName.trim()) { setNameError('Please enter your name so the cafe can call you when ready.'); return; }
    setNameError(''); setPlacingOrder(true); setOrderError('');
    try {
      const res = await api.post(`/api/public/menu/${slug}/order`, {
        customerName: customerName.trim(),
        tableNumber: null,
        paymentMethod: method,
        items: cart.map((i) => ({ menuItemId: i.menuItem.id, quantity: i.quantity, notes: i.notes.trim() || null })),
      });
      const placed = res.data.order;
      setLastPlacedOrder(placed);
      if (slug) localStorage.setItem(`last_order_${slug}`, placed.id);
      setCart([]);
      setView('confirmation');
    } catch (err: any) {
      setOrderError(err.response?.data?.error || 'Failed to submit order. Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  };

  // ── Staff call ────────────────────────────────────────────────────────────
  const handleStaffCall = async (e: React.FormEvent) => {
    e.preventDefault(); setCallingStaff(true);
    try {
      await api.post(`/api/public/menu/${slug}/call-staff`, {
        tableNumber: callStaffTable || customerName || 'Guest',
        requestType: callStaffType,
      });
      setShowCallStaffModal(false);
      setStaffCalledMsg('Staff has been notified!');
      setTimeout(() => setStaffCalledMsg(''), 5000);
    } catch { alert('Could not notify staff.'); }
    finally { setCallingStaff(false); }
  };

  // ── WhatsApp link ─────────────────────────────────────────────────────────
  const getWhatsAppLink = (order: any) => {
    if (!order) return '#';
    const who = order.customerName || order.tableNumber ? `Customer: ${order.customerName || `Table ${order.tableNumber}`}` : 'Guest';
    const items = order.items.map((i: any) => `• ${i.quantity}x ${i.menuItem.name} — ₹${(parseFloat(i.priceAtOrder) * i.quantity).toFixed(2)}${i.notes ? ` (${i.notes})` : ''}`).join('\n');
    const total = order.items.reduce((s: number, i: any) => s + parseFloat(i.priceAtOrder) * i.quantity, 0).toFixed(2);
    const msg = `🛒 *Order from ${restaurant?.name}*\n👤 *${who}*\n\n${items}\n\n💰 *Total: ₹${total}*`;
    const phone = restaurant?.contactNumber?.replace(/\D/g, '') || '';
    return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Loading
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--cream)] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-[var(--sage)]" size={36} />
        <p className="text-sm text-[var(--muted)]">Loading menu…</p>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-[var(--cream)] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="text-red-400 mb-4" size={48} />
        <h2 className="text-xl font-display font-medium text-[var(--text)]">Couldn't load menu</h2>
        <p className="text-sm text-[var(--muted)] mt-2 max-w-xs">{error || 'Menu not found. Check the URL and try again.'}</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Order Confirmation
  // ─────────────────────────────────────────────────────────────────────────
  if (view === 'confirmation' && lastPlacedOrder) {
    const isPending = lastPlacedOrder.status === 'PAYMENT_PENDING_VERIFICATION';
    const isCancelled = lastPlacedOrder.status === 'CANCELLED';
    const ageMin = (Date.now() - new Date(lastPlacedOrder.createdAt).getTime()) / 60000;
    const isExpired = (isPending || isCancelled) && ageMin > 15;
    const total = lastPlacedOrder.items.reduce((s: number, i: any) => s + parseFloat(i.priceAtOrder) * i.quantity, 0);
    const payee = restaurant?.upiPayeeName || lastPlacedOrder?.restaurant?.upiPayeeName || restaurant?.name;

    return (
      <div className="min-h-screen bg-[var(--cream)] flex justify-center">
        <div className="w-full max-w-md bg-white min-h-screen flex flex-col">

          {/* Confirmed toast */}
          {confirmedToast && (
            <div className="m-4 bg-emerald-600 text-white text-sm p-4 rounded-2xl font-semibold flex items-center gap-3">
              <CheckCircle2 size={20} className="shrink-0" />
              <span>{confirmedToast}</span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Status header */}
            <div className="text-center pt-4 space-y-3">
              {isExpired ? (
                <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                  <Clock size={36} className="text-amber-500" />
                </div>
              ) : isPending ? (
                <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto animate-pulse">
                  <Clock size={36} className="text-amber-500" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                  <Check size={36} className="text-emerald-600" />
                </div>
              )}
              <h1 className="font-display text-2xl font-medium text-[var(--text)]">
                {isExpired ? 'Awaiting Confirmation' : isPending ? 'Payment Submitted' : 'Order Placed!'}
              </h1>
              <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                isPending ? 'bg-amber-100 text-amber-800' : isCancelled ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {lastPlacedOrder.status.replace(/_/g, ' ')}
              </span>
              {lastPlacedOrder.customerName && <p className="text-sm text-[var(--muted)]">👤 {lastPlacedOrder.customerName}</p>}
            </div>

            {/* UPI QR for pending */}
            {isPending && (
              <div className="bg-[var(--cream)] border border-[var(--cream-border)] rounded-3xl p-5 space-y-4 text-center">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[var(--sage)] uppercase tracking-wider flex items-center gap-1.5">
                    <QrCode size={13} /> Scan & Pay
                  </p>
                  <p className="font-mono font-black text-[var(--sage)]">₹{total.toFixed(2)}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-[var(--cream-border)] inline-block mx-auto">
                  {(restaurant.upiQrImageUrl || lastPlacedOrder.restaurant?.upiQrImageUrl) ? (
                    <img
                      src={(restaurant.upiQrImageUrl || lastPlacedOrder.restaurant?.upiQrImageUrl).startsWith('http')
                        ? (restaurant.upiQrImageUrl || lastPlacedOrder.restaurant?.upiQrImageUrl)
                        : `${API_BASE_URL}${restaurant.upiQrImageUrl || lastPlacedOrder.restaurant?.upiQrImageUrl}`}
                      alt="UPI QR" className="w-52 h-52 object-contain" />
                  ) : upiQrCodeUrl ? (
                    <img src={upiQrCodeUrl} alt="UPI QR" className="w-52 h-52" />
                  ) : (
                    <Loader2 className="animate-spin text-[var(--sage)]" size={32} />
                  )}
                </div>
                <p className="text-sm font-semibold text-[var(--text)]">Pay to: {payee}</p>
                {(restaurant.upiId || lastPlacedOrder.restaurant?.upiId) && (
                  <p className="text-xs font-mono text-[var(--muted)]">{restaurant.upiId || lastPlacedOrder.restaurant?.upiId}</p>
                )}
                {(restaurant.upiId || lastPlacedOrder.restaurant?.upiId) && (
                  <a
                    href={upiDeepLink || `upi://pay?pa=${encodeURIComponent(restaurant.upiId || lastPlacedOrder.restaurant?.upiId || '')}&pn=${encodeURIComponent(payee || '')}&am=${total.toFixed(2)}&cu=INR`}
                    target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--sage)] text-white font-semibold rounded-2xl text-sm transition-all hover:bg-[var(--sage-mid)]"
                  >
                    <ExternalLink size={15} /> Open in UPI App
                  </a>
                )}
                <p className="text-xs text-[var(--muted)] bg-amber-50 border border-amber-100 p-3 rounded-xl text-left">
                  ⏳ Do not close this page. Cafe staff will verify your payment before preparing the order.
                </p>
              </div>
            )}

            {/* Order summary */}
            <div className="bg-[var(--cream)] border border-[var(--cream-border)] rounded-3xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardList size={13} className="text-[var(--sage)]" /> Your Order
              </h3>
              <div className="divide-y divide-[var(--cream-border)]">
                {lastPlacedOrder.items.map((item: any) => (
                  <div key={item.id} className="py-2.5 flex justify-between gap-4 text-sm">
                    <div>
                      <span className="font-bold">{item.quantity}×</span>
                      <span className="ml-1.5 text-[var(--text-mid)]">{item.menuItem.name}</span>
                      {item.notes && <p className="text-xs text-[var(--muted)] italic mt-0.5">"{item.notes}"</p>}
                    </div>
                    <span className="font-mono font-semibold">₹{(parseFloat(item.priceAtOrder) * item.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-[var(--cream-border)] flex justify-between font-bold">
                <span>Total</span>
                <span className="font-mono text-[var(--sage)] text-base">₹{total.toFixed(0)}</span>
              </div>
            </div>

            {!isPending && (
              <div className="bg-[var(--sage-light)] border border-[var(--sage)]/20 p-4 rounded-2xl text-center">
                <p className="text-[var(--sage)] font-semibold text-sm">Pay at the counter when ready 🙏</p>
              </div>
            )}

            <button
              onClick={() => window.open(getWhatsAppLink(lastPlacedOrder), '_blank')}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all"
            >
              <MessageCircle size={17} /> Share via WhatsApp
            </button>

            <button
              onClick={() => {
                if (slug) localStorage.removeItem(`last_order_${slug}`);
                setLastPlacedOrder(null);
                setView('menu');
              }}
              className="w-full py-3 border border-[var(--cream-border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--cream)] font-semibold rounded-2xl text-sm transition-all"
            >
              Order More Items
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Checkout Page (full-screen, separate from cart)
  // ─────────────────────────────────────────────────────────────────────────
  if (view === 'checkout') {
    const hasUpi = Boolean(restaurant.upiQrImageUrl || restaurant.upiId);

    return (
      <div className="min-h-screen bg-[var(--cream)] flex justify-center">
        <div className="w-full max-w-md bg-white min-h-screen flex flex-col">

          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-[var(--cream-border)] px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => { setView('cart'); setOrderError(''); }}
              className="p-2 rounded-xl border border-[var(--cream-border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--cream)] transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1">
              <h1 className="font-semibold text-[var(--text)]">Checkout</h1>
              <p className="text-xs text-[var(--muted)]">{cartCount} item{cartCount !== 1 ? 's' : ''} · ₹{cartTotal.toFixed(0)}</p>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">

            {/* Order summary (compact) */}
            <div className="bg-[var(--cream)] border border-[var(--cream-border)] rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--cream-border)] flex items-center gap-2">
                <ShoppingCart size={14} className="text-[var(--sage)]" />
                <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Your Order</span>
              </div>
              <div className="divide-y divide-[var(--cream-border)]">
                {cart.map((item) => (
                  <div key={item.menuItem.id} className="px-4 py-3 flex justify-between items-center text-sm">
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-[var(--text)]">{item.quantity}×</span>
                      <span className="ml-1.5 text-[var(--text-mid)] truncate">{item.menuItem.name}</span>
                      {item.notes && <p className="text-xs text-[var(--muted)] mt-0.5 truncate italic">"{item.notes}"</p>}
                    </div>
                    <span className="font-mono font-bold text-[var(--sage)] ml-3 shrink-0">
                      ₹{(parseFloat(item.menuItem.price) * item.quantity).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-[var(--cream-border)] flex justify-between font-bold text-sm bg-white">
                <span>Total</span>
                <span className="font-mono text-[var(--sage)] text-base">₹{cartTotal.toFixed(0)}</span>
              </div>
            </div>

            {/* Name input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[var(--text-mid)] uppercase tracking-wider">
                Your Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => { setCustomerName(e.target.value); if (nameError) setNameError(''); }}
                placeholder="e.g. Rahul, Priya, Aakash"
                className="w-full px-4 py-3.5 bg-[var(--cream)] border border-[var(--cream-border)] rounded-2xl text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--sage)] text-sm transition-all"
                autoFocus
              />
              {nameError && <p className="text-xs text-red-600 font-medium flex items-center gap-1.5"><AlertCircle size={12} />{nameError}</p>}
            </div>

            {/* Payment method */}
            {hasUpi && (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-[var(--text-mid)] uppercase tracking-wider">Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['COUNTER', 'UPI'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        paymentMethod === m
                          ? 'border-[var(--sage)] bg-[var(--sage-light)]'
                          : 'border-[var(--cream-border)] bg-white hover:border-[var(--cream-dark)]'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xl">{m === 'COUNTER' ? '🏪' : '📱'}</span>
                        {paymentMethod === m && <CheckCircle2 size={16} className="text-[var(--sage)]" />}
                      </div>
                      <p className="text-sm font-bold text-[var(--text)]">{m === 'COUNTER' ? 'Pay at Counter' : 'Pay via UPI'}</p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">{m === 'COUNTER' ? 'Cash or card at counter' : 'GPay, PhonePe, Paytm'}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* UPI QR inline preview */}
            {paymentMethod === 'UPI' && hasUpi && (
              <div className="bg-[var(--cream)] border border-[var(--cream-border)] rounded-3xl p-5 space-y-4 text-center">
                <p className="text-xs font-bold text-[var(--sage)] uppercase tracking-wider">Scan to Pay · ₹{cartTotal.toFixed(2)}</p>
                <div className="bg-white p-4 rounded-2xl border border-[var(--cream-border)] inline-block mx-auto">
                  {restaurant.upiQrImageUrl ? (
                    <img
                      src={restaurant.upiQrImageUrl.startsWith('http') ? restaurant.upiQrImageUrl : `${API_BASE_URL}${restaurant.upiQrImageUrl}`}
                      alt="UPI QR" className="w-52 h-52 object-contain"
                    />
                  ) : upiQrCodeUrl ? (
                    <img src={upiQrCodeUrl} alt="UPI QR" className="w-52 h-52" />
                  ) : (
                    <div className="w-52 h-52 flex items-center justify-center"><Loader2 className="animate-spin text-[var(--sage)]" size={28} /></div>
                  )}
                </div>
                {restaurant.upiPayeeName && <p className="text-sm font-semibold text-[var(--text)]">{restaurant.upiPayeeName}</p>}
                {restaurant.upiId && <p className="text-xs font-mono text-[var(--muted)]">{restaurant.upiId}</p>}
                {restaurant.upiId && (
                  <a
                    href={upiDeepLink || `upi://pay?pa=${encodeURIComponent(restaurant.upiId)}&pn=${encodeURIComponent(restaurant.upiPayeeName || restaurant.name)}&am=${cartTotal.toFixed(2)}&cu=INR`}
                    target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--sage)] text-white rounded-2xl text-sm font-semibold transition-all hover:bg-[var(--sage-mid)]"
                  >
                    <ExternalLink size={15} /> Open UPI App
                  </a>
                )}
              </div>
            )}

            {orderError && (
              <div className="bg-[var(--red-light)] border border-red-200 text-[var(--red-soft)] text-sm p-4 rounded-2xl">
                {orderError}
              </div>
            )}

            {/* CTA note for UPI */}
            {paymentMethod === 'UPI' && hasUpi && (
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-xs text-amber-800">
                💡 After paying in your UPI app, tap "I've Made the Payment" below. The cafe will verify before preparing your order.
              </div>
            )}
          </div>

          {/* Sticky bottom CTA */}
          <div className="border-t border-[var(--cream-border)] p-4 bg-white">
            {paymentMethod === 'COUNTER' || !hasUpi ? (
              <button
                onClick={() => handlePlaceOrder('COUNTER')}
                disabled={placingOrder}
                className="w-full py-4 bg-[var(--sage)] hover:bg-[var(--sage-mid)] disabled:opacity-50 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[var(--sage)]/20 active:scale-[0.98]"
              >
                {placingOrder ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                {placingOrder ? 'Placing Order…' : `Place Order · ₹${cartTotal.toFixed(0)}`}
              </button>
            ) : (
              <button
                onClick={() => handlePlaceOrder('UPI')}
                disabled={placingOrder}
                className="w-full py-4 bg-[var(--sage)] hover:bg-[var(--sage-mid)] disabled:opacity-50 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[var(--sage)]/20 active:scale-[0.98]"
              >
                {placingOrder ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                {placingOrder ? 'Placing Order…' : "I've Made the Payment"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: Main Menu Page
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--cream)] flex justify-center pb-28">
      <div className="w-full max-w-md bg-white min-h-screen flex flex-col relative">

        {/* Hero Header */}
        <header className="bg-[var(--sage)] px-5 pt-7 pb-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center overflow-hidden shrink-0">
              {restaurant.logoUrl && !logoError ? (
                <img
                  src={restaurant.logoUrl.startsWith('http') ? restaurant.logoUrl : `${API_BASE_URL}${restaurant.logoUrl}`}
                  alt="Logo" onError={() => setLogoError(true)} className="w-full h-full object-cover"
                />
              ) : <Store size={26} className="text-white/70" />}
            </div>
            <div className="flex-1 text-white min-w-0">
              <h1 className="font-display text-xl font-medium leading-tight">{restaurant.name}</h1>
              {restaurant.contactNumber && (
                <a href={`tel:${restaurant.contactNumber}`} className="flex items-center gap-1.5 text-white/70 text-xs mt-1 hover:text-white">
                  <Phone size={10} /> {restaurant.contactNumber}
                </a>
              )}
              {restaurant.address && (
                <p className="flex items-center gap-1.5 text-white/60 text-xs mt-0.5">
                  <MapPin size={10} className="shrink-0" /> <span className="truncate">{restaurant.address}</span>
                </p>
              )}
            </div>
            <button
              onClick={() => setShowCallStaffModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 border border-white/20 text-white hover:bg-white/25 rounded-xl text-xs font-semibold transition-all shrink-0"
            >
              <Bell size={11} /> Call
            </button>
          </div>

          {staffCalledMsg && (
            <div className="mt-3 bg-emerald-500 text-white text-xs font-semibold py-2 px-4 rounded-xl flex items-center gap-2">
              <Bell size={12} /> {staffCalledMsg}
            </div>
          )}
          {restaurant.isAcceptingOrders === false && (
            <div className="mt-3 bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-medium px-3 py-2 rounded-xl flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" /> Kitchen paused — view-only mode
            </div>
          )}
        </header>

        {/* Sticky search + category bar */}
        <div className="sticky top-0 z-30 bg-white border-b border-[var(--cream-border)] shadow-sm">
          <div className="px-4 pt-3 pb-2 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={14} />
              <input
                type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes…"
                className="w-full pl-10 pr-10 py-2.5 bg-[var(--cream)] border border-[var(--cream-border)] rounded-xl text-sm text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--sage)]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category + filter row */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {/* Veg filter */}
              <div className="flex bg-[var(--cream)] border border-[var(--cream-border)] rounded-xl p-0.5 shrink-0">
                {(['all', 'veg', 'non-veg'] as const).map((f) => (
                  <button key={f} onClick={() => setFilterVeg(f)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      filterVeg === f
                        ? f === 'veg' ? 'bg-emerald-500 text-white' : f === 'non-veg' ? 'bg-red-500 text-white' : 'bg-white text-[var(--text)] shadow-sm'
                        : 'text-[var(--muted)]'
                    }`}>
                    {f === 'veg' ? '🌿' : f === 'non-veg' ? '🍖' : 'All'}
                  </button>
                ))}
              </div>
              {restaurant.categories.map((cat) => (
                <button key={cat.id} onClick={() => scrollToCategory(cat.id)}
                  className={`text-xs px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap shrink-0 transition-all ${
                    activeCategory === cat.id
                      ? 'bg-[var(--sage)] text-white'
                      : 'bg-[var(--cream)] text-[var(--muted)] border border-[var(--cream-border)] hover:text-[var(--text)]'
                  }`}>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Menu grid */}
        <div className="flex-1 p-4 space-y-8">
          {(() => {
            let rendered = 0;
            const sections = restaurant.categories.map((cat) => {
              const items = cat.items.filter((item) => {
                const q = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || (item.description?.toLowerCase().includes(searchQuery.toLowerCase()));
                const v = filterVeg === 'all' || (filterVeg === 'veg' && item.isVeg) || (filterVeg === 'non-veg' && !item.isVeg);
                return q && v;
              });
              if (!items.length) return null;
              rendered += items.length;
              return (
                <section key={cat.id} ref={(el) => (categoryRefs.current[cat.id] = el)} className="scroll-mt-28 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-[var(--sage)] rounded-full" />
                    <h2 className="font-display text-sm font-medium text-[var(--text)] uppercase tracking-wide">{cat.name}</h2>
                    <span className="text-[10px] text-[var(--muted)]">{items.length}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {items.map((item) => {
                      const qty = cart.find((i) => i.menuItem.id === item.id)?.quantity || 0;
                      return (
                        <div key={item.id} className={`bg-white border border-[var(--cream-border)] rounded-2xl overflow-hidden card-hover ${!item.isAvailable ? 'opacity-60' : ''}`}>
                          {/* Image */}
                          <div className="relative h-32 bg-[var(--cream)] overflow-hidden">
                            {item.imageUrl ? (
                              <img src={item.imageUrl.startsWith('http') ? item.imageUrl : `${API_BASE_URL}${item.imageUrl}`}
                                alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Utensils size={28} className="text-[var(--cream-border)]" />
                              </div>
                            )}
                            <div className={`absolute top-2 left-2 w-4 h-4 rounded-sm border-2 bg-white flex items-center justify-center ${item.isVeg ? 'border-emerald-500' : 'border-red-500'}`}>
                              <div className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            </div>
                            {item.badge && (
                              <span className="absolute top-2 right-2 text-[9px] bg-[var(--sage)] text-white px-1.5 py-0.5 rounded-full font-bold">
                                {item.badge === 'bestseller' ? '🔥' : item.badge === 'spicy' ? '🌶️' : item.badge === 'special' ? '⭐' : '🆕'}
                              </span>
                            )}
                            {!item.isAvailable && (
                              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                <span className="text-xs font-bold text-red-600 bg-white px-2 py-1 rounded-lg border border-red-200">Sold Out</span>
                              </div>
                            )}
                          </div>
                          {/* Info */}
                          <div className="p-3 space-y-2">
                            <h3 className="text-sm font-semibold text-[var(--text)] line-clamp-1 leading-tight">{item.name}</h3>
                            {item.description && <p className="text-[11px] text-[var(--muted)] line-clamp-2 leading-snug">{item.description}</p>}
                            <div className="flex items-center justify-between pt-0.5">
                              <span className="font-mono font-bold text-[var(--sage)] text-sm">₹{parseFloat(item.price).toFixed(0)}</span>
                              {item.isAvailable && restaurant.isAcceptingOrders !== false && (
                                qty > 0 ? (
                                  <div className="flex items-center gap-1 bg-[var(--sage)] rounded-xl px-1.5 py-0.5">
                                    <button onClick={() => updateQty(item.id, -1)} className="p-0.5 text-white"><Minus size={10} /></button>
                                    <span className="text-xs font-black text-white w-4 text-center">{qty}</span>
                                    <button onClick={() => updateQty(item.id, 1)} className="p-0.5 text-white"><Plus size={10} /></button>
                                  </div>
                                ) : (
                                  <button onClick={() => addToCart(item)}
                                    className="w-8 h-8 bg-[var(--sage)] hover:bg-[var(--sage-mid)] text-white rounded-xl flex items-center justify-center transition-all active:scale-90">
                                    <Plus size={14} />
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            });
            if (!rendered) return (
              <div className="py-16 text-center space-y-3">
                <Utensils className="mx-auto text-[var(--cream-border)]" size={40} />
                <p className="font-semibold text-[var(--text)]">No items found</p>
                <button onClick={() => { setSearchQuery(''); setFilterVeg('all'); }}
                  className="px-4 py-2 bg-[var(--sage-light)] text-[var(--sage)] rounded-xl text-sm font-semibold">
                  Clear Filters
                </button>
              </div>
            );
            return sections;
          })()}
        </div>

        {/* Floating cart button */}
        {cartCount > 0 && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-full max-w-[calc(28rem-2px)] px-4 z-40">
            <button
              onClick={() => setView('cart')}
              className="w-full flex items-center justify-between bg-[var(--sage)] hover:bg-[var(--sage-mid)] text-white px-5 py-4 rounded-2xl shadow-xl shadow-[var(--sage)]/30 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-white text-[var(--sage)] flex items-center justify-center text-xs font-black">{cartCount}</div>
                <span className="text-sm font-semibold">View Basket</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm">₹{cartTotal.toFixed(0)}</span>
                <ChevronRight size={16} />
              </div>
            </button>
          </div>
        )}

        {/* ── Cart Drawer (view === 'cart') ─────────────────────────── */}
        {view === 'cart' && (
          <div className="fixed inset-0 z-50 flex justify-center items-end bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white rounded-t-3xl flex flex-col" style={{ maxHeight: '90dvh' }}>
              {/* Drag handle */}
              <div className="pt-3 pb-1 flex justify-center shrink-0">
                <div className="w-10 h-1 bg-[var(--cream-border)] rounded-full" />
              </div>

              {/* Cart header */}
              <div className="px-5 py-3 border-b border-[var(--cream-border)] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={16} className="text-[var(--sage)]" />
                  <h2 className="font-semibold text-[var(--text)]">Your Basket</h2>
                  <span className="bg-[var(--sage)] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{cartCount}</span>
                </div>
                <button onClick={() => setView('menu')} className="p-1.5 rounded-xl hover:bg-[var(--cream)] text-[var(--muted)] hover:text-[var(--text)] transition-all">
                  <X size={19} />
                </button>
              </div>

              {/* Items — ONLY items, NO name/payment here */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="text-center py-16 space-y-2">
                    <ShoppingCart size={36} className="mx-auto text-[var(--cream-border)]" />
                    <p className="text-sm text-[var(--muted)]">Your basket is empty</p>
                  </div>
                ) : cart.map((item) => (
                  <div key={item.menuItem.id} className="bg-[var(--cream)] border border-[var(--cream-border)] p-4 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-[var(--text)] text-sm truncate">{item.menuItem.name}</h4>
                        <p className="text-xs font-mono text-[var(--sage)] font-bold mt-0.5">₹{parseFloat(item.menuItem.price).toFixed(0)}</p>
                      </div>
                      <div className="flex items-center gap-2 bg-white border border-[var(--cream-border)] rounded-xl px-2 py-1 shrink-0">
                        <button onClick={() => updateQty(item.menuItem.id, -1)} className="p-1 text-[var(--muted)] hover:text-[var(--text)]"><Minus size={12} /></button>
                        <span className="text-sm font-bold text-[var(--text)] w-5 text-center">{item.quantity}</span>
                        <button onClick={() => updateQty(item.menuItem.id, 1)} className="p-1 text-[var(--muted)] hover:text-[var(--text)]"><Plus size={12} /></button>
                      </div>
                    </div>
                    <input
                      type="text" value={item.notes} onChange={(e) => updateNotes(item.menuItem.id, e.target.value)}
                      placeholder="Special instructions (e.g. no spice, extra sauce)…"
                      className="w-full bg-white border border-[var(--cream-border)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--sage)] text-[var(--text)] placeholder-[var(--muted)]"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {['🌶️ Extra Spicy', '🚫 No Onion', '🧀 Extra Cheese', '🧊 Less Ice', '📦 Pack Separately'].map((chip) => (
                        <button key={chip} type="button"
                          onClick={() => {
                            const cur = item.notes.trim();
                            updateNotes(item.menuItem.id, cur.includes(chip) ? cur.replace(chip, '').replace(/^,\s*|,\s*$/g, '').trim() : cur ? `${cur}, ${chip}` : chip);
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all ${
                            item.notes?.includes(chip) ? 'bg-[var(--sage)] text-white border-[var(--sage)] font-bold' : 'bg-white text-[var(--muted)] border-[var(--cream-border)]'
                          }`}>
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Proceed button — this is the ONLY action in the basket */}
              {cart.length > 0 && (
                <div className="p-4 border-t border-[var(--cream-border)] bg-[var(--cream)] shrink-0">
                  <div className="flex items-center justify-between text-sm font-semibold text-[var(--muted)] mb-3">
                    <span>Subtotal ({cartCount} items)</span>
                    <span className="font-mono font-black text-[var(--text)] text-lg">₹{cartTotal.toFixed(0)}</span>
                  </div>
                  <button
                    onClick={() => setView('checkout')}
                    className="w-full py-4 bg-[var(--sage)] hover:bg-[var(--sage-mid)] text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-[var(--sage)]/20 transition-all active:scale-[0.98]"
                  >
                    Proceed to Checkout <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Call Staff Modal */}
        {showCallStaffModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl w-full max-w-xs p-5 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-[var(--text)] flex items-center gap-2"><Bell size={15} className="text-[var(--sage)]" /> Call Staff</h3>
                <button onClick={() => setShowCallStaffModal(false)} className="text-[var(--muted)] hover:text-[var(--text)]"><X size={17} /></button>
              </div>
              <form onSubmit={handleStaffCall} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">Your Table / Name</label>
                  <input type="text" placeholder="Table 4 / Rahul" value={callStaffTable} onChange={(e) => setCallStaffTable(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[var(--cream)] border border-[var(--cream-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sage)]" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[{ id: 'Call Waiter', l: '🔔 Waiter' }, { id: 'Water Request', l: '🧊 Water' }, { id: 'Clean Table', l: '🧹 Clean Table' }, { id: 'Request Bill', l: '🧾 Bill' }].map((s) => (
                    <button key={s.id} type="button" onClick={() => setCallStaffType(s.id)}
                      className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${callStaffType === s.id ? 'bg-[var(--sage)] text-white border-[var(--sage)]' : 'bg-[var(--cream)] text-[var(--muted)] border-[var(--cream-border)]'}`}>
                      {s.l}
                    </button>
                  ))}
                </div>
                <button type="submit" disabled={callingStaff}
                  className="w-full py-3 bg-[var(--sage)] text-white rounded-2xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {callingStaff ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />} Notify Staff
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
