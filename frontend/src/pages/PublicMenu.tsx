import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import io from 'socket.io-client';
import api from '../api/api';
import { 
  Store, Phone, MapPin, Search, Leaf, AlertCircle, Loader2, 
  ShoppingCart, Plus, Minus, X, Check, Utensils, ClipboardList, MessageCircle, Bell,
  QrCode, ExternalLink, Clock, CheckCircle2, ArrowLeft
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

  // Filtering & Category State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVeg, setFilterVeg] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [activeCategory, setActiveCategory] = useState<string>('');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [nameError, setNameError] = useState('');
  const tableNumber = '';
  const [paymentMethod, setPaymentMethod] = useState<'COUNTER' | 'UPI'>('COUNTER');

  // Call Staff Modal State
  const [showCallStaffModal, setShowCallStaffModal] = useState(false);
  const [callStaffTable, setCallStaffTable] = useState('');
  const [callStaffType, setCallStaffType] = useState('Call Waiter');
  const [callingStaff, setCallingStaff] = useState(false);
  const [staffCalledSuccess, setStaffCalledSuccess] = useState('');

  // Order Submission & Payment State
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
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
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
    } catch (e) {
      console.warn(e);
    }
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
      setStaffCalledSuccess(`Staff alerted for Table ${callStaffTable || tableNumber || customerName || 'Counter'}!`);
      setTimeout(() => setStaffCalledSuccess(''), 5000);
    } catch (err) {
      console.error('Failed to call staff', err);
      alert('Could not notify staff.');
    } finally {
      setCallingStaff(false);
    }
  };

  // Load menu and log view
  useEffect(() => {
    async function loadMenuAndLogView() {
      if (!slug) return;
      try {
        const menuResponse = await api.get(`/api/public/menu/${slug}`);
        const restData = menuResponse.data.restaurant;
        setRestaurant(restData);
        
        if (restData.categories && restData.categories.length > 0) {
          setActiveCategory(restData.categories[0].id);
        }

        const src = searchParams.get('src') || 'direct_link';
        await api.post(`/api/public/menu/${slug}/view-event?src=${src}`);

        // Check if user requested a fresh start/reset link
        const isFreshStart = searchParams.get('reset') === 'true' || searchParams.get('fresh') === 'true';
        if (isFreshStart && slug) {
          localStorage.removeItem(`last_order_${slug}`);
        }

        // If URL or localStorage has orderId, load existing order status for persistence (unless fresh start)
        const existingOrderId = !isFreshStart && (searchParams.get('orderId') || localStorage.getItem(`last_order_${slug}`));
        if (existingOrderId) {
          try {
            const orderRes = await api.get(`/api/public/orders/${existingOrderId}`);
            if (orderRes.data.order) {
              setLastPlacedOrder(orderRes.data.order);
              setOrderPlaced(true);
            }
          } catch (e) {
            console.warn('Could not restore previous order', e);
          }
        }
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.error || 'Menu could not be loaded.');
      } finally {
        setLoading(false);
      }
    }
    loadMenuAndLogView();
  }, [slug, searchParams]);

  // Generate UPI QR & Deep link dynamically when order, total, or cart changes
  useEffect(() => {
    async function generateUPIQR() {
      const upiId = restaurant?.upiId || lastPlacedOrder?.restaurant?.upiId;
      if (!upiId) return;

      const payeeName = restaurant?.upiPayeeName || lastPlacedOrder?.restaurant?.upiPayeeName || restaurant?.name || 'Cafe';
      const subtotalAmount = cart.reduce((sum, item) => sum + parseFloat(item.menuItem.price) * item.quantity, 0);
      const currentTotal = lastPlacedOrder
        ? lastPlacedOrder.items.reduce((sum: number, item: any) => sum + parseFloat(item.priceAtOrder) * item.quantity, 0).toFixed(2)
        : subtotalAmount.toFixed(2);
      const noteStr = lastPlacedOrder ? `Order ${lastPlacedOrder.id.slice(-6)}` : 'Cafe Order';

      const link = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${currentTotal}&cu=INR&tn=${encodeURIComponent(noteStr)}`;
      setUpiDeepLink(link);

      try {
        const qrDataUrl = await QRCode.toDataURL(link, {
          width: 320,
          margin: 2,
          color: { dark: '#1c1917', light: '#ffffff' },
        });
        setUpiQrCodeUrl(qrDataUrl);
      } catch (e) {
        console.error('Failed to generate UPI QR code', e);
      }
    }
    generateUPIQR();
  }, [lastPlacedOrder, restaurant, cart]);

  // Real-time socket updates for active order
  useEffect(() => {
    if (!restaurant?.id || !lastPlacedOrder?.id) return;

    const socket = io(API_BASE_URL);

    socket.on('connect', () => {
      socket.emit('join_restaurant', restaurant.id);
    });

    socket.on('order_updated', (updatedOrder: any) => {
      if (updatedOrder.id === lastPlacedOrder.id) {
        const prevStatus = lastPlacedOrder.status;
        setLastPlacedOrder(updatedOrder);

        if (prevStatus === 'PAYMENT_PENDING_VERIFICATION' && updatedOrder.status === 'RECEIVED') {
          playBeep();
          const toastMsg = `✅ Payment Confirmed by ${restaurant.name} — Order Received!`;
          setConfirmedToast(toastMsg);
          setTimeout(() => setConfirmedToast(''), 8000);
        } else if (updatedOrder.status === 'PREPARING' || updatedOrder.status === 'SERVED') {
          playBeep();
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [restaurant?.id, lastPlacedOrder?.id, API_BASE_URL]);

  // Robust Body Scroll Lock (Prevents background page scroll bleeding on iOS/Android & Desktop)
  useEffect(() => {
    const isModalOpen = cartOpen || showPaymentModal || showCallStaffModal;
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
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
      }
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [cartOpen, showPaymentModal, showCallStaffModal]);

  const handleCategoryScroll = (categoryId: string) => {
    setActiveCategory(categoryId);
    const element = categoryRefs.current[categoryId];
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  // --- Cart Operations ---

  const addToCart = (item: MenuItem) => {
    setCart((prevCart) => {
      const existing = prevCart.find((i) => i.menuItem.id === item.id);
      if (existing) {
        return prevCart.map((i) =>
          i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prevCart, { menuItem: item, quantity: 1, notes: '' }];
    });
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((i) => {
          if (i.menuItem.id === itemId) {
            const nextQty = i.quantity + delta;
            return nextQty > 0 ? { ...i, quantity: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    setCart((prevCart) =>
      prevCart.map((i) =>
        i.menuItem.id === itemId ? { ...i, notes } : i
      )
    );
  };

  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce(
    (sum, item) => sum + parseFloat(item.menuItem.price) * item.quantity,
    0
  );

  const getWhatsAppLink = (order: any) => {
    if (!order) return '#';
    const customerText = order.customerName ? `Customer: ${order.customerName}` : (order.tableNumber ? `Table ${order.tableNumber}` : 'Direct Order');
    const itemsList = order.items
      .map((item: any) => {
        const itemTotal = (parseFloat(item.priceAtOrder) * item.quantity).toFixed(2);
        const noteStr = item.notes ? ` (Note: ${item.notes})` : '';
        return `• ${item.quantity}x ${item.menuItem.name} - ₹${itemTotal}${noteStr}`;
      })
      .join('\n');

    const totalCost = order.items
      .reduce((sum: number, item: any) => sum + parseFloat(item.priceAtOrder) * item.quantity, 0)
      .toFixed(2);

    const payStatusStr = order.status === 'PAYMENT_PENDING_VERIFICATION' ? 'Paid via UPI (Pending Cafe Verification)' : 'Pay at Counter';

    const message = `🛒 *New Order from ${restaurant?.name || 'Cafe'}*\n` +
      `👤 *${customerText}*\n` +
      `💳 *Payment Method:* ${payStatusStr}\n` +
      `--------------------------------\n` +
      `*Items:* \n${itemsList}\n` +
      `--------------------------------\n` +
      `💰 *Total Amount:* ₹${totalCost}\n\n` +
      `Please prepare this order! Thank you.`;

    const rawContact = restaurant?.contactNumber ? restaurant.contactNumber.replace(/[^0-9]/g, '') : '';
    return rawContact 
      ? `https://wa.me/${rawContact}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  const handleCheckout = async (selectedMethodOverride?: 'COUNTER' | 'UPI') => {
    if (cart.length === 0) return;
    
    if (!customerName.trim()) {
      setNameError('Please enter your name so the cafe can call you when ready.');
      return;
    }
    setNameError('');

    setPlacingOrder(true);
    setOrderError('');

    const isUpiAvailable = Boolean(restaurant?.upiQrImageUrl || restaurant?.upiId);
    const selectedMethod = selectedMethodOverride || ((isUpiAvailable && paymentMethod === 'UPI') ? 'UPI' : 'COUNTER');

    const payload = {
      customerName: customerName.trim(),
      tableNumber: tableNumber.trim() || null,
      paymentMethod: selectedMethod,
      items: cart.map((i) => ({
        menuItemId: i.menuItem.id,
        quantity: i.quantity,
        notes: i.notes.trim() || null,
      })),
    };

    try {
      const response = await api.post(`/api/public/menu/${slug}/order`, payload);
      const placedOrder = response.data.order;
      setLastPlacedOrder(placedOrder);
      setOrderPlaced(true);
      if (slug) {
        localStorage.setItem(`last_order_${slug}`, placedOrder.id);
      }
      setCart([]);
      setCartOpen(false);
      setShowPaymentModal(false);
    } catch (err: any) {
      setOrderError(err.response?.data?.error || 'Failed to submit order.');
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] text-[#1C1917] flex flex-col justify-center items-center p-4">
        <Loader2 className="animate-spin text-[#5E6F58] mb-4" size={40} />
        <p className="text-sm text-[#7A7571] font-medium">Loading digital menu...</p>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] text-[#1C1917] flex flex-col justify-center items-center p-6 text-center">
        <AlertCircle className="text-red-500 mb-4 animate-bounce" size={48} />
        <h2 className="text-2xl font-bold text-[#1C1917] font-serif-display">Oops!</h2>
        <p className="text-sm text-[#7A7571] mt-2 max-w-xs">{error || 'Menu details not found.'}</p>
      </div>
    );
  }

  if (orderPlaced && lastPlacedOrder) {
    const isUPIPending = lastPlacedOrder.status === 'PAYMENT_PENDING_VERIFICATION';
    const isCancelled = lastPlacedOrder.status === 'CANCELLED';
    const orderAgeMinutes = (Date.now() - new Date(lastPlacedOrder.createdAt).getTime()) / (60 * 1000);
    const isExpiredSafeguard = (isUPIPending || isCancelled) && orderAgeMinutes > 15;

    const orderTotal = lastPlacedOrder.items
      .reduce((sum: number, item: any) => sum + parseFloat(item.priceAtOrder) * item.quantity, 0)
      .toFixed(2);
    const payeeName = restaurant?.upiPayeeName || lastPlacedOrder.restaurant?.upiPayeeName || restaurant?.name || 'Cafe';

    return (
      <div className="min-h-screen bg-[#FAF9F5] text-[#1C1917] pb-16 flex justify-center">
        <div className="w-full max-w-md bg-white min-h-screen flex flex-col shadow-[0_4px_30px_rgb(28,25,23,0.02)] p-6 border-x border-[#EAE8E4] justify-start items-center space-y-5 text-center overflow-y-auto">
          
          {/* Real-time Confirmation Toast Alert Banner */}
          {confirmedToast && (
            <div className="w-full bg-emerald-600 text-white text-xs p-4 rounded-2xl font-bold shadow-lg flex items-center gap-3 animate-bounce border border-emerald-500">
              <CheckCircle2 size={24} className="shrink-0 text-white" />
              <div className="text-left leading-tight">
                <span className="block font-black text-sm uppercase tracking-wider">Payment Verified!</span>
                <span>{confirmedToast}</span>
              </div>
            </div>
          )}

          {/* Header Status Icons & Title */}
          {isExpiredSafeguard ? (
            <div className="space-y-3 pt-4">
              <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700 mx-auto">
                <Clock size={40} />
              </div>
              <h1 className="text-2xl font-bold text-[#1C1917] font-serif-display">Waiting for Confirmation</h1>
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs p-4 rounded-2xl text-left space-y-1 font-medium">
                <span className="font-bold text-amber-950 block">⚠️ Check with Staff</span>
                <p>We haven't confirmed your payment yet — please check with the cafe staff directly.</p>
              </div>
            </div>
          ) : isUPIPending ? (
            <div className="space-y-2 pt-2">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 mx-auto animate-pulse">
                <Clock size={36} />
              </div>
              <h1 className="text-2xl font-bold text-[#1C1917] font-serif-display">Payment Submitted</h1>
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs p-3.5 rounded-2xl font-semibold">
                Waiting for cafe to confirm receipt.
              </div>
              {lastPlacedOrder.customerName && (
                <p className="text-xs font-bold text-[#5E6F58] bg-[#5E6F58]/10 border border-[#5E6F58]/20 py-1 px-3.5 rounded-full inline-block">
                  Customer: {lastPlacedOrder.customerName}
                </p>
              )}
              <p className="text-[11px] text-[#7A7571] max-w-xs">
                Do not close this page. The cafe owner is verifying your payment.
              </p>
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 mx-auto animate-pulse">
                <Check size={40} />
              </div>
              <h1 className="text-2xl font-bold text-[#1C1917] font-serif-display">Order Sent to Kitchen</h1>
              <p className="text-xs text-[#7A7571] uppercase tracking-wider font-semibold">
                Status: <span className="text-[#5E6F58] font-bold">{lastPlacedOrder.status}</span>
              </p>
              {(lastPlacedOrder.customerName || lastPlacedOrder.tableNumber) && (
                <p className="text-xs text-[#5E6F58] bg-[#5E6F58]/10 border border-[#5E6F58]/20 py-1 px-3.5 rounded-full inline-block font-bold">
                  {lastPlacedOrder.customerName ? `Customer: ${lastPlacedOrder.customerName}` : `Table: ${lastPlacedOrder.tableNumber}`}
                </p>
              )}
            </div>
          )}

          {/* UPI QR Display Card if UPI selected and pending verification */}
          {isUPIPending && (
            <div className="bg-[#FAF9F5] border border-[#EAE8E4] w-full p-5 rounded-2xl space-y-4 shadow-sm text-center">
              <div className="flex items-center justify-between border-b border-[#EAE8E4] pb-3">
                <span className="text-xs font-bold text-[#7A7571] uppercase tracking-wider flex items-center gap-1.5">
                  <QrCode size={16} className="text-[#5E6F58]" />
                  Scan UPI QR to Pay
                </span>
                <span className="text-sm font-black font-mono text-[#5E6F58]">₹{orderTotal}</span>
              </div>

              {/* QR Image */}
              <div className="bg-white p-3 rounded-2xl border border-[#EAE8E4] inline-block shadow-inner">
                {(restaurant.upiQrImageUrl || lastPlacedOrder.restaurant?.upiQrImageUrl) ? (
                  <img 
                    src={
                      (restaurant.upiQrImageUrl || lastPlacedOrder.restaurant?.upiQrImageUrl).startsWith('http')
                        ? (restaurant.upiQrImageUrl || lastPlacedOrder.restaurant?.upiQrImageUrl)
                        : `${API_BASE_URL}${restaurant.upiQrImageUrl || lastPlacedOrder.restaurant?.upiQrImageUrl}`
                    } 
                    alt="Cafe Official UPI QR Code" 
                    className="w-48 h-48 object-contain mx-auto" 
                  />
                ) : upiQrCodeUrl ? (
                  <img src={upiQrCodeUrl} alt="UPI QR Code" className="w-48 h-48 object-contain mx-auto" />
                ) : (
                  <Loader2 className="animate-spin text-[#5E6F58] mx-auto" size={32} />
                )}
              </div>

              <div className="space-y-1 text-xs text-[#7A7571]">
                <p className="font-semibold text-[#1C1917]">Payee: {payeeName}</p>
                {(restaurant.upiId || lastPlacedOrder.restaurant?.upiId) && (
                  <p className="font-mono text-[11px] text-[#5E6F58] font-bold">{restaurant.upiId || lastPlacedOrder.restaurant?.upiId}</p>
                )}
              </div>

              {/* Mobile "Open in UPI App" Deep-link Button */}
              {(restaurant.upiId || lastPlacedOrder.restaurant?.upiId) && (
                <a
                  href={
                    upiDeepLink ||
                    `upi://pay?pa=${encodeURIComponent(restaurant.upiId || lastPlacedOrder.restaurant?.upiId || '')}&pn=${encodeURIComponent(restaurant.upiPayeeName || lastPlacedOrder.restaurant?.upiPayeeName || restaurant.name || 'Cafe')}&am=${orderTotal}&cu=INR&tn=Order${lastPlacedOrder.id.slice(-6)}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 bg-[#5E6F58] hover:bg-[#4E5D49] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <ExternalLink size={16} />
                  Open in UPI App (GPay / PhonePe / Paytm)
                </a>
              )}
            </div>
          )}

          {/* Order Summary Card */}
          <div className="bg-[#FAF9F5] border border-[#EAE8E4] w-full p-5 rounded-2xl text-left space-y-3">
            <h3 className="text-xs font-bold text-[#7A7571] uppercase tracking-widest flex items-center gap-1.5">
              <ClipboardList size={14} className="text-[#5E6F58]" />
              Order Summary
            </h3>
            <div className="divide-y divide-[#EAE8E4] text-xs">
              {lastPlacedOrder.items.map((item: any) => (
                <div key={item.id} className="py-2.5 flex justify-between gap-4">
                  <div className="text-slate-700">
                    <span className="font-bold text-[#1C1917]">{item.quantity}x</span> {item.menuItem.name}
                    {item.notes && <p className="text-[10px] text-slate-500 mt-0.5">Note: "{item.notes}"</p>}
                  </div>
                  <span className="font-mono text-slate-700 font-bold">₹{(parseFloat(item.priceAtOrder) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-[#EAE8E4] flex justify-between items-center text-xs font-bold">
              <span>Total Amount</span>
              <span className="font-mono text-[#5E6F58] text-sm font-black">₹{orderTotal}</span>
            </div>
          </div>

          {/* WhatsApp Action Card */}
          <button
            type="button"
            onClick={() => {
              const waUrl = getWhatsAppLink(lastPlacedOrder);
              if (waUrl && waUrl !== '#') {
                window.open(waUrl, '_blank', 'noopener,noreferrer');
              }
            }}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <MessageCircle size={18} />
            Send Order Copy via WhatsApp
          </button>

          {!isUPIPending && (
            <div className="bg-[#5E6F58]/10 border border-[#5E6F58]/20 p-4 rounded-2xl w-full text-center space-y-1">
              <span className="text-[#5E6F58] font-bold block text-xs uppercase tracking-wider">Please pay at the counter</span>
              <p className="text-[10px] text-slate-500 leading-normal">Provide your table number to complete payment when dining is finished.</p>
            </div>
          )}

          <button
            onClick={() => {
              if (slug) {
                localStorage.removeItem(`last_order_${slug}`);
              }
              setOrderPlaced(false);
              setLastPlacedOrder(null);
            }}
            className="w-full py-3 bg-[#F6F4F0] hover:bg-[#EAE8E4] text-[#1C1917] font-bold rounded-xl text-xs uppercase tracking-wider transition-all border border-[#EAE8E4]"
          >
            Order More Food
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#1C1917] pb-16 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen flex flex-col shadow-[0_4px_30px_rgb(28,25,23,0.02)] relative border-x border-[#EAE8E4]">
        
        {/* Cafe Header Banner */}
        <header className="bg-gradient-to-b from-[#F6F4F0] to-white p-6 border-b border-[#EAE8E4] space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#FBFBFA] border border-[#EAE8E4] flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
              {restaurant.logoUrl && !logoError ? (
                <img
                  src={
                    restaurant.logoUrl.startsWith('http') || restaurant.logoUrl.startsWith('data:')
                      ? restaurant.logoUrl
                      : `${API_BASE_URL}${restaurant.logoUrl}`
                  }
                  alt="Logo"
                  onError={() => setLogoError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Store size={28} className="text-slate-400" />
              )}
            </div>
            <div className="flex-1 flex justify-between items-start">
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-[#1C1917] tracking-tight">{restaurant.name}</h1>
                {restaurant.contactNumber && (
                  <a href={`tel:${restaurant.contactNumber}`} className="text-xs text-[#7A7571] flex items-center gap-1.5 hover:text-[#1C1917] transition-all font-semibold">
                    <Phone size={12} className="text-[#5E6F58]" />
                    {restaurant.contactNumber}
                  </a>
                )}
              </div>

              <button
                onClick={() => setShowCallStaffModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5E6F58]/10 border border-[#5E6F58]/20 text-[#5E6F58] hover:bg-[#5E6F58] hover:text-white rounded-xl text-[10px] font-bold transition-all shrink-0 shadow-sm active:scale-95"
              >
                <Bell size={12} />
                Call Staff
              </button>
            </div>
          </div>

          {staffCalledSuccess && (
            <div className="bg-emerald-600 text-white text-xs py-2.5 px-4 rounded-xl font-bold text-center shadow-md flex items-center justify-center gap-2 animate-pulse">
              <Bell size={14} />
              {staffCalledSuccess}
            </div>
          )}

          {restaurant.address && (
            <p className="text-xs text-[#7A7571] flex items-start gap-1.5 leading-relaxed bg-[#F6F4F0]/40 p-2.5 rounded-xl border border-[#EAE8E4]/60 font-medium">
              <MapPin size={14} className="text-[#5E6F58] shrink-0 mt-0.5" />
              {restaurant.address}
            </p>
          )}

          {restaurant.isAcceptingOrders === false && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 text-xs p-3 rounded-xl flex items-center gap-2 font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
              Kitchen is currently paused & view-only right now.
            </div>
          )}
        </header>

        {/* Sticky Filters & Category pills */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-[#EAE8E4] p-4 space-y-3 z-30 shadow-sm">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search food items..."
                className="w-full pl-10 pr-4 py-2 bg-[#F6F4F0] border border-[#EAE8E4] rounded-xl text-[#1C1917] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#5E6F58] text-xs transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex gap-1 shrink-0 bg-[#F6F4F0] p-1 rounded-xl border border-[#EAE8E4]">
              <button
                onClick={() => setFilterVeg('all')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  filterVeg === 'all'
                    ? 'bg-white text-[#1C1917] shadow-sm'
                    : 'text-[#7A7571] hover:text-[#1C1917]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterVeg('veg')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                  filterVeg === 'veg'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <Leaf size={11} />
                Veg
              </button>
              <button
                onClick={() => setFilterVeg('non-veg')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  filterVeg === 'non-veg'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'text-red-700 hover:bg-red-50'
                }`}
              >
                Non-Veg
              </button>
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-4 px-4">
            {restaurant.categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryScroll(category.id)}
                className={`text-[10px] px-3.5 py-1.5 rounded-full font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
                  activeCategory === category.id
                    ? 'bg-[#5E6F58] text-white shadow-sm'
                    : 'bg-[#FAF9F5] text-[#7A7571] hover:text-[#1C1917] border border-[#EAE8E4]'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Listings */}
        <div className="flex-1 p-4 space-y-8 overflow-y-auto">
          {(() => {
            let totalRendered = 0;
            const content = restaurant.categories.map((category) => {
              const filteredItems = category.items.filter((item) => {
                const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
                const matchesVeg = filterVeg === 'all' || 
                  (filterVeg === 'veg' && item.isVeg) || 
                  (filterVeg === 'non-veg' && !item.isVeg);
                return matchesSearch && matchesVeg;
              });

              if (filteredItems.length === 0) return null;
              totalRendered += filteredItems.length;

              return (
                <section
                  key={category.id}
                  ref={(el) => (categoryRefs.current[category.id] = el)}
                  className="space-y-4 scroll-mt-24"
                >
                  <div className="border-l-4 border-[#5E6F58] pl-3">
                    <h2 className="text-sm font-extrabold text-[#1C1917] tracking-tight uppercase font-serif-display">{category.name}</h2>
                    <span className="text-[9px] text-[#7A7571] font-bold uppercase">{filteredItems.length} Available</span>
                  </div>

                  <div className="space-y-3">
                    {filteredItems.map((item) => {
                      const cartEntry = cart.find((i) => i.menuItem.id === item.id);
                      const currentQty = cartEntry ? cartEntry.quantity : 0;

                      return (
                        <div
                          key={item.id}
                          className={`flex gap-4 p-4 rounded-2xl bg-white border border-[#EAE8E4] transition-all shadow-sm ${
                            !item.isAvailable ? 'opacity-65 bg-[#FAF9F5]/60' : 'hover:border-[#D5D2CC]'
                          }`}
                        >
                          {item.imageUrl && (
                            <img
                              src={item.imageUrl.startsWith('http') ? item.imageUrl : `${API_BASE_URL}${item.imageUrl}`}
                              alt={item.name}
                              className="w-20 h-20 object-cover rounded-xl bg-[#F6F4F0] border border-[#EAE8E4] shrink-0"
                            />
                          )}
                          <div className="flex-1 space-y-1 flex flex-col justify-between">
                            <div className="space-y-0.5">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-bold text-[#1C1917] text-sm leading-snug">{item.name}</h3>
                                <span className="text-sm font-bold text-[#5E6F58] font-mono shrink-0">
                                  ₹{parseFloat(item.price).toFixed(2)}
                                </span>
                              </div>
                              {item.description && (
                                <p className="text-[11px] text-[#7A7571] leading-normal line-clamp-2 font-medium">{item.description}</p>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                    item.isVeg
                                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                      : 'bg-red-500/10 text-red-600 border border-red-500/20'
                                  }`}
                                >
                                  {item.isVeg ? 'Veg' : 'Non-Veg'}
                                </span>
                                {item.badge && (
                                  <span className="text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 border border-amber-500/20">
                                    {item.badge === 'bestseller' && '🔥 Bestseller'}
                                    {item.badge === 'spicy' && '🌶️ Spicy'}
                                    {item.badge === 'special' && '⭐ Chef Special'}
                                    {item.badge === 'new' && '🆕 New'}
                                  </span>
                                )}
                                {item.prepTime && (
                                  <span className="text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-blue-500/10 text-blue-700 border border-blue-500/20">
                                    ⏱️ {item.prepTime}
                                  </span>
                                )}
                              </div>

                              {!item.isAvailable ? (
                                <span className="text-[9px] bg-red-500/10 text-red-600 border border-red-500/20 px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider">
                                  Sold Out
                                </span>
                              ) : restaurant.isAcceptingOrders === false ? (
                                <span className="text-[9px] text-[#7A7571] italic font-semibold">Paused</span>
                              ) : currentQty > 0 ? (
                                <div className="flex items-center gap-2 border border-[#5E6F58] bg-[#5E6F58]/5 rounded-lg px-2 py-0.5">
                                  <button
                                    onClick={() => updateCartQuantity(item.id, -1)}
                                    className="p-1 text-[#5E6F58] hover:text-[#4E5D49] transition-all"
                                  >
                                    <Minus size={11} />
                                  </button>
                                  <span className="text-xs font-black text-[#5E6F58] w-4 text-center font-mono">{currentQty}</span>
                                  <button
                                    onClick={() => updateCartQuantity(item.id, 1)}
                                    className="p-1 text-[#5E6F58] hover:text-[#4E5D49] transition-all"
                                  >
                                    <Plus size={11} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => addToCart(item)}
                                  className="flex items-center gap-1 px-3.5 py-1.5 bg-[#5E6F58] hover:bg-[#4E5D49] text-white rounded-lg text-[10px] font-bold transition-all shadow-sm"
                                >
                                  <Plus size={10} />
                                  Add
                                </button>
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
                <div className="py-12 text-center space-y-3 bg-white border border-[#EAE8E4] rounded-2xl p-6">
                  <Utensils className="mx-auto text-slate-300" size={36} />
                  <p className="text-sm font-bold text-[#1C1917]">No items found</p>
                  <p className="text-xs text-[#7A7571]">Try searching for something else or clear filters.</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterVeg('all');
                    }}
                    className="px-4 py-2 bg-[#5E6F58]/10 hover:bg-[#5E6F58]/20 text-[#5E6F58] rounded-xl text-xs font-bold transition-all"
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
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-40">
            <button
              onClick={() => {
                setOrderError('');
                setCartOpen(true);
              }}
              className="w-full flex items-center justify-between bg-[#5E6F58] hover:bg-[#4E5D49] text-white px-5 py-4 rounded-2xl shadow-lg transition-all border border-[#5E6F58]/10"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white text-[#5E6F58] text-[10px] font-black flex items-center justify-center shadow-inner">
                  {cartTotalItems}
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider">View Basket</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black font-mono">₹{cartSubtotal.toFixed(2)}</span>
                <ShoppingCart size={14} />
              </div>
            </button>
          </div>
        )}

        {/* Step 1: Sliding Cart Drawer (Your Basket) */}
        {cartOpen && (
          <div 
            onClick={() => setCartOpen(false)}
            className="fixed inset-0 z-50 flex justify-center bg-black/75 backdrop-blur-md transition-all"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white border-x border-[#EAE8E4] h-full max-h-[100dvh] flex flex-col shadow-2xl overflow-hidden"
            >
              
              {/* Drawer Header */}
              <div className="p-5 border-b border-[#EAE8E4] flex justify-between items-center bg-gradient-to-b from-[#F6F4F0] to-white shrink-0">
                <div className="flex items-center gap-2 text-[#5E6F58]">
                  <Utensils size={18} />
                  <h2 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">Your Basket ({cartTotalItems})</h2>
                </div>
                <button
                  onClick={() => setCartOpen(false)}
                  className="p-1.5 text-[#7A7571] hover:text-[#1C1917] hover:bg-[#F6F4F0] rounded-lg transition-all cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Basket Items List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain touch-pan-y">
                {orderError && (
                  <div className="bg-red-500/5 border border-red-500/20 text-red-750 text-xs p-3.5 rounded-xl">
                    {orderError}
                  </div>
                )}

                {cart.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <ShoppingCart size={40} className="mx-auto text-slate-300" />
                    <p className="text-xs font-semibold text-slate-500">Your basket is currently empty.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.menuItem.id} className="bg-[#F6F4F0]/30 border border-[#EAE8E4] p-4 rounded-2xl space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className="font-bold text-[#1C1917] text-xs leading-tight">{item.menuItem.name}</h4>
                          <span className="text-xs text-[#5E6F58] font-bold font-mono mt-1 block">
                            ₹{parseFloat(item.menuItem.price).toFixed(2)}
                          </span>
                        </div>
                        
                        {/* Quantity adjustments */}
                        <div className="flex items-center gap-2 border border-[#EAE8E4] bg-white rounded-lg px-1.5 py-0.5 shrink-0">
                          <button
                            onClick={() => updateCartQuantity(item.menuItem.id, -1)}
                            className="p-1 text-[#7A7571] hover:text-[#1C1917] transition-all rounded cursor-pointer"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="text-xs font-bold text-[#1C1917] w-5 text-center font-mono">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(item.menuItem.id, 1)}
                            className="p-1 text-[#7A7571] hover:text-[#1C1917] transition-all rounded cursor-pointer"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) => updateItemNotes(item.menuItem.id, e.target.value)}
                          placeholder="Special instructions (e.g. no spice, extra cheese)"
                          className="w-full bg-white border border-[#EAE8E4] rounded-xl px-3 py-2 text-[10px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#5E6F58] transition-all"
                        />
                        <div className="flex flex-wrap gap-1">
                          {['🌶️ Extra Spicy', '🚫 No Onion', '🧀 Extra Cheese', '🧊 Less Ice', '📦 Pack Separately'].map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              onClick={() => {
                                const currentNotes = item.notes ? item.notes.trim() : '';
                                if (currentNotes.includes(chip)) {
                                  updateItemNotes(
                                    item.menuItem.id,
                                    currentNotes.replace(chip, '').replace(/^,\s*|,\s*$/g, '').trim()
                                  );
                                } else {
                                  updateItemNotes(
                                    item.menuItem.id,
                                    currentNotes ? `${currentNotes}, ${chip}` : chip
                                  );
                                }
                              }}
                              className={`text-[9px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                                item.notes?.includes(chip)
                                  ? 'bg-[#5E6F58] text-white border-[#5E6F58] font-bold'
                                  : 'bg-white text-[#7A7571] border-[#EAE8E4] hover:border-[#D5D2CC]'
                              }`}
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Basket Footer: Subtotal & Proceed to Checkout */}
              {cart.length > 0 && (
                <div className="p-5 border-t border-[#EAE8E4] space-y-3 bg-[#FAF9F5] shrink-0">
                  <div className="flex justify-between items-center text-xs font-bold text-[#7A7571]">
                    <span>Subtotal</span>
                    <span className="text-[#1C1917] font-mono font-black text-sm">₹{cartSubtotal.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => {
                      setCartOpen(false);
                      setShowPaymentModal(true);
                    }}
                    className="w-full py-3.5 bg-[#5E6F58] hover:bg-[#4E5D49] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    Proceed to Checkout (₹{cartSubtotal.toFixed(2)}) →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Dedicated Checkout & Payment Modal */}
        {showPaymentModal && (
          <div 
            onClick={() => setShowPaymentModal(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-[#EAE8E4] rounded-3xl max-w-md w-full h-[92vh] max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden my-auto"
            >
              
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-[#EAE8E4] flex justify-between items-center bg-gradient-to-b from-[#F6F4F0] to-white shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowPaymentModal(false);
                      setCartOpen(true);
                    }}
                    className="p-1 text-[#7A7571] hover:text-[#1C1917] hover:bg-[#F6F4F0] rounded-lg transition-all cursor-pointer mr-1"
                    title="Back to Basket"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#1C1917] flex items-center gap-1.5">
                      Checkout & Payment
                    </h3>
                    <p className="text-[10px] text-[#7A7571]">Total: ₹{cartSubtotal.toFixed(2)} ({cartTotalItems} item{cartTotalItems > 1 ? 's' : ''})</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPaymentModal(false)} 
                  className="p-1.5 text-[#7A7571] hover:text-[#1C1917] hover:bg-[#F6F4F0] rounded-xl transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 overscroll-contain touch-pan-y">
                
                {/* Customer Name Required Field */}
                <div>
                  <label className="block text-[10px] font-bold text-[#7A7571] uppercase tracking-wider">
                    Your Name <span className="text-red-500">*</span> <span className="text-[9px] text-slate-400 font-normal lowercase">(so the cafe can call you when ready)</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (nameError) setNameError('');
                    }}
                    placeholder="e.g. Rahul, Priya, Alex"
                    className="mt-1 block w-full px-3.5 py-2.5 bg-white border border-[#EAE8E4] rounded-xl text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#5E6F58] text-xs transition-all font-medium"
                  />
                  {nameError && <p className="text-[10px] text-red-600 font-bold mt-1">{nameError}</p>}
                </div>

                {/* Payment Option Selector */}
                {restaurant?.upiId ? (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-[#7A7571] uppercase tracking-wider">
                      Select Payment Method
                    </label>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {/* Pay at Counter Option */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('COUNTER')}
                        className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                          paymentMethod === 'COUNTER'
                            ? 'bg-[#5E6F58]/10 border-[#5E6F58] text-[#5E6F58] shadow-sm font-bold ring-1 ring-[#5E6F58]'
                            : 'bg-white border-[#EAE8E4] text-[#7A7571] hover:border-[#D5D2CC]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Store size={18} />
                          {paymentMethod === 'COUNTER' && <CheckCircle2 size={14} className="text-[#5E6F58]" />}
                        </div>
                        <div className="mt-2">
                          <span className="text-xs font-bold block text-[#1C1917]">Pay at Counter</span>
                          <span className="text-[9px] text-[#7A7571] block leading-tight mt-0.5">Pay cash or card at counter</span>
                        </div>
                      </button>

                      {/* Pay via UPI Option */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('UPI')}
                        className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                          paymentMethod === 'UPI'
                            ? 'bg-[#5E6F58]/10 border-[#5E6F58] text-[#5E6F58] shadow-sm font-bold ring-1 ring-[#5E6F58]'
                            : 'bg-white border-[#EAE8E4] text-[#7A7571] hover:border-[#D5D2CC]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <QrCode size={18} />
                          {paymentMethod === 'UPI' && <CheckCircle2 size={14} className="text-[#5E6F58]" />}
                        </div>
                        <div className="mt-2">
                          <span className="text-xs font-bold block text-[#1C1917]">Pay via UPI</span>
                          <span className="text-[9px] text-[#7A7571] block leading-tight mt-0.5">Scan QR with GPay, PhonePe</span>
                        </div>
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Form based on Payment Method */}
                {paymentMethod === 'COUNTER' ? (
                  <div className="pt-2">
                    <button
                      onClick={() => handleCheckout('COUNTER')}
                      disabled={placingOrder}
                      className="w-full py-3.5 bg-[#5E6F58] hover:bg-[#4E5D49] disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                    >
                      {placingOrder && <Loader2 className="animate-spin" size={14} />}
                      Place Order - Pay at Counter (₹{cartSubtotal.toFixed(2)})
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#FAF9F5] border border-[#EAE8E4] p-4 rounded-2xl space-y-3.5 text-center">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-[#5E6F58] uppercase tracking-wider bg-[#5E6F58]/10 px-2.5 py-0.5 rounded-full inline-block">
                        Scan & Pay via any UPI App
                      </span>
                      <h4 className="text-xs font-bold text-[#1C1917]">
                        {restaurant?.upiPayeeName ? `Payee: ${restaurant.upiPayeeName}` : (restaurant?.name || 'Cafe')}
                      </h4>
                    </div>

                    {/* QR Code Display */}
                    <div className="relative mx-auto w-48 h-48 sm:w-52 sm:h-52 bg-white p-2.5 rounded-2xl border-2 border-[#5E6F58]/20 shadow-md flex items-center justify-center">
                      {restaurant?.upiQrImageUrl ? (
                        <img 
                          src={restaurant.upiQrImageUrl.startsWith('http') ? restaurant.upiQrImageUrl : `${API_BASE_URL}${restaurant.upiQrImageUrl}`} 
                          alt="Cafe Official UPI QR Code" 
                          className="w-full h-full object-contain rounded-xl"
                        />
                      ) : upiQrCodeUrl ? (
                        <img 
                          src={upiQrCodeUrl} 
                          alt="Generated UPI QR Code" 
                          className="w-full h-full object-contain rounded-xl"
                        />
                      ) : (
                        <Loader2 className="animate-spin text-[#5E6F58]" size={32} />
                      )}
                    </div>

                    {/* Amount & UPI ID */}
                    <div className="space-y-0.5">
                      <div className="text-xs text-[#7A7571]">
                        Amount to Pay: <span className="font-mono font-black text-sm text-[#1C1917]">₹{cartSubtotal.toFixed(2)}</span>
                      </div>
                      {restaurant?.upiId && (
                        <p className="text-[10px] font-mono text-slate-500 font-bold">UPI ID: {restaurant.upiId}</p>
                      )}
                    </div>

                    {/* Mobile UPI Button */}
                    {(restaurant?.upiId || lastPlacedOrder?.restaurant?.upiId) && (
                      <a
                        href={
                          upiDeepLink ||
                          `upi://pay?pa=${encodeURIComponent(restaurant?.upiId || '')}&pn=${encodeURIComponent(restaurant?.upiPayeeName || restaurant?.name || 'Cafe')}&am=${cartSubtotal.toFixed(2)}&cu=INR&tn=CafeOrder`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#5E6F58] hover:bg-[#4E5D49] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md w-full text-center cursor-pointer"
                      >
                        <ExternalLink size={16} />
                        Open in UPI App (GPay / PhonePe / Paytm)
                      </a>
                    )}

                    <div className="pt-2 border-t border-[#EAE8E4]">
                      <button
                        onClick={() => handleCheckout('UPI')}
                        disabled={placingOrder}
                        className="w-full py-3.5 bg-[#5E6F58] hover:bg-[#4E5D49] disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                      >
                        {placingOrder ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={16} />}
                        I've Made the Payment
                      </button>
                      
                      <p className="text-[10px] text-slate-600 font-medium leading-relaxed bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl mt-2.5 text-left">
                        💡 <strong>Please note:</strong> Please only click this after completing your payment. The cafe will verify before your order is prepared.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Call Staff Modal */}
        {showCallStaffModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-[#EAE8E4] rounded-2xl max-w-xs w-full p-5 space-y-4 shadow-xl">
              <div className="flex justify-between items-center border-b border-[#EAE8E4] pb-3">
                <h3 className="text-sm font-bold text-[#1C1917] flex items-center gap-2">
                  <Bell size={16} className="text-[#5E6F58]" />
                  Call Staff / Waiter
                </h3>
                <button onClick={() => setShowCallStaffModal(false)} className="text-[#7A7571] hover:text-[#1C1917]">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSendStaffCall} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[#7A7571] font-semibold mb-1">Your Table Number</label>
                  <input
                    type="text"
                    placeholder="e.g. Table 4"
                    value={callStaffTable}
                    onChange={(e) => setCallStaffTable(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F6F4F0] border border-[#EAE8E4] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#5E6F58]"
                  />
                </div>

                <div>
                  <label className="block text-[#7A7571] font-semibold mb-1">What do you need?</label>
                  <div className="grid grid-cols-2 gap-2 pt-1">
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
                        className={`p-2 rounded-xl text-[10px] font-bold border transition-all ${
                          callStaffType === item.id
                            ? 'bg-[#5E6F58] text-white border-[#5E6F58]'
                            : 'bg-[#F6F4F0] text-[#7A7571] border-[#EAE8E4]'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={callingStaff}
                  className="w-full py-2.5 bg-[#5E6F58] hover:bg-[#4E5D49] text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
