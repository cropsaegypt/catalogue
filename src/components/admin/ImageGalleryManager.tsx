import React, { useState } from 'react';
import { Image as ImageIcon, Plus, Trash2, Building2, Eye, Sparkles, Loader2 } from 'lucide-react';
import { CompanyImage, Company, Product } from '../../types';
import { ImageFileInput } from '../common/ImageFileInput';
import { aiCatalogService } from '../../services/aiCatalogService';

interface ImageGalleryManagerProps {
  images: CompanyImage[];
  companies: Company[];
  products: Product[];
  onSaveImages: (images: CompanyImage[]) => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

export const ImageGalleryManager: React.FC<ImageGalleryManagerProps> = ({
  images = [],
  companies = [],
  products = [],
  onSaveImages,
  onShowToast,
}) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companies.length > 0 ? companies[0].id : '');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [cleaningImgId, setCleaningImgId] = useState<string | null>(null);

  const companyImages = images.filter((img) => img.companyId === selectedCompanyId);

  const handleAddImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImageUrl) return;

    const newImage: CompanyImage = {
      id: 'IMG-' + Date.now(),
      companyId: selectedCompanyId,
      fileName: newFileName || `image-${Date.now()}.jpg`,
      url: newImageUrl,
      thumbnailUrl: newImageUrl,
      altText: newFileName || 'صورة مخصب',
      createdAt: new Date().toISOString(),
    };

    onSaveImages([newImage, ...images]);
    setNewImageUrl('');
    setNewFileName('');
    onShowToast('تم إضافة الصورة لمعرض الشركة بنجاح', 'success');
  };

  const handleDeleteImage = (imageId: string) => {
    const referencingProducts = products.filter((p) => p.mainImageUrl === images.find((i) => i.id === imageId)?.url);
    if (referencingProducts.length > 0) {
      if (!confirm(`تحذير: هذه الصورة مستخدمة بواسطة ${referencingProducts.length} منتج. هل تريد تأكيد الحذف؟`)) {
        return;
      }
    }

    onSaveImages(images.filter((i) => i.id !== imageId));
    onShowToast('تم حذف الصورة من المعرض', 'success');
  };

  return (
    <div className="space-y-6 dir-rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FAF8F5] p-6 rounded-3xl border border-[#E5E2D9] shadow-xs">
        <div>
          <h2 className="text-xl font-black text-[#2D2D24] flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#5A5A40]" />
            <span>معرض صور الشركات المصنعة</span>
          </h2>
          <p className="text-xs text-[#8A8A6D] font-medium">رفع وإدارة الصور الخاصة بكل شركة واستخدامها بالمنتجات والكتالوج</p>
        </div>

        {/* Company Selector */}
        <div className="flex items-center gap-2 bg-[#E5E2D9] p-2 rounded-2xl border border-[#D4D1C5]">
          <Building2 className="w-4 h-4 text-[#5A5A40]" />
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="bg-white border border-[#D4D1C5] text-[#2D2D24] font-bold text-xs rounded-xl px-3 py-1.5 focus:outline-none"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Upload New Image Box */}
      <form onSubmit={handleAddImage} className="bg-[#FAF8F5] p-5 rounded-3xl border border-[#E5E2D9] shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-[#2D2D24]">إضافة صورة جديدة لمعرض الشركة المحددة:</h3>
        <div className="space-y-3">
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="اسم الملف (مثال: triton-k.jpg)"
            className="w-full p-3 bg-[#F1EFEC] border border-[#D4D1C5] rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#5A5A40] focus:outline-none"
          />

          <ImageFileInput
            value={newImageUrl}
            onChange={setNewImageUrl}
            label="اختر صورة من الجهاز مباشرة:"
          />

          <button
            type="submit"
            className="bg-[#046A47] hover:bg-[#035237] text-[#F9F8F6] font-bold text-xs px-6 py-3 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>حفظ بالمعرض</span>
          </button>
        </div>
      </form>

      {/* Images Grid */}
      <div className="bg-[#FAF8F5] p-6 rounded-3xl border border-[#E5E2D9] shadow-xs space-y-4">
        <span className="text-xs font-bold text-[#8A8A6D] block">
          معرض الصور الحالي ({companyImages.length} صورة مخصصة لهذه الشركة):
        </span>

        {companyImages.length === 0 ? (
          <div className="text-center py-10 text-[#8A8A6D] text-xs font-semibold">
            لا توجد صور مرفوعة في معرض هذه الشركة حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {companyImages.map((img) => {
              const usageCount = products.filter((p) => p.mainImageUrl === img.url).length;

              return (
                <div
                  key={img.id}
                  className="bg-[#E5E2D9]/40 p-3 rounded-2xl border border-[#D4D1C5] flex flex-col justify-between space-y-2 group"
                >
                  <div className="h-32 w-full flex items-center justify-center overflow-hidden rounded-xl bg-[repeating-conic-gradient(#f3f4f6_0%_25%,#ffffff_0%_50%)] bg-[length:12px_12px] p-1">
                    <img src={img.url} alt={img.altText} className="max-h-full max-w-full object-contain" />
                  </div>

                  <div>
                    <span className="text-xs font-bold text-[#2D2D24] block truncate">{img.fileName}</span>
                    <span className="text-[10px] text-[#8A8A6D] font-medium">مستخدمة بـ {usageCount} منتجات</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#D4D1C5]">
                    <a
                      href={img.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-[#8A8A6D] hover:text-[#2D2D24]"
                      title="معاينة المباشرة"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                    <button
                      type="button"
                      disabled={cleaningImgId === img.id}
                      onClick={async () => {
                        setCleaningImgId(img.id);
                        try {
                          const cleaned = await aiCatalogService.cleanBackgroundAndUpload(
                            img.url,
                            `gal-${img.id}`
                          );
                          if (cleaned) {
                            onSaveImages(
                              images.map((item) =>
                                item.id === img.id
                                  ? { ...item, url: cleaned, thumbnailUrl: cleaned }
                                  : item
                              )
                            );
                            onShowToast('تم إزالة الخلفية وتحديث الصورة في المعرض', 'success');
                          } else {
                            onShowToast('الصورة شفافة بالفعل أو لا تحتوي على خلفية موحدة للإزالة', 'error');
                          }
                        } finally {
                          setCleaningImgId(null);
                        }
                      }}
                      className="px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#046A47] border border-emerald-200 text-[10px] font-black flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      title="إزالة خلفية الصورة"
                    >
                      {cleaningImgId === img.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      <span>تفريغ</span>
                    </button>
                    <button
                      onClick={() => handleDeleteImage(img.id)}
                      className="p-1 text-amber-900 hover:text-amber-950"
                      title="حذف الصورة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
