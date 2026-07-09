"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { io } from "socket.io-client";
import LoadingScreen from "@/components/LoadingScreen";

export default function MenuManagement() {
  const [user, setUser] = useState(null);
  
  // Menu Data States
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [paginationMeta, setPaginationMeta] = useState({ total: 0, totalPages: 1 });
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");

  // Loading States
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals & Forms States
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryModalType, setCategoryModalType] = useState("add"); // 'add' | 'edit'
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [categoryNameInput, setCategoryNameInput] = useState("");

  const [showItemModal, setShowItemModal] = useState(false);
  const [itemModalType, setItemModalType] = useState("add"); // 'add' | 'edit'
  const [activeItemId, setActiveItemId] = useState(null);
  const [itemFormData, setItemFormData] = useState({
    name: "",
    price: "",
    categoryId: "",
    stockQty: "999",
    isAvailable: true,
    costPrice: "",
    trackStock: false,
    imageFile: null,
    imageUrl: ""
  });

  const [toast, setToast] = useState({ show: false, message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: "",
    message: "",
    confirmText: "Delete",
    cancelText: "Cancel",
    onConfirm: null
  });

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

  const triggerToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3500);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));

    fetchCategories();
    
    //  SOCKET.IO REAL-TIME CONNECTION
    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
      reconnection: true
    });

    socket.on("connect", () => {
      console.log("Menu Manager Socket Connected:", socket.id);
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const userObj = JSON.parse(userStr);
          if (userObj.restaurantId) {
            socket.emit("join_restaurant", userObj.restaurantId);
          }
        } catch (e) {}
      }
    });

    socket.on("menu_updated", () => {
      fetchCategories(true);
      fetchMenuItems(currentPage, searchQuery, selectedCategoryFilter, true);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    fetchMenuItems(currentPage, searchQuery, selectedCategoryFilter);
  }, [currentPage, selectedCategoryFilter]);

  // Debounced search trigger
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setCurrentPage(1);
      fetchMenuItems(1, searchQuery, selectedCategoryFilter);
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Fetch Categories
  const fetchCategories = async (isSilent = false) => {
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/menu/categories`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      if (!isSilent) setLoadingCategories(false);
    }
  };

  // Fetch Menu Items
  const fetchMenuItems = async (page = 1, search = "", catFilter = "All", isSilent = false) => {
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/menu/menu-items?page=${page}&limit=9&search=${encodeURIComponent(search)}&category=${encodeURIComponent(catFilter)}`,
        {
          headers: { "Authorization": `Bearer ${token}` }
        }
      );
      if (res.ok) {
        const json = await res.json();
        setMenuItems(json.data || []);
        if (json.pagination) setPaginationMeta(json.pagination);
      }
    } catch (error) {
      console.error("Failed to load menu items:", error);
    } finally {
      if (!isSilent) setLoadingItems(false);
    }
  };

  // --- Category Actions ---
  const handleSaveCategory = async () => {
    if (!categoryNameInput.trim()) {
      triggerToast("Category name cannot be empty.", "error");
      return;
    }
    const token = localStorage.getItem("authToken");
    setActionLoading(true);

    try {
      if (categoryModalType === "add") {
        const res = await fetch(`${BACKEND_URL}/api/menu/categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ name: categoryNameInput })
        });
        if (!res.ok) throw new Error("Failed to create category.");
        triggerToast("Category created successfully!", "success");
      } else {
        const res = await fetch(`${BACKEND_URL}/api/menu/categories/${activeCategoryId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ name: categoryNameInput })
        });
        if (!res.ok) throw new Error("Failed to update category.");
        triggerToast("Category updated successfully!", "success");
      }
      setShowCategoryModal(false);
      setCategoryNameInput("");
      fetchCategories();
    } catch (e) {
      triggerToast(`Error: ${e.message}`, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCategory = (id, name) => {
    setConfirmModal({
      show: true,
      title: "Delete Category",
      message: `Are you sure you want to delete "${name}"? Categories can only be deleted if they don't contain any products.`,
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        const token = localStorage.getItem("authToken");
        setActionLoading(true);
        try {
          const res = await fetch(`${BACKEND_URL}/api/menu/categories/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Failed to delete category.");
          
          triggerToast("Category removed successfully.", "success");
          fetchCategories();
        } catch (e) {
          triggerToast(`Error: ${e.message}`, "error");
        } finally {
          setActionLoading(false);
          setConfirmModal(prev => ({ ...prev, show: false }));
        }
      }
    });
  };

  // --- Menu Item Actions ---
  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    const token = localStorage.getItem("authToken");
    
    const res = await fetch(`${BACKEND_URL}/api/upload`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }, // Add auth header for security
      body: formData,
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to upload image.");
    return data.data.url;
  };

  const handleSaveMenuItem = async () => {
    const { name, price, categoryId, stockQty, isAvailable, costPrice, trackStock, imageFile, imageUrl } = itemFormData;
    if (!name.trim() || !price || !categoryId) {
      triggerToast("Name, price, and category are required fields.", "error");
      return;
    }
    const token = localStorage.getItem("authToken");
    setActionLoading(true);

    try {
      let finalImageUrl = imageUrl;
      if (imageFile) {
        finalImageUrl = await uploadImage(imageFile);
      }

      const payload = {
        name,
        price: parseFloat(price),
        categoryId: parseInt(categoryId),
        stockQty: parseInt(stockQty),
        isAvailable,
        costPrice: costPrice ? parseFloat(costPrice) : 0,
        trackStock: !!trackStock,
        imageUrl: finalImageUrl
      };

      if (itemModalType === "add") {
        const res = await fetch(`${BACKEND_URL}/api/menu/menu-items`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Failed to create menu item.");
        triggerToast("Menu Item registered successfully!", "success");
      } else {
        const res = await fetch(`${BACKEND_URL}/api/menu/menu-items/${activeItemId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Failed to update menu item.");
        triggerToast("Menu Item updated successfully!", "success");
      }
      setShowItemModal(false);
      setItemFormData({ name: "", price: "", categoryId: "", stockQty: "999", isAvailable: true, costPrice: "", trackStock: false, imageFile: null, imageUrl: "" });
      fetchMenuItems(currentPage, searchQuery, selectedCategoryFilter);
      fetchCategories(); // Refresh item count
    } catch (e) {
      triggerToast(`Error: ${e.message}`, "error");
    } finally {
      setActionLoading(false);
    }
  };  const handleToggleItemAvailability = async (item) => {
    const token = localStorage.getItem("authToken");
    const nextState = !item.isAvailable;
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/menu/menu-items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ isAvailable: nextState })
      });
      if (!res.ok) throw new Error("Could not toggle availability.");
      
      setMenuItems(menuItems.map(m => m.id === item.id ? { ...m, isAvailable: nextState } : m));
      triggerToast(nextState ? `${item.name} is now Available!` : `${item.name} is now Unavailable.`, "success");
    } catch (e) {
      triggerToast(`Error: ${e.message}`, "error");
    }
  };

  const handleDeleteMenuItem = (id, name) => {
    setConfirmModal({
      show: true,
      title: "Delete Food Item",
      message: `Are you sure you want to permanently delete "${name}"? This action is irreversible.`,
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        const token = localStorage.getItem("authToken");
        setActionLoading(true);
        try {
          const res = await fetch(`${BACKEND_URL}/api/menu/menu-items/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (!res.ok) throw new Error("Failed to delete menu item.");
          
          triggerToast("Menu item removed permanently.", "success");
          fetchMenuItems(currentPage, searchQuery, selectedCategoryFilter);
          fetchCategories(); // Refresh item count
        } catch (e) {
          triggerToast(`Error: ${e.message}`, "error");
        } finally {
          setActionLoading(false);
          setConfirmModal(prev => ({ ...prev, show: false }));
        }
      }
    });
  };

  const openAddCategoryModal = () => {
    setCategoryModalType("add");
    setCategoryNameInput("");
    setShowCategoryModal(true);
  };

  const openEditCategoryModal = (cat) => {
    setCategoryModalType("edit");
    setActiveCategoryId(cat.id);
    setCategoryNameInput(cat.name);
    setShowCategoryModal(true);
  };

  const openAddItemModal = () => {
    setItemModalType("add");
    setItemFormData({
      name: "",
      price: "",
      categoryId: categories[0]?.id ? String(categories[0].id) : "",
      stockQty: "999",
      isAvailable: true,
      costPrice: "",
      trackStock: false,
      imageFile: null,
      imageUrl: ""
    });
    setShowItemModal(true);
  };

  const openEditItemModal = (item) => {
    setItemModalType("edit");
    setActiveItemId(item.id);
    setItemFormData({
      name: item.name,
      price: String(item.price),
      categoryId: String(item.categoryId),
      stockQty: String(item.stockQty),
      isAvailable: item.isAvailable,
      costPrice: item.costPrice !== undefined && item.costPrice !== null ? String(item.costPrice) : "",
      trackStock: !!item.trackStock,
      imageFile: null,
      imageUrl: item.imageUrl || ""
    });
    setShowItemModal(true);
  };

  if (loadingCategories || loadingItems) {
    return <LoadingScreen message="Syncing premium dishes catalog..." minHeight="50vh" />;
  }

  return (
    <div className="space-y-6 text-slate-800 pb-12 relative min-h-screen">
      
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-6 right-6 z-[100] animate-slide-in-right">
          <div className={`backdrop-blur-xl border px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[270px] max-w-sm ${
            toast.type === "success" ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600" : "bg-rose-500/10 border-rose-500/25 text-rose-600"
          }`}>
            {toast.type === "success" ? (
              <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            )}
            <p className="text-[11px] font-black tracking-wide leading-relaxed truncate">{toast.message}</p>
          </div>
        </div>
      )}

      {/* SECTION ACTION BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 text-left">
        <div>
          <h3 className="text-sm font-black text-slate-900 leading-tight">Recipe Catalog &amp; Categories</h3>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
            Configure dishes catalog, set price segments, and organize menu tabs
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <Link
            href="/dashboard/menu/stock"
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#ff5722]/10 hover:bg-[#ff5722]/15 text-[#ff5722] border border-[#ff5722]/20 text-[10px] font-black uppercase tracking-widest rounded-2xl transition active:scale-95 whitespace-nowrap"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Stock Control
          </Link>
          <button
            onClick={openAddCategoryModal}
            className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded-2xl transition active:scale-95 whitespace-nowrap"
          >
            + Add Category
          </button>
          
          <button
            onClick={openAddItemModal}
            className="px-5 py-3 bg-slate-900 hover:bg-slate-850 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-md transition active:scale-95 whitespace-nowrap"
          >
            + Register Food Item
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        
        {/* LEFT COLUMN: CATEGORIES AUDIT PANEL */}
        <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-[2.5rem] p-5 shadow-sm space-y-4 h-fit">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest">Categories</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100 text-[8px] font-black text-slate-500">
              {categories.length} Total
            </span>
          </div>

          {loadingCategories ? (
            <div className="py-10 text-center">
              <div className="w-6 h-6 rounded-full border-2 border-slate-900 border-t-transparent animate-spin mx-auto" />
            </div>
          ) : categories.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
              No categories registered.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-1 scrollbar-thin">
              {/* Reset filter option */}
              <button
                onClick={() => setSelectedCategoryFilter("All")}
                className={`w-full text-left px-4 py-3 rounded-2xl text-[11px] font-extrabold uppercase transition flex items-center gap-2 ${
                  selectedCategoryFilter === "All"
                    ? "bg-[#ff5722]/10 text-[#ff5722] border border-[#ff5722]/20"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-transparent"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5A3.375 3.375 0 0010.125 2.25H3.75A2.25 2.25 0 001.5 4.5v15a2.25 2.25 0 002.25 2.25h16.5a2.25 2.25 0 002.25-2.25V14.25z" />
                </svg>
                <span>View All Items</span>
              </button>

              {categories.map(cat => (
                <div
                  key={cat.id}
                  className={`w-full px-4 py-3 rounded-2xl text-[11px] font-extrabold transition flex items-center justify-between group border relative ${
                    selectedCategoryFilter === cat.name
                      ? "bg-[#ff5722]/10 text-[#ff5722] border-[#ff5722]/20"
                      : "bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-600"
                  }`}
                >
                  <button
                    onClick={() => {
                      setSelectedCategoryFilter(cat.name);
                      setCurrentPage(1);
                    }}
                    className="flex-grow text-left uppercase truncate pr-8 flex items-center gap-2"
                  >
                    <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581a1.44 1.44 0 002.037 0l4.318-4.317a1.44 1.44 0 000-2.037L10.01 3.659A2.25 2.25 0 008.568 3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                    </svg>
                    <span>{cat.name}</span>
                    <span className="ml-1 text-[8px] opacity-65">({cat.itemCount || 0})</span>
                  </button>

                  {/* Actions overlay for owners */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditCategoryModal(cat)}
                      className="w-5 h-5 rounded-md bg-white border border-slate-250 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition"
                      title="Edit Category"
                    >
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      className="w-5 h-5 rounded-md bg-white border border-rose-200 hover:bg-rose-50 flex items-center justify-center text-rose-500 transition"
                      title="Delete Category"
                    >
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: FOOD ITEMS CATALOG LEDGER */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* SEARCH AND FILTERS */}
          <div className="bg-white border border-slate-200/80 p-4 rounded-[2rem] shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="w-full sm:max-w-md relative">
              <input
                type="text"
                placeholder="Search food items by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#ff5722] focus:ring-4 focus:ring-[#ff5722]/5 transition"
              />
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              {selectedCategoryFilter !== "All" && (
                <span>Filtering by: <strong className="text-[#ff5722]">{selectedCategoryFilter}</strong></span>
              )}
            </div>
          </div>

          {/* GRID LEDGER */}
          {loadingItems ? (
            <div className="py-24 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mx-auto" />
              <p className="text-slate-500 text-xs font-black mt-4">Syncing Premium Dishes Catalog...</p>
            </div>
          ) : menuItems.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-[2.5rem] p-20 text-center space-y-4 opacity-75">
              <svg className="w-12 h-12 text-slate-350 mx-auto animate-pulse" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              <h4 className="text-slate-800 font-black text-sm uppercase tracking-wider">No food items found</h4>
              <p className="text-slate-500 text-xs font-semibold">Try adjustments to your search queries or add your first premium menu item above!</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {menuItems.map(item => (
                <div
                  key={item.id}
                  className={`bg-white border-2 rounded-[2rem] overflow-hidden shadow-lg shadow-slate-100/30 flex flex-col justify-between hover:shadow-xl transition duration-300 relative group ${
                    item.isAvailable ? 'border-slate-200/80' : 'border-rose-200 bg-rose-50/5'
                  }`}
                >
                  {/* Top Image & Controls Section */}
                  <div className={`w-full relative ${item.imageUrl ? 'h-48 bg-slate-100' : 'h-32 bg-slate-50 flex items-center justify-center'}`}>
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl.startsWith('http') ? item.imageUrl : `${BACKEND_URL}${item.imageUrl}`} 
                        alt={item.name} 
                        className={`w-full h-full object-cover transition duration-500 group-hover:scale-105 ${!item.isAvailable && 'grayscale'}`} 
                      />
                    ) : (
                      <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    )}
                    
                    {/* Floating Controls */}
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                      <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm backdrop-blur-md ${item.imageUrl ? 'bg-black/30 text-white border border-white/20' : 'bg-white text-slate-600 border border-slate-200'}`}>
                        {item.category?.name || "Uncategorized"}
                      </span>

                      <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditItemModal(item)}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition backdrop-blur-md shadow-sm ${item.imageUrl ? 'bg-black/40 text-white hover:bg-black/60 border border-white/20' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}`}
                          title="Edit Item"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteMenuItem(item.id, item.name)}
                          className="w-8 h-8 rounded-xl bg-rose-500/90 hover:bg-rose-600 text-white border border-rose-500/20 flex items-center justify-center transition backdrop-blur-md shadow-sm"
                          title="Delete Item"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 flex flex-col justify-between flex-grow space-y-5">
                    {/* Body Content */}
                    <div className="space-y-1.5">
                      <h4 className={`font-black text-slate-900 text-base leading-snug line-clamp-2 ${!item.isAvailable && 'line-through text-slate-400'}`}>
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-3 text-sm font-black">
                        <span className="text-[#ff5722]">₹{item.price.toFixed(2)}</span>
                        <span className="text-slate-450 font-semibold text-xs">Cost: ₹{(item.costPrice || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Stock Audit & availability status bar */}
                    <div className="border-t border-slate-100 pt-3.5 flex items-center justify-between">
                      <div className="space-y-0.5 text-left">
                        <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 block">
                          <span>Stock Limit</span>
                          {item.trackStock && (
                            <span className="text-[6.5px] font-black text-emerald-600 bg-emerald-50 px-1 rounded-sm border border-emerald-100 uppercase">Tracked</span>
                          )}
                        </span>
                        <span className="text-[11px] font-black text-slate-700">{item.stockQty} portions</span>
                      </div>

                      <button
                        onClick={() => handleToggleItemAvailability(item)}
                        className={`px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm ${
                          item.isAvailable
                            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:shadow-emerald-500/20"
                            : "bg-rose-500/10 border border-rose-500/20 text-rose-600 hover:bg-rose-500 hover:text-white hover:shadow-rose-500/20"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span>{item.isAvailable ? "Live" : "Unavailable"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PAGINATION */}
          {paginationMeta.totalPages > 1 && menuItems.length > 0 && (
            <div className="bg-white border border-slate-200/80 p-4 rounded-[2rem] shadow-sm flex items-center justify-between bg-slate-50">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">
                Page {currentPage} of {paginationMeta.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage === paginationMeta.totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(paginationMeta.totalPages, prev + 1))}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* --- ADD/EDIT CATEGORY MODAL --- */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative border-2 border-slate-200/80 text-slate-800">
            <button onClick={() => setShowCategoryModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-950 text-xl font-bold flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="text-center space-y-2 mb-8">
              <div className="w-16 h-16 bg-[#ff5722]/5 text-[#ff5722] rounded-3xl flex items-center justify-center mx-auto mb-4 border border-[#ff5722]/10">
                {categoryModalType === "add" ? (
                  <svg className="w-8 h-8 text-[#ff5722]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-[#ff5722]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                )}
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {categoryModalType === "add" ? "New Category" : "Edit Category"}
              </h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Configure food groups for your active digital menu
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-2">Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. Traditional Tandoor or Desserts"
                  value={categoryNameInput}
                  onChange={(e) => setCategoryNameInput(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#ff5722] focus:ring-4 focus:ring-[#ff5722]/5 transition"
                  autoFocus
                />
              </div>
              
              <button
                onClick={handleSaveCategory}
                disabled={actionLoading}
                className="w-full py-4 bg-slate-950 hover:bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? "Saving..." : categoryModalType === "add" ? "Create Category" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD/EDIT FOOD ITEM MODAL --- */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 w-full max-w-lg shadow-2xl relative border-2 border-slate-200/80 text-slate-800 max-h-[95vh] overflow-y-auto scrollbar-thin">
            <button onClick={() => setShowItemModal(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-950 text-xl font-bold flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="text-center space-y-2 mb-6">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
                </svg>
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {itemModalType === "add" ? "Register Food Item" : "Configure Food Details"}
              </h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Define pricing, stock restrictions, and categorizations
              </p>
            </div>

            <div className="space-y-4 text-xs font-bold text-slate-600">
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Dish Name</label>
                <input
                  type="text"
                  placeholder="e.g. Murgh Makhani Butter Chicken"
                  value={itemFormData.name}
                  onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#ff5722] transition"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Dish Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 350.00"
                    value={itemFormData.price}
                    onChange={(e) => setItemFormData({ ...itemFormData, price: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#ff5722] transition"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Target Category</label>
                  <select
                    value={itemFormData.categoryId}
                    onChange={(e) => setItemFormData({ ...itemFormData, categoryId: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#ff5722] transition"
                  >
                    <option value="" disabled>Select category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 150.00"
                    value={itemFormData.costPrice}
                    onChange={(e) => setItemFormData({ ...itemFormData, costPrice: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#ff5722] transition"
                  />
                </div>

                <div className="space-y-2 flex flex-col justify-end pb-1.5 pl-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={itemFormData.trackStock}
                      onChange={(e) => setItemFormData({ ...itemFormData, trackStock: e.target.checked })}
                      className="w-4 h-4 rounded text-[#ff5722] border-slate-200 focus:ring-[#ff5722]"
                    />
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Track Inventory Stock</span>
                  </label>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">POS Portion Cap Limit</label>
                  <input
                    type="number"
                    placeholder="Default 999"
                    value={itemFormData.stockQty}
                    onChange={(e) => setItemFormData({ ...itemFormData, stockQty: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#ff5722] transition"
                  />
                </div>

                <div className="space-y-2 flex flex-col justify-end pb-1.5 pl-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={itemFormData.isAvailable}
                      onChange={(e) => setItemFormData({ ...itemFormData, isAvailable: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-500 border-slate-200 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Active &amp; Available</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1">Dish Image</label>
                <div className="relative group border-2 border-dashed border-slate-200 hover:border-[#ff5722] rounded-3xl bg-slate-50 hover:bg-[#ff5722]/5 transition overflow-hidden">
                  {(itemFormData.imageUrl || itemFormData.imageFile) ? (
                    <div className="relative w-full h-36 sm:h-40">
                      <img 
                        src={itemFormData.imageFile ? URL.createObjectURL(itemFormData.imageFile) : (itemFormData.imageUrl.startsWith('http') ? itemFormData.imageUrl : `${BACKEND_URL}${itemFormData.imageUrl}`)} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                        <span className="text-white text-xs font-black uppercase tracking-widest bg-black/40 px-4 py-2 rounded-xl border border-white/20 shadow-xl">Change Photo</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 opacity-70 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 text-[#ff5722]">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                      </div>
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Click to upload photo</span>
                      <span className="text-[8px] font-bold text-slate-400 mt-1">PNG, JPG or WEBP (Max 5MB)</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setItemFormData({ ...itemFormData, imageFile: e.target.files[0] })}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveMenuItem}
                disabled={actionLoading}
                className="w-full py-4 mt-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/10 transition active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? "Saving..." : itemModalType === "add" ? "Register Food Item" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PREMIUM CUSTOM CONFIRMATION MODAL --- */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative border border-slate-150 text-slate-800 animate-scale-up">
            
            {/* Destructive Warning Icon */}
            <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 animate-pulse">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div className="text-center space-y-2 mb-8">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {confirmModal.title}
              </h3>
              <p className="text-xs font-bold text-slate-500 leading-relaxed px-2">
                {confirmModal.message}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest transition active:scale-95 border border-slate-200"
              >
                {confirmModal.cancelText}
              </button>
              
              <button
                onClick={confirmModal.onConfirm}
                disabled={actionLoading}
                className="flex-1 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-500/10 transition active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? "Processing..." : confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
