import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Package,
  Warehouse,
  FileText,
  Users,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
} from "lucide-react";
import api from "@/lib/api";

function StatCard({ icon: Icon, label, value, sub, color = "brand_1" }) {
  return (
    <div
      className="bg-white border border-brand_1 rounded-lg p-4 sm:p-5 lg:p-6"
      data-testid={`stat-${label}`}
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <span className="text-sm sm:text-base lg:text-lg text-brand_1 font-medium leading-snug">
          {label}
        </span>
        <div className="w-9 h-9 sm:w-11 sm:h-11 lg:w-14 lg:h-14 rounded-lg flex items-center justify-center bg-white border border-gray-100 shadow-sm flex-shrink-0">
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-brand_1" />
        </div>
      </div>
      <p className="text-lg sm:text-xl lg:text-2xl font-extrabold text-brand_1 truncate">
        {value}
      </p>
      {sub && (
        <p className="text-xs sm:text-sm lg:text-base text-brand_1 mt-1.5 font-medium truncate">
          {sub}
        </p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { exchangeRate } = useOutletContext();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/dashboard/stats")
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12 sm:py-20 text-brand_1 text-base sm:text-xl font-bold">
        جاري التحميل...
      </div>
    );
  }

  if (!stats) return null;

  const formatUSD = (v) =>
    `$${(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatSYP = (v) =>
    `${((v || 0) * exchangeRate).toLocaleString("en-US", { maximumFractionDigits: 0 })} ل.س`;

  return (
    <div
      className="space-y-5 sm:space-y-7 lg:space-y-10 p-3 sm:p-5 lg:p-6"
      data-testid="dashboard-page"
    >
      <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-brand_1 font-['Tajawal'] mb-3 sm:mb-5 lg:mb-8">
        لوحة التحكم
      </h1>

      {/* Stats Grid 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <StatCard
          icon={ShoppingCart}
          label="مبيعات اليوم"
          value={formatUSD(stats.today_sales)}
          sub={formatSYP(stats.today_sales)}
        />
        <StatCard
          icon={FileText}
          label="فواتير اليوم"
          value={stats.today_invoices_count}
        />
        <StatCard
          icon={TrendingUp}
          label="إجمالي المبيعات"
          value={formatUSD(stats.total_sales)}
          sub={formatSYP(stats.total_sales)}
        />
        <StatCard
          icon={DollarSign}
          label="قيمة المخزون"
          value={formatUSD(stats.inventory_value)}
          sub={formatSYP(stats.inventory_value)}
        />
      </div>

      {/* Stats Grid 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <StatCard
          icon={Package}
          label="المنتجات"
          value={stats.total_products}
        />
        <StatCard
          icon={Warehouse}
          label="المحلات"
          value={stats.total_warehouses}
        />
        <StatCard
          icon={Users}
          label="الموزعون"
          value={stats.total_distributors}
        />
        <StatCard
          icon={AlertTriangle}
          label="نقص مخزون"
          value={stats.low_stock_count}
          color="red"
        />
      </div>

      {/* Recent Invoices */}
      {stats.recent_invoices && stats.recent_invoices.length > 0 && (
        <div className="bg-white border border-brand_1 rounded-lg p-3 sm:p-5 lg:p-8 mt-4 sm:mt-6 lg:mt-10">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-brand_1 mb-3 sm:mb-5 lg:mb-8 font-['Tajawal']">
            آخر الفواتير
          </h2>
          <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
            <table
              className="w-full text-xs sm:text-sm lg:text-base text-right border-collapse"
              style={{ minWidth: "520px" }}
              data-testid="recent-invoices-table"
            >
              <thead>
                <tr className="bg-gray-50 border-b-2 border-brand_1">
                  <th className="p-2.5 sm:p-3 lg:p-5 font-bold text-brand_1 whitespace-nowrap">
                    رقم الفاتورة
                  </th>
                  <th className="p-2.5 sm:p-3 lg:p-5 font-bold text-brand_1 whitespace-nowrap">
                    العميل
                  </th>
                  <th className="p-2.5 sm:p-3 lg:p-5 font-bold text-brand_1 whitespace-nowrap">
                    المبلغ ($)
                  </th>
                  <th className="p-2.5 sm:p-3 lg:p-5 font-bold text-brand_1 whitespace-nowrap">
                    المبلغ (ل.س)
                  </th>
                  <th className="p-2.5 sm:p-3 lg:p-5 font-bold text-brand_1 whitespace-nowrap">
                    الحالة
                  </th>
                  <th className="p-2.5 sm:p-3 lg:p-5 font-bold text-brand_1 whitespace-nowrap">
                    التاريخ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recent_invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="p-2.5 sm:p-3 lg:p-5 text-brand_1 font-medium whitespace-nowrap">
                      {inv.invoice_number}
                    </td>
                    <td className="p-2.5 sm:p-3 lg:p-5 text-brand_1 whitespace-nowrap">
                      {inv.customer_name || "—"}
                    </td>
                    <td className="p-2.5 sm:p-3 lg:p-5 text-brand_1 font-semibold whitespace-nowrap">
                      {formatUSD(inv.total_usd)}
                    </td>
                    <td className="p-2.5 sm:p-3 lg:p-5 text-brand_1 whitespace-nowrap">
                      {formatSYP(inv.total_usd)}
                    </td>
                    <td className="p-2.5 sm:p-3 lg:p-5">
                      <span
                        className={`inline-block px-2 py-0.5 sm:px-3 sm:py-1 lg:px-4 lg:py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-sm whitespace-nowrap ${
                          inv.status === "completed"
                            ? "bg-green-50 text-brand_1 border border-brand_1"
                            : inv.status === "draft"
                              ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                              : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {inv.status === "completed"
                          ? "مكتملة"
                          : inv.status === "draft"
                            ? "غير واصل"
                            : "ملغاة"}
                      </span>
                    </td>
                    <td className="p-2.5 sm:p-3 lg:p-5 text-brand_1 text-xs sm:text-sm font-medium whitespace-nowrap">
                      {new Date(inv.created_at).toLocaleDateString("ar-SY")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
