import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { Plus, Edit2, Trash2, Camera, X, Eye, EyeOff, Loader2 } from 'lucide-react';

interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  isVeg: boolean;
  isAvailable: boolean;
  badge: string | null;
  prepTime: string | null;
  displayOrder: number;
}

interface MenuCategory {
  id: string;
  name: string;
  displayOrder: number;
  items: MenuItem[];
}

interface MenuBuilderProps {
  restaurantId: string;
}

export default function MenuBuilder({ restaurantId }: MenuBuilderProps) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Category Modal State
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catOrder, setCatOrder] = useState(0);

  // Item Modal State
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemVeg, setItemVeg] = useState(true);
  const [itemAvailable, setItemAvailable] = useState(true);
  const [itemBadge, setItemBadge] = useState<string>('');
  const [itemPrepTime, setItemPrepTime] = useState<string>('');
  const [itemOrder, setItemOrder] = useState(0);
  const [itemImage, setItemImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchMenu = async () => {
    try {
      if (restaurantId) {
        const response = await api.get(`/api/restaurants/${restaurantId}/full-menu`);
        setCategories(response.data.categories || []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch menu structures.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, [restaurantId]);

  // --- Category Actions ---

  const handleOpenCatModal = (category: MenuCategory | null = null) => {
    if (category) {
      setEditingCategory(category);
      setCatName(category.name);
      setCatOrder(category.displayOrder);
    } else {
      setEditingCategory(null);
      setCatName('');
      setCatOrder(categories.length);
    }
    setCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (editingCategory) {
        await api.put(`/api/categories/${editingCategory.id}`, {
          name: catName,
          displayOrder: catOrder,
        });
      } else {
        await api.post(`/api/restaurants/${restaurantId}/categories`, {
          name: catName,
          displayOrder: catOrder,
        });
      }
      setCatModalOpen(false);
      fetchMenu();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save category.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category and all its items?')) return;
    try {
      await api.delete(`/api/categories/${id}`);
      fetchMenu();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete category.');
    }
  };

  // --- Item Actions ---

  const handleOpenItemModal = (categoryId: string, item: MenuItem | null = null) => {
    setTargetCategoryId(categoryId);
    setItemImage(null);
    setImagePreview(null);

    if (item) {
      setEditingItem(item);
      setItemName(item.name);
      setItemDesc(item.description || '');
      setItemPrice(item.price);
      setItemVeg(item.isVeg);
      setItemAvailable(item.isAvailable);
      setItemBadge(item.badge || '');
      setItemPrepTime(item.prepTime || '');
      setItemOrder(item.displayOrder);
      if (item.imageUrl) {
        setImagePreview(item.imageUrl.startsWith('http') ? item.imageUrl : `${API_BASE_URL}${item.imageUrl}`);
      }
    } else {
      setEditingItem(null);
      setItemName('');
      setItemDesc('');
      setItemPrice('');
      setItemVeg(true);
      setItemAvailable(true);
      setItemBadge('');
      setItemPrepTime('');
      setItemOrder(0);
    }
    setItemModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setItemImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const formData = new FormData();
    formData.append('name', itemName);
    formData.append('description', itemDesc);
    formData.append('price', itemPrice);
    formData.append('isVeg', String(itemVeg));
    formData.append('isAvailable', String(itemAvailable));
    formData.append('badge', itemBadge);
    formData.append('prepTime', itemPrepTime);
    formData.append('displayOrder', String(itemOrder));
    if (itemImage) {
      formData.append('image', itemImage);
    }

    try {
      if (editingItem) {
        await api.put(`/api/items/${editingItem.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post(`/api/categories/${targetCategoryId}/items`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setItemModalOpen(false);
      fetchMenu();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save menu item.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await api.delete(`/api/items/${id}`);
      fetchMenu();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete item.');
    }
  };

  const handleToggleItemAvailability = async (item: MenuItem) => {
    setError('');
    const nextAvailable = !item.isAvailable;
    // 0ms Instant Optimistic UI update
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        items: cat.items.map((i) => (i.id === item.id ? { ...i, isAvailable: nextAvailable } : i)),
      }))
    );

    try {
      await api.put(`/api/items/${item.id}`, {
        isAvailable: nextAvailable,
      });
    } catch (err: any) {
      // Revert if API failed
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((i) => (i.id === item.id ? { ...i, isAvailable: item.isAvailable } : i)),
        }))
      );
      setError(err.response?.data?.error || 'Failed to toggle availability.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin text-[#5E6F58]" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/5 border border-red-500/20 text-red-700 text-xs p-4 rounded-xl flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-650">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#1C1917]">Menu Sections</h2>
        <button
          onClick={() => handleOpenCatModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#5E6F58] hover:bg-[#4E5D49] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <Plus size={16} />
          Add Section
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="bg-white border border-[#EAE8E4] rounded-2xl p-12 text-center text-[#7A7571]">
          <p className="text-base font-bold text-[#1C1917]">No categories created yet.</p>
          <p className="text-xs mt-2">Get started by adding your first menu section (e.g. Starters).</p>
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map((category) => (
            <div key={category.id} className="bg-white border border-[#EAE8E4] rounded-2xl p-6 shadow-[0_4px_20px_rgb(28,25,23,0.01)] space-y-4">
              <div className="flex justify-between items-center border-b border-[#EAE8E4] pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#1C1917]">{category.name}</h3>
                  <span className="text-[10px] text-slate-400 font-mono">(Order: {category.displayOrder})</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenCatModal(category)}
                    className="p-1.5 text-[#7A7571] hover:text-[#1C1917] hover:bg-[#F6F4F0] rounded-lg transition-all"
                    title="Edit Category Name"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="p-1.5 text-[#7A7571] hover:text-red-600 hover:bg-[#F6F4F0] rounded-lg transition-all"
                    title="Delete Category"
                  >
                    <Trash2 size={15} />
                  </button>
                  <button
                    onClick={() => handleOpenItemModal(category.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5E6F58]/10 hover:bg-[#5E6F58] text-[#5E6F58] hover:text-white rounded-lg text-[10px] font-bold ml-2 transition-all"
                  >
                    <Plus size={12} />
                    Add Item
                  </button>
                </div>
              </div>

              {category.items.length === 0 ? (
                <p className="text-xs text-[#7A7571] italic py-2">No items in this section.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex gap-4 p-4 rounded-2xl border transition-all ${
                        item.isAvailable
                          ? 'bg-[#FBFBFA] border-[#EAE8E4] hover:border-[#D5D2CC]'
                          : 'bg-[#FAF9F5]/40 border-[#EAE8E4]/60 opacity-60'
                      }`}
                    >
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl.startsWith('http') ? item.imageUrl : `${API_BASE_URL}${item.imageUrl}`}
                          alt={item.name}
                          className="w-20 h-20 object-cover rounded-xl bg-[#F6F4F0] border border-[#E5E2DC] shrink-0"
                        />
                      )}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-[#1C1917] text-sm leading-tight">{item.name}</h4>
                          <span className="text-sm font-bold text-[#5E6F58] font-mono shrink-0">
                            ₹{parseFloat(item.price).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-[#7A7571] line-clamp-2 h-8">{item.description || 'No description.'}</p>
                                               <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                item.isVeg
                                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-600 border border-red-500/20'
                              }`}
                            >
                              {item.isVeg ? 'Veg' : 'Non-Veg'}
                            </span>
                            {item.badge && (
                              <span className="text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 border border-amber-500/20">
                                {item.badge === 'bestseller' && '🔥 Bestseller'}
                                {item.badge === 'spicy' && '🌶️ Spicy'}
                                {item.badge === 'special' && '⭐ Chef Special'}
                                {item.badge === 'new' && '🆕 New Item'}
                              </span>
                            )}
                            <span className="text-[9px] text-slate-400 font-mono">Order: {item.displayOrder}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleItemAvailability(item)}
                              className={`p-1.5 rounded-lg border transition-all active:scale-90 duration-100 cursor-pointer ${
                                item.isAvailable
                                  ? 'text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 border-emerald-500/20'
                                  : 'text-slate-400 hover:text-slate-500 bg-slate-100 border-slate-200'
                              }`}
                              title={item.isAvailable ? 'Mark Sold Out' : 'Mark In Stock'}
                            >
                              {item.isAvailable ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenItemModal(category.id, item)}
                              className="p-1.5 text-[#7A7571] hover:text-[#5E6F58] hover:bg-[#FAF9F5] rounded-lg transition-all active:scale-90 duration-100 cursor-pointer"
                              title="Edit Item"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 text-[#7A7571] hover:text-red-600 hover:bg-[#FAF9F5] rounded-lg transition-all active:scale-90 duration-100 cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* --- Category Modal --- */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#EAE8E4] rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#EAE8E4] pb-3">
              <h3 className="text-base font-bold text-[#1C1917]">{editingCategory ? 'Edit Section' : 'Add Menu Section'}</h3>
              <button onClick={() => setCatModalOpen(false)} className="text-slate-400 hover:text-[#1C1917]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571]">Section Name</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="mt-2 block w-full px-4 py-2.5 bg-[#F6F4F0] border border-[#E5E2DC] rounded-xl text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#5E6F58] focus:border-[#5E6F58] text-sm transition-all"
                  placeholder="e.g. Starters, Mains, Desserts"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571]">Display Order</label>
                <input
                  type="number"
                  required
                  value={catOrder}
                  onChange={(e) => setCatOrder(parseInt(e.target.value) || 0)}
                  className="mt-2 block w-full px-4 py-2.5 bg-[#F6F4F0] border border-[#E5E2DC] rounded-xl text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#5E6F58] focus:border-[#5E6F58] text-sm transition-all"
                />
                <p className="text-[10px] text-slate-400 mt-1">Lower numbers are shown first</p>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="px-4 py-2 border border-[#EAE8E4] text-[#7A7571] rounded-xl text-xs font-bold hover:bg-[#F6F4F0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-[#5E6F58] hover:bg-[#4E5D49] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {submitting && <Loader2 className="animate-spin" size={16} />}
                  Save Section
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Item Modal --- */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border border-[#EAE8E4] rounded-2xl p-6 max-w-lg w-full shadow-xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-[#EAE8E4] pb-3">
              <h3 className="text-base font-bold text-[#1C1917]">{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</h3>
              <button onClick={() => setItemModalOpen(false)} className="text-slate-400 hover:text-[#1C1917]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571]">Item Name</label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="mt-2 block w-full px-4 py-2 bg-[#F6F4F0] border border-[#E5E2DC] rounded-xl text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#5E6F58] focus:border-[#5E6F58] text-sm transition-all"
                    placeholder="e.g. Classic Margherita Pizza"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571]">Description</label>
                  <textarea
                    rows={2}
                    value={itemDesc}
                    onChange={(e) => setItemDesc(e.target.value)}
                    className="mt-2 block w-full px-4 py-2 bg-[#F6F4F0] border border-[#E5E2DC] rounded-xl text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#5E6F58] focus:border-[#5E6F58] text-sm transition-all"
                    placeholder="Describe ingredients or portion sizes..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571]">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="mt-2 block w-full px-4 py-2 bg-[#F6F4F0] border border-[#E5E2DC] rounded-xl text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#5E6F58] focus:border-[#5E6F58] text-sm transition-all"
                    placeholder="99.00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571]">Prep Time (Optional)</label>
                  <input
                    type="text"
                    value={itemPrepTime}
                    onChange={(e) => setItemPrepTime(e.target.value)}
                    className="mt-2 block w-full px-4 py-2 bg-[#F6F4F0] border border-[#E5E2DC] rounded-xl text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#5E6F58] focus:border-[#5E6F58] text-sm transition-all"
                    placeholder="e.g. 10-15 mins"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571]">Display Order</label>
                  <input
                    type="number"
                    required
                    value={itemOrder}
                    onChange={(e) => setItemOrder(parseInt(e.target.value) || 0)}
                    className="mt-2 block w-full px-4 py-2 bg-[#F6F4F0] border border-[#E5E2DC] rounded-xl text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#5E6F58] focus:border-[#5E6F58] text-sm transition-all"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571]">Highlight Badge (Optional)</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { id: '', label: 'None' },
                      { id: 'bestseller', label: '🔥 Bestseller' },
                      { id: 'spicy', label: '🌶️ Spicy' },
                      { id: 'special', label: '⭐ Chef Special' },
                      { id: 'new', label: '🆕 New Item' },
                    ].map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setItemBadge(b.id)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition-all ${
                          itemBadge === b.id
                            ? 'bg-[#5E6F58] text-white border-[#5E6F58] shadow-sm'
                            : 'bg-[#F6F4F0] text-[#7A7571] border-[#E5E2DC] hover:text-[#1C1917]'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-[#F6F4F0] border border-[#E5E2DC] px-4 py-2 rounded-xl">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#7A7571]">Style</span>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => setItemVeg(true)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-all ${
                        itemVeg
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'text-slate-400 border-transparent'
                      }`}
                    >
                      Veg
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemVeg(false)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-all ${
                        !itemVeg
                          ? 'bg-red-500/10 text-red-600 border-red-500/20'
                          : 'text-slate-400 border-transparent'
                      }`}
                    >
                      Non-Veg
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-[#F6F4F0] border border-[#E5E2DC] px-4 py-2 rounded-xl">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#7A7571]">Inventory</span>
                  <button
                    type="button"
                    onClick={() => setItemAvailable(!itemAvailable)}
                    className={`ml-auto text-xs px-3 py-1 rounded-lg font-bold border transition-all ${
                      itemAvailable
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : 'bg-red-500/10 text-red-600 border-red-500/20'
                    }`}
                  >
                    {itemAvailable ? 'In Stock' : 'Sold Out'}
                  </button>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7571] mb-1">Item Image</label>
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-xl border border-[#E5E2DC] bg-[#F6F4F0] flex items-center justify-center overflow-hidden shrink-0">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="text-slate-400" size={24} />
                      )}
                    </div>
                    <label className="flex-1 cursor-pointer flex items-center justify-center border border-dashed border-[#E5E2DC] hover:border-[#5E6F58]/50 bg-[#F6F4F0] py-3 rounded-xl hover:bg-[#EAE8E4] transition-all text-xs font-bold text-[#7A7571] hover:text-[#1C1917]">
                      <span>Upload Image</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-[#EAE8E4]">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="px-4 py-2 border border-[#EAE8E4] text-[#7A7571] rounded-xl text-xs font-bold hover:bg-[#F6F4F0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-[#5E6F58] hover:bg-[#4E5D49] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {submitting && <Loader2 className="animate-spin" size={16} />}
                  Save Menu Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
