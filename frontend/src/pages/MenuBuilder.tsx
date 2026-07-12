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
  const [itemOrder, setItemOrder] = useState(0);
  const [itemImage, setItemImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchMenu = async () => {
    try {
      const restaurant = JSON.parse(localStorage.getItem('restaurant') || '{}');
      if (restaurant.slug) {
        const response = await api.get(`/api/public/menu/${restaurant.slug}`);
        // The public menu returns only available items. For admin editing, we want categories and their items.
        // We will fetch from public menu first as it has active structure, but category management will handle all items.
        // Wait, for admin, let's fetch category listings, then fetch the full menu items.
        // Let's implement category + item list mappings from response.
        setCategories(response.data.restaurant.categories || []);
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
        // Update category
        await api.put(`/api/categories/${editingCategory.id}`, {
          name: catName,
          displayOrder: catOrder,
        });
      } else {
        // Create category
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
    if (!window.confirm('Are you sure you want to delete this category? All its items will be deleted.')) return;
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
      setItemOrder(item.displayOrder);
      if (item.imageUrl) {
        setImagePreview(`${API_BASE_URL}${item.imageUrl}`);
      }
    } else {
      setEditingItem(null);
      setItemName('');
      setItemDesc('');
      setItemPrice('');
      setItemVeg(true);
      setItemAvailable(true);
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
    try {
      await api.put(`/api/items/${item.id}`, {
        isAvailable: !item.isAvailable,
      });
      fetchMenu();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to toggle availability.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm p-4 rounded-xl flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-200">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Menu Sections</h2>
        <button
          onClick={() => handleOpenCatModal()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all shadow-md"
        >
          <Plus size={16} />
          Add Section
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
          <p className="text-lg">No menu categories created yet.</p>
          <p className="text-sm text-slate-500 mt-2">Get started by adding your first menu section (e.g. Starters).</p>
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map((category) => (
            <div key={category.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">{category.name}</h3>
                  <span className="text-xs text-slate-500 font-mono">(Order: {category.displayOrder})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenCatModal(category)}
                    className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-all"
                    title="Edit Category Name"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all"
                    title="Delete Category"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => handleOpenItemModal(category.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold ml-2 transition-all"
                  >
                    <Plus size={14} />
                    Add Item
                  </button>
                </div>
              </div>

              {category.items.length === 0 ? (
                <p className="text-sm text-slate-500 italic py-2">No items in this section.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex gap-4 p-4 rounded-xl border transition-all ${
                        item.isAvailable
                          ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                          : 'bg-slate-950/20 border-slate-900 opacity-60'
                      }`}
                    >
                      {item.imageUrl && (
                        <img
                          src={`${API_BASE_URL}${item.imageUrl}`}
                          alt={item.name}
                          className="w-20 h-20 object-cover rounded-lg bg-slate-900 border border-slate-800 shrink-0"
                        />
                      )}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-white text-base leading-tight">{item.name}</h4>
                          <span className="text-sm font-semibold text-indigo-400 font-mono shrink-0">
                            ${parseFloat(item.price).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 h-8">{item.description || 'No description.'}</p>
                        
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                item.isVeg
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}
                            >
                              {item.isVeg ? 'Veg' : 'Non-Veg'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">Order: {item.displayOrder}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleItemAvailability(item)}
                              className={`p-1.5 rounded-lg border transition-all ${
                                item.isAvailable
                                  ? 'text-emerald-400 hover:text-emerald-300 bg-emerald-500/5 border-emerald-500/10'
                                  : 'text-slate-500 hover:text-slate-400 bg-slate-800/5 border-slate-800'
                              }`}
                              title={item.isAvailable ? 'Mark Unavailable' : 'Mark Available'}
                            >
                              {item.isAvailable ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                            <button
                              onClick={() => handleOpenItemModal(category.id, item)}
                              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-all"
                              title="Edit Item"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">{editingCategory ? 'Edit Section' : 'Add Menu Section'}</h3>
              <button onClick={() => setCatModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Section Name</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="mt-1 block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                  placeholder="e.g. Starters, Main Course, Drinks"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Display Order</label>
                <input
                  type="number"
                  required
                  value={catOrder}
                  onChange={(e) => setCatOrder(parseInt(e.target.value) || 0)}
                  className="mt-1 block w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                />
                <p className="text-[10px] text-slate-500 mt-1">Lower numbers are shown first</p>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-850"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</h3>
              <button onClick={() => setItemModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300">Item Name</label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="mt-1 block w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                    placeholder="e.g. Classic Margherita Pizza"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300">Description</label>
                  <textarea
                    rows={2}
                    value={itemDesc}
                    onChange={(e) => setItemDesc(e.target.value)}
                    className="mt-1 block w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                    placeholder="Describe flavor notes, portions, or allergies..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="mt-1 block w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                    placeholder="9.99"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">Display Order</label>
                  <input
                    type="number"
                    required
                    value={itemOrder}
                    onChange={(e) => setItemOrder(parseInt(e.target.value) || 0)}
                    className="mt-1 block w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                  />
                </div>

                <div className="flex items-center gap-4 bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl">
                  <span className="text-sm font-medium text-slate-300">Dietary Style</span>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => setItemVeg(true)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-all ${
                        itemVeg
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm'
                          : 'text-slate-500 border-transparent'
                      }`}
                    >
                      Veg
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemVeg(false)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-all ${
                        !itemVeg
                          ? 'bg-red-500/10 text-red-400 border-red-500/20 shadow-sm'
                          : 'text-slate-500 border-transparent'
                      }`}
                    >
                      Non-Veg
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl">
                  <span className="text-sm font-medium text-slate-300">Availability</span>
                  <button
                    type="button"
                    onClick={() => setItemAvailable(!itemAvailable)}
                    className={`ml-auto text-xs px-2.5 py-1 rounded-lg font-bold border transition-all ${
                      itemAvailable
                        ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                  >
                    {itemAvailable ? 'In Stock' : 'Out of Stock'}
                  </button>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">Item Image</label>
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center overflow-hidden shrink-0">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="text-slate-600" size={24} />
                      )}
                    </div>
                    <label className="flex-1 cursor-pointer flex items-center justify-center border border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950 py-3 rounded-xl hover:bg-slate-850 transition-all text-xs font-semibold text-slate-400 hover:text-white">
                      <span>Upload Image</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-850"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
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
