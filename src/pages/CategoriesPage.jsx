import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tags, Plus, Pencil, Trash2, Search } from "lucide-react";
import api from "@/lib/api";

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [search, setSearch] = useState("");

  const fetchCategories = async () => {
    try {
      const { data } = await api.get("/categories");
      setCategories(data);
    } catch (err) {
      /* */
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description || "" });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, form);
      } else {
        await api.post("/categories", form);
      }
      setDialogOpen(false);
      fetchCategories();
    } catch (err) {
      /* */
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الصنف؟")) return;
    try {
      await api.delete(`/categories/${id}`);
      fetchCategories();
    } catch (err) {
      /* */
    }
  };

  const filtered =
    categories.filter(
      (c) => c.name?.includes(search) || c.description?.includes(search),
    ) || [];

  return (
    <div className="space-y-10 p-4" data-testid="categories-page">
      {" "}
      {/* Increased spacing and padding */}
      <div className="flex items-center justify-between flex-wrap gap-5">
        {" "}
        {/* Increased gap */}
        <h1 className="text-4xl font-bold text-brand_1 font-['Tajawal']">
          {" "}
          {/* Increased title size to text-4xl */}
          الأصناف
        </h1>
        <button
          data-testid="add-category-btn"
          onClick={openCreate}
          className="flex items-center gap-3 bg-brand_1 text-white px-6 py-3 rounded-lg text-lg font-bold hover:opacity-90 transition-opacity shadow-sm" // Increased size, padding, and weight
        >
          <Plus className="w-6 h-6" /> إضافة صنف {/* Enlarged icon */}
        </button>
      </div>
      <div className="flex items-center gap-4 bg-white border-2 border-brand_1 rounded-lg px-5 py-3 max-w-xl shadow-sm">
        {" "}
        {/* Increased border, padding, and max-width */}
        <Search className="w-6 h-6 text-brand_1" /> {/* Enlarged search icon */}
        <Input
          data-testid="category-search"
          placeholder="بحث في الأصناف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-0 bg-transparent h-10 text-xl focus-visible:ring-0 p-0 placeholder:text-gray-400" // Increased height and text size
        />
      </div>
      {loading ? (
        <p className="text-brand_1 text-center py-20 text-2xl font-bold">
          جاري التحميل...
        </p> // Increased size and padding
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-brand_1">
          <Tags className="w-20 h-20 mx-auto mb-6 text-brand_1 opacity-50" />{" "}
          {/* Enlarged empty state icon */}
          <p className="text-2xl font-medium">لا توجد أصناف بعد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {" "}
          {/* Increased gap and adjusted breakpoints */}
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-white border-2 border-brand_1 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow" // Increased border, rounded corners, and padding
              data-testid={`category-card-${c.id}`}
            >
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-5">
                  <h3 className="text-2xl font-extrabold text-brand_1">
                    {c.name}
                  </h3>{" "}
                  {/* Increased name size to text-2xl */}
                </div>
                <div className="flex items-center gap-3">
                  {" "}
                  {/* Increased gap between actions */}
                  <button
                    data-testid={`edit-category-${c.id}`}
                    onClick={() => openEdit(c)}
                    className="p-3 rounded-lg text-brand_1 hover:bg-brand_1/10 transition-colors border border-transparent hover:border-brand_1/20" // Increased padding
                  >
                    <Pencil className="w-6 h-6" />
                  </button>
                  <button
                    data-testid={`delete-category-${c.id}`}
                    onClick={() => handleDelete(c.id)}
                    className="p-3 rounded-lg text-red-500 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
              </div>
              {c.description && (
                <p className="text-lg text-brand_1 leading-relaxed">
                  {c.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl p-8" dir="rtl">
          {" "}
          {/* Increased max-width and padding */}
          <DialogHeader className="mb-6">
            <DialogTitle className="text-3xl font-bold text-brand_1 font-['Tajawal']">
              {" "}
              {/* Increased dialog title size */}
              {editing ? "تعديل الصنف" : "إضافة صنف جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-lg font-bold text-brand_1 block">
                {" "}
                {/* Increased label size and weight */}
                اسم الصنف *
              </label>
              <Input
                data-testid="category-name-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border-2 border-brand_1 h-14 text-xl rounded-lg px-4" // Increased height, border, and text size
              />
            </div>
            <div className="space-y-2">
              <label className="text-lg font-bold text-brand_1 block">
                الوصف
              </label>
              <Input
                data-testid="category-description-input"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="border-2 border-brand_1 h-14 text-xl rounded-lg px-4"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-4 sm:justify-start mt-8">
            {" "}
            {/* Increased gap and margin */}
            <button
              data-testid="save-category-btn"
              onClick={handleSubmit}
              className="bg-brand_1 text-white px-8 py-3 rounded-lg text-lg font-bold hover:opacity-90 transition-opacity min-w-[120px]" // Increased padding and size
            >
              {editing ? "تحديث" : "إضافة"}
            </button>
            <button
              onClick={() => setDialogOpen(false)}
              className="border-2 border-brand_1 text-brand_1 px-8 py-3 rounded-lg text-lg font-bold hover:bg-brand_1/5 transition-colors min-w-[120px]"
            >
              إلغاء
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
