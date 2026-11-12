import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Building2, Globe, Phone, FolderOpen } from 'lucide-react';
import { Company, Category, Product, Package, PriceHistory, CompanyImage, CompanySubCategory } from '../../types';
import { CompanyProfileHub } from './CompanyProfileHub';
import { ImageFileInput } from '../common/ImageFileInput';

interface CompanyManagerProps {
  companies: Company[];
  categories: Category[];
  subCategories?: CompanySubCategory[];
  products: Product[];
  packages: Package[];
  priceHistory: PriceHistory[];
  images: CompanyImage[];
  onSaveCompanies: (companies: Company[]) => void;
  onSaveProducts?: (products: Product[]) => void;
  onSavePackages?: (packages: Package[]) => void;
  onSaveSubCategories?: (subs: CompanySubCategory[]) => void;
  onAddPriceHistory?: (entry: Omit<PriceHistory, 'id' | 'createdAt'>) => void;
  onBatchUpdatePrices: (
    updates: { productId: string; packageId: string; newPrice: number }[],
    source: 'manual' | 'excel',
    updatedBy: string
  ) => { updatedCount: number; errors: string[] };
  onSaveImages: (images: CompanyImage[]) => void;
  onAddImportLog: (log: any) => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

export const CompanyManager: React.FC<CompanyManagerProps> = ({
  companies = [],
  categories = [],
  subCategories = [],
  products = [],
  packages = [],
  priceHistory = [],
  images = [],
  onSaveCompanies,
  onSaveProducts,
  onSavePackages,
  onSaveSubCategories,
  onAddPriceHistory,
  onBatchUpdatePrices,
  onSaveImages,
  onAddImportLog,
  onShowToast,
}) => {
  const [activeCompanyHub, setActiveCompanyHub] = useState<Company | null>(null);


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [website, setWebsite] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const openAddModal = () => {
    setEditingCompany(null);
    setName('');
    setDescription('');
    setLogoUrl('');
    setWebsite('');
    setContactInfo('');
    setSelectedCategoryIds([]);
    setIsModalOpen(true);
  };

  const openEditModal = (comp: Company) => {
    setEditingCompany(comp);
    setName(comp.name);
    setDescription(comp.description || '');
    setLogoUrl(comp.logoUrl || '');
    setWebsite(comp.website || '');
    setContactInfo(comp.contactInfo || '');
    setSelectedCategoryIds(comp.categoryIds || []);
    setIsModalOpen(true);
  };

  const toggleCategorySelection = (catId: string) => {
    if (selectedCategoryIds.includes(catId)) {
      setSelectedCategoryIds(selectedCategoryIds.filter((id) => id !== catId));
    } else {
      setSelectedCategoryIds([...selectedCategoryIds, catId]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let updatedList: Company[];

    if (editingCompany) {
      updatedList = companies.map((c) =>
        c.id === editingCompany.id
          ? {
              ...c,
              name,
              description,
              logoUrl,
              website,
              contactInfo,
              categoryIds: selectedCategoryIds,
              updatedAt: new Date().toISOString(),
            }
          : c
      );
      onShowToast('تم تحديث بيانات الشركة بنجاح', 'success');
    } else {
      const newComp: Company = {
        id: 'COMP-' + String(companies.length + 1).padStart(2, '0'),
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        logoUrl,
        description,
        website,
        contactInfo,
        categoryIds: selectedCategoryIds,
        displayOrder: companies.length + 1,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedList = [...companies, newComp];
      onShowToast('تم إضافة شركة جديدة بنجاح', 'success');
    }

    onSaveCompanies(updatedList);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت تأكد من حذف هذه الشركة؟')) {
      const updated = companies.filter((c) => c.id !== id);
      onSaveCompanies(updated);
      onShowToast('تم حذف الشركة', 'success');
    }
  };

  // If a specific company profile hub is active, render the dedicated hub!
  if (activeCompanyHub) {
    return (
      <CompanyProfileHub
        company={activeCompanyHub}
        categories={categories}
        subCategories={subCategories}
        products={products}
        packages={packages}
        priceHistory={priceHistory}
        images={images}
        onBack={() => setActiveCompanyHub(null)}
        onBatchUpdatePrices={onBatchUpdatePrices}
        onSaveProducts={onSaveProducts}
        onSavePackages={onSavePackages}
        onSaveSubCategories={onSaveSubCategories}
        onAddPriceHistory={onAddPriceHistory}
        onSaveImages={onSaveImages}
        onAddImportLog={onAddImportLog}
        onShowToast={onShowToast}
      />
    );
  }


  return (
    <div className="space-y-6 dir-rtl">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#FAF8F5] p-6 rounded-3xl border border-[#E5E2D9] shadow-xs">
        <div>
          <h2 className="text-xl font-black text-[#2D2D24] flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#046A47]" />
            <span>إدارة ومعارض ملفات الشركات المصنعة</span>
          </h2>
          <p className="text-xs text-[#5A5A40] font-medium">كل شركة لها ملف شامل يحتوي الأسعار، الصور، والشيتات الخاصة بها</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-[#046A47] hover:bg-[#035237] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة شركة جديدة</span>
        </button>
      </div>

      {/* Companies Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {companies.map((comp) => {
          const compCategories = categories.filter((cat) => comp.categoryIds?.includes(cat.id));
          const compProdsCount = products.filter((p) => p.companyId === comp.id).length;

          return (
            <div
              key={comp.id}
              className="bg-[#FAF8F5] rounded-3xl border border-[#E5E2D9] p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-white rounded-2xl p-1 border border-[#D4D1C5] flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                    {comp.logoUrl ? (
                      <img src={comp.logoUrl} alt={comp.name} className="w-full h-full object-contain rounded-lg" />
                    ) : (
                      <Building2 className="w-7 h-7 text-[#046A47]" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-[#2D2D24]">{comp.name}</h3>
                    <p className="text-xs text-[#5A5A40] font-medium mt-0.5">{comp.description || 'لا يوجد وصف متاح'}</p>
                    <span className="text-[11px] font-bold text-[#046A47] block mt-1">
                      إجمالي المنتجات المتاحة: {compProdsCount} منتجات
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEditModal(comp)}
                    className="p-2 bg-[#E5E2D9] hover:bg-[#D4D1C5] text-[#2D2D24] rounded-xl"
                    title="تعديل بيانات الشركة"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(comp.id)}
                    className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Category associations & Open Hub Button */}
              <div className="pt-3 border-t border-[#E5E2D9] flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1">
                  {compCategories.map((cat) => (
                    <span
                      key={cat.id}
                      className="bg-[#E5E2D9] text-[#2D2D24] border border-[#D4D1C5] text-[10px] font-bold px-2 py-0.5 rounded-full"
                    >
                      {cat.name}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => setActiveCompanyHub(comp)}
                  className="bg-[#046A47] hover:bg-[#035237] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>فتح ملف الشركة الشامل</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 dir-rtl">
          <div className="bg-[#FAF8F5] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto border border-[#E5E2D9]">
            <h3 className="text-lg font-black text-[#2D2D24]">
              {editingCompany ? 'تعديل شركة' : 'إضافة شركة جديدة'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#2D2D24] block mb-1">اسم الشركة *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 bg-[#F1EFEC] border border-[#D4D1C5] rounded-xl text-sm font-bold text-[#2D2D24]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#2D2D24] block mb-1">ربط بالأقسام الرئيسية (تعدد الخيارات)</label>
                <div className="grid grid-cols-2 gap-2 border border-[#D4D1C5] p-3 rounded-xl max-h-36 overflow-y-auto bg-white">
                  {categories.filter((cat) => !cat.parentId).map((cat) => (
                    <label key={cat.id} className="flex items-center gap-2 text-xs font-semibold text-[#2D2D24] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCategoryIds.includes(cat.id)}
                        onChange={() => toggleCategorySelection(cat.id)}
                        className="rounded text-[#046A47] focus:ring-[#046A47] w-4 h-4"
                      />
                      <span>{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#2D2D24] block mb-1">وصف ملخص للشركة</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 bg-[#F1EFEC] border border-[#D4D1C5] rounded-xl text-sm text-[#2D2D24]"
                />
              </div>

              {/* Logo File Upload using ImageFileInput with interactive circular cropper */}
              <ImageFileInput
                value={logoUrl}
                onChange={setLogoUrl}
                cropShape="circle"
                label="شعار/لوجو الشركة (اختر الصورة وقصها داخل الدائرة):"
              />

              <div>
                <label className="text-xs font-bold text-[#2D2D24] block mb-1">الموقع الإلكتروني</label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://company.com"
                  className="w-full p-3 bg-[#F1EFEC] border border-[#D4D1C5] rounded-xl text-sm text-[#2D2D24]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-[#E5E2D9] hover:bg-[#D4D1C5] rounded-xl text-xs font-bold text-[#2D2D24]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#046A47] hover:bg-[#035237] rounded-xl text-xs font-bold text-white shadow-xs"
                >
                  حفظ الشركة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
