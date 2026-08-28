"use client";

import { getBackendUrl, getSocketUrl } from "@/config/api";

import { useEffect, useState } from "react";
import Link from "next/link";
import { io } from "socket.io-client";
import {
  UtensilsCrossed,
  Plus,
  Search,
  Layers,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Flame,
  Check,
  X,
  Sparkles,
  Scale,
  DollarSign,
  Package,
  SlidersHorizontal,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function MenuManagement() {
  const [user, setUser] = useState<any>(null);

  // Menu Data
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [paginationMeta, setPaginationMeta] = useState({ total: 0, totalPages: 1, page: 1 });
  const [currentPage, setCurrentPage] = useState(1);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");

  // Loading
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Category Modal & Management Hub
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryModalType, setCategoryModalType] = useState<"add" | "edit">("add");
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState("");
  
  // Dedicated Category Management Modal
  const [showManageCategoriesModal, setShowManageCategoriesModal] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [categorySearchQuery, setCategorySearchQuery] = useState("");

  // Item Modal & Form
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemModalType, setItemModalType] = useState<"add" | "edit">("add");
  const [activeItemId, setActiveItemId] = useState<number | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<"basic" | "stock" | "variants" | "addons">("basic");

  // Comprehensive Form State
  const [itemFormData, setItemFormData] = useState<any>({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    isVeg: false,
    costPrice: "",
    stockMode: "dont_track", // 'dont_track' | 'item_stock' | 'recipe_bom'
    stockQty: "999",
    lowStockAlert: "5",
    hasVariants: false,
    allowSpice: true,
    isAvailable: true,
    imageFile: null,
    imageUrl: "",
    // Variants: [{ name: 'Half', price: '224', isDefault: false, recipes: [] }]
    variants: [],
    // Addons: [{ name: 'Extra Cheese', price: '30', recipes: [] }]
    addons: [],
    // Base Recipes: [{ inventoryId: '', qtyRequired: '', unit: 'g' }]
    recipes: []
  });

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const [confirmModal, setConfirmModal] = useState<any>({
    show: false,
    title: "",
    message: "",
    confirmText: "Delete",
    onConfirm: null
  });

  const BACKEND_URL = getBackendUrl();

  const triggerToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {}
    }

    fetchCategories();
    fetchRawMaterials();

    const socket = io(getSocketUrl(), {
      transports: ["polling"],
      upgrade: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000
    });

    socket.on("connect_error", () => {});

    socket.on("connect", () => {
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

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setCurrentPage(1);
      fetchMenuItems(1, searchQuery, selectedCategoryFilter);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Fetch Categories
  const fetchCategories = async (isSilent = false) => {
    if (!isSilent) setLoadingCategories(true);
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/menu/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data || []);
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      if (!isSilent) setLoadingCategories(false);
    }
  };

  // Fetch Raw Materials for Recipe Linking
  const fetchRawMaterials = async () => {
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/inventory?limit=200`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setRawMaterials(json.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch raw materials:", e);
    }
  };

  // Fetch Menu Items
  const fetchMenuItems = async (page = 1, search = "", catFilter = "All", isSilent = false) => {
    if (!isSilent) setLoadingItems(true);
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/menu/menu-items?page=${page}&limit=50&search=${encodeURIComponent(
          search
        )}&category=${encodeURIComponent(catFilter)}`,
        {
          headers: { Authorization: `Bearer ${token}` }
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
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: categoryNameInput.trim() })
        });
        if (!res.ok) throw new Error("Failed to create category.");
        triggerToast("Category created successfully!", "success");
      } else {
        const res = await fetch(`${BACKEND_URL}/api/menu/categories/${activeCategoryId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: categoryNameInput.trim() })
        });
        if (!res.ok) throw new Error("Failed to update category.");
        triggerToast("Category updated successfully!", "success");
      }
      setShowCategoryModal(false);
      setCategoryNameInput("");
      fetchCategories();
    } catch (e: any) {
      triggerToast(e.message || "Failed to save category", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Inline Category Update in Management Modal
  const handleUpdateCategoryInline = async (catId: number) => {
    if (!editingCategoryName.trim()) {
      triggerToast("Category name cannot be empty.", "error");
      return;
    }
    const token = localStorage.getItem("authToken");
    setActionLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/menu/categories/${catId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editingCategoryName.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update category.");
      triggerToast("Category updated successfully!", "success");
      setEditingCategoryId(null);
      fetchCategories();
    } catch (e: any) {
      triggerToast(e.message || "Failed to update category.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Category Deletion
  const handleDeleteCategory = async (cat: any) => {
    if ((cat.itemCount || 0) > 0) {
      triggerToast(`Cannot delete "${cat.name}" because it contains ${cat.itemCount} dishes. Remove or reassign them first.`, "error");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
      return;
    }

    const token = localStorage.getItem("authToken");
    setActionLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/menu/categories/${cat.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete category.");
      triggerToast("Category deleted successfully!", "success");
      fetchCategories();
    } catch (e: any) {
      triggerToast(e.message || "Failed to delete category.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Category Creation from Hub
  const handleCreateCategoryFromHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryInput.trim()) {
      triggerToast("Please enter a category name.", "error");
      return;
    }
    const token = localStorage.getItem("authToken");
    setActionLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/menu/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newCategoryInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create category.");
      triggerToast("Category added successfully!", "success");
      setNewCategoryInput("");
      fetchCategories();
    } catch (e: any) {
      triggerToast(e.message || "Failed to create category.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Open Add Item Modal
  const handleOpenAddItem = () => {
    setItemModalType("add");
    setActiveItemId(null);
    setActiveModalTab("basic");
    setItemFormData({
      name: "",
      description: "",
      price: "",
      categoryId: categories[0]?.id?.toString() || "",
      isVeg: false,
      costPrice: "",
      stockMode: "dont_track",
      stockQty: "999",
      lowStockAlert: "5",
      hasVariants: false,
      allowSpice: true,
      isAvailable: true,
      imageFile: null,
      imageUrl: "",
      variants: [],
      addons: [],
      recipes: []
    });
    setShowItemModal(true);
  };

  // Open Edit Item Modal
  const handleOpenEditItem = (item: any) => {
    setItemModalType("edit");
    setActiveItemId(item.id);
    setActiveModalTab("basic");
    setItemFormData({
      name: item.name || "",
      description: item.description || "",
      price: item.price?.toString() || "",
      categoryId: item.categoryId?.toString() || "",
      isVeg: !!item.isVeg,
      costPrice: item.costPrice?.toString() || "",
      stockMode: item.stockMode || "dont_track",
      stockQty: item.stockQty?.toString() || "999",
      lowStockAlert: item.lowStockAlert?.toString() || "5",
      hasVariants: !!item.hasVariants,
      allowSpice: item.allowSpice !== undefined ? !!item.allowSpice : true,
      isAvailable: !!item.isAvailable,
      imageFile: null,
      imageUrl: item.imageUrl || "",
      variants: Array.isArray(item.variants)
        ? item.variants.map((v: any) => ({
            name: v.name,
            price: v.price?.toString(),
            isDefault: !!v.isDefault,
            recipes: Array.isArray(v.recipes)
              ? v.recipes.map((r: any) => ({
                  inventoryId: r.inventoryId?.toString(),
                  qtyRequired: r.qtyRequired?.toString(),
                  unit: r.unit || "g"
                }))
              : []
          }))
        : [],
      addons: Array.isArray(item.addons)
        ? item.addons.map((a: any) => ({
            name: a.name,
            price: a.price?.toString(),
            recipes: Array.isArray(a.recipes)
              ? a.recipes.map((r: any) => ({
                  inventoryId: r.inventoryId?.toString(),
                  qtyRequired: r.qtyRequired?.toString(),
                  unit: r.unit || "g"
                }))
              : []
          }))
        : [],
      recipes: Array.isArray(item.recipes)
        ? item.recipes.map((r: any) => ({
            inventoryId: r.inventoryId?.toString(),
            qtyRequired: r.qtyRequired?.toString(),
            unit: r.unit || "g"
          }))
        : []
    });
    setShowItemModal(true);
  };

  // Save Menu Item
  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemFormData.name.trim() || !itemFormData.price || !itemFormData.categoryId) {
      triggerToast("Name, price, and category are required fields.", "error");
      return;
    }

    const token = localStorage.getItem("authToken");
    setActionLoading(true);

    try {
      const payload = {
        name: itemFormData.name.trim(),
        description: itemFormData.description.trim(),
        price: parseFloat(itemFormData.price),
        categoryId: parseInt(itemFormData.categoryId),
        isVeg: !!itemFormData.isVeg,
        costPrice: parseFloat(itemFormData.costPrice) || 0,
        stockMode: itemFormData.stockMode,
        stockQty: parseInt(itemFormData.stockQty) || 999,
        lowStockAlert: parseInt(itemFormData.lowStockAlert) || 5,
        hasVariants: !!itemFormData.hasVariants,
        allowSpice: !!itemFormData.allowSpice,
        isAvailable: !!itemFormData.isAvailable,
        imageUrl: itemFormData.imageUrl || null,
        variants: itemFormData.hasVariants ? itemFormData.variants : [],
        addons: itemFormData.addons,
        recipes: itemFormData.stockMode === "recipe_bom" ? itemFormData.recipes : []
      };

      const url =
        itemModalType === "add"
          ? `${BACKEND_URL}/api/menu/menu-items`
          : `${BACKEND_URL}/api/menu/menu-items/${activeItemId}`;

      const method = itemModalType === "add" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save menu item.");

      triggerToast(
        itemModalType === "add" ? "Menu item added successfully!" : "Menu item updated successfully!",
        "success"
      );
      setShowItemModal(false);
      fetchMenuItems(currentPage, searchQuery, selectedCategoryFilter);
    } catch (err: any) {
      triggerToast(err.message || "Failed to save item", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Helper: Add variant row
  const addVariantRow = () => {
    setItemFormData({
      ...itemFormData,
      variants: [
        ...itemFormData.variants,
        { name: "", price: itemFormData.price || "0", isDefault: itemFormData.variants.length === 0, recipes: [] }
      ]
    });
  };

  // Helper: Add addon row
  const addAddonRow = () => {
    setItemFormData({
      ...itemFormData,
      addons: [...itemFormData.addons, { name: "", price: "20", recipes: [] }]
    });
  };

  // Helper: Add base recipe row
  const addBaseRecipeRow = () => {
    setItemFormData({
      ...itemFormData,
      recipes: [
        ...itemFormData.recipes,
        { inventoryId: rawMaterials[0]?.id?.toString() || "", qtyRequired: "100", unit: "g" }
      ]
    });
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] p-4 lg:p-6 text-slate-800 font-sans">
      
      {/* TOP HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-100 text-[#ff5722]">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Smart Menu & Recipe Manager</h1>
              <p className="text-xs text-slate-500 font-medium">Portion variants, BOM recipe linking, stock strategies & addons</p>
            </div>
          </div>
        </div>

        {/* TOP ACTION BUTTONS */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setShowManageCategoriesModal(true);
              setEditingCategoryId(null);
            }}
            className="px-3.5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-[#ff5722] text-xs font-black flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <Layers className="w-4 h-4 text-[#ff5722]" />
            <span>Manage Categories ({categories.length})</span>
          </button>

          <button
            onClick={() => {
              setCategoryModalType("add");
              setCategoryNameInput("");
              setShowCategoryModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#ff5722]" />
            <span>+ Category</span>
          </button>

          <button
            onClick={handleOpenAddItem}
            className="px-4 py-2 rounded-xl bg-[#ff5722] hover:bg-[#e64a19] text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Dish / Item</span>
          </button>
        </div>
      </div>

      {/* CATEGORY CHIPS BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-3 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          <button
            onClick={() => { setSelectedCategoryFilter("All"); setCurrentPage(1); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer ${
              selectedCategoryFilter === "All"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Categories ({menuItems.length})
          </button>

          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`group flex items-center rounded-xl text-xs font-black whitespace-nowrap transition ${
                selectedCategoryFilter === cat.name
                  ? "bg-[#ff5722] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <button
                onClick={() => { setSelectedCategoryFilter(cat.name); setCurrentPage(1); }}
                className="px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
              >
                <span>{cat.name}</span>
                <span className="text-[10px] opacity-75 font-bold">({cat.itemCount || 0})</span>
              </button>
              
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingCategoryId(cat.id);
                  setEditingCategoryName(cat.name);
                  setShowManageCategoriesModal(true);
                }}
                className={`pr-2.5 py-1.5 opacity-60 hover:opacity-100 transition cursor-pointer ${
                  selectedCategoryFilter === cat.name ? "text-white" : "text-slate-400 hover:text-slate-900"
                }`}
                title="Edit Category"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          ))}

          <button
            onClick={() => setShowManageCategoriesModal(true)}
            className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#ff5722] text-xs font-black whitespace-nowrap flex items-center gap-1 border border-dashed border-orange-300 transition cursor-pointer"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Manage All ({categories.length})</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND GRID */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search dish by name or price..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>

        <div className="text-xs font-bold text-slate-500">
          Showing <span className="font-black text-slate-900">{menuItems.length}</span> dishes
        </div>
      </div>

      {/* MENU ITEMS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loadingItems ? (
          <div className="col-span-full py-16 text-center text-slate-400 font-bold">
            Syncing catalog...
          </div>
        ) : menuItems.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 font-bold">
            No dishes found. Click "+ Add Dish / Item" to create one.
          </div>
        ) : (
          menuItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition flex flex-col justify-between overflow-hidden p-4 group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.isVeg ? "bg-emerald-500" : "bg-rose-500"}`} />
                    <span className="text-[10px] font-black uppercase text-slate-400">
                      {item.category?.name || "Dish"}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      item.stockMode === "dont_track"
                        ? "bg-slate-100 text-slate-600"
                        : item.stockMode === "item_stock"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-orange-100 text-orange-800"
                    }`}
                  >
                    {item.stockMode === "dont_track"
                      ? "No Stock"
                      : item.stockMode === "item_stock"
                      ? `Stock: ${item.stockQty}`
                      : "BOM Recipe"}
                  </span>
                </div>

                <h3 className="text-sm font-black text-slate-900 line-clamp-1">{item.name}</h3>
                {item.description && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{item.description}</p>
                )}

                {/* Variants & Addons Chips */}
                <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                  {item.variants && item.variants.length > 0 ? (
                    <span className="text-[10px] bg-slate-100 text-slate-700 font-black px-2 py-0.5 rounded-md">
                      {item.variants.length} Portions
                    </span>
                  ) : null}

                  {item.addons && item.addons.length > 0 ? (
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 font-black px-2 py-0.5 rounded-md">
                      +{item.addons.length} Addons
                    </span>
                  ) : null}

                  {item.recipes && item.recipes.length > 0 ? (
                    <span className="text-[10px] bg-purple-50 text-purple-800 font-black px-2 py-0.5 rounded-md">
                      {item.recipes.length} Ingredients
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Base Price</span>
                  <span className="text-base font-black text-slate-900">₹{Number(item.price).toFixed(2)}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditItem(item)}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    title="Edit Dish & Recipe"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: ADD / EDIT SMART MENU ITEM (4-TAB SYSTEM) */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
            
            {/* MODAL HEADER */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-2">
                {itemModalType === "add" ? (
                  <Sparkles className="w-5 h-5 text-[#ff5722]" />
                ) : (
                  <Edit2 className="w-5 h-5 text-blue-600" />
                )}
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {itemModalType === "add" ? "Add New Dish / Menu Item" : "Edit Dish & Recipe BOM"}
                  </h3>
                  <p className="text-[11px] text-slate-500">Configure portions, addons, recipes & stock policy</p>
                </div>
              </div>

              <button
                onClick={() => setShowItemModal(false)}
                className="p-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 4 TABS NAVIGATION */}
            <div className="flex items-center border-b border-slate-200 bg-slate-100/70 p-1 shrink-0 gap-1 text-xs font-black">
              <button
                type="button"
                onClick={() => setActiveModalTab("basic")}
                className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
                  activeModalTab === "basic" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                1. Basic Info
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab("stock")}
                className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
                  activeModalTab === "stock" ? "bg-white text-[#ff5722] shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                2. Stock & Recipe
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab("variants")}
                className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
                  activeModalTab === "variants" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                3. Portions ({itemFormData.variants?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => setActiveModalTab("addons")}
                className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
                  activeModalTab === "addons" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                4. Add-ons ({itemFormData.addons?.length || 0})
              </button>
            </div>

            {/* MODAL BODY (SCROLLABLE) */}
            <form onSubmit={handleSaveMenuItem} className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {/* TAB 1: BASIC INFO */}
              {activeModalTab === "basic" && (
                <div className="space-y-3.5">
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-600">Dish Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Highway Chicken Tikka Masala"
                      value={itemFormData.name}
                      onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-black uppercase text-slate-600">Category *</label>
                      <select
                        required
                        value={itemFormData.categoryId}
                        onChange={(e) => setItemFormData({ ...itemFormData, categoryId: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-black uppercase text-slate-600">Base Selling Price (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="e.g. 320"
                        value={itemFormData.price}
                        onChange={(e) => setItemFormData({ ...itemFormData, price: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-black uppercase text-slate-600">Food Type</label>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => setItemFormData({ ...itemFormData, isVeg: true })}
                          className={`flex-1 py-2 rounded-xl text-xs font-black border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                            itemFormData.isVeg ? "bg-emerald-50 border-emerald-300 text-emerald-800" : "bg-slate-50 text-slate-600"
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] text-white" />
                          <span>Veg</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setItemFormData({ ...itemFormData, isVeg: false })}
                          className={`flex-1 py-2 rounded-xl text-xs font-black border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                            !itemFormData.isVeg ? "bg-rose-50 border-rose-300 text-rose-800" : "bg-slate-50 text-slate-600"
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex items-center justify-center text-[8px] text-white" />
                          <span>Non-Veg</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-black uppercase text-slate-600">Estimated Cost Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 110"
                        value={itemFormData.costPrice}
                        onChange={(e) => setItemFormData({ ...itemFormData, costPrice: e.target.value })}
                        className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-600">Description (Optional)</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Tender chicken simmered in rich buttery tomato gravy..."
                      value={itemFormData.description}
                      onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: STOCK TRACKING & RECIPE BOM */}
              {activeModalTab === "stock" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-700 block mb-2">
                      Select Stock Tracking Strategy:
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      {/* Option 1 */}
                      <button
                        type="button"
                        onClick={() => setItemFormData({ ...itemFormData, stockMode: "dont_track" })}
                        className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                          itemFormData.stockMode === "dont_track"
                            ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-xs font-black block">1. Don't Track Stock</span>
                        <span className="text-[10px] opacity-75 mt-0.5 block">
                          Always available in POS. No deduction (Water, Roti, etc.)
                        </span>
                      </button>

                      {/* Option 2 */}
                      <button
                        type="button"
                        onClick={() => setItemFormData({ ...itemFormData, stockMode: "item_stock" })}
                        className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                          itemFormData.stockMode === "item_stock"
                            ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-xs font-black block">2. Finished Item Stock</span>
                        <span className="text-[10px] opacity-75 mt-0.5 block">
                          Track direct unit count (Burgers, Drink Cans)
                        </span>
                      </button>

                      {/* Option 3 */}
                      <button
                        type="button"
                        onClick={() => setItemFormData({ ...itemFormData, stockMode: "recipe_bom" })}
                        className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                          itemFormData.stockMode === "recipe_bom"
                            ? "bg-[#ff5722] border-[#ff5722] text-white shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-xs font-black block">3. Recipe / BOM Stock</span>
                        <span className="text-[10px] opacity-75 mt-0.5 block">
                          Deducts raw kitchen materials automatically
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* If Item Stock */}
                  {itemFormData.stockMode === "item_stock" && (
                    <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black uppercase text-blue-900">Current Finished Units</label>
                          <input
                            type="number"
                            value={itemFormData.stockQty}
                            onChange={(e) => setItemFormData({ ...itemFormData, stockQty: e.target.value })}
                            className="w-full mt-1 px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-xs font-black"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-blue-900">Low Stock Alert Threshold</label>
                          <input
                            type="number"
                            value={itemFormData.lowStockAlert}
                            onChange={(e) => setItemFormData({ ...itemFormData, lowStockAlert: e.target.value })}
                            className="w-full mt-1 px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-xs font-black"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* If Recipe BOM */}
                  {itemFormData.stockMode === "recipe_bom" && (
                    <div className="p-3.5 bg-orange-50/50 rounded-2xl border border-orange-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-black text-orange-950">
                          <Scale className="w-4 h-4 text-[#ff5722]" />
                          <span>Base Recipe Ingredients (BOM):</span>
                        </div>
                        <button
                          type="button"
                          onClick={addBaseRecipeRow}
                          className="px-2.5 py-1 rounded-lg bg-[#ff5722] hover:bg-[#e64a19] text-white text-[11px] font-black flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Add Raw Material</span>
                        </button>
                      </div>

                      {itemFormData.recipes.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic py-2">
                          No ingredients added yet. Click "+ Add Raw Material" to link chicken, curd, oil, etc.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {itemFormData.recipes.map((r: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-orange-100">
                              <select
                                value={r.inventoryId}
                                onChange={(e) => {
                                  const updated = [...itemFormData.recipes];
                                  updated[idx].inventoryId = e.target.value;
                                  setItemFormData({ ...itemFormData, recipes: updated });
                                }}
                                className="flex-1 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                              >
                                {rawMaterials.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.itemName} ({m.baseUnit})
                                  </option>
                                ))}
                              </select>

                              <input
                                type="number"
                                step="0.001"
                                placeholder="Qty"
                                value={r.qtyRequired}
                                onChange={(e) => {
                                  const updated = [...itemFormData.recipes];
                                  updated[idx].qtyRequired = e.target.value;
                                  setItemFormData({ ...itemFormData, recipes: updated });
                                }}
                                className="w-20 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black"
                              />

                              <select
                                value={r.unit}
                                onChange={(e) => {
                                  const updated = [...itemFormData.recipes];
                                  updated[idx].unit = e.target.value;
                                  setItemFormData({ ...itemFormData, recipes: updated });
                                }}
                                className="w-16 px-1.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                              >
                                <option value="g">g</option>
                                <option value="kg">kg</option>
                                <option value="ml">ml</option>
                                <option value="ltr">ltr</option>
                                <option value="pcs">pcs</option>
                              </select>

                              <button
                                type="button"
                                onClick={() => {
                                  const updated = itemFormData.recipes.filter((_: any, i: number) => i !== idx);
                                  setItemFormData({ ...itemFormData, recipes: updated });
                                }}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PORTIONS & VARIANTS */}
              {activeModalTab === "variants" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <div>
                      <span className="text-xs font-black text-slate-800 block">Has Portion Variants?</span>
                      <span className="text-[11px] text-slate-500">e.g. Regular, Half, Full, Large</span>
                    </div>

                    <input
                      type="checkbox"
                      checked={itemFormData.hasVariants}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setItemFormData({
                          ...itemFormData,
                          hasVariants: checked,
                          variants:
                            checked && itemFormData.variants.length === 0
                              ? [
                                  { name: "Regular", price: itemFormData.price || "0", isDefault: true, recipes: [] },
                                  { name: "Half", price: ((parseFloat(itemFormData.price) || 0) * 0.7).toFixed(0), isDefault: false, recipes: [] },
                                  { name: "Full", price: ((parseFloat(itemFormData.price) || 0) * 1.5).toFixed(0), isDefault: false, recipes: [] }
                                ]
                              : itemFormData.variants
                        });
                      }}
                      className="w-5 h-5 accent-[#ff5722] cursor-pointer"
                    />
                  </div>

                  {itemFormData.hasVariants && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase text-slate-600">Configured Portions</span>
                        <button
                          type="button"
                          onClick={addVariantRow}
                          className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-orange-400" />
                          <span>+ Add Portion</span>
                        </button>
                      </div>

                      {itemFormData.variants.map((v: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <input
                            type="text"
                            placeholder="Portion name (e.g. Half)"
                            value={v.name}
                            onChange={(e) => {
                              const updated = [...itemFormData.variants];
                              updated[idx].name = e.target.value;
                              setItemFormData({ ...itemFormData, variants: updated });
                            }}
                            className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                          />

                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-500">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Price"
                              value={v.price}
                              onChange={(e) => {
                                const updated = [...itemFormData.variants];
                                updated[idx].price = e.target.value;
                                setItemFormData({ ...itemFormData, variants: updated });
                              }}
                              className="w-24 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const updated = itemFormData.variants.filter((_: any, i: number) => i !== idx);
                              setItemFormData({ ...itemFormData, variants: updated });
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: ADDONS & MODIFIERS */}
              {activeModalTab === "addons" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <div>
                      <span className="text-xs font-black text-slate-800 block">Spice Level Selector</span>
                      <span className="text-[11px] text-slate-500">Allow Mild, Normal, Spicy, Extra Hot in POS</span>
                    </div>

                    <input
                      type="checkbox"
                      checked={itemFormData.allowSpice}
                      onChange={(e) => setItemFormData({ ...itemFormData, allowSpice: e.target.checked })}
                      className="w-5 h-5 accent-[#ff5722] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black uppercase text-slate-600">Extra Add-ons</span>
                      <button
                        type="button"
                        onClick={addAddonRow}
                        className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-orange-400" />
                        <span>+ Add Add-on</span>
                      </button>
                    </div>

                    {itemFormData.addons.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic py-2">
                        No addons configured yet. Click "+ Add Add-on" to create Extra Cheese, Extra Sauce, etc.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {itemFormData.addons.map((a: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            <input
                              type="text"
                              placeholder="Addon name (e.g. Extra Cheese)"
                              value={a.name}
                              onChange={(e) => {
                                const updated = [...itemFormData.addons];
                                updated[idx].name = e.target.value;
                                setItemFormData({ ...itemFormData, addons: updated });
                              }}
                              className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                            />

                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-slate-500">+₹</span>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Extra Price"
                                value={a.price}
                                onChange={(e) => {
                                  const updated = [...itemFormData.addons];
                                  updated[idx].price = e.target.value;
                                  setItemFormData({ ...itemFormData, addons: updated });
                                }}
                                className="w-24 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-black"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const updated = itemFormData.addons.filter((_: any, i: number) => i !== idx);
                                setItemFormData({ ...itemFormData, addons: updated });
                              }}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MODAL BOTTOM BUTTONS */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-[#ff5722] hover:bg-[#e64a19] text-white text-xs font-black transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{actionLoading ? "Saving..." : "Save Dish & Recipes"}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: CATEGORY ADD/EDIT */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100">
            <h3 className="text-base font-black text-slate-900 mb-1">
              {categoryModalType === "add" ? "Create Food Category" : "Edit Category"}
            </h3>
            <p className="text-xs text-slate-500 mb-4">Categories organize dishes in POS & QR menu</p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-black uppercase text-slate-600">Category Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Biryani & Rice, Royal Curries"
                  value={categoryNameInput}
                  onChange={(e) => setCategoryNameInput(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#ff5722] focus:ring-2 focus:ring-orange-500/10"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCategory}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-[#ff5722] hover:bg-[#e64a19] text-white text-xs font-black transition shadow-xs cursor-pointer"
                >
                  {actionLoading ? "Saving..." : "Save Category"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE MODAL: CATEGORY MANAGEMENT HUB */}
      {showManageCategoriesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-2xl border border-slate-100 max-h-[88vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-orange-100 text-[#ff5722]">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Manage Menu Categories</h3>
                    <p className="text-xs text-slate-500 font-medium">Create, rename, reorder & delete food categories</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowManageCategoriesModal(false);
                  setEditingCategoryId(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Create Bar */}
            <form onSubmit={handleCreateCategoryFromHub} className="py-4 shrink-0">
              <label className="text-[11px] font-black uppercase text-slate-600 mb-1.5 block">Add New Category</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Category Name (e.g. Sizzlers, Mocktails, Desserts)..."
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#ff5722] focus:ring-2 focus:ring-orange-500/10"
                />
                <button
                  type="submit"
                  disabled={actionLoading || !newCategoryInput.trim()}
                  className="px-5 py-2.5 bg-[#ff5722] hover:bg-[#e64a19] disabled:opacity-50 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Category</span>
                </button>
              </div>
            </form>

            {/* Search Categories */}
            <div className="mb-3 shrink-0 relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter categories..."
                value={categorySearchQuery}
                onChange={(e) => setCategorySearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none"
              />
            </div>

            {/* Categories Scrollable List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-0">
              {categories.filter(c => c.name.toLowerCase().includes(categorySearchQuery.toLowerCase())).length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-medium">
                  No matching categories found. Type a name above to create one.
                </div>
              ) : (
                categories
                  .filter(c => c.name.toLowerCase().includes(categorySearchQuery.toLowerCase()))
                  .map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 transition"
                    >
                      {editingCategoryId === cat.id ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <input
                            type="text"
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            className="flex-1 px-3 py-1.5 bg-white border-2 border-[#ff5722] rounded-xl text-xs font-black focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateCategoryInline(cat.id)}
                            disabled={actionLoading}
                            className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                            title="Save Changes"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategoryId(null)}
                            className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-orange-100 text-[#ff5722] flex items-center justify-center font-black text-xs">
                              {cat.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-900">{cat.name}</p>
                              <p className="text-[10px] text-slate-500 font-bold">
                                {cat.itemCount || 0} active {cat.itemCount === 1 ? "dish" : "dishes"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCategoryFilter(cat.name);
                                setCurrentPage(1);
                                setShowManageCategoriesModal(false);
                              }}
                              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-bold transition cursor-pointer"
                            >
                              Filter Dishes
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategoryId(cat.id);
                                setEditingCategoryName(cat.name);
                              }}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-xl transition cursor-pointer"
                              title="Edit Category Name"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat)}
                              disabled={actionLoading}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition cursor-pointer disabled:opacity-40"
                              title={cat.itemCount > 0 ? "Cannot delete category with active dishes" : "Delete Category"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-[11px] font-bold text-slate-500">
                Total: <strong className="text-slate-900">{categories.length}</strong> categories
              </span>
              <button
                type="button"
                onClick={() => setShowManageCategoriesModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition cursor-pointer"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-black text-white flex items-center gap-2 animate-fade-in ${
            toast.type === "success"
              ? "bg-emerald-600"
              : toast.type === "error"
              ? "bg-rose-600"
              : "bg-slate-900"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{toast.msg}</span>
        </div>
      )}

    </div>
  );
}
