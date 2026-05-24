import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FileText,
  Plus,
  Printer,
  Trash2,
  CalendarIcon,
  Eye,
  Check,
  X,
  RefreshCw,
  Upload,
  Pen,
  Search,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import api from "@/lib/api";

// ─── Constants ───────────────────────────────────────────────────────────
const STORAGE_KEY = "invoices_cache";
const PENDING_KEY = "invoices_pending_ops";
const GROUPS_KEY = "invoices_open_groups";
const ROW_HEIGHT = 64;
const OVERSCAN = 10;
const MONTHS_AR = [
  "كانون الثاني",
  "شباط",
  "آذار",
  "نيسان",
  "أيار",
  "حزيران",
  "تموز",
  "آب",
  "أيلول",
  "تشرين الأول",
  "تشرين الثاني",
  "كانون الأول",
];

// ─── LocalStorage Helpers ────────────────────────────────────────────────
function loadOpenGroups() {
  try {
    return JSON.parse(localStorage.getItem(GROUPS_KEY)) || {};
  } catch {
    return {};
  }
}
function saveOpenGroups(state) {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(state));
}

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}
function saveCache(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadPending() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY)) || [];
  } catch {
    return [];
  }
}
function savePending(ops) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(ops));
}

// ─── Helpers ─────────────────────────────────────────────────────────────
const priceTypeLabel = { retail: "مفرق", wholesale: "جملة", bulletin: "نشرة" };

const formatPrice = (val) => {
  const num = parseFloat(val) || 0;
  if ((num * 1000) % 10 !== 0) return num.toFixed(3);
  return num.toFixed(2);
};

// ─── Sub-Components ───────────────────────────────────────────────────────
const InvoiceRow = memo(
  ({ inv, formatSYP, openView, openEdit, handleDelete, style }) => (
    <div
      style={style}
      className="border-b border-brand_1 hover:bg-white/50 flex items-center bg-white"
    >
      <div className="grid grid-cols-[1.2fr_1.5fr_1fr_0.8fr_1.2fr_1.2fr_1fr_1.2fr_1.5fr] w-full items-center text-right px-2 sm:px-4">
        <div className="p-2 sm:p-4 text-brand_1 font-medium text-sm sm:text-base truncate">
          {inv.invoice_number}
        </div>
        <div className="p-2 sm:p-4 text-brand_1 text-sm sm:text-base truncate">
          {inv.customer_name || "—"}
        </div>
        <div className="p-2 sm:p-4">
          <span className="text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full bg-white text-brand_1 border border-brand_1/20">
            {priceTypeLabel[inv.price_type] || "مفرق"}
          </span>
        </div>
        <div className="p-2 sm:p-4 text-brand_1 text-sm sm:text-base text-center">
          {(inv.items || []).length}
        </div>
        <div className="p-2 sm:p-4 text-brand_1 font-medium text-sm sm:text-base">
          ${formatPrice(inv.total_usd)}
        </div>
        <div className="p-2 sm:p-4 text-brand_1 text-xs sm:text-sm truncate">
          {formatSYP(inv.total_usd)}
        </div>
        <div className="p-2 sm:p-4">
          <span
            className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${
              inv.status === "completed"
                ? "bg-white text-brand_1 border border-brand_1/20"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {inv.status === "completed" ? "واصل" : "غير واصل"}
          </span>
        </div>
        <div className="p-2 sm:p-4 text-brand_1 text-xs sm:text-sm">
          {new Date(inv.created_at).toLocaleDateString("ar-SY")}
        </div>
        <div className="p-2 sm:p-4">
          <div className="flex items-center gap-1 sm:gap-2 justify-center">
            <button
              data-testid={`view-invoice-${inv.id}`}
              onClick={() => openView(inv)}
              className="p-1.5 sm:p-2 rounded-lg text-brand_1 hover:bg-white"
            >
              <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => openEdit(inv)}
              className="p-1.5 sm:p-2 rounded-lg text-brand_1 hover:bg-white"
            >
              <Pen className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => handleDelete(inv.id)}
              className="p-1.5 sm:p-2 rounded-lg text-red-500 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  ),
);

