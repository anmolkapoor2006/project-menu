import React, { useState, useEffect } from 'react';
import api from '../api/api';
import {
  Plus, Edit2, Trash2, Camera, X, Eye, EyeOff, Loader2,
  Utensils, ChevronRight, Tag, Clock, LayoutGrid, List
} from 'lucide-react';

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

const BADGE_OPTIONS = [
  { id: '', label: 'None', color: '' },
  { id: 'bestseller', label: '🔥 Bestseller', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { id: 'spicy', label: '🌶️ Spicy', color: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'special', label: '⭐ Chef Special', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'new', label: '🆕 New', color: 'bg-blue-50 text-blue-700 border-blue-200' },
];

const BADGE_DISPLAY: Record<string, string> = {
  bestseller: '🔥 Bestseller',
  spicy: '🌶️ Spicy',
  special: '⭐ Chef Special',
  new: '🆕 New',
};

const inputCls = 'w-full px-4 py-2.5 bg-[var(--cream)] border border-[var(--cream-border)] rounded-xl text-[var(--text)] placeholder-[var(--muted-light)] focus:outline-none focus:ring-2 focus:ring-[var(--sage)] focus:border-transparent text-sm transition-all';

export default function MenuBuilder({ restaurantId }: MenuBuilderProps) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  // Category Modal
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catOrder, setCatOrder] = useState(0);

  // Item Modal
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemVeg, setItemVeg] = useState(true);
  const [itemAvailable, setItemAvailable] = useState(true);
  const [itemBadge, setItemBadge] = useState('');
  const [itemPrepTime, setItemPrepTime] = useState('');
  const [itemOrder, setItemOrder] = useState(0);
  const [itemImage, setItemImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchMenu = async () => {
    try {
      if (restaurantId) {
        const response = await api.get(`/api/restaurants/${restaurantId}/full-menu`);
        const cats: MenuCategory[] = response.data.categories || [];
        setCategories(cats);
        // auto-expand all by default
        setExpandedCats(new Set(cats.map((c) => c.id)));
      }
    } catch (err) {
      setError('Failed to fetch menu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMenu(); }, [restaurantId]);

  const toggleCat = (id: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Category handlers ────────────────────────────────────────────────
  const handleOpenCatModal = (category: MenuCategory | null = null) => {
    if (category) {
      setEditingCategory(category); setCatName(category.name); setCatOrder(category.displayOrder);
    } else {
      setEditingCategory(null); setCatName(''); setCatOrder(categories.length);
    }
    setCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError('');
    try {
      if (editingCategory) {
        await api.put(`/api/categories/${editingCategory.id}`, { name: catName, displayOrder: catOrder });
      } else {
        await api.post(`/api/restaurants/${restaurantId}/categories`, { name: catName, displayOrder: catOrder });
      }
      setCatModalOpen(false); fetchMenu();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save category.');
    } finally { setSubmitting(false); }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Delete this category and all its items?')) return;
    try { await api.delete(`/api/categories/${id}`); fetchMenu(); }
    catch (err: any) { setError(err.response?.data?.error || 'Failed to delete category.'); }
  };

  // ── Item handlers ────────────────────────────────────────────────────
  const handleOpenItemModal = (categoryId: string, item: MenuItem | null = null) => {
    setTargetCategoryId(categoryId); setItemImage(null); setImagePreview(null);
    if (item) {
      setEditingItem(item); setItemName(item.name); setItemDesc(item.description || '');
      setItemPrice(item.price); setItemVeg(item.isVeg); setItemAvailable(item.isAvailable);
      setItemBadge(item.badge || ''); setItemPrepTime(item.prepTime || ''); setItemOrder(item.displayOrder);
      if (item.imageUrl) setImagePreview(item.imageUrl.startsWith('http') ? item.imageUrl : `${API_BASE_URL}${item.imageUrl}`);
    } else {
      setEditingItem(null); setItemName(''); setItemDesc(''); setItemPrice('');
      setItemVeg(true); setItemAvailable(true); setItemBadge(''); setItemPrepTime(''); setItemOrder(0);
    }
    setItemModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) { const f = e.target.files[0]; setItemImage(f); setImagePreview(URL.createObjectURL(f)); }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setError('');
    const formData = new FormData();
    formData.append('name', itemName); formData.append('description', itemDesc);
    formData.append('price', itemPrice); formData.append('isVeg', String(itemVeg));
    formData.append('isAvailable', String(itemAvailable)); formData.append('badge', itemBadge);
    formData.append('prepTime', itemPrepTime); formData.append('displayOrder', String(itemOrder));
    if (itemImage) formData.append('image', itemImage);
    try {
      if (editingItem) {
        await api.put(`/api/items/${editingItem.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post(`/api/categories/${targetCategoryId}/items`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setItemModalOpen(false); fetchMenu();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save item.');
    } finally { setSubmitting(false); }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Delete this item?')) return;
    try { await api.delete(`/api/items/${id}`); fetchMenu(); }
    catch (err: any) { setError(err.response?.data?.error || 'Failed to delete item.'); }
  };

  const handleToggleItemAvailability = async (item: MenuItem) => {
    const next = !item.isAvailable;
    setCategories((prev) => prev.map((cat) => ({
      ...cat, items: cat.items.map((i) => i.id === item.id ? { ...i, isAvailable: next } : i),
    })));
    try { await api.put(`/api/items/${item.id}`, { isAvailable: next }); }
    catch (err: any) {
      setCategories((prev) => prev.map((cat) => ({
        ...cat, items: cat.items.map((i) => i.id === item.id ? { ...i, isAvailable: item.isAvailable } : i),
      })));
      setError('Failed to toggle availability.');
    }
  };

  const totalItems = categories.reduce((s, c) => s + c.items.length, 0);
  const availableItems = categories.reduce((s, c) => s + c.items.filter((i) => i.isAvailable).length, 0);

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-[var(--sage)]" size={36} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-medium text-[var(--text)]">Menu Builder</h2>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            {categories.length} section{categories.length !== 1 ? 's' : ''} · {totalItems} items · {availableItems} available
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-[var(--cream)] border border-[var(--cream-border)] rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-[var(--sage)]' : 'text-[var(--muted)]'}`}
              title="Grid view"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-[var(--sage)]' : 'text-[var(--muted)]'}`}
              title="List view"
            >
              <List size={15} />
            </button>
          </div>
          <button
            onClick={() => handleOpenCatModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--sage)] hover:bg-[var(--sage-mid)] text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-[var(--sage)]/20 active:scale-95"
          >
            <Plus size={16} /> Add Section
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[var(--red-light)] border border-red-200 text-[var(--red-soft)] text-sm p-4 rounded-2xl flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-3 text-red-400 hover:text-red-600 shrink-0"><X size={16} /></button>
        </div>
      )}

      {/* Empty state */}
      {categories.length === 0 ? (
        <div className="bg-white border border-[var(--cream-border)] rounded-3xl p-16 text-center space-y-4">
          <div className="w-20 h-20 bg-[var(--sage-light)] rounded-3xl flex items-center justify-center mx-auto">
            <Utensils size={36} className="text-[var(--sage)]" />
          </div>
          <div>
            <h3 className="text-lg font-display font-medium text-[var(--text)]">No menu sections yet</h3>
            <p className="text-sm text-[var(--muted)] mt-1">Add your first section like "Starters", "Mains", or "Desserts"</p>
          </div>
          <button
            onClick={() => handleOpenCatModal()}
            className="inline-flex items-center gap-2 px-5 py-3 bg-[var(--sage)] hover:bg-[var(--sage-mid)] text-white rounded-2xl text-sm font-semibold transition-all shadow-md shadow-[var(--sage)]/20"
          >
            <Plus size={16} /> Add First Section
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {categories.map((category) => (
            <div key={category.id} className="bg-white border border-[var(--cream-border)] rounded-3xl overflow-hidden shadow-sm">
              {/* Category Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--cream-dark)] bg-[var(--cream)]/40">
                <button
                  onClick={() => toggleCat(category.id)}
                  className="flex items-center gap-2.5 flex-1 text-left group"
                >
                  <ChevronRight
                    size={18}
                    className={`text-[var(--muted)] transition-transform duration-200 ${expandedCats.has(category.id) ? 'rotate-90' : ''}`}
                  />
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text)] group-hover:text-[var(--sage)] transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-xs text-[var(--muted)]">{category.items.length} item{category.items.length !== 1 ? 's' : ''}</p>
                  </div>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenCatModal(category)}
                    className="p-2 text-[var(--muted)] hover:text-[var(--sage)] hover:bg-[var(--sage-light)] rounded-xl transition-all"
                    title="Edit section"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="p-2 text-[var(--muted)] hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    title="Delete section"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => handleOpenItemModal(category.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--sage)] hover:bg-[var(--sage-mid)] text-white rounded-xl text-xs font-semibold transition-all ml-1"
                  >
                    <Plus size={13} /> Add Item
                  </button>
                </div>
              </div>

              {/* Category Items */}
              {expandedCats.has(category.id) && (
                <div className="p-4">
                  {category.items.length === 0 ? (
                    <button
                      onClick={() => handleOpenItemModal(category.id)}
                      className="w-full py-8 border-2 border-dashed border-[var(--cream-border)] hover:border-[var(--sage)]/40 rounded-2xl text-[var(--muted)] hover:text-[var(--sage)] text-sm font-medium flex items-center justify-center gap-2 transition-all group"
                    >
                      <Plus size={16} className="group-hover:scale-110 transition-transform" /> Add your first item
                    </button>
                  ) : viewMode === 'grid' ? (
                    /* Grid View — 3 columns */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {category.items.map((item) => (
                        <div
                          key={item.id}
                          className={`group relative bg-[var(--cream)] border border-[var(--cream-border)] rounded-2xl overflow-hidden transition-all ${!item.isAvailable ? 'opacity-60' : 'hover:border-[var(--cream-dark)] hover:shadow-sm'}`}
                        >
                          {/* Image area */}
                          <div className="relative h-28 bg-white border-b border-[var(--cream-border)] overflow-hidden">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl.startsWith('http') ? item.imageUrl : `${API_BASE_URL}${item.imageUrl}`}
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-[var(--cream)]">
                                <Utensils size={28} className="text-[var(--cream-border)]" />
                              </div>
                            )}

                            {/* Veg indicator */}
                            <div className={`absolute top-2 left-2 w-4 h-4 rounded-sm border-2 flex items-center justify-center bg-white ${item.isVeg ? 'border-emerald-500' : 'border-red-500'}`}>
                              <div className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            </div>

                            {/* Badge */}
                            {item.badge && (
                              <span className="absolute top-2 right-2 text-[9px] bg-[var(--sage)] text-white px-1.5 py-0.5 rounded-full font-bold">
                                {BADGE_DISPLAY[item.badge]}
                              </span>
                            )}

                            {/* Sold out overlay */}
                            {!item.isAvailable && (
                              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                <span className="text-xs font-bold text-red-600 bg-white px-2 py-1 rounded-lg border border-red-200">Sold Out</span>
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-semibold text-[var(--text)] leading-snug line-clamp-1 flex-1">{item.name}</h4>
                              <span className="font-mono font-bold text-[var(--sage)] text-sm shrink-0">₹{parseFloat(item.price).toFixed(0)}</span>
                            </div>
                            {item.description && (
                              <p className="text-xs text-[var(--muted)] line-clamp-2 leading-snug">{item.description}</p>
                            )}
                            {item.prepTime && (
                              <p className="flex items-center gap-1 text-[10px] text-[var(--muted)]">
                                <Clock size={10} /> {item.prepTime}
                              </p>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 pt-1 border-t border-[var(--cream-border)]">
                              <button
                                type="button"
                                onClick={() => handleToggleItemAvailability(item)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex-1 justify-center ${
                                  item.isAvailable
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                }`}
                                title={item.isAvailable ? 'Mark Sold Out' : 'Mark Available'}
                              >
                                {item.isAvailable ? <Eye size={10} /> : <EyeOff size={10} />}
                                {item.isAvailable ? 'Available' : 'Sold Out'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenItemModal(category.id, item)}
                                className="p-1.5 text-[var(--muted)] hover:text-[var(--sage)] hover:bg-[var(--sage-light)] rounded-lg transition-all"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1.5 text-[var(--muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* List View */
                    <div className="divide-y divide-[var(--cream-border)]">
                      {category.items.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center gap-4 py-3.5 first:pt-0 last:pb-0 transition-opacity ${!item.isAvailable ? 'opacity-60' : ''}`}
                        >
                          {/* Thumb */}
                          <div className="w-12 h-12 rounded-xl bg-[var(--cream)] border border-[var(--cream-border)] overflow-hidden shrink-0">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl.startsWith('http') ? item.imageUrl : `${API_BASE_URL}${item.imageUrl}`}
                                alt={item.name} className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Utensils size={16} className="text-[var(--cream-border)]" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-sm border-2 flex items-center justify-center ${item.isVeg ? 'border-emerald-500' : 'border-red-500'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              </div>
                              <h4 className="text-sm font-semibold text-[var(--text)] truncate">{item.name}</h4>
                              {item.badge && (
                                <span className="text-[9px] bg-[var(--sage)] text-white px-1.5 py-0.5 rounded-full font-bold shrink-0">
                                  {BADGE_DISPLAY[item.badge]}
                                </span>
                              )}
                            </div>
                            {item.description && <p className="text-xs text-[var(--muted)] truncate mt-0.5">{item.description}</p>}
                          </div>

                          {/* Price */}
                          <span className="font-mono font-bold text-[var(--sage)] text-sm shrink-0">₹{parseFloat(item.price).toFixed(0)}</span>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleItemAvailability(item)}
                              className={`p-1.5 rounded-lg border transition-all ${
                                item.isAvailable
                                  ? 'text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                                  : 'text-red-500 border-red-200 bg-red-50 hover:bg-red-100'
                              }`}
                              title={item.isAvailable ? 'Mark Sold Out' : 'Mark Available'}
                            >
                              {item.isAvailable ? <Eye size={13} /> : <EyeOff size={13} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenItemModal(category.id, item)}
                              className="p-1.5 text-[var(--muted)] hover:text-[var(--sage)] hover:bg-[var(--sage-light)] rounded-lg transition-all"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 text-[var(--muted)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Category Modal ─────────────────────────────────────────────── */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-[var(--cream-border)] flex items-center justify-between">
              <h3 className="font-semibold text-[var(--text)]">{editingCategory ? 'Edit Section' : 'New Menu Section'}</h3>
              <button onClick={() => setCatModalOpen(false)} className="text-[var(--muted)] hover:text-[var(--text)] p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Section Name</label>
                <input
                  type="text" required value={catName} onChange={(e) => setCatName(e.target.value)}
                  className={inputCls} placeholder="e.g. Starters, Mains, Desserts, Beverages"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Display Order</label>
                <input
                  type="number" required value={catOrder} onChange={(e) => setCatOrder(parseInt(e.target.value) || 0)}
                  className={inputCls}
                />
                <p className="text-xs text-[var(--muted)]">Lower numbers appear first in the menu</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setCatModalOpen(false)}
                  className="flex-1 py-2.5 border border-[var(--cream-border)] text-[var(--muted)] rounded-xl text-sm font-semibold hover:bg-[var(--cream)] transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[var(--sage)] hover:bg-[var(--sage-mid)] text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
                  {submitting && <Loader2 className="animate-spin" size={14} />}
                  {editingCategory ? 'Save Changes' : 'Create Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Item Modal ─────────────────────────────────────────────────── */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl my-8 overflow-hidden">
            {/* Modal header */}
            <div className="px-6 py-5 border-b border-[var(--cream-border)] flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-semibold text-[var(--text)]">{editingItem ? 'Edit Item' : 'Add Menu Item'}</h3>
              <button onClick={() => setItemModalOpen(false)} className="text-[var(--muted)] hover:text-[var(--text)] p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-5">
              {/* Image upload — large, at top */}
              <div>
                <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider block mb-2">Item Photo</label>
                <label className="relative block cursor-pointer group">
                  <div className={`w-full h-40 rounded-2xl border-2 border-dashed overflow-hidden flex items-center justify-center transition-all ${
                    imagePreview ? 'border-[var(--sage)]' : 'border-[var(--cream-border)] hover:border-[var(--sage)]/50 bg-[var(--cream)]'
                  }`}>
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center space-y-2">
                        <Camera className="mx-auto text-[var(--muted)]" size={28} />
                        <p className="text-sm text-[var(--muted)] font-medium">Click to upload photo</p>
                        <p className="text-xs text-[var(--muted-light)]">JPG, PNG, WebP supported</p>
                      </div>
                    )}
                    {imagePreview && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                        <div className="text-white text-center">
                          <Camera size={24} className="mx-auto" />
                          <p className="text-xs mt-1 font-semibold">Change Photo</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              </div>

              {/* Name + Price in 2 cols */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Item Name *</label>
                  <input type="text" required value={itemName} onChange={(e) => setItemName(e.target.value)}
                    className={inputCls} placeholder="e.g. Butter Chicken" autoFocus />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Price (₹) *</label>
                  <input type="number" step="0.01" required value={itemPrice} onChange={(e) => setItemPrice(e.target.value)}
                    className={inputCls} placeholder="199" />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Description</label>
                <textarea rows={2} value={itemDesc} onChange={(e) => setItemDesc(e.target.value)}
                  className={`${inputCls} resize-none`} placeholder="Describe ingredients, portion size, or flavour…" />
              </div>

              {/* Prep Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={12} /> Prep Time <span className="font-normal normal-case text-[var(--muted)]">(optional)</span>
                </label>
                <input type="text" value={itemPrepTime} onChange={(e) => setItemPrepTime(e.target.value)}
                  className={inputCls} placeholder="e.g. 10-15 mins" />
              </div>

              {/* Veg / Non-Veg + Available */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Type</label>
                  <div className="flex rounded-xl overflow-hidden border border-[var(--cream-border)]">
                    <button type="button" onClick={() => setItemVeg(true)}
                      className={`flex-1 py-2.5 text-xs font-bold transition-all ${itemVeg ? 'bg-emerald-500 text-white' : 'bg-white text-[var(--muted)] hover:bg-[var(--cream)]'}`}>
                      🌿 Veg
                    </button>
                    <button type="button" onClick={() => setItemVeg(false)}
                      className={`flex-1 py-2.5 text-xs font-bold transition-all ${!itemVeg ? 'bg-red-500 text-white' : 'bg-white text-[var(--muted)] hover:bg-[var(--cream)]'}`}>
                      🍖 Non-Veg
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Availability</label>
                  <div className="flex rounded-xl overflow-hidden border border-[var(--cream-border)]">
                    <button type="button" onClick={() => setItemAvailable(true)}
                      className={`flex-1 py-2.5 text-xs font-bold transition-all ${itemAvailable ? 'bg-emerald-500 text-white' : 'bg-white text-[var(--muted)] hover:bg-[var(--cream)]'}`}>
                      In Stock
                    </button>
                    <button type="button" onClick={() => setItemAvailable(false)}
                      className={`flex-1 py-2.5 text-xs font-bold transition-all ${!itemAvailable ? 'bg-red-500 text-white' : 'bg-white text-[var(--muted)] hover:bg-[var(--cream)]'}`}>
                      Sold Out
                    </button>
                  </div>
                </div>
              </div>

              {/* Badge */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
                  <Tag size={12} /> Highlight Badge
                </label>
                <div className="flex flex-wrap gap-2">
                  {BADGE_OPTIONS.map((b) => (
                    <button key={b.id} type="button" onClick={() => setItemBadge(b.id)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-semibold border transition-all ${
                        itemBadge === b.id
                          ? 'bg-[var(--sage)] text-white border-[var(--sage)] shadow-sm'
                          : 'bg-[var(--cream)] text-[var(--muted)] border-[var(--cream-border)] hover:border-[var(--cream-dark)]'
                      }`}>
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Display Order */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Display Order</label>
                <input type="number" required value={itemOrder} onChange={(e) => setItemOrder(parseInt(e.target.value) || 0)}
                  className={inputCls} />
                <p className="text-xs text-[var(--muted)]">Lower numbers appear first within the section</p>
              </div>

              {/* Footer buttons */}
              <div className="flex gap-3 pt-2 border-t border-[var(--cream-border)]">
                <button type="button" onClick={() => setItemModalOpen(false)}
                  className="flex-1 py-3 border border-[var(--cream-border)] text-[var(--muted)] rounded-xl text-sm font-semibold hover:bg-[var(--cream)] transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-[var(--sage)] hover:bg-[var(--sage-mid)] text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-md shadow-[var(--sage)]/20">
                  {submitting && <Loader2 className="animate-spin" size={14} />}
                  {editingItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
