import React, { useRef, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { aiCatalogService } from '../../services/aiCatalogService';

interface ImageFileInputProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export const ImageFileInput: React.FC<ImageFileInputProps> = ({
  value,
  onChange,
  label,
  placeholder = 'اختر صورة من جهازك أو أدخل الرابط...',
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    e.target.value = '';
    setIsUploading(true);
    try {
      const compressedDataUrl = await aiCatalogService.compressImage(file, 1080, 0.78);
      if (compressedDataUrl) {
        const finalUrl = await aiCatalogService.uploadExtractedImage(compressedDataUrl, 'asset');
        onChange(finalUrl || compressedDataUrl);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="text-xs font-bold text-[#2D2D24] block mb-1">{label}</label>}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="bg-[#E5E2D9] hover:bg-[#D4D1C5] disabled:opacity-60 text-[#2D2D24] border border-[#D4D1C5] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer shadow-xs"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 text-[#046A47] animate-spin" />
          ) : (
            <Upload className="w-4 h-4 text-[#5A5A40]" />
          )}
          <span>{isUploading ? 'جاري الرفع...' : 'رفع صورة من الجهاز'}</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex-1 relative">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full p-2.5 bg-[#F1EFEC] border border-[#D4D1C5] rounded-xl text-xs text-[#2D2D24] focus:ring-2 focus:ring-[#5A5A40] focus:outline-none pl-8"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute left-2.5 top-2.5 text-[#8A8A6D] hover:text-[#2D2D24]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {value && (
        <div className="flex items-center gap-3 p-2 bg-[#FAF8F5] border border-[#E5E2D9] rounded-xl">
          <div className="w-12 h-12 bg-white rounded-lg border border-[#D4D1C5] p-1 flex items-center justify-center overflow-hidden shrink-0">
            <img src={value} alt="Preview" className="w-full h-full object-contain" />
          </div>
          <div className="text-[11px] text-[#5A5A40] font-bold truncate flex-1">
            {value.startsWith('data:image')
              ? '✅ صورة مرفوعة ومضغوطة بنجاح'
              : '✅ رابط صورة جاهز (سحابي / خارجي)'}
          </div>
        </div>
      )}
    </div>
  );
};