const MonthGroup = memo(
  ({
    month,
    invs,
    mKey,
    isMOpen,
    toggleGroup,
    formatSYP,
    openView,
    openEdit,
    handleDelete,
    MONTHS_AR,
  }) => {
    const [scrollTop, setScrollTop] = useState(0);
    const VISIBLE_HEIGHT = Math.min(invs.length * ROW_HEIGHT, 400);

    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN,
    );
    const endIndex = Math.min(
      invs.length - 1,
      Math.floor((scrollTop + VISIBLE_HEIGHT) / ROW_HEIGHT) + OVERSCAN,
    );

    const visibleRows = useMemo(() => {
      const items = [];
      for (let i = startIndex; i <= endIndex; i++) {
        if (invs[i]) {
          items.push(
            <InvoiceRow
              key={invs[i].id}
              inv={invs[i]}
              formatSYP={formatSYP}
              openView={openView}
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
    }, [
      invs,
      startIndex,
      endIndex,
      formatSYP,
      openView,
      openEdit,
      handleDelete,
    ]);

    return (
      <div className="border-b border-brand_1/30 last:border-b-0">
        <button
          onClick={() => toggleGroup(mKey)}
          className="w-full flex items-center justify-between px-3 sm:px-6 py-3 text-brand_1/70 hover:bg-white/50"
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isMOpen ? "rotate-180" : ""}`}
            />
            {MONTHS_AR[parseInt(month)]}
          </div>
          <span className="text-xs bg-brand_1/5 text-brand_1/60 px-2 py-0.5 rounded-full">
            {invs.length}
          </span>
        </button>

        {isMOpen && (
          <div>
            {/* هيدر الجدول — مخفي على الموبايل */}
            <div className="hidden sm:grid bg-white/50 border-y border-brand_1/20 grid-cols-[1.2fr_1.5fr_1fr_0.8fr_1.2fr_1.2fr_1fr_1.2fr_1.5fr] px-4 py-2 text-xs font-semibold text-brand_1/60">
              <div>رقم الفاتورة</div>
              <div>المشتري</div>
              <div>التسعيرة</div>
              <div className="text-center">العناصر</div>
              <div>$ المجموع</div>
              <div>ل.س المجموع</div>
              <div>الحالة</div>
              <div>التاريخ</div>
              <div className="text-center">إجراءات</div>
            </div>
            {/* هيدر مبسط للموبايل */}
            <div className="grid sm:hidden bg-white/50 border-y border-brand_1/20 grid-cols-[1.2fr_1.5fr_1fr_0.8fr_1.2fr_1.2fr_1fr_1.2fr_1.5fr] px-2 py-2 text-xs font-semibold text-brand_1/60">
              <div>رقم</div>
              <div>المشتري</div>
              <div>نوع</div>
              <div className="text-center">ع</div>
              <div>$</div>
              <div>ل.س</div>
              <div>حالة</div>
              <div>تاريخ</div>
              <div className="text-center">⚙</div>
            </div>
            <div
              onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
              className="relative overflow-y-auto overflow-x-auto"
              style={{ height: VISIBLE_HEIGHT }}
            >
              <div
                style={{
                  height: invs.length * ROW_HEIGHT,
                  position: "relative",
                }}
              >
                {visibleRows}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

// ─── Main Component ───────────────────────────────────────────────────────
export default function InvoicesPage() {
  const { exchangeRate } = useOutletContext();

  // ── State ──
  const [invoices, setInvoices] = useState(() => loadCache()?.invoices || []);
  const [products, setProducts] = useState(() => loadCache()?.products || []);
  const [categories, setCategories] = useState(
    () => loadCache()?.categories || [],
  );
  const [pendingOps, setPendingOps] = useState(loadPending);

  const [syncing, setSyncing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [printWithHeader, setPrintWithHeader] = useState(true);
  const [printCurrency, setPrintCurrency] = useState("usd");
  const [searchQuery, setSearchQuery] = useState("");
  const [openGroups, setOpenGroups] = useState(loadOpenGroups);
  const printRef = useRef();

  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    items: [],
    discount: 0,
    notes: "",
    status: "draft",
    price_type: "retail",
  });
  const [editing, setEditing] = useState(null);
  const [searchProduct, setSearchProduct] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [itemQty, setItemQty] = useState(1);

  // ── عند أول تشغيل: جلب من السيرفر إذا الكاش فاضي ──
  useEffect(() => {
    if (invoices.length === 0) syncFromServer();
  }, []);

  // ── جلب البيانات من السيرفر وتحديث الكاش (بدون تأثير على pending) ──
  const syncFromServer = useCallback(async () => {
    try {
      const [iRes, pRes, cRes] = await Promise.all([
        api.get("/invoices"),
        api.get("/products"),
        api.get("/categories"),
      ]);
      const fresh = {
        invoices: iRes.data,
        products: pRes.data,
        categories: cRes.data,
      };
      setInvoices(fresh.invoices);
      setProducts(fresh.products);
      setCategories(fresh.categories);
      saveCache(fresh);
    } catch (err) {
      console.error("تعذّر جلب البيانات من السيرفر", err);
    }
  }, []);

  // ── إضافة عملية للقائمة المعلقة ──
  const pushOp = useCallback((op) => {
    setPendingOps((prev) => {
      const next = [...prev, op];
      savePending(next);
      return next;
    });
  }, []);

  // ── تثبيت: تنفيذ كل العمليات المعلقة ثم sync ──
  const syncOffline = async () => {
    if (!pendingOps.length) return;
    setSyncing(true);
    const failed = [];

    for (const op of pendingOps) {
      try {
        if (op.type === "create") {
          await api.post("/invoices", op.payload);
        } else if (op.type === "update") {
          await api.put(`/invoices/${op.id}`, op.payload);
        } else if (op.type === "delete") {
          await api.delete(`/invoices/${op.id}`);
        }
      } catch {
        failed.push(op);
      }
    }

    setPendingOps(failed);
    savePending(failed);
    setSyncing(false);

    // بعد التثبيت: جلب البيانات الحديثة من السيرفر
    await syncFromServer();
  };

  // ── Toggle groups ──
  const toggleGroup = useCallback((key) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveOpenGroups(next);
      return next;
    });
  }, []);

  // ── فتح ديالوج الإنشاء ──
  const openCreate = () => {
    setEditing(null);
    setForm({
      customer_name: "",
      customer_phone: "",
      items: [],
      discount: 0,
      notes: "",
      status: "draft",
      price_type: "retail",
    });
    setSearchProduct("");
    setFilterCategory("all");
    setSelectedProduct(null);
    setItemQty(1);
    setDialogOpen(true);
  };

  // ── فتح ديالوج التعديل ──
  const openEdit = useCallback((inv) => {
    setEditing(inv);
    setForm({
      customer_name: inv.customer_name || "",
      customer_phone: inv.customer_phone || "",
      items: inv.items || [],
      discount: inv.discount || 0,
      notes: inv.notes || "",
      status: inv.status || "draft",
      price_type: inv.price_type || "retail",
    });
    setSearchProduct("");
    setFilterCategory("all");
    setSelectedProduct(null);
    setItemQty(1);
    setDialogOpen(true);
  }, []);

  // ── السعر حسب نوع التسعيرة ──
  const getPriceByType = (product, type) => {
    if (type === "wholesale")
      return product.wholesale_price_usd || product.price_usd || 0;
    if (type === "bulletin")
      return product.bulletin_price_usd || product.price_usd || 0;
    return product.price_usd || 0;
  };

  const changePriceType = (newType) => {
    const updatedItems = form.items.map((item) => {
      const product = products.find((p) => p.id === item.product_id);
      if (!product) return item;
      const newPrice = getPriceByType(product, newType);
      return {
        ...item,
        price_usd: newPrice,
        total_usd: newPrice * item.quantity,
      };
    });
    setForm({ ...form, price_type: newType, items: updatedItems });
  };

  // ── إضافة منتج للفاتورة ──
  const addItem = () => {
    if (!selectedProduct || itemQty <= 0) return;
    const qty = parseFloat(itemQty);
    const price = getPriceByType(selectedProduct, form.price_type);
    const item = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      category_id: selectedProduct.category_id || "",
      quantity: qty,
      price_usd: price,
      total_usd: price * qty,
      unit: selectedProduct.unit || "",
    };
    const idx = form.items.findIndex(
      (i) => i.product_id === selectedProduct.id,
    );
    if (idx >= 0) {
      const updated = [...form.items];
      updated[idx].quantity += qty;
      updated[idx].total_usd = updated[idx].price_usd * updated[idx].quantity;
      setForm({ ...form, items: updated });
    } else {
      setForm({ ...form, items: [...form.items, item] });
    }
    setSelectedProduct(null);
    setSearchProduct("");
    setItemQty(1);
  };

  const removeItem = (idx) =>
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  const handleFocus = (e) => e.target.select();

  const updateItemQty = (idx, val) => {
    const updated = [...form.items];
    updated[idx].quantity = val;
    updated[idx].total_usd = updated[idx].price_usd * (parseFloat(val) || 0);
    setForm({ ...form, items: updated });
  };

  const updateItemPrice = (idx, val) => {
    const price = parseFloat(val);
    if (isNaN(price) || price < 0) return;
    const updated = [...form.items];
    updated[idx].price_usd = price;
    updated[idx].total_usd = price * updated[idx].quantity;
    setForm({ ...form, items: updated });
  };

  const subtotal = form.items.reduce((s, i) => s + i.total_usd, 0);
  const total = subtotal - (parseFloat(form.discount) || 0);

  // ── تحديث كميات المنتجات محلياً ──
  const updateLocalProductQuantities = useCallback(
    (oldItems = [], newItems = []) => {
      setProducts((prev) => {
        const updated = prev.map((p) => {
          const oldQty =
            parseFloat(oldItems.find((i) => i.product_id === p.id)?.quantity) ||
            0;
          const newQty =
            parseFloat(newItems.find((i) => i.product_id === p.id)?.quantity) ||
            0;
          const diff = newQty - oldQty;
          if (diff === 0) return p;
          return { ...p, quantity: (parseFloat(p.quantity) || 0) - diff };
        });
        const cached = loadCache();
        saveCache({ ...cached, products: updated });
        return updated;
      });
    },
    [],
  );

  // ── حفظ الفاتورة (إنشاء أو تعديل) — كلو محلي + pending ──
  const handleSubmit = useCallback(
    async (status = form.status) => {
      const ts = Date.now();
      const newItems = form.items.map((item) => ({
        ...item,
        quantity: parseFloat(item.quantity) || 0,
      }));
      const total_usd =
        newItems.reduce((s, i) => s + i.total_usd, 0) -
        (parseFloat(form.discount) || 0);

      const isNew = !editing;
      const offlineId = `offline_${ts}`;
      const invId = editing?.id || offlineId;
      const isOfflineId = String(invId).startsWith("offline_");

      const inv = {
        ...form,
        discount: parseFloat(form.discount) || 0,
        status,
        items: newItems,
        id: invId,
        invoice_number: editing?.invoice_number || String(ts),
        created_at: editing?.created_at || new Date().toISOString(),
        total_usd,
        exchange_rate: exchangeRate,
      };

      // 1. تحديث الكميات محلياً
      updateLocalProductQuantities(editing?.items || [], newItems);

      // 2. تحديث قائمة الفواتير المحلية
      setInvoices((prev) => {
        const next = isNew
          ? [inv, ...prev]
          : prev.map((o) => (o.id === editing.id ? inv : o));
        saveCache({ ...loadCache(), invoices: next });
        return next;
      });

      // 3. إضافة العملية للـ pending
      const { id, invoice_number, created_at, exchange_rate, ...payload } = inv;
      if (isNew) {
        pushOp({ type: "create", payload });
      } else if (!isOfflineId) {
        // فاتورة موجودة على السيرفر → update
        pushOp({ type: "update", id: editing.id, payload });
      }
      // إذا كان offline_id → الـ create op موجود أصلاً بالـ pending، فقط عدّله
      else {
        setPendingOps((prev) => {
          const next = prev.map((op) =>
            op.type === "create" &&
            op.payload.invoice_number === editing.invoice_number
              ? { ...op, payload }
              : op,
          );
          savePending(next);
          return next;
        });
      }

      setDialogOpen(false);
    },
    [form, editing, exchangeRate, updateLocalProductQuantities, pushOp],
  );

  // ── حذف فاتورة — كلو محلي + pending ──
  const handleDelete = useCallback(
    async (id) => {
      if (!window.confirm("هل أنت متأكد من حذف هذه الفاتورة؟")) return;

      const isOffline = String(id).startsWith("offline_");

      // حذف محلي
      setInvoices((prev) => {
        const next = prev.filter((i) => i.id !== id);
        saveCache({ ...loadCache(), invoices: next });
        return next;
      });

      if (isOffline) {
        // فاتورة لم تُرفع للسيرفر → احذف الـ create op من الـ pending
        setPendingOps((prev) => {
          const next = prev.filter(
            (op) =>
              !(
                op.type === "create" &&
                op.payload.invoice_number === id.replace("offline_", "")
              ),
          );
          savePending(next);
          return next;
        });
      } else {
        // فاتورة موجودة على السيرفر → أضف delete op
        pushOp({ type: "delete", id });
      }
    },
    [pushOp],
  );

  // ── عرض الفاتورة ──
  const openView = useCallback((inv) => {
    setViewInvoice(inv);
    setViewDialogOpen(true);
  }, []);

  // ── طباعة ──
  const handlePrint = async () => {
    const content = printRef.current;
    if (!content) return;
    if (typeof window !== "undefined" && window.electronAPI?.printInvoice) {
      try {
        await window.electronAPI.printInvoice(content.innerHTML, {
          withHeader: printWithHeader,
          currency: printCurrency,
        });
      } catch (err) {
        alert("فشلت الطباعة: " + (err.message || "خطأ غير معروف"));
      }
      return;
    }
    alert("وضع الطباعة غير متوفر. يرجى استخدام نسخة التطبيق.");
  };

  const handleQuantityChange = (val, callback) => {
    if (/^[0-9]*\.?[0-9]*$/.test(val) || val === "") callback(val);
  };

  const filteredProducts = useMemo(() => {
    const normalize = (str) =>
      (str || "")
        .replace(/[أإآٱ]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي")
        .toLowerCase();

    const q = normalize(searchProduct.trim());

    if (!q)
      return products.filter(
        (p) => filterCategory === "all" || p.category_id === filterCategory,
      );

    return products.filter((p) => {
      const matchSearch =
        normalize(p.name).includes(q) || normalize(p.code || "").includes(q);
      const matchCat =
        filterCategory === "all" || p.category_id === filterCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchProduct, filterCategory]);

  const formatSYP = useCallback(
    (usd) =>
      `${((usd || 0) * exchangeRate).toLocaleString("en-US", { maximumFractionDigits: 0 })} ل.س`,
    [exchangeRate],
  );

  // ── بحث وتصفية الفواتير ──
  const matchInvoice = useCallback((inv, q) => {
    if (!q) return true;
    const lq = q.toLowerCase();
    if ((inv.invoice_number || "").includes(q)) return true;
    if ((inv.customer_name || "").toLowerCase().includes(lq)) return true;
    if ((inv.notes || "").toLowerCase().includes(lq)) return true;
    if (
      (inv.items || []).some((i) =>
        (i.product_name || "").toLowerCase().includes(lq),
      )
    )
      return true;
    return false;
  }, []);

  const groupedInvoices = useMemo(() => {
    const q = searchQuery.trim();
    const filtered = invoices.filter((inv) => {
      if (!matchInvoice(inv, q)) return false;
      if (filterStatus !== "all" && inv.status !== filterStatus) return false;
      if (dateFrom || dateTo) {
        const d = new Date(inv.created_at);
        if (dateFrom && d < dateFrom) return false;
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59);
          if (d > end) return false;
        }
      }
      return true;
    });
    const byYear = {};
    filtered.forEach((inv) => {
      const d = new Date(inv.created_at);
      const y = d.getFullYear();
      const m = d.getMonth();
      if (!byYear[y]) byYear[y] = {};
      if (!byYear[y][m]) byYear[y][m] = [];
      byYear[y][m].push(inv);
    });
    return byYear;
  }, [invoices, searchQuery, matchInvoice, filterStatus, dateFrom, dateTo]);

  return (
    <div className="space-y-4 sm:space-y-8" data-testid="invoices-page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand_1 font-['Tajawal']">
          الفواتير
        </h1>
        <div className="flex items-center gap-2 sm:gap-3">
          {pendingOps.length > 0 && (
            <button
              onClick={syncOffline}
              disabled={syncing}
              className="flex items-center gap-1.5 sm:gap-2 bg-orange-500 text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium hover:bg-orange-600 disabled:opacity-50"
            >
              {syncing ? (
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
              تثبيت ({pendingOps.length})
            </button>
          )}
          <button
            data-testid="new-invoice-btn"
            onClick={openCreate}
            className="flex items-center gap-1.5 sm:gap-2 bg-brand_1 text-white px-3 sm:px-5 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> فاتورة جديدة
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 bg-white border border-brand_1 rounded-lg p-3 sm:p-4">
        <Popover>
          <PopoverTrigger asChild>
            <button
              data-testid="date-from-picker"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 border border-brand_1 rounded-lg bg-white text-sm sm:text-base text-brand_1"
            >
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              {dateFrom ? format(dateFrom, "yyyy/MM/dd") : "من تاريخ"}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
              locale={ar}
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <button
              data-testid="date-to-picker"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 border border-brand_1 rounded-lg bg-white text-sm sm:text-base text-brand_1"
            >
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              {dateTo ? format(dateTo, "yyyy/MM/dd") : "إلى تاريخ"}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              locale={ar}
            />
          </PopoverContent>
        </Popover>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger
            data-testid="filter-invoice-status"
            className="w-[150px] sm:w-[180px] border-brand_1 bg-white text-sm sm:text-base h-10 sm:h-11"
          >
            <SelectValue placeholder="كل الحالات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="draft">غير واصل</SelectItem>
            <SelectItem value="completed">واصل</SelectItem>
          </SelectContent>
        </Select>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => {
              setDateFrom(null);
              setDateTo(null);
            }}
            className="text-xs sm:text-sm text-red-600 px-2 sm:px-3 py-2 hover:bg-red-50 rounded-lg"
          >
            مسح التاريخ
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 sm:gap-3 bg-white border border-brand_1 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3">
        <Search className="w-4 h-4 sm:w-5 sm:h-5 text-brand_1/60 flex-shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث بالاسم، رقم الفاتورة، منتج، أو ملاحظة..."
          className="flex-1 bg-transparent outline-none text-brand_1 text-sm sm:text-base placeholder:text-brand_1/40"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-brand_1/40 hover:text-brand_1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grouped Table */}
      <div className="overflow-x-auto">
        {Object.keys(groupedInvoices)
          .sort((a, b) => b - a)
          .map((year) => (
            <div key={year}>
              <div className="px-3 sm:px-6 py-2 text-brand_1/50 text-xs sm:text-sm font-semibold bg-brand_1/5">
                {year}
              </div>
              {Object.keys(groupedInvoices[year])
                .sort((a, b) => b - a)
                .map((month) => {
                  const mKey = `ym_${year}_${month}`;
                  return (
                    <MonthGroup
                      key={mKey}
                      month={month}
                      invs={groupedInvoices[year][month]}
                      mKey={mKey}
                      isMOpen={openGroups[mKey] !== false}
                      toggleGroup={toggleGroup}
                      formatSYP={formatSYP}
                      openView={openView}
                      openEdit={openEdit}
                      handleDelete={handleDelete}
                      MONTHS_AR={MONTHS_AR}
                    />
                  );
                })}
            </div>
          ))}
      </div>

      {/* Dialog إنشاء/تعديل */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="text-brand_1 font-['Tajawal'] text-lg sm:text-xl">
              {editing
                ? `تعديل الفاتورة ${editing.invoice_number}`
                : "فاتورة جديدة"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-6 py-4 sm:py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className="text-sm sm:text-base text-brand_1 mb-2 block">
                  اسم المشتري
                </label>
                <Input
                  value={form.customer_name}
                  onChange={(e) =>
                    setForm({ ...form, customer_name: e.target.value })
                  }
                  className="border-brand_1 text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
              <div>
                <label className="text-sm sm:text-base text-brand_1 mb-2 block">
                  هاتف المشتري
                </label>
                <Input
                  value={form.customer_phone}
                  onChange={(e) =>
                    setForm({ ...form, customer_phone: e.target.value })
                  }
                  className="border-brand_1 text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-white border border-brand_1 rounded-lg p-3 sm:p-4">
              <span className="text-sm sm:text-base text-brand_1 font-medium ml-2">
                نوع التسعيرة:
              </span>
              {[
                { value: "retail", label: "مفرق" },
                { value: "wholesale", label: "جملة" },
                { value: "bulletin", label: "نشرة" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => changePriceType(opt.value)}
                  className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-all ${form.price_type === opt.value ? "bg-brand_1 text-white" : "bg-white border border-brand_1 text-brand_1"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="bg-white border border-brand_1 rounded-lg p-3 sm:p-4 space-y-3">
              <label className="text-sm sm:text-base text-brand_1 font-medium block">
                إضافة منتج
              </label>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <Select
                  value={filterCategory}
                  onValueChange={(v) => {
                    setFilterCategory(v);
                    setSelectedProduct(null);
                    setSearchProduct("");
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[170px] border-brand_1 bg-white h-10 sm:h-11 text-sm sm:text-base">
                    <SelectValue placeholder="كل الأصناف" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الأصناف</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex-1 min-w-[180px] sm:min-w-[220px] relative">
                  <Input
                    placeholder="ابحث عن المنتج..."
                    value={searchProduct}
                    onChange={(e) => {
                      setSearchProduct(e.target.value);
                      setSelectedProduct(null);
                    }}
                    className="border-brand_1 bg-white h-10 sm:h-11 text-sm sm:text-base"
                  />
                  {searchProduct &&
                    !selectedProduct &&
                    filteredProducts.length > 0 && (
                      <div className="absolute top-full right-0 left-0 z-50 mt-1 bg-white border border-brand_1 rounded-lg max-h-48 overflow-y-auto shadow-md">
                        {filteredProducts.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setSelectedProduct(p);
                              setSearchProduct(p.name);
                            }}
                            className="w-full text-right px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-white text-sm sm:text-base text-brand_1 border-b border-brand_1 flex justify-between"
                          >
                            <span>{p.name}</span>
                            <span className="text-brand_1 text-xs sm:text-sm">
                              ${formatPrice(getPriceByType(p, form.price_type))}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                </div>

                <Input
                  type="text"
                  value={itemQty}
                  onChange={(e) => setItemQty(e.target.value)}
                  className="w-20 sm:w-24 border-brand_1 bg-white h-10 sm:h-11 text-sm sm:text-base"
                  placeholder="الكمية"
                />
                <button
                  onClick={addItem}
                  disabled={!selectedProduct}
                  className="bg-brand_1 text-white px-4 sm:px-5 py-2 rounded-lg text-sm sm:text-base disabled:opacity-50 h-10 sm:h-11"
                >
                  إضافة
                </button>
              </div>
            </div>

            {form.items.length > 0 && (
              <div className="border border-brand_1 rounded-lg overflow-x-auto">
                <table className="w-full text-sm sm:text-base text-right min-w-[400px]">
                  <thead>
                    <tr className="bg-white border-b border-brand_1">
                      {["المنتج", "الكمية", "السعر ($)", "المجموع", ""].map(
                        (h, i) => (
                          <th
                            key={i}
                            className="p-2 sm:p-3 font-semibold text-brand_1 text-sm"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-brand_1">
                        <td className="p-2 sm:p-3 text-brand_1 text-sm sm:text-base">
                          {item.product_name}
                          {(() => {
                            const productInStock = products.find(
                              (p) => p.id === item.product_id,
                            );
                            if (
                              productInStock &&
                              item.quantity > productInStock.quantity
                            ) {
                              return (
                                <span className="text-red-500 text-xs mr-2">
                                  (المتوفر: {productInStock.quantity})
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </td>
                        <td className="p-2 sm:p-3">
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={item.quantity}
                            onFocus={handleFocus}
                            onChange={(e) =>
                              handleQuantityChange(e.target.value, (val) =>
                                updateItemQty(idx, val),
                              )
                            }
                            className="w-16 sm:w-24 h-8 sm:h-9 text-sm sm:text-base border-brand_1 text-center font-bold"
                          />
                        </td>
                        <td className="p-2 sm:p-3">
                          <Input
                            type="text"
                            step="0.01"
                            min="0"
                            value={item.price_usd}
                            onChange={(e) =>
                              updateItemPrice(idx, e.target.value)
                            }
                            className="w-20 sm:w-28 h-8 sm:h-9 text-sm sm:text-base border-brand_1"
                          />
                        </td>
                        <td className="p-2 sm:p-3 text-brand_1 font-medium text-sm sm:text-base">
                          ${formatPrice(item.total_usd)}
                        </td>
                        <td className="p-2 sm:p-3">
                          <button
                            onClick={() => removeItem(idx)}
                            className="text-red-500 hover:bg-red-50 p-1.5 sm:p-2 rounded-lg"
                          >
                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className="text-sm sm:text-base text-brand_1 mb-2 block">
                  دفعة ($)
                </label>
                <Input
                  type="text"
                  step="0.01"
                  value={form.discount}
                  onChange={(e) =>
                    setForm({ ...form, discount: e.target.value })
                  }
                  className="border-brand_1 text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
              <div>
                <label className="text-sm sm:text-base text-brand_1 mb-2 block">
                  ملاحظات
                </label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="border-brand_1 text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
            </div>

            <div className="bg-white border border-brand_1 rounded-lg p-4 sm:p-5 flex justify-between items-center">
              <div>
                <p className="text-sm sm:text-base text-brand_1">
                  المجموع الفرعي: <strong>${formatPrice(subtotal)}</strong>
                </p>
                <p className="text-sm sm:text-base text-brand_1">
                  دفعة:{" "}
                  <strong>
                    ${formatPrice(parseFloat(form.discount) || 0)}
                  </strong>
                </p>
              </div>
              <div className="text-left">
                <p className="text-lg sm:text-xl font-bold text-brand_1">
                  ${formatPrice(total)}
                </p>
                <p className="text-sm sm:text-base text-brand_1">
                  {formatSYP(total)}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-wrap gap-2 sm:gap-3 sm:justify-start">
            <button
              onClick={() => handleSubmit("draft")}
              className="border border-brand_1 text-brand_1 px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base hover:bg-white flex-1 sm:flex-none"
            >
              حفظ كغير واصل
            </button>
            <button
              onClick={() => handleSubmit("completed")}
              className="bg-brand_1 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium flex items-center gap-2 flex-1 sm:flex-none justify-center"
            >
              <Check className="w-4 h-4 sm:w-5 sm:h-5" /> إنهاء الفاتورة
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog عرض وطباعة — بدون تغيير لأنه محتوى طباعة */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent
          className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="text-brand_1 font-['Tajawal'] text-lg sm:text-xl">
              فاتورة {viewInvoice?.invoice_number}
            </DialogTitle>
          </DialogHeader>

          {viewInvoice && (
            <>
              <div ref={printRef}>
                {/* محتوى الطباعة — بدون تغيير */}
                {printWithHeader && (
                  <table
                    className="shop-header-table"
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      marginBottom: "0",
                      border: "2px solid #6b4fa0",
                    }}
                  >
                    <tbody>
                      <tr>
                        <td
                          style={{
                            width: "50%",
                            padding: "3px 5px",
                            verticalAlign: "top",
                            borderLeft: "1px solid #6b4fa0",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "22px",
                              fontWeight: "bold",
                              color: "#2c2c2c",
                              fontFamily: "Tahoma, Arial",
                            }}
                          >
                            قدها وقدود
                          </div>
                        </td>
                        <td
                          style={{
                            width: "50%",
                            padding: "3px 5px",
                            verticalAlign: "top",
                            textAlign: "right",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#8c52ff",
                              lineHeight: "1.4",
                            }}
                          >
                            Ditch Paper For Good
                          </div>
                        </td>
                      </tr>
                      <tr style={{ borderTop: "1px solid #6b4fa0" }}>
                        <td
                          style={{
                            padding: "1px 2px",
                            borderLeft: "1px solid #6b4fa0",
                            verticalAlign: "middle",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span
                              style={{
                                background: "#6b4fa0",
                                color: "white",
                                padding: "2px 8px",
                                fontSize: "12px",
                                fontWeight: "bold",
                              }}
                            >
                              نحو التحول الرقمي
                            </span>
                            <span
                              style={{ fontSize: "12px", color: "#2c2c2c" }}
                            >
                              بإدارة : قدها وقدود
                            </span>
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "1px 2px",
                            textAlign: "right",
                            verticalAlign: "middle",
                          }}
                        >
                          <div style={{ fontSize: "12px", color: "#2c2c2c" }}>
                            سوريا - الإمارات
                          </div>
                        </td>
                      </tr>
                      <tr
                        style={{
                          borderTop: "1px solid #6b4fa0",
                          background: "#f9f6ff",
                        }}
                      >
                        <td
                          colSpan="2"
                          style={{ padding: "1px 2px", textAlign: "center" }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-around",
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "13px",
                                fontWeight: "bold",
                                color: "#2c2c2c",
                                letterSpacing: "1px",
                              }}
                            >
                              0937922870
                            </span>
                            <span
                              style={{
                                fontSize: "13px",
                                fontWeight: "bold",
                                color: "#2c2c2c",
                                letterSpacing: "1px",
                              }}
                            >
                              0937922870
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}

                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    border: "1px solid #6b4fa0",
                    borderTop: "none",
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        style={{
                          padding: "1px 2px",
                          fontSize: "13px",
                          borderLeft: "1px solid #ddd",
                          width: "50%",
                        }}
                      >
                        <span style={{ color: "#555" }}>رقم الفاتورة:</span>{" "}
                        <strong>{viewInvoice.invoice_number}</strong>
                      </td>
                      <td
                        style={{
                          padding: "1px 2px",
                          fontSize: "13px",
                          width: "50%",
                          textAlign: "right",
                        }}
                      >
                        <span style={{ color: "#555" }}>التاريخ:</span>{" "}
                        <strong>
                          {new Date(viewInvoice.created_at).toLocaleDateString(
                            "ar-SY",
                          )}
                        </strong>
                      </td>
                    </tr>
                    <tr style={{ borderTop: "1px solid #ddd" }}>
                      <td
                        colSpan="2"
                        style={{ padding: "1px 2px", fontSize: "13px" }}
                      >
                        <span style={{ color: "#555" }}>السيد </span>{" "}
                        <strong>{viewInvoice.customer_name || ""}</strong>{" "}
                        <span style={{ color: "#555" }}>المحترم </span>
                        {viewInvoice.customer_phone && (
                          <span
                            style={{
                              marginRight: "20px",
                              color: "#555",
                              fontSize: "12px",
                            }}
                          >
                            {viewInvoice.customer_phone}
                          </span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    border: "1px solid #6b4fa0",
                    borderTop: "none",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f0ebfa" }}>
                      {["#", "المنتج", "الكمية", "الوحدة"].map((h, i) => (
                        <th
                          key={i}
                          style={{
                            border: "1px solid #bbb",
                            padding: "1px 1.5px",
                            fontSize: "12px",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                      {printCurrency == "usd" && (
                        <th
                          className="usd-only"
                          style={{
                            border: "1px solid #bbb",
                            padding: "1px 1.5px",
                            fontSize: "12px",
                          }}
                        >
                          السعر ($)
                        </th>
                      )}
                      {printCurrency == "usd" && (
                        <th
                          className="usd-only"
                          style={{
                            border: "1px solid #bbb",
                            padding: "1px 1.5px",
                            fontSize: "12px",
                          }}
                        >
                          المجموع ($)
                        </th>
                      )}
                      {printCurrency == "syp" && (
                        <th
                          className="syp-only"
                          style={{
                            border: "1px solid #bbb",
                            padding: "1px 1.5px",
                            fontSize: "12px",
                          }}
                        >
                          السعر (ل.س)
                        </th>
                      )}
                      {printCurrency == "syp" && (
                        <th
                          className="syp-only"
                          style={{
                            border: "1px solid #bbb",
                            padding: "1px 1.5px",
                            fontSize: "12px",
                          }}
                        >
                          المجموع (ل.س)
                        </th>
                      )}
                      <th
                        style={{
                          border: "1px solid #bbb",
                          padding: "1px 1.5px",
                          fontSize: "12px",
                        }}
                      >
                        ملاحظات
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewInvoice.items || []).map((item, i) => {
                      const rate = viewInvoice.exchange_rate || exchangeRate;
                      return (
                        <tr
                          key={i}
                          style={{ borderTop: "1.5px solid #8c52ff" }}
                        >
                          <td
                            style={{
                              border: "1.5px solid #8c52ff",
                              padding: "1px 1.5px",
                              textAlign: "center",
                              fontSize: "12px",
                            }}
                          >
                            {i + 1}
                          </td>
                          <td
                            style={{
                              border: "1.5px solid #8c52ff",
                              padding: "3px 5px",
                              fontSize: "13px",
                            }}
                          >
                            {item.product_name}
                          </td>
                          <td
                            style={{
                              border: "1.5px solid #8c52ff",
                              padding: "1px 1.5px",
                              textAlign: "center",
                              fontSize: "13px",
                            }}
                          >
                            {item.quantity}
                          </td>
                          <td
                            style={{
                              border: "1.5px solid #8c52ff",
                              padding: "1px 1.5px",
                              textAlign: "center",
                              fontSize: "13px",
                            }}
                          >
                            {item.unit}
                          </td>
                          {printCurrency == "usd" && (
                            <td
                              className="usd-only"
                              style={{
                                border: "1.5px solid #8c52ff",
                                padding: "1px 1.5px",
                                textAlign: "center",
                                fontSize: "13px",
                              }}
                            >
                              {formatPrice(item.price_usd)}
                            </td>
                          )}
                          {printCurrency == "usd" && (
                            <td
                              className="usd-only"
                              style={{
                                border: "1.5px solid #8c52ff",
                                padding: "1px 1.5px",
                                textAlign: "center",
                                fontSize: "13px",
                                fontWeight: "bold",
                              }}
                            >
                              {formatPrice(item.total_usd)}
                            </td>
                          )}
                          {printCurrency == "syp" && (
                            <td
                              className="syp-only"
                              style={{
                                border: "1.5px solid #8c52ff",
                                padding: "1px 1.5px",
                                textAlign: "center",
                                fontSize: "13px",
                              }}
                            >
                              {Math.round(
                                (item.price_usd || 0) * rate,
                              ).toLocaleString("en")}
                            </td>
                          )}
                          {printCurrency == "syp" && (
                            <td
                              className="syp-only"
                              style={{
                                border: "1.5px solid #8c52ff",
                                padding: "1px 1.5px",
                                textAlign: "center",
                                fontSize: "13px",
                                fontWeight: "bold",
                              }}
                            >
                              {Math.round(
                                (item.total_usd || 0) * rate,
                              ).toLocaleString("en")}
                            </td>
                          )}
                          <td
                            style={{
                              border: "1.5px solid #8c52ff",
                              padding: "1px 1.5px",
                              textAlign: "center",
                              fontSize: "13px",
                              fontWeight: "bold",
                            }}
                          ></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    border: "1px solid #6b4fa0",
                    borderTop: "none",
                  }}
                >
                  <tbody>
                    {viewInvoice.discount > 0 && (
                      <tr style={{ background: "#f0ebfa" }}>
                        <td
                          style={{
                            padding: "1px 2px",
                            fontSize: "14px",
                            fontWeight: "bold",
                            width: "70%",
                            textAlign: "right",
                            borderTop: "1px solid #6b4fa0",
                          }}
                        >
                          المجموع الكلي
                        </td>
                        <td
                          style={{
                            padding: "1px 2px",
                            fontSize: "15px",
                            fontWeight: "bold",
                            borderTop: "1px solid #6b4fa0",
                            borderRight: "1px solid #6b4fa0",
                            textAlign: "center",
                            color: "#6b4fa0",
                          }}
                        >
                          {printCurrency == "usd" ? (
                            <span className="usd-only">
                              ${" "}
                              {formatPrice(
                                (viewInvoice.total_usd || 0) +
                                  (viewInvoice.discount || 0),
                              )}
                            </span>
                          ) : (
                            <span className="syp-only">
                              {Math.round(
                                ((viewInvoice.total_usd || 0) +
                                  (viewInvoice.discount || 0)) *
                                  (viewInvoice.exchange_rate || exchangeRate),
                              ).toLocaleString("en")}{" "}
                              ل.س
                            </span>
                          )}
                        </td>
                      </tr>
                    )}
                    {viewInvoice.discount > 0 && (
                      <tr>
                        <td
                          style={{
                            padding: "1px 2px",
                            fontSize: "13px",
                            borderTop: "1px solid #ddd",
                            width: "70%",
                            textAlign: "right",
                          }}
                        >
                          دفعة
                        </td>
                        <td
                          style={{
                            padding: "1px 2px",
                            fontSize: "13px",
                            borderTop: "1px solid #ddd",
                            borderRight: "1px solid #ddd",
                            textAlign: "center",
                            fontWeight: "bold",
                          }}
                        >
                          {printCurrency == "syp"
                            ? (
                                viewInvoice.discount * viewInvoice.exchange_rate
                              ).toLocaleString("en")
                            : formatPrice(viewInvoice.discount)}
                        </td>
                      </tr>
                    )}
                    <tr style={{ background: "#f0ebfa" }}>
                      <td
                        style={{
                          padding: "1px 2px",
                          fontSize: "14px",
                          fontWeight: "bold",
                          width: "70%",
                          textAlign: "right",
                          borderTop: "1px solid #6b4fa0",
                        }}
                      >
                        {viewInvoice.discount > 0 ? "المتبقي" : "المجموع الكلي"}
                      </td>
                      <td
                        style={{
                          padding: "1px 2px",
                          fontSize: "15px",
                          fontWeight: "bold",
                          borderTop: "1px solid #6b4fa0",
                          borderRight: "1px solid #6b4fa0",
                          textAlign: "center",
                          color: "#6b4fa0",
                        }}
                      >
                        {printCurrency == "usd" ? (
                          <span className="usd-only">
                            $ {formatPrice(viewInvoice.total_usd)}
                          </span>
                        ) : (
                          <span className="syp-only">
                            {Math.round(
                              (viewInvoice.total_usd || 0) *
                                (viewInvoice.exchange_rate || exchangeRate),
                            ).toLocaleString("en")}{" "}
                            ل.س
                          </span>
                        )}
                      </td>
                    </tr>
                    {viewInvoice.notes && (
                      <tr>
                        <td
                          colSpan="2"
                          style={{
                            padding: "1px 2px",
                            fontSize: "12px",
                            color: "#555",
                            borderTop: "1px solid #ddd",
                          }}
                        >
                          ملاحظات: {viewInvoice.notes}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <DialogFooter className="flex flex-wrap gap-2 sm:gap-3 sm:justify-start no-print">
                <div className="flex items-center gap-2 border border-brand_1 rounded-lg px-3 sm:px-4 py-2">
                  <span className="text-xs sm:text-sm text-brand_1">
                    معلومات المحل
                  </span>
                  <button
                    onClick={() => setPrintWithHeader(true)}
                    className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${printWithHeader ? "bg-brand_1 text-white" : "text-brand_1"}`}
                  >
                    مع
                  </button>
                  <button
                    onClick={() => setPrintWithHeader(false)}
                    className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${!printWithHeader ? "bg-brand_1 text-white" : "text-brand_1"}`}
                  >
                    بدون
                  </button>
                </div>
                <div className="flex items-center gap-2 border border-brand_1 rounded-lg px-3 sm:px-4 py-2">
                  <span className="text-xs sm:text-sm text-brand_1">
                    العملة:
                  </span>
                  <button
                    onClick={() => setPrintCurrency("usd")}
                    className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${printCurrency === "usd" ? "bg-brand_1 text-white" : "text-brand_1"}`}
                  >
                    دولار $
                  </button>
                  <button
                    onClick={() => setPrintCurrency("syp")}
                    className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium ${printCurrency === "syp" ? "bg-brand_1 text-white" : "text-brand_1"}`}
                  >
                    ليرة ل.س
                  </button>
                </div>
                <button
                  onClick={handlePrint}
                  className="bg-brand_1 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium flex items-center gap-2"
                >
                  <Printer className="w-4 h-4 sm:w-5 sm:h-5" /> طباعة
                </button>
                <button
                  onClick={() => setViewDialogOpen(false)}
                  className="border border-brand_1 text-brand_1 px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base hover:bg-white"
                >
                  إغلاق
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
