import React, { useState } from 'react';
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, Layers, Image as ImageIcon } from 'lucide-react';
import { Category } from '../../types';
import { ImageFileInput } from '../common/ImageFileInput';

interface CategoryManagerProps {
  categories: Category[];
  onSaveCategories: (categories: Category[]) => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  onSaveCategories,
  onShowToast,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const openAddModal = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setImageUrl('');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description);
    setImageUrl(cat.imageUrl || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let updatedList: Category[];

    if (editingCategory) {
      updatedList = categories.map((c) =>
        c.id === editingCategory.id
          ? { ...c, name, description, imageUrl, updatedAt: new Date().toISOString() }
          : c
      );
      onShowToast('تم تحديث بيانات القسم بنجاح', 'success');
    } else {
      const newCat: Category = {
        id: 'CAT-' + String(categories.length + 1).padStart(2, '0'),
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        description,
        imageUrl,
        displayOrder: categories.length + 1,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedList = [...categories, newCat];
      onShowToast('تم إضافة قسم جديد بنجاح', 'success');
    }

    onSaveCategories(updatedList);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت تأكد من حذف هذا القسم؟')) {
      const updated = categories.filter((c) => c.id !== id);
      onSaveCategories(updated);
      onShowToast('تم حذف القسم', 'success');
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const updated = [...categories];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // re-assign display orders
    updated.forEach((c, idx) => (c.displayOrder = idx + 1));

    onSaveCategories(updated);
    onShowToast('تم إعادة ترتيب الأقسام', 'success');
  };

  return (
    <div className="space-y-6 dir-rtl">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-emerald-950 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <span>إدارة الأقسام الرئيسية</span>
          </h2>
          <p className="text-xs text-gray-500 font-medium">إضافة وتعديل ترتيب أقسام المنتجات في الكتالوج</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة قسم جديد</span>
        </button>
      </div>

      {/* Category List */}
      <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="bg-emerald-950 text-white text-xs font-bold">
            <tr>
              <th className="p-4">الترتيب</th>
              <th className="p-4">اسم القسم</th>
              <th className="p-4">الوصف</th>
              <th className="p-4 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.map((cat, index) => (
              <tr key={cat.id} className="hover:bg-emerald-50/40 transition-colors">
                <td className="p-4 font-mono text-xs font-bold text-gray-400">#{index + 1}</td>
                <td className="p-4 font-black text-emerald-950">{cat.name}</td>
                <td className="p-4 text-xs text-gray-600 max-w-xs truncate">{cat.description || '-'}</td>
                <td className="p-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleMove(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-30 rounded-lg text-gray-700"
                      title="تحريك لأعلى"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMove(index, 'down')}
                      disabled={index === categories.length - 1}
                      className="p-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-30 rounded-lg text-gray-700"
                      title="تحريك لأسفل"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(cat)}
                      className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg"
                      title="تعديل"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-emerald-950">
              {editingCategory ? 'تعديل قسم' : 'إضافة قسم جديد'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">اسم القسم *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">وصف القسم</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
              <ImageFileInput
                value={imageUrl}
                onChange={setImageUrl}
                label="صورة القسم الأيقونية الدائرية (ارفع ملف الصورة من جهازك مباشرة):"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 rounded-xl text-xs font-bold text-white shadow-md"
                >
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
