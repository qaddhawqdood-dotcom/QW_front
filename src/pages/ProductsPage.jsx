import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { useOutletContext } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Search,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import api from "@/lib/api";

const PRODUCTS_CACHE_KEY = "products_cache";
// تم زيادة الارتفاع لضمان استيعاب الأسماء الطويلة مع الحفاظ على الـ Virtualization
const ROW_HEIGHT = 120;
const OVERSCAN = 10;

// ─── Helpers ────────────────────────────────────────────────────────────
const loadCache = () => {
  try {
    return JSON.parse(localStorage.getItem(PRODUCTS_CACHE_KEY)) || null;
  } catch {
    return null;
  }
};

const saveCache = (data) => {
  localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(data));
};

const fUSD = (v) => `$${(v || 0).toFixed(3)}`;

const DEFAULT_FORM = {
  name: "",
  warehouse_id: localStorage.getItem("select-product-warehouse") || "",
  category_id: localStorage.getItem("select-product-category") || "",
  price_usd: 0,
  wholesale_price_usd: 0,
  bulletin_price_usd: 0,
  cost_usd: 0,
  quantity: 0,
  unit: "قطعة",
  description: "",
};

// ─── Sub-Components (Memoized for Performance) ───────────────────────────
const PriceCell = memo(({ value, fSYP }) => (
  <div className="p-2 sm:p-4 flex flex-col justify-center overflow-hidden">
    <div className="font-bold text-base sm:text-xl text-brand_1 truncate">
      {fUSD(value)}
    </div>
    <div className="text-sm sm:text-lg text-brand_1/60 truncate mt-0.5 sm:mt-1">
      {fSYP(value)}
    </div>
  </div>
));

