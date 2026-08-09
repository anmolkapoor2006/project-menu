import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import io from 'socket.io-client';
import api from '../api/api';
import {
  Store, Phone, MapPin, Search, AlertCircle, Loader2,
  ShoppingCart, Plus, Minus, X, Check, Utensils, ClipboardList,
  MessageCircle, Bell, QrCode, ExternalLink, Clock, CheckCircle2, ArrowLeft
} from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  isVeg: boolean;
  isAvailable: boolean;
  badge: string | null;
  prepTime?: string | null;
}

interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

interface Restaurant {
  id: string;
  name: string;
  logoUrl: string | null;
  address: string | null;
  contactNumber: string | null;
  upiId?: string | null;
  upiPayeeName?: string | null;
  upiQrImageUrl?: string | null;
  isAcceptingOrders: boolean;
  categories: MenuCategory[];
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
}

export default function PublicMenu() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logoError, setLogoError] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterVeg, setFilterVeg] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [activeCategory, setActiveCategory] = useState<string>('');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [nameError, setNameError] = useState('');
  const tableNumber = '';
  const [paymentMethod, setPaymentMethod] = useState<'COUNTER' | 'UPI'>('COUNTER');

  const [showCallStaffModal, setShowCallStaffModal] = useState(false);
  const [callStaffTable, setCallStaffTable] = useState('');
  const [callStaffType, setCallStaffType] = useState('Call Waiter');
  const [callingStaff, setCallingStaff] = useState(false);
  const [staffCalledSuccess, setStaffCalledSuccess] = useState('');

  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<any>(null);
  const [orderError, setOrderError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [upiQrCodeUrl, setUpiQrCodeUrl] = useState<string>('');
  const [upiDeepLink, setUpiDeepLink] = useState<string>('');
  const [confirmedToast, setConfirmedToast] = useState<string>('');

  const categoryRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) { console.warn(e); }
  };

  const handleSendStaffCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setCallingStaff(true);
    setStaffCalledSuccess('');
    try {
      await api.post(`/api/public/menu/${slug}/call-staff`, {
        tableNumber: callStaffTable || tableNumber || customerName || 'Counter',
        requestType: callStaffType,
      });
      setShowCallStaffModal(false);
      setStaffCalledSuccess(`Staff alerted!`);
      setTimeout(() => setStaffCalledSuccess(''), 5000);
    } catch (err) {
      alert('Could not notify staff.');
    } finally {
      setCallingStaff(false);
    }
  };

  useEffect(() => {
    async function loadMenuAndLogView() {
      if (!slug) return;
      try {
        const menuResponse = await api.get(`/api/public/menu/${slug}`);
        const restData = menuResponse.data.restaurant;
        setRestaurant(restData);
        if (restData.categories?.length > 0) setActiveCategory(restData.categories[0].id);

        const src = searchParams.get('src') || 'direct_link';
        await api.post(`/api/public/menu/${slug}/view-event?src=${src}`);

        const isFreshStart = searchParams.get('reset') === 'true' || searchParams.get('fresh') === 'true';
        if (isFreshStart && slug) localStorage.removeItem(`last_order_${slug}`);

        const existingOrderId = !isFreshStart && (searchParams.get('orderId') || localStorage.getItem(`last_order_${slug}`));
        if (existingOrderId) {
          try {
            const orderRes = await api.get(`/api/public/orders/${existingOrderId}`);
            if (orderRes.data.order) { setLastPlacedOrder(orderRes.data.order); setOrderPlaced(true); }
          } catch (e) { console.warn('Could not restore previous order', e); }
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Menu could not be loaded.');
      } finally {
        setLoading(false);
      }
    }
    loadMenuAndLogView();
  }, [slug, searchParams]);

  useEffect(() => {
    async function generateUPIQR() {
      const upiId = restaurant?.upiId || lastPlacedOrder?.restaurant?.upiId;
      if (!upiId) return;
      const payeeName = restaurant?.upiPayeeName || lastPlacedOrder?.restaurant?.upiPayeeName || restaurant?.name || 'Cafe';
      const subtotalAmount = cart.reduce((s, i) => s + parseFloat(i.menuItem.price) * i.quantity, 0);
      const currentTotal = lastPlacedOrder
        ? lastPlacedOrder.items.reduce((s: number, i: any) => s + parseFloat(i.priceAtOrder) * i.quantity, 0).toFixed(2)
        : subtotalAmount.toFixed(2);
      const noteStr = lastPlacedOrder ? `Order ${lastPlacedOrder.id.slice(-6)}` : 'Cafe Order';
      const link = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${currentTotal}&cu=INR&tn=${encodeURIComponent(noteStr)}`;
      setUpiDeepLink(link);
      try {
        const qrDataUrl = await QRCode.toDataURL(link, { width: 320, margin: 2, color: { dark: '#1A1208', light: '#ffffff' } });
        setUpiQrCodeUrl(qrDataUrl);
      } catch (e) { console.error(e); }
    }
    generateUPIQR();
  }, [lastPlacedOrder, restaurant, cart]);

  useEffect(() => {
    if (!restaurant?.id || !lastPlacedOrder?.id) return;
    const socket = io(API_BASE_URL);
    socket.on('connect', () => { socket.emit('join_restaurant', restaurant.id); });
    socket.on('order_updated', (updatedOrder: any) => {
      if (updatedOrder.id === lastPlacedOrder.id) {
        const prevStatus = lastPlacedOrder.status;
        setLastPlacedOrder(updatedOrder);
        if (prevStatus === 'PAYMENT_PENDING_VERIFICATION' && updatedOrder.status === 'RECEIVED') {
          playBeep();
          setConfirmedToast(`✅ Payment Confirmed — Order Received!`);
          setTimeout(() => setConfirmedToast(''), 8000);
        } else if (['PREPARING', 'SERVED'].includes(updatedOrder.status)) { playBeep(); }
      }
    });
    return () => { socket.disconnect(); };
  }, [restaurant?.id, lastPlacedOrder?.id, API_BASE_URL]);

  // Body scroll lock for overlays
  useEffect(() => {
    const isModalOpen = cartOpen || showCallStaffModal;
    if (isModalOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [cartOpen, showCallStaffModal]);

  const handleCategoryScroll = (categoryId: string) => {
    setActiveCategory(categoryId);
    const element = categoryRefs.current[categoryId];
    if (element) {
      const offset = 110;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      window.scrollTo({ top: elementRect - bodyRect - offset, behavior: 'smooth' });
    }
  };

  const addToCart = (item: MenuItem) => {
    setCart((p) => {
      const ex = p.find((i) => i.menuItem.id === item.id);
      if (ex) return p.map((i) => i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...p, { menuItem: item, quantity: 1, notes: '' }];
    });
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart((p) => p.map((i) => i.menuItem.id === itemId ? { ...i, quantity: i.quantity + delta } : i).filter((i) => i.quantity > 0));
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    setCart((p) => p.map((i) => i.menuItem.id === itemId ? { ...i, notes } : i));
  };

  const cartTotalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const cartSubtotal = cart.reduce((s, i) => s + parseFloat(i.menuItem.price) * i.quantity, 0);

  const getWhatsAppLink = (order: any) => {
    if (!order) return '#';
    const customerText = order.customerName ? `Customer: ${order.customerName}` : (order.tableNumber ? `Table ${order.tableNumber}` : 'Direct Order');
    const itemsList = order.items.map((item: any) => {
      const total = (parseFloat(item.priceAtOrder) * item.quantity).toFixed(2);
      const note = item.notes ? ` (Note: ${item.notes})` : '';
      return `• ${item.quantity}x ${item.menuItem.name} - ₹${total}${note}`;
    }).join('\n');
    const total = order.items.reduce((s: number, i: any) => s + parseFloat(i.priceAtOrder) * i.quantity, 0).toFixed(2);
    const payStr = order.status === 'PAYMENT_PENDING_VERIFICATION' ? 'Paid via UPI (Pending Verification)' : 'Pay at Counter';
    const msg = `🛒 *New Order from ${restaurant?.name || 'Cafe'}*\n👤 *${customerText}*\n💳 *Payment:* ${payStr}\n--------------------------------\n*Items:*\n${itemsList}\n--------------------------------\n💰 *Total:* ₹${total}\n\nPlease prepare this order! Thank you.`;
    const raw = restaurant?.contactNumber ? restaurant.contactNumber.replace(/[^0-9]/g, '') : '';
    return raw ? `https://wa.me/${raw}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  const handleCheckout = async (selectedMethodOverride?: 'COUNTER' | 'UPI') => {
    if (cart.length === 0) return;
    if (!customerName.trim()) { setNameError('Please enter your name so the cafe can call you when ready.'); return; }
    setNameError('');
    setPlacingOrder(true);
    setOrderError('');

    const isUpiAvailable = Boolean(restaurant?.upiQrImageUrl || restaurant?.upiId);
    const selectedMethod = selectedMethodOverride || ((isUpiAvailable && paymentMethod === 'UPI') ? 'UPI' : 'COUNTER');

    const payload = {
      customerName: customerName.trim(),
      tableNumber: tableNumber.trim() || null,
      paymentMethod: selectedMethod,
      items: cart.map((i) => ({ menuItemId: i.menuItem.id, quantity: i.quantity, notes: i.notes.trim() || null })),
    };

    try {
      const response = await api.post(`/api/public/menu/${slug}/order`, payload);
      const placedOrder = response.data.order;
      setLastPlacedOrder(placedOrder);
      setOrderPlaced(true);
      if (slug) localStorage.setItem(`last_order_${slug}`, placedOrder.id);
      setCart([]);
      setCartOpen(false);
      setShowPaymentModal(false);
    } catch (err: any) {
      setOrderError(err.response?.data?.error || 'Failed to submit order.');
    } finally {
      setPlacingOrder(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--cream)] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-[var(--sage)]" size={36} />
        <p className="text-sm text-[var(--muted)]">Loading menu…</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────
  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-[var(--cream)] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="text-red-400 mb-4" size={48} />
        <h2 className="text-xl font-display font-medium text-[var(--text)]">Oops!</h2>
        <p className="text-sm text-[var(--muted)] mt-2 max-w-xs">{error || 'Menu not found.'}</p>
      </div>
    );
  }

  // ── Order Confirmation ────────────────────────────────────────────────
  if (orderPlaced && lastPlacedOrder) {
    const isUPIPending = lastPlacedOrder.status === 'PAYMENT_PENDING_VERIFICATION';
    const isCancelled = lastPlacedOrder.status === 'CANCELLED';
    const orderAgeMin = (Date.now() - new Date(lastPlacedOrder.createdAt).getTime()) / 60000;
    const isExpired = (isUPIPending || isCancelled) && orderAgeMin > 15;
    const orderTotal = lastPlacedOrder.items.reduce((s: number, i: any) => s + parseFloat(i.priceAtOrder) * i.quantity, 0).toFixed(2);
    const payeeName = restaurant?.upiPayeeName || lastPlacedOrder.restaurant?.upiPayeeName || restaurant?.name || 'Cafe';

    return (
      <div className="min-h-screen bg-[var(--cream)] flex justify-center">
        <div className="w-full max-w-md bg-white min-h-screen flex flex-col border-x border-[var(--cream-border)]">
          {/* Confirmation Toast */}
          {confirmedToast && (
            <div className="m-4 bg-emerald-600 text-white text-sm p-4 rounded-2xl font-bold flex items-center gap-3 animate-bounce">
              <CheckCircle2 size={22} className="shrink-0" />
              <div>
                <p className="font-black uppercase text-xs tracking-wider">Payment Verified!</p>
                <p className="font-normal text-xs mt-0.5">{confirmedToast}</p>
              </div>
            </div>
          )}

          <div className="flex-1 p-6 space-y-5 overflow-y-auto">
            {/* Status */}
            {isExpired ? (
              <div className="text-center space-y-3 pt-4">
                <div className="w-20 h-20 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center mx-auto">
                  <Clock size={36} className="text-amber-600" />
                </div>
                <h1 className="font-display text-2xl font-medium text-[var(--text)]">Waiting for Confirmation</h1>
                <p className="text-sm text-[var(--muted)] bg-amber-50 border border-amber-200 p-3 rounded-2xl">
                  ⚠️ Payment not confirmed yet — please check with cafe staff.
                </p>
              </div>
            ) : isUPIPending ? (
              <div className="text-center space-y-3 pt-4">
                <div className="w-16 h-16 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center mx-auto animate-pulse">
                  <Clock size={32} className="text-amber-500" />
                </div>
                <h1 className="font-display text-2xl font-medium text-[var(--text)]">Payment Submitted</h1>
                <p className="text-sm bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-2xl font-medium">
                  Waiting for cafe to confirm your payment.
                </p>
                <p className="text-xs text-[var(--muted)]">Do not close this page.</p>
              </div>
            ) : (
              <div className="text-center space-y-3 pt-4">
                <div className="w-20 h-20 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto animate-pulse">
                  <Check size={36} className="text-emerald-600" />
                </div>
                <h1 className="font-display text-2xl font-medium text-[var(--text)]">Order Sent to Kitchen!</h1>
                <span className="inline-block bg-[var(--sage-light)] text-[var(--sage)] text-xs font-bold px-3 py-1 rounded-full border border-[var(--sage)]/20 uppercase tracking-wider">
                  Status: {lastPlacedOrder.status}
                </span>
                {(lastPlacedOrder.customerName || lastPlacedOrder.tableNumber) && (
                  <p className="text-sm text-[var(--muted)]">
                    {lastPlacedOrder.customerName ? `👤 ${lastPlacedOrder.customerName}` : `🪑 Table ${lastPlacedOrder.tableNumber}`}
                  </p>
                )}
              </div>
            )}

            {/* UPI QR */}
            {isUPIPending && (
              <div className="bg-[var(--cream)] border border-[var(--cream-border)] rounded-3xl p-5 space-y-4 text-center">
                <div className="flex items-center justify-between border-b border-[var(--cream-border)] pb-3">
                  <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
                    <QrCode size={14} className="text-[var(--sage)]" /> Scan to Pay
                  </span>
                  <span className="font-mono font-black text-[var(--sage)]">₹{orderTotal}</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-[var(--cream-border)] inline-block">
                  {(restaurant.upiQrImageUrl || lastPlacedOrder.restaurant?.upiQrImageUrl) ? (
                    <img src={(restaurant.upiQrImageUrl || lastPlacedOrder.restaurant?.upiQrImageUrl).startsWith('http')
                      ? (restaurant.upiQrImageUrl || lastPlacedOrder.restaurant?.upiQrImageUrl)
                      : `${API_BASE_URL}${restaurant.upiQrImageUrl || lastPlacedOrder.restaurant?.upiQrImageUrl}`}
                      alt="UPI QR" className="w-52 h-52 object-contain mx-auto" />
                  ) : upiQrCodeUrl ? (
                    <img src={upiQrCodeUrl} alt="UPI QR" className="w-52 h-52 object-contain mx-auto" />
                  ) : (
                    <Loader2 className="animate-spin text-[var(--sage)] mx-auto" size={32} />
                  )}
                </div>
                <p className="text-sm font-semibold text-[var(--text)]">Payee: {payeeName}</p>
                {(restaurant.upiId || lastPlacedOrder.restaurant?.upiId) && (
                  <>
                    <p className="text-xs font-mono text-[var(--muted)]">{restaurant.upiId || lastPlacedOrder.restaurant?.upiId}</p>
                    <a href={upiDeepLink || `upi://pay?pa=${encodeURIComponent(restaurant.upiId || lastPlacedOrder.restaurant?.upiId || '')}&pn=${encodeURIComponent(payeeName)}&am=${orderTotal}&cu=INR`}
                      target="_blank" rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--sage)] hover:bg-[var(--sage-mid)] text-white font-semibold rounded-2xl text-sm transition-all">
                      <ExternalLink size={15} /> Open in UPI App
                    </a>
                  </>
                )}
              </div>
            )}

            {/* Order Summary */}
            <div className="bg-[var(--cream)] border border-[var(--cream-border)] rounded-3xl p-5 space-y-3">
              <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardList size={13} className="text-[var(--sage)]" /> Order Summary
              </h3>
              <div className="divide-y divide-[var(--cream-border)]">
                {lastPlacedOrder.items.map((item: any) => (
                  <div key={item.id} className="py-2.5 flex justify-between gap-4 text-sm">
                    <div>
                      <span className="font-bold text-[var(--text)]">{item.quantity}×</span>
                      <span className="ml-1.5 text-[var(--text-mid)]">{item.menuItem.name}</span>
                      {item.notes && <p className="text-xs text-[var(--muted)] mt-0.5 italic">"{item.notes}"</p>}
                    </div>
                    <span className="font-mono text-sm font-semibold text-[var(--text)]">₹{(parseFloat(item.priceAtOrder) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-[var(--cream-border)] flex justify-between font-bold text-sm">
                <span>Total</span>
                <span className="font-mono text-[var(--sage)] text-base">₹{orderTotal}</span>
              </div>
            </div>

            {/* WhatsApp */}
            <button
              onClick={() => { const url = getWhatsAppLink(lastPlacedOrder); if (url && url !== '#') window.open(url, '_blank', 'noopener,noreferrer'); }}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all shadow-md">
              <MessageCircle size={17} /> Send Order via WhatsApp
            </button>

            {!isUPIPending && (
              <div className="bg-[var(--sage-light)] border border-[var(--sage)]/20 p-4 rounded-2xl text-center">
                <p className="text-[var(--sage)] font-semibold text-sm">Please pay at the counter</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">Show this order to staff when paying.</p>
              </div>
            )}

            <button
              onClick={() => { if (slug) localStorage.removeItem(`last_order_${slug}`); setOrderPlaced(false); setLastPlacedOrder(null); }}
              className="w-full py-3 bg-[var(--cream)] hover:bg-[var(--cream-dark)] text-[var(--text)] font-semibold rounded-2xl text-sm border border-[var(--cream-border)] transition-all">
              Order More Food
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Full-screen Checkout & Payment Page ────────────────────────────────
  if (showPaymentModal) {
    return (
      <div className="min-h-screen bg-[var(--cream)] flex justify-center">
        <div className="w-full max-w-md bg-white min-h-screen flex flex-col border-x border-[var(--cream-border)]">
          {/* Header */}
          <div className="px-5 py-4 border-b border-[var(--cream-border)] flex items-center gap-3 bg-white sticky top-0 z-10">
            <button
              onClick={() => { setShowPaymentModal(false); setCartOpen(true); }}
              className="p-2 rounded-xl border border-[var(--cream-border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--cream)] transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="font-semibold text-[var(--text)] text-sm">Checkout & Payment</h2>
              <p className="text-xs text-[var(--muted)]">₹{cartSubtotal.toFixed(2)} · {cartTotalItems} item{cartTotalItems > 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
                Your Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => { setCustomerName(e.target.value); if (nameError) setNameError(''); }}
                placeholder="e.g. Rahul, Priya, Alex"
                className="w-full px-4 py-3 bg-[var(--cream)] border border-[var(--cream-border)] rounded-2xl text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--sage)] text-sm"
              />
              {nameError && <p className="text-xs text-red-600 font-semibold">{nameError}</p>}
            </div>

            {/* Payment Method */}
            {restaurant?.upiId && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['COUNTER', 'UPI'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        paymentMethod === method
                          ? 'bg-[var(--sage-light)] border-[var(--sage)] ring-2 ring-[var(--sage)] ring-offset-1'
                          : 'bg-white border-[var(--cream-border)] hover:border-[var(--cream-dark)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        {method === 'COUNTER' ? <Store size={18} className="text-[var(--sage)]" /> : <QrCode size={18} className="text-[var(--sage)]" />}
                        {paymentMethod === method && <CheckCircle2 size={15} className="text-[var(--sage)]" />}
                      </div>
                      <p className="text-sm font-bold text-[var(--text)]">{method === 'COUNTER' ? 'Pay at Counter' : 'Pay via UPI'}</p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">{method === 'COUNTER' ? 'Cash or card at counter' : 'Scan QR — GPay, PhonePe'}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Counter CTA */}
            {paymentMethod === 'COUNTER' ? (
              <button onClick={() => handleCheckout('COUNTER')} disabled={placingOrder}
                className="w-full py-4 bg-[var(--sage)] hover:bg-[var(--sage-mid)] disabled:opacity-50 text-white font-semibold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[var(--sage)]/20">
                {placingOrder && <Loader2 className="animate-spin" size={15} />}
                Place Order — Pay at Counter (₹{cartSubtotal.toFixed(2)})
              </button>
            ) : (
              <div className="bg-[var(--cream)] border border-[var(--cream-border)] p-5 rounded-3xl space-y-4 text-center">
                <p className="text-xs font-bold text-[var(--sage)] uppercase tracking-wider">
                  {restaurant?.upiPayeeName || restaurant?.name || 'Cafe'}
                </p>
                <div className="mx-auto w-56 h-56 bg-white p-3 rounded-2xl border-2 border-[var(--sage)]/20 flex items-center justify-center">
                  {restaurant?.upiQrImageUrl ? (
                    <img src={restaurant.upiQrImageUrl.startsWith('http') ? restaurant.upiQrImageUrl : `${API_BASE_URL}${restaurant.upiQrImageUrl}`}
                      alt="UPI QR" className="w-full h-full object-contain rounded-xl" />
                  ) : upiQrCodeUrl ? (
                    <img src={upiQrCodeUrl} alt="UPI QR" className="w-full h-full object-contain rounded-xl" />
                  ) : (
                    <Loader2 className="animate-spin text-[var(--sage)]" size={32} />
                  )}
                </div>
                <div className="text-sm text-[var(--muted)]">
                  Amount: <span className="font-mono font-black text-[var(--text)] text-base">₹{cartSubtotal.toFixed(2)}</span>
                </div>
                {restaurant?.upiId && <p className="text-xs font-mono text-[var(--muted)]">UPI ID: {restaurant.upiId}</p>}
                {restaurant?.upiId && (
                  <a href={upiDeepLink || `upi://pay?pa=${encodeURIComponent(restaurant.upiId)}&pn=${encodeURIComponent(restaurant.upiPayeeName || restaurant.name || 'Cafe')}&am=${cartSubtotal.toFixed(2)}&cu=INR&tn=CafeOrder`}
                    target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--sage)] hover:bg-[var(--sage-mid)] text-white font-semibold rounded-2xl text-sm transition-all">
                    <ExternalLink size={15} /> Open in UPI App
                  </a>
                )}
                <div className="pt-2 border-t border-[var(--cream-border)] space-y-3">
                  <button onClick={() => handleCheckout('UPI')} disabled={placingOrder}
                    className="w-full py-3.5 bg-[var(--sage)] hover:bg-[var(--sage-mid)] disabled:opacity-50 text-white font-semibold rounded-2xl text-sm flex items-center justify-center gap-2 transition-all">
                    {placingOrder ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle2 size={16} />}
                    I've Made the Payment
                  </button>
                  <p className="text-xs text-[var(--muted)] bg-[var(--amber-light)] border border-[var(--amber)]/20 p-2.5 rounded-xl text-left">
                    💡 Only tap after completing payment. The cafe will verify before preparing your order.
                  </p>
                </div>
              </div>
            )}

            {orderError && (
              <div className="bg-[var(--red-light)] border border-red-200 text-[var(--red-soft)] text-sm p-3.5 rounded-2xl">
                {orderError}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Main Public Menu ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--cream)] flex justify-center pb-24">
      <div className="w-full max-w-md bg-white min-h-screen flex flex-col border-x border-[var(--cream-border)] relative">

        {/* Hero Header */}
        <header className="relative bg-[var(--sage)] px-5 pt-8 pb-6">
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="w-16 h-16 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center overflow-hidden shrink-0">
              {restaurant.logoUrl && !logoError ? (
                <img
                  src={restaurant.logoUrl.startsWith('http') || restaurant.logoUrl.startsWith('data:') ? restaurant.logoUrl : `${API_BASE_URL}${restaurant.logoUrl}`}
                  alt="Logo"
                  onError={() => setLogoError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Store size={28} className="text-white/70" />
              )}
            </div>

            <div className="flex-1 text-white">
              <h1 className="font-display text-xl font-medium leading-tight">{restaurant.name}</h1>
              {restaurant.contactNumber && (
                <a href={`tel:${restaurant.contactNumber}`} className="flex items-center gap-1.5 text-white/70 text-xs mt-1 hover:text-white transition-colors">
                  <Phone size={11} /> {restaurant.contactNumber}
                </a>
              )}
              {restaurant.address && (
                <p className="flex items-start gap-1.5 text-white/60 text-xs mt-1">
                  <MapPin size={11} className="shrink-0 mt-0.5" /> {restaurant.address}
                </p>
              )}
            </div>

            <button
              onClick={() => setShowCallStaffModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 border border-white/20 text-white hover:bg-white/25 rounded-xl text-xs font-semibold transition-all shrink-0"
            >
              <Bell size={12} /> Call
            </button>
          </div>

          {staffCalledSuccess && (
            <div className="mt-3 bg-emerald-500 text-white text-xs font-semibold py-2 px-4 rounded-xl flex items-center gap-2">
              <Bell size={13} /> {staffCalledSuccess}
            </div>
          )}

          {restaurant.isAcceptingOrders === false && (
            <div className="mt-3 bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              Kitchen paused — view-only mode
            </div>
          )}
        </header>

        {/* Sticky Search + Categories */}
        <div className="sticky top-0 z-30 bg-white border-b border-[var(--cream-border)] shadow-sm">
          <div className="px-4 pt-3 pb-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes…"
                className="w-full pl-10 pr-10 py-2.5 bg-[var(--cream)] border border-[var(--cream-border)] rounded-xl text-sm text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--sage)]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Veg filter + Category pills */}
            <div className="flex items-center gap-2 mt-2.5 overflow-x-auto no-scrollbar pb-1">
              {/* Veg toggle */}
              <div className="flex items-center bg-[var(--cream)] rounded-xl border border-[var(--cream-border)] p-0.5 shrink-0">
                {(['all', 'veg', 'non-veg'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterVeg(f)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      filterVeg === f
                        ? f === 'veg' ? 'bg-emerald-500 text-white' : f === 'non-veg' ? 'bg-red-500 text-white' : 'bg-white text-[var(--text)] shadow-sm'
                        : 'text-[var(--muted)]'
                    }`}
                  >
                    {f === 'veg' ? '🌿 Veg' : f === 'non-veg' ? '🍖 Non-Veg' : 'All'}
                  </button>
                ))}
              </div>

              {/* Category pills */}
              {restaurant.categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryScroll(cat.id)}
                  className={`text-xs px-3.5 py-1.5 rounded-full font-semibold whitespace-nowrap shrink-0 transition-all ${
                    activeCategory === cat.id
                      ? 'bg-[var(--sage)] text-white shadow-sm'
                      : 'bg-[var(--cream)] text-[var(--muted)] hover:text-[var(--text)] border border-[var(--cream-border)]'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="flex-1 p-4 space-y-8">
          {(() => {
            let totalRendered = 0;
            const content = restaurant.categories.map((category) => {
              const filteredItems = category.items.filter((item) => {
                const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
                const matchVeg = filterVeg === 'all' || (filterVeg === 'veg' && item.isVeg) || (filterVeg === 'non-veg' && !item.isVeg);
                return matchSearch && matchVeg;
              });
              if (!filteredItems.length) return null;
              totalRendered += filteredItems.length;

              return (
                <section
                  key={category.id}
                  ref={(el) => (categoryRefs.current[category.id] = el)}
                  className="space-y-3 scroll-mt-28"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 rounded-full bg-[var(--sage)]" />
                    <h2 className="text-sm font-display font-medium text-[var(--text)] uppercase tracking-wide">{category.name}</h2>
                    <span className="text-[10px] text-[var(--muted)] font-semibold">{filteredItems.length} items</span>
                  </div>

                  {/* 2-column grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {filteredItems.map((item) => {
                      const cartEntry = cart.find((i) => i.menuItem.id === item.id);
                      const currentQty = cartEntry?.quantity || 0;

                      return (
                        <div
                          key={item.id}
                          className={`bg-white border border-[var(--cream-border)] rounded-2xl overflow-hidden card-hover ${!item.isAvailable ? 'opacity-60' : ''}`}
                        >
                          {/* Image */}
                          <div className="relative bg-[var(--cream)] h-32 overflow-hidden">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl.startsWith('http') ? item.imageUrl : `${API_BASE_URL}${item.imageUrl}`}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Utensils size={28} className="text-[var(--cream-border)]" />
                              </div>
                            )}
                            {/* Veg dot */}
                            <div className={`absolute top-2 left-2 w-4 h-4 rounded-sm border-2 flex items-center justify-center ${item.isVeg ? 'border-emerald-500 bg-white' : 'border-red-500 bg-white'}`}>
                              <div className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            </div>
                            {/* Badge */}
                            {item.badge && (
                              <span className="absolute top-2 right-2 text-[9px] bg-[var(--sage)] text-white px-1.5 py-0.5 rounded-full font-bold">
                                {item.badge === 'bestseller' ? '🔥' : item.badge === 'spicy' ? '🌶️' : item.badge === 'special' ? '⭐' : '🆕'}
                              </span>
                            )}
                            {!item.isAvailable && (
                              <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                                <span className="text-xs font-bold text-red-600 bg-white px-2 py-1 rounded-lg border border-red-200">Sold Out</span>
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="p-3 space-y-2">
                            <div>
                              <h3 className="text-sm font-semibold text-[var(--text)] leading-tight line-clamp-1">{item.name}</h3>
                              {item.description && (
                                <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-snug line-clamp-2">{item.description}</p>
                              )}
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-[var(--sage)] text-sm">₹{parseFloat(item.price).toFixed(0)}</span>

                              {item.isAvailable && restaurant.isAcceptingOrders !== false && (
                                currentQty > 0 ? (
                                  <div className="flex items-center gap-1.5 bg-[var(--sage)] rounded-xl px-1 py-0.5">
                                    <button onClick={() => updateCartQuantity(item.id, -1)} className="p-1 text-white hover:text-white/70">
                                      <Minus size={10} />
                                    </button>
                                    <span className="text-xs font-black text-white w-4 text-center">{currentQty}</span>
                                    <button onClick={() => updateCartQuantity(item.id, 1)} className="p-1 text-white hover:text-white/70">
                                      <Plus size={10} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => addToCart(item)}
                                    className="w-8 h-8 bg-[var(--sage)] hover:bg-[var(--sage-mid)] text-white rounded-xl flex items-center justify-center transition-all active:scale-90"
                                  >
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

            if (totalRendered === 0) {
              return (
                <div className="py-16 text-center space-y-3">
                  <Utensils className="mx-auto text-[var(--cream-border)]" size={40} />
                  <p className="font-semibold text-[var(--text)]">No items found</p>
                  <button
                    onClick={() => { setSearchQuery(''); setFilterVeg('all'); }}
                    className="px-4 py-2 bg-[var(--sage-light)] text-[var(--sage)] rounded-xl text-sm font-semibold"
                  >
                    Reset Filters
                  </button>
                </div>
              );
            }
            return content;
          })()}
        </div>

        {/* Floating Cart Button */}
        {cartTotalItems > 0 && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-full max-w-[calc(28rem-2px)] px-4 z-40">
            <button
              onClick={() => { setOrderError(''); setCartOpen(true); }}
              className="w-full flex items-center justify-between bg-[var(--sage)] hover:bg-[var(--sage-mid)] text-white px-5 py-4 rounded-2xl shadow-xl shadow-[var(--sage)]/30 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-white text-[var(--sage)] flex items-center justify-center text-xs font-black shadow-sm">
                  {cartTotalItems}
                </div>
                <span className="text-sm font-semibold">View Basket</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm">₹{cartSubtotal.toFixed(0)}</span>
                <ShoppingCart size={16} />
              </div>
            </button>
          </div>
        )}

        {/* Cart Slide-up Drawer */}
        {cartOpen && (
          <div
            onClick={() => setCartOpen(false)}
            className="fixed inset-0 z-50 flex justify-center items-end bg-black/60 backdrop-blur-sm"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-t-3xl h-dvh max-h-dvh flex flex-col slide-up"
            >
              {/* Drawer handle */}
              <div className="pt-3 pb-1 flex justify-center shrink-0">
                <div className="w-10 h-1 rounded-full bg-[var(--cream-border)]" />
              </div>

              {/* Drawer header */}
              <div className="px-5 py-3 border-b border-[var(--cream-border)] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-[var(--sage)]">
                  <ShoppingCart size={17} />
                  <h2 className="text-sm font-bold text-[var(--text)] uppercase tracking-wide">Your Basket ({cartTotalItems})</h2>
                </div>
                <button onClick={() => setCartOpen(false)} className="p-1.5 rounded-xl hover:bg-[var(--cream)] text-[var(--muted)] hover:text-[var(--text)] transition-all">
                  <X size={19} />
                </button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3 overscroll-contain touch-pan-y">
                {orderError && (
                  <div className="bg-[var(--red-light)] border border-red-200 text-[var(--red-soft)] text-xs p-3 rounded-xl">{orderError}</div>
                )}

                {cart.length === 0 ? (
                  <div className="text-center py-16 space-y-2">
                    <ShoppingCart size={36} className="mx-auto text-[var(--cream-border)]" />
                    <p className="text-sm text-[var(--muted)]">Your basket is empty</p>
                  </div>
                ) : cart.map((item) => (
                  <div key={item.menuItem.id} className="bg-[var(--cream)] border border-[var(--cream-border)] p-4 rounded-2xl space-y-3">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <h4 className="font-semibold text-[var(--text)] text-sm">{item.menuItem.name}</h4>
                        <p className="font-mono text-xs text-[var(--sage)] font-bold mt-0.5">₹{parseFloat(item.menuItem.price).toFixed(0)}</p>
                      </div>
                      <div className="flex items-center gap-2 border border-[var(--cream-border)] bg-white rounded-xl px-1.5 py-0.5 shrink-0">
                        <button onClick={() => updateCartQuantity(item.menuItem.id, -1)} className="p-1 text-[var(--muted)] hover:text-[var(--text)]"><Minus size={11} /></button>
                        <span className="text-sm font-bold text-[var(--text)] w-5 text-center">{item.quantity}</span>
                        <button onClick={() => updateCartQuantity(item.menuItem.id, 1)} className="p-1 text-[var(--muted)] hover:text-[var(--text)]"><Plus size={11} /></button>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={item.notes}
                      onChange={(e) => updateItemNotes(item.menuItem.id, e.target.value)}
                      placeholder="Special instructions (no spice, extra cheese…)"
                      className="w-full bg-white border border-[var(--cream-border)] rounded-xl px-3 py-2 text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--sage)]"
                    />
                    <div className="flex flex-wrap gap-1">
                      {['🌶️ Extra Spicy', '🚫 No Onion', '🧀 Extra Cheese', '🧊 Less Ice', '📦 Pack Separately'].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => {
                            const cur = item.notes.trim();
                            if (cur.includes(chip)) {
                              updateItemNotes(item.menuItem.id, cur.replace(chip, '').replace(/^,\s*|,\s*$/g, '').trim());
                            } else {
                              updateItemNotes(item.menuItem.id, cur ? `${cur}, ${chip}` : chip);
                            }
                          }}
                          className={`text-[9px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                            item.notes?.includes(chip)
                              ? 'bg-[var(--sage)] text-white border-[var(--sage)] font-bold'
                              : 'bg-white text-[var(--muted)] border-[var(--cream-border)] hover:border-[var(--cream-dark)]'
                          }`}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              {cart.length > 0 && (
                <div className="p-5 border-t border-[var(--cream-border)] bg-[var(--cream)] shrink-0 space-y-3">
                  <div className="flex justify-between items-center text-sm font-semibold text-[var(--muted)]">
                    <span>Subtotal</span>
                    <span className="font-mono font-black text-[var(--text)] text-base">₹{cartSubtotal.toFixed(0)}</span>
                  </div>
                  <button
                    onClick={() => { setCartOpen(false); setShowPaymentModal(true); }}
                    className="w-full py-4 bg-[var(--sage)] hover:bg-[var(--sage-mid)] text-white font-semibold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
                  >
                    Proceed to Checkout (₹{cartSubtotal.toFixed(0)}) →
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
                <h3 className="font-semibold text-[var(--text)] flex items-center gap-2">
                  <Bell size={16} className="text-[var(--sage)]" /> Call Staff
                </h3>
                <button onClick={() => setShowCallStaffModal(false)} className="text-[var(--muted)] hover:text-[var(--text)]">
                  <X size={17} />
                </button>
              </div>

              <form onSubmit={handleSendStaffCall} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">Your Table or Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Table 4 or Rahul"
                    value={callStaffTable}
                    onChange={(e) => setCallStaffTable(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[var(--cream)] border border-[var(--cream-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sage)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Call Waiter', label: '🔔 Call Waiter' },
                    { id: 'Water Request', label: '🧊 Request Water' },
                    { id: 'Clean Table', label: '🧹 Clean Table' },
                    { id: 'Request Bill', label: '🧾 Request Bill' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCallStaffType(item.id)}
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition-all ${
                        callStaffType === item.id
                          ? 'bg-[var(--sage)] text-white border-[var(--sage)]'
                          : 'bg-[var(--cream)] text-[var(--muted)] border-[var(--cream-border)] hover:border-[var(--cream-dark)]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={callingStaff}
                  className="w-full py-3 bg-[var(--sage)] hover:bg-[var(--sage-mid)] text-white rounded-2xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  {callingStaff ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                  Notify Staff
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
