import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import io from 'socket.io-client';
import api from '../api/api';
import { API_BASE_URL } from '../config';
import { playConfirmBeep } from '../utils/audio';
import {
  Store, Phone, MapPin, Search, AlertCircle, Loader2,
  ShoppingCart, Plus, Minus, X, Check, Utensils, ClipboardList,
  MessageCircle, Bell, QrCode, ExternalLink, Clock, CheckCircle2, ArrowLeft, ChevronRight
} from 'lucide-react';
import { usePageMetadata } from '../utils/usePageMetadata';

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

type View = 'menu' | 'cart' | 'checkout' | 'payment' | 'confirmation';

export default function PublicMenu() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  usePageMetadata(restaurant?.name ? `${restaurant.name} | Menu` : 'Digital Menu', 'spoon');
  const [logoError, setLogoError] = useState(false);

  const [view, setView] = useState<View>('menu');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterVeg, setFilterVeg] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [activeCategory, setActiveCategory] = useState('');

  const [cart, setCart] = useState<CartItem[]>([]);

  const [customerName, setCustomerName] = useState('');
  const [nameError, setNameError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COUNTER' | 'UPI'>('COUNTER');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');

  const [lastPlacedOrder, setLastPlacedOrder] = useState<any>(null);

  const [upiQrCodeUrl, setUpiQrCodeUrl] = useState('');
  const [upiDeepLink, setUpiDeepLink] = useState('');

  const [showCallStaffModal, setShowCallStaffModal] = useState(false);
  const [callStaffTable, setCallStaffTable] = useState('');
  const [callStaffType, setCallStaffType] = useState('Call Waiter');
  const [callingStaff, setCallingStaff] = useState(false);
  const [staffCalledMsg, setStaffCalledMsg] = useState('');

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

  useEffect(() => {
    async function load() {
      if (!slug) return;
      try {
        const res = await api.get(`/api/public/menu/${slug}`);
        const rest = res.data.restaurant;
        setRestaurant(rest);
        if (rest.categories?.length) setActiveCategory(rest.categories[0].id);

        document.title = `${rest.name} — Menu`;

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
    // Page chhodte waqt title reset karo.
    return () => { document.title = 'MenuQR'; };
  }, [slug, searchParams]);

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

  useEffect(() => {
    const upiId = restaurant?.upiId;
    if (!upiId) return;
    const payee = restaurant?.upiPayeeName || restaurant?.name || 'Cafe';
    const amount = cart.reduce((s, i) => s + parseFloat(i.menuItem.price) * i.quantity, 0).toFixed(2);
    const link = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payee)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Cafe Order')}`;
    setUpiDeepLink(link);
  }, [restaurant?.upiId, restaurant?.upiPayeeName, restaurant?.name, cart]);

  // Cafe ka QR ho to generated QR ke badle wahi use hoga.
  useEffect(() => {
    async function gen() {
      const upiId = restaurant?.upiId;
      if (!upiId || restaurant?.upiQrImageUrl) return;
      const payee = restaurant?.upiPayeeName || restaurant?.name || 'Cafe';
      const link = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payee)}&cu=INR`;
      try {
        const url = await QRCode.toDataURL(link, { width: 300, margin: 2, color: { dark: '#1A1208', light: '#ffffff' } });
        setUpiQrCodeUrl(url);
      } catch (e) { console.error(e); }
    }
    gen();
  }, [restaurant?.upiId, restaurant?.upiPayeeName, restaurant?.upiQrImageUrl, restaurant?.name]);

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

  const scrollToCategory = (id: string) => {
    setActiveCategory(id);
    const el = categoryRefs.current[id];
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110, behavior: 'smooth' });
  };

  // Naam ke bina order submit nahi hoga.
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

  const getWhatsAppLink = (order: any) => {
    if (!order) return '#';
    const who = order.customerName || order.tableNumber ? `Customer: ${order.customerName || `Table ${order.tableNumber}`}` : 'Guest';
    const items = order.items.map((i: any) => `• ${i.quantity}x ${i.menuItem.name} — ₹${(parseFloat(i.priceAtOrder) * i.quantity).toFixed(2)}${i.notes ? ` (${i.notes})` : ''}`).join('\n');
    const total = order.items.reduce((s: number, i: any) => s + parseFloat(i.priceAtOrder) * i.quantity, 0).toFixed(2);
    const msg = `🛒 *Order from ${restaurant?.name}*\n👤 *${who}*\n\n${items}\n\n💰 *Total: ₹${total}*`;
    const phone = restaurant?.contactNumber?.replace(/\D/g, '') || '';
    return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--cream)] flex justify-center">
        <div className="w-full max-w-md bg-white min-h-screen flex flex-col">
          <div className="bg-[var(--sage)] px-5 pt-7 pb-5 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-5 w-36 bg-white/20 rounded-xl" />
                <div className="h-3 w-24 bg-white/15 rounded-xl" />
              </div>
            </div>
          </div>
          <div className="border-b border-[var(--cream-border)] px-4 py-3 space-y-2.5 animate-pulse">
            <div className="h-10 bg-[var(--cream-dark)] rounded-xl" />
            <div className="flex gap-2">
              <div className="h-7 w-20 bg-[var(--cream-dark)] rounded-xl" />
              <div className="h-7 w-24 bg-[var(--cream-dark)] rounded-xl" />
              <div className="h-7 w-20 bg-[var(--cream-dark)] rounded-xl" />
            </div>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-[var(--cream)] rounded-2xl overflow-hidden">
                <div className="h-32 bg-[var(--cream-dark)]" />
                <div className="p-3 space-y-2">
                  <div className="h-4 w-3/4 bg-[var(--cream-dark)] rounded-lg" />
                  <div className="h-3 w-full bg-[var(--cream-dark)] rounded-lg" />
                  <div className="h-3 w-1/2 bg-[var(--cream-dark)] rounded-lg" />
                  <div className="h-8 w-full bg-[var(--cream-dark)] rounded-xl mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
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

          {confirmedToast && (
            <div className="m-4 bg-emerald-600 text-white text-sm p-4 rounded-2xl font-semibold flex items-center gap-3">
              <CheckCircle2 size={20} className="shrink-0" />
              <span>{confirmedToast}</span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
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
                {({
                  'PAYMENT_PENDING_VERIFICATION': 'Awaiting Payment Verification',
                  'RECEIVED': 'Order Received',
                  'IN_PROGRESS': 'Being Prepared',
                  'READY': 'Ready for Pickup',
                  'DELIVERED': 'Delivered',
                  'CANCELLED': 'Cancelled',
                } as Record<string, string>)[lastPlacedOrder.status] || lastPlacedOrder.status.replace(/_/g, ' ')}
              </span>
              {lastPlacedOrder.customerName && <p className="text-sm text-[var(--muted)]">👤 {lastPlacedOrder.customerName}</p>}
            </div>

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

  if (view === 'checkout') {
    const hasUpi = Boolean(restaurant.upiQrImageUrl || restaurant.upiId);

    return (
      <div className="min-h-screen bg-[var(--cream)] flex justify-center">
        <div className="w-full max-w-md bg-white min-h-screen flex flex-col">

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

          <div className="flex-1 overflow-y-auto p-5 space-y-6">

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

            {hasUpi && paymentMethod === 'UPI' && (
              <div className="flex items-center gap-2.5 bg-[var(--sage-light)] border border-[var(--sage)]/15 px-4 py-3 rounded-2xl">
                <QrCode size={14} className="text-[var(--sage)] shrink-0" />
                <p className="text-xs text-[var(--sage)] font-medium">Scan & pay via QR on the next page.</p>
              </div>
            )}

            {orderError && (
              <div className="bg-[var(--red-light)] border border-red-200 text-[var(--red-soft)] text-sm p-4 rounded-2xl flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" /> {orderError}
              </div>
            )}
          </div>

          <div className="border-t border-[var(--cream-border)] p-4 bg-white">
            <button
              onClick={() => {
                if (!customerName.trim()) {
                  setNameError('Please enter your name so the cafe can call you when ready.');
                  return;
                }
                setNameError('');
                setOrderError('');
                setView('payment');
              }}
              className="w-full py-4 bg-[var(--sage)] hover:bg-[var(--sage-mid)] text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[var(--sage)]/20 active:scale-[0.98]"
            >
              <ChevronRight size={16} />
              {paymentMethod === 'UPI' && hasUpi
                ? `Continue to Payment · ₹${cartTotal.toFixed(0)}`
                : `Place Order · ₹${cartTotal.toFixed(0)}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'payment') {
    const isCounter = paymentMethod === 'COUNTER' || !Boolean(restaurant.upiQrImageUrl || restaurant.upiId);
    const upiId = restaurant.upiId;
    const qrSrc = restaurant.upiQrImageUrl
      ? (restaurant.upiQrImageUrl.startsWith('http') ? restaurant.upiQrImageUrl : `${API_BASE_URL}${restaurant.upiQrImageUrl}`)
      : upiQrCodeUrl;

    return (
      <div className="min-h-screen bg-[var(--cream)] flex justify-center">
        <div className="w-full max-w-md bg-white min-h-screen flex flex-col">

          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[var(--cream-border)] px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => { setView('checkout'); setOrderError(''); }}
              className="p-2 rounded-xl border border-[var(--cream-border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--cream)] transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex-1">
              <h1 className="font-semibold text-[var(--text)]">{isCounter ? 'Confirm Order' : 'Complete Payment'}</h1>
              <p className="text-xs text-[var(--muted)]">{restaurant.name}</p>
            </div>
          </div>

          <div className="bg-[var(--sage)] text-white px-6 pt-8 pb-10 text-center">
            <p className="text-xs text-white/50 font-semibold uppercase tracking-widest mb-2">Amount Due</p>
            <p className="font-display text-5xl font-semibold tracking-tight">₹{cartTotal.toFixed(0)}</p>
            <p className="text-sm text-white/50 mt-2">{customerName} · {cartCount} item{cartCount !== 1 ? 's' : ''}</p>
          </div>

          <div className="flex-1 overflow-y-auto -mt-5">
            <div className="bg-[var(--cream)] rounded-t-[28px] p-5 space-y-4 min-h-full">

              {isCounter ? (
                <>
                  <div className="bg-white border border-[var(--cream-border)] rounded-3xl p-6 text-center space-y-4 shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--sage-light)] flex items-center justify-center mx-auto text-3xl">🏪</div>
                    <div>
                      <h2 className="font-semibold text-[var(--text)] text-base">Pay at the Counter</h2>
                      <p className="text-sm text-[var(--muted)] mt-1.5 leading-relaxed max-w-xs mx-auto">
                        Cash, card, or any UPI accepted at the counter. Your order will be prepared once placed.
                      </p>
                    </div>
                  </div>
                  <div className="bg-white border border-[var(--cream-border)] rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-[var(--cream-border)]">
                      <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Your Order</p>
                    </div>
                    <div className="divide-y divide-[var(--cream-border)]">
                      {cart.map((item) => (
                        <div key={item.menuItem.id} className="px-4 py-3 flex justify-between items-start text-sm">
                          <span className="text-[var(--text-mid)] flex-1 pr-3">
                            <span className="font-semibold">{item.quantity}×</span> {item.menuItem.name}
                            {item.notes && <span className="block text-[11px] text-[var(--muted)] italic mt-0.5">"{item.notes}"</span>}
                          </span>
                          <span className="font-mono font-bold text-[var(--sage)] shrink-0">
                            ₹{(parseFloat(item.menuItem.price) * item.quantity).toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-3 border-t border-[var(--cream-border)] flex justify-between font-bold bg-[var(--cream)]">
                      <span className="text-[var(--text)]">Total</span>
                      <span className="font-mono text-[var(--sage)] text-base">₹{cartTotal.toFixed(0)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-white border border-[var(--cream-border)] rounded-3xl overflow-hidden shadow-sm scale-in">
                    <div className="px-5 py-4 border-b border-[var(--cream-border)] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <QrCode size={15} className="text-[var(--sage)]" />
                        <span className="text-sm font-bold text-[var(--text)]">Scan &amp; Pay</span>
                      </div>
                      <span className="font-mono font-black text-[var(--sage)] text-lg">₹{cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="p-6 flex flex-col items-center gap-5">
                      <div className="float-gentle w-56 h-56 border-2 border-[var(--cream-border)] rounded-2xl p-3 flex items-center justify-center bg-white shadow-sm">
                        {qrSrc ? (
                          <img src={qrSrc} alt="UPI QR Code" className="w-full h-full object-contain rounded-lg" />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-[var(--muted)]">
                            <Loader2 className="animate-spin text-[var(--sage)]" size={28} />
                            <p className="text-xs">Generating QR…</p>
                          </div>
                        )}
                      </div>
                      <div className="text-center space-y-1.5">
                        <p className="text-xs text-[var(--muted)] font-medium">Pay to</p>
                        <p className="font-semibold text-[var(--text)]">{restaurant.upiPayeeName || restaurant.name}</p>
                        {upiId && (
                          <span className="inline-block font-mono text-xs text-[var(--muted)] bg-[var(--cream)] border border-[var(--cream-border)] px-3 py-1 rounded-full">
                            {upiId}
                          </span>
                        )}
                      </div>
                    </div>
                    {upiId && (
                      <div className="px-5 pb-5">
                        <a
                          href={upiDeepLink || `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(restaurant.upiPayeeName || restaurant.name)}&am=${cartTotal.toFixed(2)}&cu=INR`}
                          target="_blank" rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 py-3.5 bg-[var(--sage)] text-white font-semibold rounded-2xl text-sm transition-all hover:bg-[var(--sage-mid)] active:scale-[0.98] shadow-md shadow-[var(--sage)]/20"
                        >
                          <ExternalLink size={15} /> Open in GPay / PhonePe / Paytm
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                    <span className="text-base mt-0.5 shrink-0">💡</span>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      After paying in your UPI app, tap <strong className="font-semibold">"I've Paid"</strong> below. The cafe will verify your payment before preparing your order.
                    </p>
                  </div>
                </>
              )}

              {orderError && (
                <div className="bg-[var(--red-light)] border border-red-200 text-[var(--red-soft)] text-sm p-4 rounded-2xl flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" /> {orderError}
                </div>
              )}

            </div>
          </div>

          <div className="border-t border-[var(--cream-border)] p-4 bg-white shrink-0">
            <button
              onClick={() => handlePlaceOrder(isCounter ? 'COUNTER' : 'UPI')}
              disabled={placingOrder}
              className="w-full py-4 bg-[var(--sage)] hover:bg-[var(--sage-mid)] disabled:opacity-50 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[var(--sage)]/20 active:scale-[0.98]"
            >
              {placingOrder ? <Loader2 className="animate-spin" size={16} /> : isCounter ? <Check size={16} /> : <CheckCircle2 size={16} />}
              {placingOrder ? 'Placing Order…' : isCounter ? `Place Order · ₹${cartTotal.toFixed(0)}` : "✓ I've Paid — Place My Order"}
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--cream)] flex justify-center pb-28">
      <div className="w-full max-w-md bg-white min-h-screen flex flex-col relative">

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
              onClick={() => { playConfirmBeep(); setShowCallStaffModal(true); }}
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

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
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

        {view === 'cart' && (
          <div className="fixed inset-0 z-50 flex justify-center items-end bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white rounded-t-3xl flex flex-col" style={{ maxHeight: '90dvh' }}>
              <div className="pt-3 pb-1 flex justify-center shrink-0">
                <div className="w-10 h-1 bg-[var(--cream-border)] rounded-full" />
              </div>

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
                  onClick={() => { if (!callingStaff) playConfirmBeep(); }}
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
