import { useState, useEffect, useCallback } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard,
  Warehouse,
  Package,
  FileText,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Tags,
  DollarSign,
  Menu,
  ArrowDownUp,
} from "lucide-react";
import api from "@/lib/api";

const navItems = [
  { path: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { path: "/warehouses", label: "المحلات", icon: Warehouse },
  { path: "/categories", label: "الأصناف", icon: Tags },
  { path: "/products", label: "القطع والمنتجات", icon: Package },
  { path: "/invoices", label: "الفواتير", icon: FileText },
  { path: "/distributors", label: "الموزعون والتجار", icon: Users },
];

export default function Layout() {
  const [exchangeRate, setExchangeRate] = useState(14500);
  const [editRate, setEditRate] = useState("");
  const [editingRate, setEditingRate] = useState(false);

  const [percentage, set_percentage] = useState(0);
  const [percentage_direction, set_percentage_direction] = useState("increase");
  const [selected_category, set_selected_category] = useState("all");
  const [edit_percentage, set_edit_percentage] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);

  const [categories, setCategories] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await api.get("/settings");
      if (data.exchange_rate) setExchangeRate(data.exchange_rate);
      if (data.price_percentage_change !== undefined)
        set_percentage(data.price_percentage_change);
    } catch (err) {
      if (err.response?.status === 401) return;
    }
  }, [navigate]);

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await api.get("/categories");
      setCategories(data);
    } catch (err) {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchCategories();
  }, [fetchSettings, fetchCategories]);

  const saveRate = async () => {
    const rate = parseFloat(editRate);
    if (isNaN(rate) || rate <= 0) return;
    try {
      await api.put("/settings", { exchange_rate: rate });
      setExchangeRate(rate);
      setEditingRate(false);
    } catch (err) {
      /* ignore */
    }
  };

  const save_percentage = async () => {
    const the_percentage = parseFloat(percentage);
    if (isNaN(the_percentage) || the_percentage <= 0) return;
    setApplyLoading(true);
    try {
      await api.put("/settings", {
        price_percentage_change: the_percentage,
        price_percentage_direction: percentage_direction,
        price_percentage_category: selected_category, // "all" أو category_id
      });
      set_edit_percentage(false);
    } catch (err) {
      /* ignore */
    }
    setApplyLoading(false);
  };

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b border-brand_1">
        {!collapsed && (
          <h2 className="text-xl font-bold text-brand_1 font-['Tajawal']">
            قدها وقدود
          </h2>
        )}
      </div>
      <nav className="flex-1 p-3 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              data-testid={`nav-${item.path.replace("/", "") || "dashboard"}`}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium ${
                active ? "bg-brand_1 text-white" : "text-brand_1 hover:bg-white"
              }`}
            >
              <Icon className="w-6 h-6 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="flex min-h-screen bg-white" dir="rtl">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-white border-l border-brand_1 min-h-screen ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-3 border-t border-brand_1 flex items-center justify-center text-brand_1 hover:bg-white"
        >
          {collapsed ? (
            <ChevronLeft className="w-6 h-6" />
          ) : (
            <ChevronRight className="w-6 h-6" />
          )}
        </button>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed right-0 top-0 bottom-0 w-72 bg-white border-l border-brand_1 flex flex-col z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="bg-white border-b border-white px-5 md:px-8 py-4 flex items-center justify-between no-print">
          <div className="flex items-center gap-4 flex-wrap">
            <button
              data-testid="mobile-menu-btn"
              className="md:hidden p-3 rounded-lg text-brand_1 hover:bg-white"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* سعر الصرف */}
            <div className="flex items-center gap-3 bg-white border border-brand_1 rounded-lg px-4 py-2">
              <DollarSign className="w-5 h-5 text-brand_1" />
              <span className="text-base text-brand_1 font-medium">
                سعر الصرف:
              </span>
              {editingRate ? (
                <div className="flex items-center gap-2">
                  <Input
                    data-testid="exchange-rate-input"
                    type="text"
                    value={editRate}
                    onChange={(e) => setEditRate(e.target.value)}
                    className="w-28 h-9 text-base border-brand_1"
                    onKeyDown={(e) => e.key === "Enter" && saveRate()}
                  />
                  <button
                    onClick={saveRate}
                    className="text-sm bg-brand_1 text-white px-3 py-1.5 rounded-lg"
                  >
                    حفظ
                  </button>
                  <button
                    onClick={() => setEditingRate(false)}
                    className="text-sm text-brand_1 px-3 py-1.5"
                  >
                    إلغاء
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditRate(exchangeRate.toString());
                    setEditingRate(true);
                  }}
                  className="text-base font-bold text-brand_1 hover:text-brand_1"
                >
                  {exchangeRate.toLocaleString("en")} ل.س / $1
                </button>
              )}
            </div>

            {/* تغيير النسبة المئوية */}
            <div className="flex items-center gap-3 bg-white border border-brand_1 rounded-lg px-4 py-2">
              <ArrowDownUp className="w-5 h-5 text-brand_1" />
              <span className="text-base text-brand_1 font-medium">
                تغيير نسبة الأسعار:
              </span>
              {edit_percentage ? (
                <div className="flex items-center gap-3 flex-wrap">
                  {/* اختيار الصنف */}
                  <select
                    value={selected_category}
                    onChange={(e) => set_selected_category(e.target.value)}
                    className="h-9 text-base border border-brand_1 rounded-lg px-2 bg-white"
                  >
                    {console.log(categories)}
                    <option value="all">كل الأصناف</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>

                  {/* الاتجاه */}
                  <select
                    value={percentage_direction}
                    onChange={(e) => set_percentage_direction(e.target.value)}
                    className="h-9 text-base border border-brand_1 rounded-lg px-2 bg-white"
                  >
                    <option value="increase">زيادة ↑</option>
                    <option value="decrease">نقصان ↓</option>
                  </select>

                  {/* النسبة */}
                  <Input
                    type="text"
                    value={percentage}
                    onChange={(e) => set_percentage(e.target.value)}
                    className="w-24 h-9 text-base border-brand_1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="%"
                    onKeyDown={(e) => e.key === "Enter" && save_percentage()}
                  />

                  <button
                    onClick={save_percentage}
                    disabled={applyLoading}
                    className="text-sm bg-brand_1 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {applyLoading ? "..." : "حفظ"}
                  </button>
                  <button
                    onClick={() => set_edit_percentage(false)}
                    className="text-sm text-brand_1 px-3 py-1.5"
                  >
                    إلغاء
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => set_edit_percentage(true)}
                  className="text-base font-bold text-brand_1 hover:text-brand_1"
                >
                  {percentage > 0
                    ? `${percentage}% ${percentage_direction === "increase" ? "↑" : "↓"}`
                    : "تحديد النسبة"}
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 md:p-8">
          <Outlet context={{ exchangeRate }} />
        </main>
      </div>
    </div>
  );
}
