import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  CornerDownLeft,
  FolderPlus,
  Image as ImageIcon,
} from 'lucide-react';
import { Category, Product } from '../../types';
import { ImageFileInput } from '../common/ImageFileInput';
import {
  getMainCategories,
  getSubCategories,
  getProductMainCategoryId,
  getProductSubCategoryId,
} from '../../utils/categoryHierarchy';

interface CategoryManagerProps {
  categories: Category[];
  products?: Product[];
  onSaveCategories: (categories: Category[]) => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  products = [],
  onSaveCategories,
  onShowToast,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [parentId, setParentId] = useState<string>('');

  const mainCategories = [...getMainCategories(categories)].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );

  const getMainProductCount = (mainId: string) =>
    products.filter((p) => getProductMainCategoryId(p, categories) === mainId).length;

  const getSubProductCount = (subId: string) =>
    products.filter((p) => getProductSubCategoryId(p, categories) === subId).length;

  const openAddMainModal = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setImageUrl('');
    setParentId('');
    setIsModalOpen(true);
  };

  const openAddSubModal = (defaultParentId?: string) => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setImageUrl('');
    setParentId(defaultParentId || mainCategories[0]?.id || '');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description);
    setImageUrl(cat.imageUrl || '');
    setParentId(cat.parentId || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const cleanParentId = parentId.trim() || undefined;
    let updatedList: Category[];

    if (editingCategory) {
      // Avoid accidental self-parenting
      const safeParentId = cleanParentId === editingCategory.id ? undefined : cleanParentId;
      updatedList = categories.map((c) =>
        c.id === editingCategory.id
          ? {
              ...c,
              name: name.trim(),
              description: description.trim(),
              imageUrl,
              parentId: safeParentId,
              updatedAt: new Date().toISOString(),
            }
          : c
      );
      onShowToast(
        safeParentId ? 'تم تحديث بيانات القسم الفرعي بنجاح' : 'تم تحديث بيانات القسم الرئيسي بنجاح',
        'success'
      );
    } else {
      const siblingCount = cleanParentId
        ? getSubCategories(categories, cleanParentId).length
        : mainCategories.length;
      const newCat: Category = {
        id: (cleanParentId ? 'SUB-' : 'CAT-') + Date.now().toString().slice(-6),
        name: name.trim(),
        slug:
          name
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-') +
          '-' +
          Date.now().toString().slice(-3),
        description: description.trim(),
        imageUrl,
        ...(cleanParentId ? { parentId: cleanParentId } : {}),
        displayOrder: siblingCount + 1,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedList = [...categories, newCat];
      onShowToast(
        cleanParentId ? 'تمت إضافة القسم الفرعي بنجاح' : 'تم إضافة قسم رئيسي جديد بنجاح',
        'success'
      );
    }

    onSaveCategories(updatedList);
    setIsModalOpen(false);
  };

  const handleDelete = (cat: Category) => {
    const childSubs = !cat.parentId ? getSubCategories(categories, cat.id) : [];
    const confirmMsg =
      childSubs.length > 0
        ? `هل أنت متأكد من حذف القسم الرئيسي "${cat.name}" وعدد (${childSubs.length}) قسم فرعي تابع له؟`
        : `هل أنت متأكد من حذف "${cat.name}"؟`;

    if (confirm(confirmMsg)) {
      const updated = categories.filter((c) => c.id !== cat.id && c.parentId !== cat.id);
      onSaveCategories(updated);
      onShowToast('تم الحذف بنجاح', 'success');
    }
  };

  const handleMoveWithinGroup = (
    siblings: Category[],
    index: number,
    direction: 'up' | 'down'
  ) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    const reordered = [...siblings];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const orderMap = new Map<string, number>();
    reordered.forEach((c, idx) => orderMap.set(c.id, idx + 1));

    const updated = categories
      .map((c) => (orderMap.has(c.id) ? { ...c, displayOrder: orderMap.get(c.id)! } : c))
      .sort((a, b) => {
        const aIsSub = a.parentId ? 1 : 0;
        const bIsSub = b.parentId ? 1 : 0;
        if (aIsSub !== bIsSub) return aIsSub - bIsSub;
        return a.displayOrder - b.displayOrder;
      });

    onSaveCategories(updated);
    onShowToast('تم إعادة الترتيب', 'success');
  };

  const editingHasChildren = editingCategory
    ? getSubCategories(categories, editingCategory.id).length > 0
    : false;

  const totalSubCount = getSubCategories(categories).length;

  return (
    <div className="space-y-6 dir-rtl">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-emerald-950 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <span>
              إدارة الأقسام الرئيسية والفرعية ({mainCategories.length} رئيسي • {totalSubCount} فرعي)
            </span>
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            أنشئ الأقسام الرئيسية وأضف تحت كل قسم أي عدد من الأقسام الفرعية لتنظيم الكتالوج
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mainCategories.length > 0 && (
            <button
              type="button"
              onClick={() => openAddSubModal()}
              className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>+ إضافة قسم فرعي</span>
            </button>
          )}

          <button
            type="button"
            onClick={openAddMainModal}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة قسم رئيسي</span>
          </button>
        </div>
      </div>

      {/* Hierarchical Tree List */}
      <div className="space-y-3">
        {mainCategories.length === 0 ? (
          <div className="bg-white rounded-3xl border border-emerald-100 p-10 text-center text-sm font-bold text-gray-500">
            لا توجد أقسام بعد. ابدأ بإضافة قسم رئيسي جديد.
          </div>
        ) : (
          mainCategories.map((mainCat, index) => {
            const subCats = [...getSubCategories(categories, mainCat.id)].sort(
              (a, b) => a.displayOrder - b.displayOrder
            );
            const mainProdCount = getMainProductCount(mainCat.id);

            return (
              <div
                key={mainCat.id}
                className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden"
              >
                {/* Main Category Row */}
                <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 bg-emerald-50/40">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg shrink-0">
                      #{index + 1}
                    </span>

                    <div className="w-11 h-11 rounded-2xl bg-white border border-emerald-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {mainCat.imageUrl ? (
                        <img
                          src={mainCat.imageUrl}
                          alt={mainCat.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-emerald-600/60" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-black text-emerald-950">{mainCat.name}</h3>
                        <span className="text-[11px] font-bold bg-white border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">
                          {mainProdCount} منتج
                        </span>
                        {subCats.length > 0 && (
                          <span className="text-[11px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                            {subCats.length} فرعي
                          </span>
                        )}
                      </div>
                      {mainCat.description && (
                        <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">
                          {mainCat.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openAddSubModal(mainCat.id)}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer"
                      title="إضافة قسم فرعي تحت هذا القسم"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>+ فرعي</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMoveWithinGroup(mainCategories, index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 bg-white hover:bg-gray-100 disabled:opacity-30 rounded-lg text-gray-700 border border-gray-200 cursor-pointer"
                      title="تحريك لأعلى"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveWithinGroup(mainCategories, index, 'down')}
                      disabled={index === mainCategories.length - 1}
                      className="p-1.5 bg-white hover:bg-gray-100 disabled:opacity-30 rounded-lg text-gray-700 border border-gray-200 cursor-pointer"
                      title="تحريك لأسفل"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(mainCat)}
                      className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg cursor-pointer"
                      title="تعديل"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(mainCat)}
                      className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg cursor-pointer"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Nested Sub-Categories List */}
                {subCats.length > 0 && (
                  <div className="divide-y divide-gray-100 border-t border-emerald-100 bg-white pr-6 sm:pr-10">
                    {subCats.map((sub, subIdx) => (
                      <div
                        key={sub.id}
                        className="p-3 sm:px-5 flex flex-wrap items-center justify-between gap-2 hover:bg-amber-50/30 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <CornerDownLeft className="w-4 h-4 text-amber-600 shrink-0" />
                          <span className="font-black text-sm text-stone-800">{sub.name}</span>
                          <span className="text-[11px] font-bold bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                            {getSubProductCount(sub.id)} منتج
                          </span>
                          {sub.description && (
                            <span className="text-[11px] text-gray-400 truncate max-w-xs hidden sm:inline">
                              — {sub.description}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleMoveWithinGroup(subCats, subIdx, 'up')}
                            disabled={subIdx === 0}
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-30 rounded-lg text-gray-700 cursor-pointer"
                            title="تحريك لأعلى"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveWithinGroup(subCats, subIdx, 'down')}
                            disabled={subIdx === subCats.length - 1}
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-30 rounded-lg text-gray-700 cursor-pointer"
                            title="تحريك لأسفل"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(sub)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg cursor-pointer"
                            title="تعديل القسم الفرعي"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(sub)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg cursor-pointer"
                            title="حذف القسم الفرعي"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-emerald-950">
              {editingCategory
                ? parentId
                  ? 'تعديل قسم فرعي'
                  : 'تعديل قسم رئيسي'
                : parentId
                  ? 'إضافة قسم فرعي جديد'
                  : 'إضافة قسم رئيسي جديد'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              {/* Parent Type Selector (Disabled if editing a main category that already has sub-categories) */}
              {!editingHasChildren && mainCategories.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    تصنيف القسم (رئيسي أم فرعي؟)
                  </label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className="w-full p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-sm font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="">قسم رئيسي مستقل</option>
                    {mainCategories
                      .filter((mc) => mc.id !== editingCategory?.id)
                      .map((mc) => (
                        <option key={mc.id} value={mc.id}>
                          قسم فرعي تابع لـ: {mc.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  {parentId ? 'اسم القسم الفرعي *' : 'اسم القسم الرئيسي *'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={parentId ? 'مثال: مبيدات فطرية / حشرية / هيوميك' : 'مثال: مبيدات زراعية'}
                  className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">وصف القسم</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {!parentId && (
                <ImageFileInput
                  value={imageUrl}
                  onChange={setImageUrl}
                  label="صورة القسم (ارفع ملف الصورة من جهازك مباشرة):"
                />
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-700 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer"
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
