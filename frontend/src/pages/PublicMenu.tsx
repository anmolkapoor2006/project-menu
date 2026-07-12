import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../api/api';
import { 
  Store, Phone, MapPin, Search, Leaf, AlertCircle, Loader2, 
  ShoppingCart, Plus, Minus, X, Check, Utensils, ClipboardList 
} from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  isVeg: boolean;
  isAvailable: boolean;
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
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVeg, setFilterVeg] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [activeCategory, setActiveCategory] = useState<string>('');

  // Cart Drawer States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [lastPlacedOrder, setLastPlacedOrder] = useState<any>(null);

  const categoryRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.error || 'Menu could not be loaded.');
      } finally {
        setLoading(false);
      }
    }
    loadMenuAndLogView();
  }, [slug, searchParams]);

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

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setPlacingOrder(true);
    setOrderError('');

    const payload = {
      tableNumber: tableNumber.trim() || null,
      items: cart.map((i) => ({
        menuItemId: i.menuItem.id,
        quantity: i.quantity,
        notes: i.notes.trim() || null,
      })),
    };

    try {
      const response = await api.post(`/api/public/menu/${slug}/order`, payload);
      setLastPlacedOrder(response.data.order);
      setOrderPlaced(true);
      setCart([]);
      setCartOpen(false);
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
    return (
      <div className="min-h-screen bg-[#FAF9F5] text-[#1C1917] pb-16 flex justify-center">
        <div className="w-full max-w-md bg-white min-h-screen flex flex-col shadow-[0_4px_30px_rgb(28,25,23,0.02)] p-6 border-x border-[#EAE8E4] justify-center items-center space-y-6 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 animate-pulse">
            <Check size={40} />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-[#1C1917] font-serif-display">Order Sent to Kitchen</h1>
            <p className="text-xs text-[#7A7571] uppercase tracking-wider font-semibold">Your order is being prepared</p>
            {lastPlacedOrder.tableNumber && (
              <p className="text-xs text-[#5E6F58] bg-[#5E6F58]/10 border border-[#5E6F58]/20 py-1 px-3.5 rounded-full inline-block font-bold">
                Table: {lastPlacedOrder.tableNumber}
              </p>
            )}
          </div>

          <div className="bg-[#FAF9F5] border border-[#EAE8E4] w-full p-6 rounded-2xl text-left space-y-3">
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
                  <span className="font-mono text-slate-400 font-semibold">${(parseFloat(item.priceAtOrder) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#5E6F58]/10 border border-[#5E6F58]/20 p-5 rounded-2xl w-full text-center space-y-1">
            <span className="text-[#5E6F58] font-bold block text-xs uppercase tracking-wider">Please pay at the counter</span>
            <p className="text-[10px] text-slate-500 leading-normal">Provide your table number to complete payment when dining is finished.</p>
          </div>

          <button
            onClick={() => setOrderPlaced(false)}
            className="w-full py-3.5 bg-[#5E6F58] hover:bg-[#4E5D49] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
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
              {restaurant.logoUrl ? (
                <img src={`${API_BASE_URL}${restaurant.logoUrl}`} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Store size={28} className="text-slate-400" />
              )}
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-[#1C1917] tracking-tight">{restaurant.name}</h1>
              {restaurant.contactNumber && (
                <a href={`tel:${restaurant.contactNumber}`} className="text-xs text-[#7A7571] flex items-center gap-1.5 hover:text-[#1C1917] transition-all font-semibold">
                  <Phone size={12} className="text-[#5E6F58]" />
                  {restaurant.contactNumber}
                </a>
              )}
            </div>
          </div>
          {restaurant.address && (
            <p className="text-xs text-[#7A7571] flex items-start gap-1.5 leading-relaxed bg-[#F6F4F0]/40 p-2.5 rounded-xl border border-[#EAE8E4]/60 font-medium">
              <MapPin size={14} className="text-[#5E6F58] shrink-0 mt-0.5" />
              {restaurant.address}
            </p>
          )}
        </header>

        {/* Sticky Filters & Category pills */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-[#EAE8E4] p-4 space-y-3 z-30 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search food items..."
                className="w-full pl-10 pr-4 py-2 bg-[#F6F4F0] border border-[#EAE8E4] rounded-xl text-[#1C1917] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#5E6F58] text-xs transition-all"
              />
            </div>

            <button
              onClick={() => setFilterVeg(prev => prev === 'veg' ? 'all' : 'veg')}
              className={`p-2 rounded-xl border transition-all flex items-center justify-center shrink-0 ${
                filterVeg === 'veg'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                  : 'bg-[#F6F4F0] border-[#EAE8E4] text-slate-400 hover:text-[#1C1917]'
              }`}
              title="Filter Veg Only"
            >
              <Leaf size={16} />
            </button>
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
          {restaurant.categories.map((category) => {
            const filteredItems = category.items.filter((item) => {
              const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
              const matchesVeg = filterVeg === 'all' || 
                (filterVeg === 'veg' && item.isVeg) || 
                (filterVeg === 'non-veg' && !item.isVeg);
              return matchesSearch && matchesVeg;
            });

            if (filteredItems.length === 0) return null;

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
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 p-4 rounded-2xl bg-white border border-[#EAE8E4] hover:border-[#D5D2CC] transition-all shadow-sm"
                    >
                      {item.imageUrl && (
                        <img
                          src={`${API_BASE_URL}${item.imageUrl}`}
                          alt={item.name}
                          className="w-20 h-20 object-cover rounded-xl bg-[#F6F4F0] border border-[#EAE8E4] shrink-0"
                        />
                      )}
                      <div className="flex-1 space-y-1 flex flex-col justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-[#1C1917] text-sm leading-snug">{item.name}</h3>
                            <span className="text-sm font-bold text-[#5E6F58] font-mono shrink-0">
                              ${parseFloat(item.price).toFixed(2)}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-[11px] text-[#7A7571] leading-normal line-clamp-2 font-medium">{item.description}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span
                            className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              item.isVeg
                                ? 'bg-emerald-50/10 text-emerald-600 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-600 border border-red-500/20'
                            }`}
                          >
                            {item.isVeg ? 'Veg' : 'Non-Veg'}
                          </span>
                          
                          <button
                            onClick={() => addToCart(item)}
                            className="flex items-center gap-1 px-3.5 py-1.5 bg-[#5E6F58] hover:bg-[#4E5D49] text-white rounded-lg text-[10px] font-bold transition-all shadow-sm"
                          >
                            <Plus size={10} />
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
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
                <span className="text-xs font-black font-mono">${cartSubtotal.toFixed(2)}</span>
                <ShoppingCart size={14} />
              </div>
            </button>
          </div>
        )}

        {/* Sliding Cart Drawer */}
        {cartOpen && (
          <div className="fixed inset-0 z-50 flex justify-center bg-black/45 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white border-x border-[#EAE8E4] h-full flex flex-col justify-between shadow-2xl">
              
              {/* Header */}
              <div className="p-5 border-b border-[#EAE8E4] flex justify-between items-center bg-gradient-to-b from-[#F6F4F0] to-white">
                <div className="flex items-center gap-2 text-[#5E6F58]">
                  <Utensils size={18} />
                  <h2 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">Your Basket</h2>
                </div>
                <button
                  onClick={() => setCartOpen(false)}
                  className="p-1.5 text-[#7A7571] hover:text-[#1C1917] hover:bg-[#F6F4F0] rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {orderError && (
                <div className="mx-5 mt-4 bg-red-500/5 border border-red-500/20 text-red-750 text-xs p-3.5 rounded-xl">
                  {orderError}
                </div>
              )}

              {/* Basket list */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {cart.map((item) => (
                  <div key={item.menuItem.id} className="bg-[#F6F4F0]/30 border border-[#EAE8E4] p-4 rounded-2xl space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="font-bold text-[#1C1917] text-xs leading-tight">{item.menuItem.name}</h4>
                        <span className="text-xs text-[#5E6F58] font-bold font-mono mt-1 block">
                          ${parseFloat(item.menuItem.price).toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Quantity adjustments */}
                      <div className="flex items-center gap-2 border border-[#EAE8E4] bg-white rounded-lg px-1.5 py-0.5 shrink-0">
                        <button
                          onClick={() => updateCartQuantity(item.menuItem.id, -1)}
                          className="p-1 text-[#7A7571] hover:text-[#1C1917] transition-all rounded"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="text-xs font-bold text-[#1C1917] w-5 text-center font-mono">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.menuItem.id, 1)}
                          className="p-1 text-[#7A7571] hover:text-[#1C1917] transition-all rounded"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={item.notes}
                      onChange={(e) => updateItemNotes(item.menuItem.id, e.target.value)}
                      placeholder="Special instructions (e.g. no spice, extra cheese)"
                      className="w-full bg-white border border-[#EAE8E4] rounded-xl px-3 py-2 text-[10px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#5E6F58] transition-all"
                    />
                  </div>
                ))}
              </div>

              {/* Drawer Footer */}
              <div className="p-5 border-t border-[#EAE8E4] space-y-4 bg-[#FAF9F5]">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#7A7571] uppercase tracking-wider">
                      Table Number <span className="text-[9px] text-slate-400 lowercase">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="e.g. 5, Bar-2, Terrace-1"
                      className="mt-1.5 block w-full px-4 py-2.5 bg-white border border-[#EAE8E4] rounded-xl text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#5E6F58] text-xs transition-all"
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs font-bold text-[#7A7571] pt-2 border-t border-[#EAE8E4]">
                    <span>Subtotal</span>
                    <span className="text-[#1C1917] font-mono font-black text-sm">${cartSubtotal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={placingOrder || cart.length === 0}
                  className="w-full py-3.5 bg-[#5E6F58] hover:bg-[#4E5D49] disabled:opacity-50 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {placingOrder && <Loader2 className="animate-spin" size={14} />}
                  Place Order - Pay at Counter
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