const ProductRow = memo(({ product, fSYP, openEdit, handleDelete, style }) => {
  return (
    <div
      style={style}
      className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors flex items-center bg-white"
    >
      {/* لابتوب: جدول عادي */}
      <div className="hidden sm:grid grid-cols-[2fr_1.2fr_1.2fr_1.2fr_1fr_0.8fr_1.2fr] w-full items-center text-right px-4">
        <div className="p-4 text-xl text-brand_1 font-bold break-words line-clamp-3 overflow-hidden leading-tight">
          {product.name}
        </div>
        <PriceCell value={product.bulletin_price_usd} fSYP={fSYP} />
        <PriceCell value={product.wholesale_price_usd} fSYP={fSYP} />
        <PriceCell value={product.price_usd} fSYP={fSYP} />
        <div className="p-4 text-center">
          <span
            className={`text-2xl font-black px-4 py-1 rounded-lg inline-block min-w-[60px] ${product.quantity <= (product.min_quantity || 0) ? "bg-red-100 text-red-600" : "text-brand_1 bg-brand_1/5"}`}
          >
            {product.quantity}
          </span>
        </div>
        <div className="p-4 text-xl text-brand_1 font-medium text-center truncate">
          {product.unit}
        </div>
        <div className="p-4 flex items-center justify-center gap-2">
          <button
            onClick={() => openEdit(product)}
            className="p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
          >
            <Pencil className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleDelete(product.id)}
            className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* موبايل: كارد مضغوط */}
      <div className="flex sm:hidden w-full px-3 py-2 gap-3 items-start">
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-brand_1 break-words leading-tight line-clamp-2">
            {product.name}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            <span className="text-xs text-brand_1/60">
              مبيع:{" "}
              <span className="font-bold text-brand_1">
                {fUSD(product.price_usd)}
              </span>
            </span>
            <span className="text-xs text-brand_1/60">
              جملة:{" "}
              <span className="font-bold text-brand_1">
                {fUSD(product.wholesale_price_usd)}
              </span>
            </span>
            <span className="text-xs text-brand_1/60">
              نشرة:{" "}
              <span className="font-bold text-brand_1">
                {fUSD(product.bulletin_price_usd)}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-sm font-black px-2 py-0.5 rounded ${product.quantity <= (product.min_quantity || 0) ? "bg-red-100 text-red-600" : "text-brand_1 bg-brand_1/5"}`}
            >
              {product.quantity} {product.unit}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button
            onClick={() => openEdit(product)}
            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(product.id)}
            className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

// ─── Main Page ──────────────────────────────────────────────────────────
export default function ProductsPage() {
  const { exchangeRate } = useOutletContext();
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  // ── Stable Formatter ──
  const fSYP = useCallback(
    (v) => `${Math.round((v || 0) * exchangeRate).toLocaleString("en")} ل.س`,
    [exchangeRate],
  );

  // ── Fetch Logic ──
  const fetchAll = useCallback(async () => {
    try {
      const [pRes, wRes, cRes] = await Promise.all([
        api.get("/products"),
        api.get("/warehouses"),
        api.get("/categories"),
      ]);
      const data = {
        products: pRes.data,
        warehouses: wRes.data,
        categories: cRes.data,
      };
      saveCache(data);
      return data;
    } catch (err) {
      const cached = loadCache();
      return cached || { products: [], warehouses: [], categories: [] };
    }
  }, []);

  useEffect(() => {
    const cached = loadCache();
    if (cached) {
      setProducts(cached.products || []);
      setWarehouses(cached.warehouses || []);
      setCategories(cached.categories || []);
      setLoading(false);
    }
    fetchAll().then((data) => {
      setProducts(data.products);
      setWarehouses(data.warehouses);
      setCategories(data.categories);
      setLoading(false);
    });
  }, [fetchAll]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const data = await fetchAll();
    setProducts(data.products);
    setWarehouses(data.warehouses);
    setCategories(data.categories);
    setRefreshing(false);
  }, [fetchAll]);

  // ── Filtered Data ──
  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return products.filter((p) => {
      if (s && !p.name.toLowerCase().includes(s)) return false;
      if (filterWarehouse !== "all" && p.warehouse_id !== filterWarehouse)
        return false;
      if (filterCategory !== "all" && p.category_id !== filterCategory)
        return false;
      if (filterLowStock && p.quantity > (p.min_quantity || 0)) return false;
      return true;
    });
  }, [products, search, filterWarehouse, filterCategory, filterLowStock]);

  // ── Dialog Handlers ──
  const openCreate = () => {
    setEditing(null);
    setForm({
      ...DEFAULT_FORM,
      warehouse_id: localStorage.getItem("select-product-warehouse") || "",
      category_id: localStorage.getItem("select-product-category") || "",
    });
    setDialogOpen(true);
  };

  const openEdit = useCallback((p) => {
    setEditing(p);
    setForm({ ...p });
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (id) => {
      if (!window.confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
      setProducts((prev) => prev.filter((p) => p.id !== id));
      try {
        await api.delete(`/products/${id}`);
        const cached = loadCache();
        if (cached) {
          cached.products = cached.products.filter((p) => p.id !== id);
          saveCache(cached);
        }
      } catch {
        handleRefresh();
      }
    },
    [handleRefresh],
  );

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    const payload = {
      ...form,
      price_usd: parseFloat(form.price_usd) || 0,
      wholesale_price_usd: parseFloat(form.wholesale_price_usd) || 0,
      bulletin_price_usd: parseFloat(form.bulletin_price_usd) || 0,
      cost_usd: parseFloat(form.cost_usd) || 0,
      quantity: parseInt(form.quantity) || 0,
    };
    setDialogOpen(false);
    try {
      if (editing) {
        setProducts((prev) =>
          prev.map((p) => (p.id === editing.id ? { ...p, ...payload } : p)),
        );
        await api.put(`/products/${editing.id}`, payload);
      } else {
        const res = await api.post("/products", payload);
        setProducts((prev) => [res.data, ...prev]);
      }
      handleRefresh();
    } catch {
      handleRefresh();
    }
  };

  // ── Virtualization Calculation ──
  const onScroll = (e) => setScrollTop(e.currentTarget.scrollTop);
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    filtered.length - 1,
    Math.floor((scrollTop + 600) / ROW_HEIGHT) + OVERSCAN,
  );

  const visibleRows = useMemo(() => {
    const items = [];
    for (let i = startIndex; i <= endIndex; i++) {
      if (filtered[i]) {
        items.push(
          <ProductRow
            key={filtered[i].id}
            product={filtered[i]}
            fSYP={fSYP}
            openEdit={openEdit}
            handleDelete={handleDelete}
            style={{
              position: "absolute",
              top: i * ROW_HEIGHT,
              width: "100%",
              height: ROW_HEIGHT,
            }}
          />,
        );
      }
    }
    return items;
  }, [filtered, startIndex, endIndex, fSYP, openEdit, handleDelete]);

  return (
    <div
      className="space-y-4 sm:space-y-8 p-2"
      dir="rtl"
      data-testid="products-page"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
        <h1 className="text-2xl sm:text-4xl font-bold text-brand_1 font-['Tajawal']">
          القطع والمنتجات
        </h1>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 sm:gap-3 border-2 border-brand_1 text-brand_1 bg-white px-3 sm:px-6 py-2 sm:py-3 rounded-xl text-sm sm:text-lg font-bold hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
          >
            <RefreshCw
              className={`w-4 h-4 sm:w-6 sm:h-6 ${refreshing ? "animate-spin" : ""}`}
            />
            تحديث
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 sm:gap-3 bg-brand_1 text-white px-4 sm:px-8 py-2 sm:py-3 rounded-xl text-sm sm:text-lg font-bold hover:opacity-90 transition-all shadow-md"
          >
            <Plus className="w-4 h-4 sm:w-6 sm:h-6" /> إضافة منتج
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-5 bg-white border-2 border-brand_1 rounded-xl p-3 sm:p-5 shadow-sm">
        <div className="flex-1 min-w-[200px] sm:min-w-[280px] relative">
          <Search className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-brand_1/40 w-4 h-4 sm:w-6 sm:h-6" />
          <Input
            placeholder="ابحث عن منتج..."
            className="pr-9 sm:pr-12 h-11 sm:h-14 text-base sm:text-xl border-brand_1/20 focus:border-brand_1 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
          <SelectTrigger className="w-full sm:w-[220px] h-11 sm:h-14 text-sm sm:text-lg border-brand_1/20 rounded-xl">
            <SelectValue placeholder="المحل" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المحلات</SelectItem>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[220px] h-11 sm:h-14 text-sm sm:text-lg border-brand_1/20 rounded-xl">
            <SelectValue placeholder="التصنيف" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل التصنيفات</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          onClick={() => setFilterLowStock(!filterLowStock)}
          className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-6 h-11 sm:h-14 rounded-xl text-sm sm:text-lg font-bold transition-all border-2 ${filterLowStock ? "bg-red-50 border-red-200 text-red-600" : "bg-white border-brand_1/20 text-brand_1/60"}`}
        >
          <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6" />
          نواقص
        </button>
      </div>

      {/* Virtual Table */}
      <div className="bg-white border-2 border-brand_1 rounded-2xl overflow-hidden shadow-sm">
        {/* Header — مخفي على الموبايل */}
        <div className="hidden sm:block bg-brand_1 text-white">
          <div className="grid grid-cols-[2fr_1.2fr_1.2fr_1.2fr_1fr_0.8fr_1.2fr] w-full text-right px-4">
            <div className="p-4 text-xl font-bold">اسم المنتج</div>
            <div className="p-4 text-xl font-bold">سعر النشرة</div>
            <div className="p-4 text-xl font-bold">سعر الجملة</div>
            <div className="p-4 text-xl font-bold">سعر المبيع</div>
            <div className="p-4 text-xl font-bold text-center">الكمية</div>
            <div className="p-4 text-xl font-bold text-center">الوحدة</div>
            <div className="p-4 text-xl font-bold text-center">إجراءات</div>
          </div>
        </div>
        {/* هيدر موبايل مبسط */}
        <div className="flex sm:hidden bg-brand_1 text-white px-3 py-2 text-sm font-bold justify-between">
          <span>المنتج</span>
          <span>الأسعار / الكمية</span>
          <span>إجراءات</span>
        </div>

        {/* Body */}
        <div
          ref={containerRef}
          onScroll={onScroll}
          className="relative overflow-auto"
          style={{ height: "600px" }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full gap-3">
              <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-brand_1 animate-spin" />
              <span className="text-base sm:text-xl font-bold text-brand_1">
                جاري التحميل...
              </span>
            </div>
          ) : (
            <div
              style={{
                height: filtered.length * ROW_HEIGHT,
                position: "relative",
              }}
            >
              {visibleRows}
            </div>
          )}
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl p-4 sm:p-8"
          dir="rtl"
        >
          <DialogHeader className="mb-4 sm:mb-8">
            <DialogTitle className="text-xl sm:text-3xl font-black text-brand_1 flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-brand_1/10 rounded-xl sm:rounded-2xl">
                <Package className="w-5 h-5 sm:w-8 sm:h-8" />
              </div>
              {editing ? "تعديل منتج" : "إضافة منتج جديد"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="text-sm sm:text-lg font-bold text-brand_1 mb-2 block">
                المحل
              </label>
              <Select
                value={form.warehouse_id}
                onValueChange={(v) => {
                  localStorage.setItem("select-product-warehouse", v);
                  setForm({ ...form, warehouse_id: v });
                }}
              >
                <SelectTrigger className="h-11 sm:h-14 text-base sm:text-xl border-2 border-brand_1 rounded-xl">
                  <SelectValue placeholder="اختر المحل" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem
                      className="text-base sm:text-xl text-right"
                      key={w.id}
                      value={w.id}
                    >
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm sm:text-lg font-bold text-brand_1 mb-2 block">
                التصنيف
              </label>
              <Select
                value={form.category_id}
                onValueChange={(v) => {
                  localStorage.setItem("select-product-category", v);
                  setForm({ ...form, category_id: v });
                }}
              >
                <SelectTrigger className="h-11 sm:h-14 text-base sm:text-xl border-2 border-brand_1 rounded-xl">
                  <SelectValue placeholder="اختر التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem
                      className="text-base sm:text-xl text-center"
                      key={c.id}
                      value={c.id}
                    >
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mt-3 sm:mt-0">
            <div className="col-span-1 sm:col-span-2">
              <label className="text-sm sm:text-lg font-bold text-brand_1 mb-2 block">
                اسم المنتج
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-12 sm:h-16 text-xl sm:text-3xl border-2 border-brand_1 rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm sm:text-lg font-bold text-brand_1 mb-2 block">
                سعر النشرة ($)
              </label>
              <Input
                type="text"
                value={form.bulletin_price_usd}
                onChange={(e) =>
                  setForm({ ...form, bulletin_price_usd: e.target.value })
                }
                className="h-11 sm:h-14 text-base sm:text-xl border-2 border-brand_1 rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm sm:text-lg font-bold text-brand_1 mb-2 block">
                سعر الجملة ($)
              </label>
              <Input
                type="text"
                value={form.wholesale_price_usd}
                onChange={(e) =>
                  setForm({ ...form, wholesale_price_usd: e.target.value })
                }
                className="h-11 sm:h-14 text-base sm:text-xl border-2 border-brand_1 rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm sm:text-lg font-bold text-brand_1 mb-2 block">
                سعر المبيع ($)
              </label>
              <Input
                type="text"
                value={form.price_usd}
                onChange={(e) =>
                  setForm({ ...form, price_usd: e.target.value })
                }
                className="h-11 sm:h-14 text-base sm:text-xl border-2 border-brand_1 rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm sm:text-lg font-bold text-brand_1 mb-2 block">
                الكمية
              </label>
              <Input
                type="text"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="h-11 sm:h-14 text-base sm:text-xl border-2 border-brand_1 rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm sm:text-lg font-bold text-brand_1 mb-2 block">
                الوحدة
              </label>
              <Input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="h-11 sm:h-14 text-base sm:text-xl border-2 border-brand_1 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-4 sm:justify-start mt-4 sm:mt-8">
            <button
              onClick={handleSubmit}
              className="bg-brand_1 text-white px-6 sm:px-10 py-3 sm:py-4 rounded-xl text-base sm:text-xl font-black hover:opacity-90 shadow-lg transition-all flex-1 sm:flex-none"
            >
              {editing ? "تعديل" : "حفظ"}
            </button>
            <button
              onClick={() => setDialogOpen(false)}
              className="border-2 border-brand_1 text-brand_1 px-6 sm:px-10 py-3 sm:py-4 rounded-xl text-base sm:text-xl font-bold hover:bg-gray-50 transition-all flex-1 sm:flex-none"
            >
              إلغاء
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
