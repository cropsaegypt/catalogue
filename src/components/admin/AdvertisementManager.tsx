import React, { useState } from 'react';
import { Megaphone, Plus, Edit2, Trash2, Eye } from 'lucide-react';
import { Advertisement } from '../../types';

interface AdvertisementManagerProps {
  advertisements: Advertisement[];
  onSaveAdvertisements: (ads: Advertisement[]) => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

export const AdvertisementManager: React.FC<AdvertisementManagerProps> = ({
  advertisements,
  onSaveAdvertisements,
  onShowToast,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [desktopImageUrl, setDesktopImageUrl] = useState('');
  const [active, setActive] = useState(true);

  const openAddModal = () => {
    setEditingAd(null);
    setTitle('');
    setDescription('');
    setDesktopImageUrl('');
    setActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (ad: Advertisement) => {
    setEditingAd(ad);
    setTitle(ad.title);
    setDescription(ad.description || '');
    setDesktopImageUrl(ad.desktopImageUrl || '');
    setActive(ad.active);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let updatedList: Advertisement[];

    if (editingAd) {
      updatedList = advertisements.map((a) =>
        a.id === editingAd.id
          ? {
              ...a,
              title,
              description,
              desktopImageUrl,
              active,
            }
          : a
      );
      onShowToast('تم تحديث الإعلان بنجاح', 'success');
    } else {
      const newAd: Advertisement = {
        id: 'ADV-' + Date.now(),
        title,
        description,
        desktopImageUrl,
        active,
        showOnline: true,
        showPdf: true,
        placementType: 'after_product_count',
        placementValue: 4,
        displayOrder: advertisements.length + 1,
      };
      updatedList = [...advertisements, newAd];
      onShowToast('تم إضافة الإعلان بنجاح', 'success');
    }

    onSaveAdvertisements(updatedList);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('هل تريد تأكيد حذف هذا الإعلان؟')) {
      onSaveAdvertisements(advertisements.filter((a) => a.id !== id));
      onShowToast('تم حذف الإعلان', 'success');
    }
  };

  return (
    <div className="space-y-6 dir-rtl">
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-emerald-950 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-emerald-600" />
            <span>إدارة البنرات والإعلانات</span>
          </h2>
          <p className="text-xs text-gray-500 font-medium">إضافة إعلانات تظهر بين المنتجات وفي ملف الكتالوج الـ PDF</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة إعلان جديد</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {advertisements.map((ad) => (
          <div key={ad.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base text-emerald-950">{ad.title}</h3>
                <p className="text-xs text-gray-500">{ad.description || '-'}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(ad)}
                  className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-xs"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(ad.id)}
                  className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {ad.desktopImageUrl && (
              <img src={ad.desktopImageUrl} alt={ad.title} className="w-full h-32 object-cover rounded-xl border" />
            )}
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-emerald-950">{editingAd ? 'تعديل الإعلان' : 'إعلان جديد'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">عنوان الإعلان *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">وصف الإعلان</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">رابط صورة البنر</label>
                <input
                  type="url"
                  value={desktopImageUrl}
                  onChange={(e) => setDesktopImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-3 border rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-bold text-gray-700"
                >
                  إلغاء
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold">
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
