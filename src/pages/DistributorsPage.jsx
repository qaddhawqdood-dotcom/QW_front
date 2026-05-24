import { useState, useEffect, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Search,
  Phone,
  MapPin,
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
  X,
  Calendar,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  CheckCircle,
  Clock,
} from "lucide-react";
import api from "@/lib/api";
import * as XLSX from "xlsx";

// ── مكون الدفعات على معاملة محددة ────────────────────────────────────────
function PaymentsPanel({ transaction, exchangeRate, onClose, onRefresh }) {
  const [payments, setPayments] = useState(transaction.payments || []);
  const [totalPaid, setTotalPaid] = useState(transaction.total_paid || 0);
  const [remaining, setRemaining] = useState(
    transaction.remaining_usd ?? transaction.amount_usd,
  );
  const [fullyPaid, setFullyPaid] = useState(transaction.fully_paid || false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const fUSD = (v) => `$${(v || 0).toFixed(3)}`;
  const fSYP = (v) =>
    `${((v || 0) * exchangeRate).toLocaleString("en-US", { maximumFractionDigits: 0 })} ل.س`;

  const addPayment = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setLoading(true);
    try {
      const { data } = await api.post(
        `/distributor-transactions/${transaction.id}/payments`,
        { amount_usd: amt, note },
      );
      setPayments((prev) => [...prev, data.payment]);
      setTotalPaid(data.total_paid);
      setRemaining(data.remaining_usd);
      setFullyPaid(data.fully_paid);
      setAmount("");
      setNote("");
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || "حدث خطأ");
    }
    setLoading(false);
  };

  const deletePayment = async (paymentId) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الدفعة؟")) return;
    try {
      await api.delete(`/payments/${paymentId}`);
      const newPayments = payments.filter((p) => p.id !== paymentId);
      const newTotal =
        newPayments.reduce((s, p) => s + p.amount_usd, 0) +
        (transaction.initial_payment || 0);
      setPayments(newPayments);
      setTotalPaid(newTotal);
      setRemaining(transaction.amount_usd - newTotal);
      setFullyPaid(transaction.amount_usd - newTotal <= 0);
      onRefresh();
    } catch (err) {
      alert("حدث خطأ أثناء الحذف");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-2 sm:p-4">
      <div
        className="bg-white rounded-xl w-full max-w-xl max-h-[95vh] sm:max-h-[90vh] flex flex-col"
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-brand_1 text-white px-4 sm:px-6 py-4 sm:py-5 rounded-t-xl flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-lg sm:text-xl font-['Tajawal']">
              دفعات المعاملة
            </h3>
            <p className="text-brand_1 text-sm sm:text-base mt-1 truncate">
              {transaction.description ||
                transaction.invoice_number ||
                "بدون وصف"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-brand_1 rounded-full flex-shrink-0 mr-2"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* ملخص */}
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-brand_1 border-b border-brand_1 bg-white">
          <div className="p-2 sm:p-4 text-center">
            <p className="text-xs sm:text-sm text-brand_1 mb-1">
              إجمالي المعاملة
            </p>
            <p className="font-bold text-brand_1 text-sm sm:text-base">
              {fUSD(transaction.amount_usd)}
            </p>
            <p className="text-xs sm:text-sm text-brand_1 hidden sm:block">
              {fSYP(transaction.amount_usd)}
            </p>
          </div>
          <div className="p-2 sm:p-4 text-center">
            <p className="text-xs sm:text-sm text-brand_1 mb-1">المدفوع</p>
            <p className="font-bold text-brand_1 text-sm sm:text-base">
              {fUSD(totalPaid)}
            </p>
            <p className="text-xs sm:text-sm text-brand_1 hidden sm:block">
              {fSYP(totalPaid)}
            </p>
          </div>
          <div className="p-2 sm:p-4 text-center">
            <p className="text-xs sm:text-sm text-brand_1 mb-1">المتبقي</p>
            <p
              className={`font-bold text-sm sm:text-base ${remaining > 0 ? "text-red-600" : "text-brand_1"}`}
            >
              {fUSD(remaining)}
            </p>
            <p className="text-xs sm:text-sm text-brand_1 hidden sm:block">
              {fSYP(remaining)}
            </p>
          </div>
        </div>

        {/* حالة السداد */}
        <div
          className={`px-4 sm:px-6 py-2 sm:py-3 flex items-center gap-2 text-sm sm:text-base font-medium ${fullyPaid ? "bg-white text-brand_1" : "bg-orange-50 text-orange-700"}`}
        >
          {fullyPaid ? (
            <>
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" /> تم
              السداد الكامل
            </>
          ) : (
            <>
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="truncate">
                سداد جزئي — يتبقى {fUSD(remaining)}
              </span>
            </>
          )}
        </div>

        {/* سجل الدفعات */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3">
          {/* عرض الدفعة الأولى إن وجدت */}
          {transaction.initial_payment > 0 && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-3 sm:px-5 py-3 sm:py-4">
              <div className="min-w-0">
                <p className="font-semibold text-blue-700 text-sm sm:text-base">
                  {fUSD(transaction.initial_payment)} (دفعة أولى)
                </p>
                <p className="text-xs sm:text-sm text-blue-600">
                  {fSYP(transaction.initial_payment)}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                <p className="text-xs sm:text-sm text-blue-600 hidden xs:block">
                  {new Date(transaction.created_at).toLocaleDateString(
                    "ar-SY",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    },
                  )}
                </p>
                <div className="w-9 h-9" />
              </div>
            </div>
          )}

          {payments.length === 0 && !(transaction.initial_payment > 0) ? (
            <p className="text-center text-brand_1 text-sm sm:text-base py-6">
              لا توجد دفعات بعد
            </p>
          ) : (
            payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-white border border-brand_1 rounded-lg px-3 sm:px-5 py-3 sm:py-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-brand_1 text-sm sm:text-base">
                    {fUSD(p.amount_usd)}
                  </p>
                  <p className="text-xs sm:text-sm text-brand_1">
                    {fSYP(p.amount_usd)}
                  </p>
                  {p.note && (
                    <p className="text-xs sm:text-sm text-brand_1 mt-1">
                      {p.note}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                  <p className="text-xs sm:text-sm text-brand_1 hidden sm:block">
                    {new Date(p.paid_at).toLocaleDateString("ar-SY", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-brand_1 sm:hidden">
                    {new Date(p.paid_at).toLocaleDateString("ar-SY", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                  <button
                    onClick={() => deletePayment(p.id)}
                    className="p-1.5 sm:p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* إضافة دفعة جديدة */}
        {!fullyPaid && (
          <div className="border-t border-brand_1 p-3 sm:p-5 space-y-3 sm:space-y-4">
            <p className="text-sm sm:text-base font-medium text-brand_1">
              إضافة دفعة جديدة
            </p>
            {/* موبايل: تخطيط عمودي */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Input
                type="text"
                step="0.01"
                placeholder={`المبلغ (max: ${remaining.toFixed(3)}$)`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="border-brand_1 h-10 sm:h-11 text-sm sm:text-base"
                onKeyDown={(e) => e.key === "Enter" && addPayment()}
              />
              <Input
                placeholder="ملاحظة (اختياري)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="border-brand_1 h-10 sm:h-11 text-sm sm:text-base"
              />
              <button
                onClick={addPayment}
                disabled={loading}
                className="bg-brand_1 text-white px-4 sm:px-5 py-2 rounded-lg text-sm sm:text-base hover:bg-brand_1 disabled:opacity-50 whitespace-nowrap w-full sm:w-auto"
              >
                {loading ? "..." : "إضافة"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── مكون واجهة التفاصيل الكاملة ──────────────────────────────────────────
function DistributorDetail({
  dist,
  transactions,
  exchangeRate,
  onClose,
  onAddTxn,
  onRefresh,
}) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedTxn, setSelectedTxn] = useState(null);

  const now = new Date();
  const targetDate = new Date(
    now.getFullYear(),
    now.getMonth() + monthOffset,
    1,
  );
  const monthLabel = targetDate.toLocaleDateString("ar-SY", {
    month: "long",
    year: "numeric",
  });

  const distTxns = transactions.filter((t) => t.distributor_id === dist.id);

  const monthTxns = distTxns.filter((t) => {
    const d = new Date(t.created_at);
    return (
      d.getMonth() === targetDate.getMonth() &&
      d.getFullYear() === targetDate.getFullYear()
    );
  });

  const monthPurchases = monthTxns
    .filter((t) => t.type === "purchase")
    .reduce((s, t) => s + (t.amount_usd || 0), 0);

  const monthPayments = monthTxns.reduce((s, t) => {
    if (t.type === "payment") return s + (t.amount_usd || 0);
    if (t.type === "purchase") return s + (t.total_paid || 0);
    return s;
  }, 0);

  const totalPurchases = distTxns
    .filter((t) => t.type === "purchase")
    .reduce((s, t) => s + (t.amount_usd || 0), 0);

  const totalPayments = distTxns.reduce((s, t) => {
    if (t.type === "payment") return s + (t.amount_usd || 0);
    if (t.type === "purchase") return s + (t.total_paid || 0);
    return s;
  }, 0);

  const balance = totalPurchases - totalPayments;

  const fUSD = (v) => `$${(v || 0).toFixed(3)}`;
  const fSYP = (v) =>
    `${((v || 0) * exchangeRate).toLocaleString("en-US", { maximumFractionDigits: 0 })} ل.س`;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col" dir="rtl">
      {selectedTxn && (
        <PaymentsPanel
          transaction={selectedTxn}
          exchangeRate={exchangeRate}
          onClose={() => setSelectedTxn(null)}
          onRefresh={() => {
            onRefresh();
          }}
        />
      )}

      {/* Header */}
      <div className="bg-brand_1 text-white px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold font-['Tajawal'] truncate">
            {dist.name}
          </h2>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 sm:mt-2 text-brand_1 text-sm sm:text-base">
            {dist.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                {dist.phone}
              </span>
            )}
            {dist.address && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">{dist.address}</span>
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 sm:p-3 rounded-full hover:bg-brand_1 flex-shrink-0"
        >
          <X className="w-5 h-5 sm:w-7 sm:h-7" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8">
        {/* بطاقات الملخص الكلي */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 sm:p-5">
            <p className="text-xs sm:text-sm text-red-600 mb-1">
              إجمالي المشتريات
            </p>
            <p className="text-base sm:text-xl font-bold text-red-700">
              {fUSD(totalPurchases)}
            </p>
            <p className="text-xs sm:text-sm text-red-500 mt-1 hidden sm:block">
              {fSYP(totalPurchases)}
            </p>
          </div>
          <div className="bg-white border border-brand_1 rounded-xl p-3 sm:p-5">
            <p className="text-xs sm:text-sm text-brand_1 mb-1">
              إجمالي الدفعات
            </p>
            <p className="text-base sm:text-xl font-bold text-brand_1">
              {fUSD(totalPayments)}
            </p>
            <p className="text-xs sm:text-sm text-brand_1 mt-1 hidden sm:block">
              {fSYP(totalPayments)}
            </p>
          </div>
          <div
            className={`border rounded-xl p-3 sm:p-5 ${balance > 0 ? "bg-orange-50 border-orange-100" : "bg-white border-brand_1"}`}
          >
            <p
              className={`text-xs sm:text-sm mb-1 ${balance > 0 ? "text-orange-600" : "text-brand_1"}`}
            >
              الرصيد المتبقي
            </p>
            <p
              className={`text-base sm:text-xl font-bold ${balance > 0 ? "text-orange-700" : "text-brand_1"}`}
            >
              {fUSD(balance)}
            </p>
            <p
              className={`text-xs sm:text-sm mt-1 hidden sm:block ${balance > 0 ? "text-orange-500" : "text-brand_1"}`}
            >
              {fSYP(balance)}
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 sm:p-5">
            <p className="text-xs sm:text-sm text-blue-600 mb-1">
              عدد المعاملات
            </p>
            <p className="text-base sm:text-xl font-bold text-blue-700">
              {distTxns.length}
            </p>
            <p className="text-xs sm:text-sm text-blue-500 mt-1">
              معاملة إجمالية
            </p>
          </div>
        </div>

        {/* قسم الشهر */}
        <div className="bg-white border border-brand_1 rounded-xl overflow-hidden">
          <div className="bg-white border-b border-brand_1 px-3 sm:px-5 py-3 sm:py-4 flex items-center justify-between">
            <button
              onClick={() => setMonthOffset((o) => o - 1)}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-white text-brand_1"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 text-brand_1 font-semibold text-sm sm:text-base">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-brand_1" />
              {monthLabel}
              {monthOffset !== 0 && (
                <button
                  onClick={() => setMonthOffset(0)}
                  className="text-xs sm:text-sm text-brand_1 underline"
                >
                  العودة للشهر الحالي
                </button>
              )}
            </div>
            <button
              onClick={() => setMonthOffset((o) => Math.min(o + 1, 0))}
              disabled={monthOffset === 0}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-white text-brand_1 disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          <div className="grid grid-cols-3 divide-x divide-x-reverse divide-brand_1 border-b border-brand_1">
            <div className="p-3 sm:p-5 text-center">
              <p className="text-xs sm:text-sm text-brand_1 mb-1">
                مشتريات الشهر
              </p>
              <p className="font-bold text-red-600 text-sm sm:text-base">
                {fUSD(monthPurchases)}
              </p>
              <p className="text-xs sm:text-sm text-brand_1 hidden sm:block">
                {fSYP(monthPurchases)}
              </p>
            </div>
            <div className="p-3 sm:p-5 text-center">
              <p className="text-xs sm:text-sm text-brand_1 mb-1">
                دفعات الشهر
              </p>
              <p className="font-bold text-brand_1 text-sm sm:text-base">
                {fUSD(monthPayments)}
              </p>
              <p className="text-xs sm:text-sm text-brand_1 hidden sm:block">
                {fSYP(monthPayments)}
              </p>
            </div>
            <div className="p-3 sm:p-5 text-center">
              <p className="text-xs sm:text-sm text-brand_1 mb-1">صافي الشهر</p>
              <p
                className={`font-bold text-sm sm:text-base ${monthPurchases - monthPayments > 0 ? "text-orange-600" : "text-brand_1"}`}
              >
                {fUSD(monthPurchases - monthPayments)}
              </p>
              <p className="text-xs sm:text-sm text-brand_1 hidden sm:block">
                {fSYP(monthPurchases - monthPayments)}
              </p>
            </div>
          </div>

          {monthTxns.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-brand_1">
              <DollarSign className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-brand_1" />
              <p className="text-sm sm:text-base">
                لا توجد معاملات في هذا الشهر
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm sm:text-base text-right min-w-[600px]">
                <thead>
                  <tr className="bg-white text-brand_1">
                    <th className="px-3 sm:px-5 py-3 font-medium text-sm">
                      التاريخ
                    </th>
                    <th className="px-3 sm:px-5 py-3 font-medium text-sm">
                      النوع
                    </th>
                    <th className="px-3 sm:px-5 py-3 font-medium text-sm">
                      المبلغ ($)
                    </th>
                    <th className="px-3 sm:px-5 py-3 font-medium text-sm">
                      المدفوع
                    </th>
                    <th className="px-3 sm:px-5 py-3 font-medium text-sm">
                      المتبقي
                    </th>
                    <th className="px-3 sm:px-5 py-3 font-medium text-sm">
                      الوصف
                    </th>
                    <th className="px-3 sm:px-5 py-3 font-medium text-sm">
                      الحالة
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...monthTxns]
                    .sort(
                      (a, b) => new Date(b.created_at) - new Date(a.created_at),
                    )
                    .map((t) => (
                      <tr
                        key={t.id}
                        className="border-t border-brand_1 hover:bg-white/50"
                      >
                        <td className="px-3 sm:px-5 py-3 text-brand_1 text-xs sm:text-sm whitespace-nowrap">
                          {new Date(t.created_at).toLocaleDateString("ar-SY", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-3 sm:px-5 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${t.type === "purchase" ? "bg-red-50 text-red-700" : "bg-white text-brand_1"}`}
                          >
                            {t.type === "purchase" ? (
                              <>
                                <ArrowDownCircle className="w-3 h-3 sm:w-4 sm:h-4" />{" "}
                                شراء
                              </>
                            ) : (
                              <>
                                <ArrowUpCircle className="w-3 h-3 sm:w-4 sm:h-4" />{" "}
                                دفعة
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-3 sm:px-5 py-3 font-medium text-brand_1 text-sm">
                          {fUSD(t.amount_usd)}
                        </td>
                        <td className="px-3 sm:px-5 py-3 text-brand_1 text-sm">
                          {t.type === "purchase" ? fUSD(t.total_paid) : "—"}
                        </td>
                        <td className="px-3 sm:px-5 py-3">
                          {t.type === "purchase" ? (
                            <span
                              className={`font-medium text-sm ${(t.remaining_usd || 0) > 0 ? "text-orange-600" : "text-brand_1"}`}
                            >
                              {fUSD(t.remaining_usd)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 sm:px-5 py-3 text-brand_1 text-sm">
                          {t.description || "—"}
                        </td>
                        <td className="px-3 sm:px-5 py-3">
                          {t.type === "purchase" ? (
                            <button
                              onClick={() => setSelectedTxn(t)}
                              className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold cursor-pointer ${t.fully_paid ? "bg-white text-brand_1" : "bg-orange-50 text-orange-700 hover:bg-orange-100"}`}
                            >
                              {t.fully_paid ? (
                                <>
                                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />{" "}
                                  مسدد
                                </>
                              ) : (
                                <>
                                  <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" />{" "}
                                  إضافة دفعة
                                </>
                              )}
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* سجل كامل المعاملات */}
        <div className="bg-white border border-brand_1 rounded-xl overflow-hidden">
          <div className="bg-white border-b border-brand_1 px-3 sm:px-5 py-3 sm:py-4 flex items-center justify-between">
            <h3 className="font-semibold text-brand_1 flex items-center gap-2 text-sm sm:text-base">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-brand_1" />
              سجل كامل المعاملات ({distTxns.length})
            </h3>
            <button
              onClick={() => onAddTxn(dist.id)}
              className="flex items-center gap-1 sm:gap-2 bg-brand_1 text-white text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-brand_1"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" /> معاملة جديدة
            </button>
          </div>

          {distTxns.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-brand_1">
              <p className="text-sm sm:text-base">لا توجد معاملات بعد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm sm:text-base text-right min-w-[750px]">
                <thead>
                  <tr className="bg-white text-brand_1">
                    <th className="px-3 sm:px-5 py-3 font-medium text-sm">
                      التاريخ
                    </th>
                    <th className="px-3 sm:px-5 py-3 font-medium text-sm">
                      النوع
                    </th>
                    <th className="px-3 sm:px-5 py-3 font-medium text-sm">
                      المبلغ ($)
                    </th>
                    <th className="px-3 sm:px-5 py-3 font-medium text-sm">
                      المدفوع
                    </th>
                    <th className="px-3 sm:px-5 py-3 font-medium text-sm">
                      المتبقي
                    </th>
                    <th className="px-3 sm:px-5 py-3 font-medium text-sm">
                      الوصف
                    </th>
                    <th className="px-3 sm:px-5 py-3 font-medium text-sm">
                      رقم الفاتورة
                    </th>
                    <th className="px-3 sm:px-5 py-3 font-medium text-sm">
                      الرصيد التراكمي
                    </th>
                    <th className="px-3 sm:px-5 py-3 font-medium text-sm">
                      الحالة
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const sorted = [...distTxns].sort(
                      (a, b) => new Date(a.created_at) - new Date(b.created_at),
                    );
                    let running = 0;
                    const rows = sorted.map((t) => {
                      running +=
                        t.type === "purchase" ? t.amount_usd : -t.amount_usd;
                      return { ...t, running };
                    });
                    return rows.reverse().map((t) => (
                      <tr
                        key={t.id}
                        className="border-t border-brand_1 hover:bg-white/50"
                      >
                        <td className="px-3 sm:px-5 py-3 text-brand_1 text-xs sm:text-sm whitespace-nowrap">
                          {new Date(t.created_at).toLocaleDateString("ar-SY", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-3 sm:px-5 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${t.type === "purchase" ? "bg-red-50 text-red-700" : "bg-white text-brand_1"}`}
                          >
                            {t.type === "purchase" ? (
                              <>
                                <ArrowDownCircle className="w-3 h-3 sm:w-4 sm:h-4" />{" "}
                                شراء
                              </>
                            ) : (
                              <>
                                <ArrowUpCircle className="w-3 h-3 sm:w-4 sm:h-4" />{" "}
                                دفعة
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-3 sm:px-5 py-3 font-medium text-brand_1 text-sm">
                          {fUSD(t.amount_usd)}
                        </td>
                        <td className="px-3 sm:px-5 py-3 text-brand_1 text-sm">
                          {t.type === "purchase" ? fUSD(t.total_paid) : "—"}
                        </td>
                        <td className="px-3 sm:px-5 py-3">
                          {t.type === "purchase" ? (
                            <span
                              className={`font-medium text-sm ${(t.remaining_usd || 0) > 0 ? "text-orange-600" : "text-brand_1"}`}
                            >
                              {fUSD(t.remaining_usd)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 sm:px-5 py-3 text-brand_1 text-sm">
                          {t.description || "—"}
                        </td>
                        <td className="px-3 sm:px-5 py-3 text-brand_1 text-sm">
                          {t.invoice_number || "—"}
                        </td>
                        <td className="px-3 sm:px-5 py-3">
                          <span
                            className={`font-semibold text-sm ${t.running > 0 ? "text-orange-600" : "text-brand_1"}`}
                          >
                            {fUSD(t.running)}
                          </span>
                        </td>
                        <td className="px-3 sm:px-5 py-3">
                          {t.type === "purchase" ? (
                            <button
                              onClick={() => setSelectedTxn(t)}
                              className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold cursor-pointer ${t.fully_paid ? "bg-white text-brand_1" : "bg-orange-50 text-orange-700 hover:bg-orange-100"}`}
                            >
                              {t.fully_paid ? (
                                <>
                                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />{" "}
                                  مسدد
                                </>
                              ) : (
                                <>
                                  <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" />{" "}
                                  إضافة دفعة
                                </>
                              )}
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── الصفحة الرئيسية ───────────────────────────────────────────────────────
export default function DistributorsPage() {
  const { exchangeRate } = useOutletContext();
  const [distributors, setDistributors] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [txnDialogOpen, setTxnDialogOpen] = useState(false);
  const [detailDist, setDetailDist] = useState(null);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedDist, setSelectedDist] = useState("all");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    notes: "",
  });
  const [txnForm, setTxnForm] = useState({
    distributor_id: "",
    type: "purchase",
    amount_usd: 0,
    description: "",
    invoice_number: "",
    initial_payment: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      const [dRes, tRes] = await Promise.all([
        api.get("/distributors"),
        api.get("/distributor-transactions"),
      ]);
      setDistributors(dRes.data);
      setTransactions(tRes.data);

      if (detailDist) {
        const updated = dRes.data.find((d) => d.id === detailDist.id);
        if (updated) setDetailDist(updated);
      }
    } catch (err) {
      /* */
    }
    setLoading(false);
  }, [detailDist]);

  useEffect(() => {
    fetchData();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", phone: "", address: "", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (d, e) => {
    e.stopPropagation();
    setEditing(d);
    setForm({
      name: d.name,
      phone: d.phone || "",
      address: d.address || "",
      notes: d.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    try {
      if (editing) {
        await api.put(`/distributors/${editing.id}`, form);
      } else {
        await api.post("/distributors", form);
      }
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      /* */
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("هل أنت متأكد من حذف هذا الموزع وجميع معاملاته؟"))
      return;
    try {
      await api.delete(`/distributors/${id}`);
      if (detailDist?.id === id) setDetailDist(null);
      fetchData();
    } catch (err) {
      /* */
    }
  };

  const openTxnCreate = (distId) => {
    setTxnForm({
      distributor_id: distId || "",
      type: "purchase",
      amount_usd: 0,
      description: "",
      invoice_number: "",
      initial_payment: 0,
    });
    setTxnDialogOpen(true);
  };

  const handleTxnSubmit = async () => {
    if (!txnForm.distributor_id || !txnForm.amount_usd) return;
    try {
      await api.post("/distributor-transactions", {
        ...txnForm,
        amount_usd: parseFloat(txnForm.amount_usd) || 0,
        initial_payment: parseFloat(txnForm.initial_payment) || 0,
      });
      setTxnDialogOpen(false);
      fetchData();
    } catch (err) {
      /* */
    }
  };

  const handleDeleteTxn = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه المعاملة؟")) return;
    try {
      await api.delete(`/distributor-transactions/${id}`);
      fetchData();
    } catch (err) {
      /* */
    }
  };

  const filteredDist = distributors.filter(
    (d) => d.name.includes(search) || (d.phone || "").includes(search),
  );
  const filteredTxns =
    selectedDist === "all"
      ? transactions
      : transactions.filter((t) => t.distributor_id === selectedDist);

  const getDistName = (id) =>
    distributors.find((d) => d.id === id)?.name || "—";
  const fUSD = (v) => `$${(v || 0).toFixed(3)}`;
  const formatSYP = (usd) =>
    `${((usd || 0) * exchangeRate).toLocaleString("en-US", { maximumFractionDigits: 0 })} ل.س`;

  const exportExcel = () => {
    const data = filteredTxns.map((t) => ({
      الموزع: getDistName(t.distributor_id),
      النوع: t.type === "purchase" ? "شراء" : "دفعة",
      "المبلغ ($)": t.amount_usd,
      "المدفوع ($)": t.total_paid ?? "—",
      "المتبقي ($)": t.remaining_usd ?? "—",
      الوصف: t.description || "",
      "رقم الفاتورة": t.invoice_number || "",
      التاريخ: new Date(t.created_at).toLocaleDateString("ar-SY"),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المعاملات");
    XLSX.writeFile(wb, "distributor_transactions.xlsx");
  };

  return (
    <>
      {detailDist && (
        <DistributorDetail
          dist={detailDist}
          transactions={transactions}
          exchangeRate={exchangeRate}
          onClose={() => setDetailDist(null)}
          onAddTxn={(id) => openTxnCreate(id)}
          onRefresh={fetchData}
        />
      )}

      <div className="space-y-6 sm:space-y-8" data-testid="distributors-page">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand_1 font-['Tajawal']">
          الموزعون والتجار
        </h1>

        <Tabs defaultValue="distributors" dir="rtl">
          <TabsList className="bg-white border border-brand_1 h-10 sm:h-12">
            <TabsTrigger
              value="distributors"
              data-testid="tab-distributors"
              className="data-[state=active]:bg-brand_1 data-[state=active]:text-white text-sm sm:text-base px-3 sm:px-5 py-1.5 sm:py-2"
            >
              الموزعون
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              data-testid="tab-transactions"
              className="data-[state=active]:bg-brand_1 data-[state=active]:text-white text-sm sm:text-base px-3 sm:px-5 py-1.5 sm:py-2"
            >
              المعاملات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="distributors">
            <div className="space-y-5 sm:space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3 bg-white border border-brand_1 rounded-lg px-3 sm:px-4 py-2 sm:py-3 flex-1 max-w-md">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 text-brand_1 flex-shrink-0" />
                  <Input
                    data-testid="distributor-search"
                    placeholder="بحث في الموزعين..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border-0 bg-transparent h-8 sm:h-10 focus-visible:ring-0 p-0 text-sm sm:text-base"
                  />
                </div>
                <button
                  data-testid="add-distributor-btn"
                  onClick={openCreate}
                  className="flex items-center gap-1.5 sm:gap-2 bg-brand_1 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium hover:bg-brand_1"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> إضافة موزع
                </button>
              </div>

              {loading ? (
                <p className="text-brand_1 text-center py-10 text-base sm:text-lg">
                  جاري التحميل...
                </p>
              ) : filteredDist.length === 0 ? (
                <div className="text-center py-12 sm:py-16 text-brand_1">
                  <Users className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-brand_1" />
                  <p className="text-base sm:text-lg">لا يوجد موزعون بعد</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {filteredDist.map((d) => {
                    const dTxns = transactions.filter(
                      (t) => t.distributor_id === d.id,
                    );
                    const totalPurchases = dTxns
                      .filter((t) => t.type === "purchase")
                      .reduce((s, t) => s + (t.amount_usd || 0), 0);
                    const totalPayments = dTxns.reduce((s, t) => {
                      if (t.type === "payment") return s + (t.amount_usd || 0);
                      if (t.type === "purchase") return s + (t.total_paid || 0);
                      return s;
                    }, 0);
                    const balance = totalPurchases - totalPayments;

                    return (
                      <div
                        key={d.id}
                        onClick={() => setDetailDist(d)}
                        className="bg-white border border-brand_1 rounded-lg p-4 sm:p-6 cursor-pointer hover:shadow-md hover:border-brand_1 transition-all"
                        data-testid={`distributor-card-${d.id}`}
                      >
                        <div className="flex items-start justify-between mb-3 sm:mb-4">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-brand_1 text-lg sm:text-xl truncate">
                              {d.name}
                            </h3>
                            {d.phone && (
                              <div className="flex items-center gap-1 text-sm sm:text-base text-brand_1 mt-1 sm:mt-2">
                                <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                {d.phone}
                              </div>
                            )}
                            {d.address && (
                              <div className="flex items-center gap-1 text-sm sm:text-base text-brand_1 mt-1">
                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span className="truncate">{d.address}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 mr-2">
                            <button
                              onClick={(e) => openEdit(d, e)}
                              className="p-1.5 sm:p-2 rounded-lg text-brand_1 hover:bg-white"
                            >
                              <Pencil className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(d.id, e)}
                              className="p-1.5 sm:p-2 rounded-lg text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </div>
                        </div>
                        <div className="bg-white border border-brand_1 rounded-lg p-3 sm:p-4 space-y-2">
                          <div className="flex justify-between text-sm sm:text-base">
                            <span className="text-brand_1">المشتريات</span>
                            <span className="text-brand_1 font-medium">
                              {fUSD(totalPurchases)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm sm:text-base">
                            <span className="text-brand_1">الدفعات</span>
                            <span className="text-brand_1 font-medium">
                              {fUSD(totalPayments)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm sm:text-base border-t border-brand_1 pt-2">
                            <span className="text-brand_1 font-semibold">
                              الرصيد المتبقي
                            </span>
                            <span
                              className={`font-bold text-sm sm:text-base ${balance > 0 ? "text-red-600" : "text-brand_1"}`}
                            >
                              {fUSD(balance)}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-brand_1 text-left">
                            {formatSYP(balance)}
                          </p>
                        </div>
                        <div className="mt-3 sm:mt-4 text-center text-xs sm:text-sm text-brand_1">
                          اضغط لعرض التفاصيل الكاملة ←
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="transactions">
            <div className="space-y-5 sm:space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
                <Select value={selectedDist} onValueChange={setSelectedDist}>
                  <SelectTrigger
                    data-testid="filter-txn-distributor"
                    className="w-full sm:w-[240px] border-brand_1 bg-white h-10 sm:h-11 text-sm sm:text-base"
                  >
                    <SelectValue placeholder="كل الموزعين" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الموزعين</SelectItem>
                    {distributors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <button
                    onClick={exportExcel}
                    className="flex items-center gap-1.5 sm:gap-2 border border-brand_1 text-brand_1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base hover:bg-white flex-1 sm:flex-none justify-center"
                  >
                    <Download className="w-4 h-4 sm:w-5 sm:h-5" /> تصدير Excel
                  </button>
                  <button
                    onClick={() => openTxnCreate("")}
                    className="flex items-center gap-1.5 sm:gap-2 bg-brand_1 text-white px-3 sm:px-5 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium hover:bg-brand_1 flex-1 sm:flex-none justify-center"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> معاملة جديدة
                  </button>
                </div>
              </div>

              {filteredTxns.length === 0 ? (
                <div className="text-center py-12 sm:py-16 text-brand_1">
                  <DollarSign className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-brand_1" />
                  <p className="text-base sm:text-lg">لا توجد معاملات</p>
                </div>
              ) : (
                <div className="bg-white border border-brand_1 rounded-lg overflow-x-auto">
                  <table
                    className="w-full text-sm sm:text-base text-right min-w-[700px]"
                    data-testid="transactions-table"
                  >
                    <thead>
                      <tr className="bg-white border-b border-brand_1">
                        <th className="p-3 sm:p-4 font-semibold text-brand_1 text-sm">
                          الموزع
                        </th>
                        <th className="p-3 sm:p-4 font-semibold text-brand_1 text-sm">
                          النوع
                        </th>
                        <th className="p-3 sm:p-4 font-semibold text-brand_1 text-sm">
                          المبلغ ($)
                        </th>
                        <th className="p-3 sm:p-4 font-semibold text-brand_1 text-sm">
                          المدفوع
                        </th>
                        <th className="p-3 sm:p-4 font-semibold text-brand_1 text-sm">
                          المتبقي
                        </th>
                        <th className="p-3 sm:p-4 font-semibold text-brand_1 text-sm">
                          الوصف
                        </th>
                        <th className="p-3 sm:p-4 font-semibold text-brand_1 text-sm">
                          رقم الفاتورة
                        </th>
                        <th className="p-3 sm:p-4 font-semibold text-brand_1 text-sm">
                          التاريخ
                        </th>
                        <th className="p-3 sm:p-4 font-semibold text-brand_1 text-sm">
                          إجراءات
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTxns.map((t) => (
                        <tr
                          key={t.id}
                          className="border-b border-brand_1 hover:bg-white/50"
                        >
                          <td className="p-3 sm:p-4 text-brand_1 text-sm">
                            {getDistName(t.distributor_id)}
                          </td>
                          <td className="p-3 sm:p-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${t.type === "purchase" ? "bg-red-50 text-red-700" : "bg-white text-brand_1"}`}
                            >
                              {t.type === "purchase" ? (
                                <>
                                  <ArrowDownCircle className="w-3 h-3 sm:w-4 sm:h-4" />{" "}
                                  شراء
                                </>
                              ) : (
                                <>
                                  <ArrowUpCircle className="w-3 h-3 sm:w-4 sm:h-4" />{" "}
                                  دفعة
                                </>
                              )}
                            </span>
                          </td>
                          <td className="p-3 sm:p-4 text-brand_1 font-medium text-sm">
                            {fUSD(t.amount_usd)}
                          </td>
                          <td className="p-3 sm:p-4 text-brand_1 text-sm">
                            {t.type === "purchase" ? fUSD(t.total_paid) : "—"}
                          </td>
                          <td className="p-3 sm:p-4">
                            {t.type === "purchase" ? (
                              <span
                                className={`font-medium text-sm ${(t.remaining_usd || 0) > 0 ? "text-orange-600" : "text-brand_1"}`}
                              >
                                {fUSD(t.remaining_usd)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="p-3 sm:p-4 text-brand_1 text-sm">
                            {t.description || "—"}
                          </td>
                          <td className="p-3 sm:p-4 text-brand_1 text-sm">
                            {t.invoice_number || "—"}
                          </td>
                          <td className="p-3 sm:p-4 text-brand_1 text-xs sm:text-sm whitespace-nowrap">
                            {new Date(t.created_at).toLocaleDateString("ar-SY")}
                          </td>
                          <td className="p-3 sm:p-4">
                            <button
                              onClick={() => handleDeleteTxn(t.id)}
                              className="p-1.5 sm:p-2 rounded-lg text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Distributor Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="w-[95vw] sm:max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-brand_1 font-['Tajawal'] text-lg sm:text-xl">
                {editing ? "تعديل الموزع" : "إضافة موزع جديد"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 sm:space-y-5 py-4 sm:py-5">
              <div>
                <label className="text-sm sm:text-base text-brand_1 mb-2 block">
                  اسم الموزع *
                </label>
                <Input
                  data-testid="distributor-name-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="border-brand_1 text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
              <div>
                <label className="text-sm sm:text-base text-brand_1 mb-2 block">
                  رقم الهاتف
                </label>
                <Input
                  data-testid="distributor-phone-input"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="border-brand_1 text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
              <div>
                <label className="text-sm sm:text-base text-brand_1 mb-2 block">
                  العنوان
                </label>
                <Input
                  data-testid="distributor-address-input"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  className="border-brand_1 text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
              <div>
                <label className="text-sm sm:text-base text-brand_1 mb-2 block">
                  ملاحظات
                </label>
                <Input
                  data-testid="distributor-notes-input"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="border-brand_1 text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2 sm:gap-3 sm:justify-start">
              <button
                data-testid="save-distributor-btn"
                onClick={handleSubmit}
                className="bg-brand_1 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium hover:bg-brand_1 flex-1 sm:flex-none"
              >
                {editing ? "تحديث" : "إضافة"}
              </button>
              <button
                onClick={() => setDialogOpen(false)}
                className="border border-brand_1 text-brand_1 px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base hover:bg-white flex-1 sm:flex-none"
              >
                إلغاء
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transaction Dialog */}
        <Dialog open={txnDialogOpen} onOpenChange={setTxnDialogOpen}>
          <DialogContent className="w-[95vw] sm:max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-brand_1 font-['Tajawal'] text-lg sm:text-xl">
                معاملة جديدة
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 sm:space-y-5 py-4 sm:py-5">
              <div>
                <label className="text-sm sm:text-base text-brand_1 mb-2 block">
                  الموزع *
                </label>
                <Select
                  value={txnForm.distributor_id}
                  onValueChange={(v) =>
                    setTxnForm({ ...txnForm, distributor_id: v })
                  }
                >
                  <SelectTrigger
                    data-testid="txn-distributor-select"
                    className="border-brand_1 h-10 sm:h-11 text-sm sm:text-base"
                  >
                    <SelectValue placeholder="اختر الموزع" />
                  </SelectTrigger>
                  <SelectContent>
                    {distributors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm sm:text-base text-brand_1 mb-2 block">
                  نوع المعاملة
                </label>
                <Select
                  value={txnForm.type}
                  onValueChange={(v) => setTxnForm({ ...txnForm, type: v })}
                >
                  <SelectTrigger
                    data-testid="txn-type-select"
                    className="border-brand_1 h-10 sm:h-11 text-sm sm:text-base"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">شراء (مدين)</SelectItem>
                    <SelectItem value="payment">دفعة (دائن)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm sm:text-base text-brand_1 mb-2 block">
                  المبلغ الإجمالي ($) *
                </label>
                <Input
                  data-testid="txn-amount-input"
                  type="text"
                  step="0.01"
                  value={txnForm.amount_usd}
                  onChange={(e) =>
                    setTxnForm({ ...txnForm, amount_usd: e.target.value })
                  }
                  className="border-brand_1 text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
              {txnForm.type === "purchase" && (
                <div>
                  <label className="text-sm sm:text-base text-brand_1 mb-2 block">
                    دفعة أولى ($){" "}
                    <span className="text-brand_1 text-xs sm:text-sm">
                      (اختياري)
                    </span>
                  </label>
                  <Input
                    type="text"
                    step="0.01"
                    value={txnForm.initial_payment}
                    onChange={(e) =>
                      setTxnForm({
                        ...txnForm,
                        initial_payment: e.target.value,
                      })
                    }
                    className="border-brand_1 text-sm sm:text-base h-10 sm:h-11"
                    placeholder="0"
                  />
                </div>
              )}
              <div>
                <label className="text-sm sm:text-base text-brand_1 mb-2 block">
                  الوصف
                </label>
                <Input
                  data-testid="txn-description-input"
                  value={txnForm.description}
                  onChange={(e) =>
                    setTxnForm({ ...txnForm, description: e.target.value })
                  }
                  className="border-brand_1 text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
              <div>
                <label className="text-sm sm:text-base text-brand_1 mb-2 block">
                  رقم الفاتورة
                </label>
                <Input
                  data-testid="txn-invoice-input"
                  value={txnForm.invoice_number}
                  onChange={(e) =>
                    setTxnForm({ ...txnForm, invoice_number: e.target.value })
                  }
                  className="border-brand_1 text-sm sm:text-base h-10 sm:h-11"
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2 sm:gap-3 sm:justify-start">
              <button
                data-testid="save-txn-btn"
                onClick={handleTxnSubmit}
                className="bg-brand_1 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium hover:bg-brand_1 flex-1 sm:flex-none"
              >
                حفظ المعاملة
              </button>
              <button
                onClick={() => setTxnDialogOpen(false)}
                className="border border-brand_1 text-brand_1 px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base hover:bg-white flex-1 sm:flex-none"
              >
                إلغاء
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
