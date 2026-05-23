"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function OrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableId = searchParams.get("tableId");

  const [selectedTable, setSelectedTable] = useState(null);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");

  const fetchOrderMenuData = async () => {
    const token = localStorage.getItem("authToken");
    if (!token || !tableId) {
      router.push("/waiter");
      return;
    }

    try {
      // 1. Fetch target table details
      const tableRes = await fetch(`${BACKEND_URL}/api/tables`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (tableRes.ok) {
        const tablesData = await tableRes.json();
        const matched = tablesData.find(t => t.id.toString() === tableId);
        if (matched) {
          setSelectedTable(matched);
        } else {
          router.push("/waiter");
          return;
        }
      }

      // 2. Fetch Categories
      const catRes = await fetch(`${BACKEND_URL}/api/menu/categories`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (catRes.ok) {
        const categoriesData = await catRes.json();
        setCategories(categoriesData);
      }

      // 3. Fetch Items
      const itemRes = await fetch(`${BACKEND_URL}/api/menu/menu-items?limit=250`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (itemRes.ok) {
        const json = await itemRes.json();
        setMenuItems(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderMenuData();
  }, [tableId]);

  const addToCart = (item) => {
    const existing = cart.find(i => i.menuItemId === item.id);
    if (existing) {
      setCart(cart.map(i => i.menuItemId === item.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, {
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        qty: 1,
        note: ""
      }]);
    }
  };

  const updateQty = (itemId, amount) => {
    const cartItem = cart.find(i => i.menuItemId === itemId);
    if (!cartItem) return;
    const newQty = cartItem.qty + amount;
    if (newQty <= 0) {
      setCart(cart.filter(i => i.menuItemId !== itemId));
    } else {
      setCart(cart.map(i => i.menuItemId === itemId ? { ...i, qty: newQty } : i));
    }
  };

  const updateItemNote = (itemId, note) => {
    setCart(cart.map(item => 
      item.menuItemId === itemId ? { ...item, note } : item
    ));
  };

  const handleSendKot = async () => {
    if (!cart.length || !selectedTable) return;

    setSubmitting(true);
    const token = localStorage.getItem("authToken");

    const orderPayload = {
      orderType: "dine_in",
      tableId: selectedTable.id,
      items: cart.map(i => ({
        menuItemId: i.menuItemId,
        qty: i.qty,
        note: i.note
      })),
      discount: 0,
      tax: 0,
      paymentStatus: "unpaid",
      trackStock: false
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(orderPayload)
      });

      if (!res.ok) throw new Error("KOT failed.");

      setCart([]);
      setCartDrawerOpen(false);
      router.push("/waiter/kots");

    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMenuItems = Array.isArray(menuItems) ? menuItems.filter(item => {
    const matchesCategory = selectedCategory === "All" || item.category?.name === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 rounded-full border-4 border-[#ff5722] border-t-transparent animate-spin mx-auto" />
          <p className="text-slate-500 text-xs font-black uppercase tracking-wider">Syncing signature menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 animate-fade-in">
      
      {/* Header & Back Button */}
      <div className="flex justify-between items-center bg-white border border-slate-100 p-4 rounded-[2rem] shadow-sm">
        <button
          onClick={() => router.push("/waiter")}
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase text-slate-655 transition"
        >
          ← Back to Seating
        </button>
        <div className="text-right">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Dine-In Customer</span>
          <span className="text-sm font-black text-[#ff5722] block leading-none mt-0.5"> Table {selectedTable?.tableNo}</span>
        </div>
      </div>

      {/* Search and Category filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-xs"></span>
          <input
            type="text"
            placeholder="Search curries, naan, kebab..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="premium-input w-full pl-10 text-xs py-3"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none max-w-full">
          <button
            onClick={() => setSelectedCategory("All")}
            className={`px-4 py-2 border rounded-xl text-[10px] font-black whitespace-nowrap transition duration-205 ${selectedCategory === "All" ? 'bg-slate-900 border-slate-900 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600'}`}
          >
             All
          </button>
          {categories.map((c, i) => (
            <button
              key={i}
              onClick={() => setSelectedCategory(c.name)}
              className={`px-4 py-2 border rounded-xl text-[10px] font-black whitespace-nowrap transition duration-205 ${selectedCategory === c.name ? 'bg-slate-900 border-slate-900 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Dishes Catalog Menu Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-12">
        {filteredMenuItems.length === 0 ? (
          <div className="col-span-2 text-center py-16 bg-white border border-slate-100 rounded-[2.2rem] text-slate-400 font-bold text-xs">
             No matches found. Try another search or filter.
          </div>
        ) : (
          filteredMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => addToCart(item)}
              className="bg-white border border-slate-200 p-4 rounded-[2rem] flex justify-between items-center text-left hover:shadow-lg transition duration-200 active:scale-98 group"
            >
              <div className="space-y-1.5 pr-2">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">{item.category?.name}</span>
                <h4 className="font-extrabold text-slate-900 text-xs leading-tight line-clamp-1 group-hover:text-[#ff5722] transition-colors">{item.name}</h4>
                <p className="text-[11px] font-black text-slate-950">₹{item.price.toFixed(2)}</p>
              </div>
              <span className="w-8 h-8 bg-slate-950 text-white flex items-center justify-center font-black rounded-xl text-xs transition duration-200 group-hover:bg-[#ff5722] group-hover:scale-105">+</span>
            </button>
          ))
        )}
      </div>

      {/* Floating Bottom Drawer */}
      {cart.length > 0 && (
        <div className="fixed bottom-20 inset-x-4 z-[90] max-w-md mx-auto">
          
          {!cartDrawerOpen ? (
            <button
              onClick={() => setCartDrawerOpen(true)}
              className="w-full bg-[#ff5722] hover:bg-[#e04c1c] text-white p-4.5 rounded-[1.8rem] shadow-2xl flex justify-between items-center transition active:scale-98 animate-bounce"
            >
              <div className="flex items-center gap-2">
                <span className="text-base"></span>
                <div className="text-left leading-none">
                  <span className="text-[9px] font-black uppercase tracking-widest block opacity-75">Table {selectedTable?.tableNo} Cart</span>
                  <span className="text-xs font-black block mt-0.5">{cart.reduce((s, i) => s + i.qty, 0)} Items Added</span>
                </div>
              </div>
              <span className="text-xs font-black bg-white/20 px-3.5 py-1.5 rounded-xl border border-white/10">
                View Cart • ₹{cart.reduce((s, i) => s + (i.price * i.qty), 0).toFixed(2)}
              </span>
            </button>
          ) : (
            <div className="bg-white border border-slate-200 rounded-[2.2rem] p-5 shadow-2xl space-y-4 animate-fade-in text-left">
              <div className="flex justify-between items-center border-b border-slate-50 pb-2.5">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <span></span> Table {selectedTable?.tableNo} - Order list
                </h3>
                <button 
                  onClick={() => setCartDrawerOpen(false)}
                  className="text-[9px] font-black uppercase text-slate-400 hover:text-slate-650 bg-slate-50 px-2.5 py-1 rounded-xl"
                >
                  Close 
                </button>
              </div>

              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {cart.map(item => (
                  <div key={item.menuItemId} className="bg-slate-50 border border-slate-100 p-3 rounded-2xl space-y-2">
                    <div className="flex justify-between items-start gap-4">
                      <p className="text-xs font-black text-slate-900 truncate leading-snug">{item.name}</p>
                      <button onClick={() => updateQty(item.menuItemId, -item.qty)} className="text-slate-350 hover:text-rose-500 font-extrabold text-xs"></button>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                      <input
                        type="text"
                        placeholder="Add chef cooking note..."
                        value={item.note}
                        onChange={(e) => updateItemNote(item.menuItemId, e.target.value)}
                        className="text-[9px] bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:border-slate-800 focus:outline-none flex-1 placeholder:text-slate-300 font-bold"
                      />
                      <div className="flex items-center gap-1.5 border border-slate-200 bg-white rounded-lg p-0.5 shadow-inner">
                        <button onClick={() => updateQty(item.menuItemId, -1)} className="w-5.5 h-5.5 bg-slate-50 rounded flex items-center justify-center font-bold text-xs">-</button>
                        <span className="text-[10px] font-black px-1">{item.qty}</span>
                        <button onClick={() => updateQty(item.menuItemId, 1)} className="w-5.5 h-5.5 bg-slate-50 rounded flex items-center justify-center font-bold text-xs">+</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-3.5 border-t border-slate-50">
                <div className="flex justify-between items-center text-xs font-black px-1">
                  <span className="text-slate-400 uppercase tracking-widest text-[9px]">Subtotal</span>
                  <span className="text-base text-slate-900">₹{cart.reduce((s, i) => s + (i.price * i.qty), 0).toFixed(2)}</span>
                </div>

                <button
                  onClick={handleSendKot}
                  disabled={submitting}
                  className="py-4 bg-[#ff5722] hover:bg-[#e04c1c] text-white font-extrabold rounded-2xl text-[10px] tracking-widest uppercase transition disabled:opacity-50 w-full active:scale-95 shadow-lg shadow-orange-500/20"
                >
                  {submitting ? "Sending KOT..." : " Dispatch KOT to Kitchen"}
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}

export default function OrderMenuPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 rounded-full border-4 border-[#ff5722] border-t-transparent animate-spin mx-auto" />
          <p className="text-slate-500 text-xs font-black uppercase tracking-wider">Loading active order module...</p>
        </div>
      </div>
    }>
      <OrderContent />
    </Suspense>
  );
}
