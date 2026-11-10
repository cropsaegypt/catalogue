import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronRight, ChevronLeft } from 'lucide-react';

interface ImageZoomModalProps {
  isOpen: boolean;
  images: string[];
  initialIndex?: number;
  title?: string;
  onClose: () => void;
}

export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({
  isOpen,
  images,
  initialIndex = 0,
  title = 'معاينة وتكبير الصورة',
  onClose,
}) => {
  if (!isOpen || !images || images.length === 0) return null;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);

  const currentImage = images[currentIndex] || images[0];

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.3, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.3, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1);
  };

  const handleNext = () => {
    setScale(1);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    setScale(1);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md dir-rtl animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[85vh] bg-[#1F2937] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between border border-emerald-500/30">
        {/* Top Controls Bar */}
        <div className="p-4 bg-gray-900/90 border-b border-gray-800 text-white flex items-center justify-between z-10">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-emerald-400">{title}</h3>
            {images.length > 1 && (
              <p className="text-xs text-gray-400">صورة {currentIndex + 1} من {images.length}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center bg-gray-800 p-1 rounded-xl border border-gray-700">
              <button
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-gray-700 text-emerald-400 rounded-lg transition-colors"
                title="تكبير"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-gray-700 text-emerald-400 rounded-lg transition-colors"
                title="تصغير"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1.5 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                title="إعادة ضبط المقاس"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-xl transition-colors"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Image Stage */}
        <div className="relative flex-1 bg-black/40 flex items-center justify-center p-4 overflow-hidden select-none">
          {images.length > 1 && (
            <button
              onClick={handlePrev}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/60 hover:bg-emerald-600 text-white rounded-full transition-all shadow-lg cursor-pointer"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
            <img
              src={currentImage}
              alt="معاينة زووم"
              style={{ transform: `scale(${scale})` }}
              className="max-h-full max-w-full object-contain transition-transform duration-200 ease-out rounded-lg shadow-2xl"
            />
          </div>

          {images.length > 1 && (
            <button
              onClick={handleNext}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/60 hover:bg-emerald-600 text-white rounded-full transition-all shadow-lg cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Bottom Thumbnails Strip */}
        {images.length > 1 && (
          <div className="p-3 bg-gray-900/90 border-t border-gray-800 flex items-center justify-center gap-2 overflow-x-auto">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setScale(1);
                  setCurrentIndex(idx);
                }}
                className={`w-14 h-14 rounded-xl border-2 overflow-hidden shrink-0 transition-all ${
                  idx === currentIndex ? 'border-emerald-500 scale-105 shadow-md' : 'border-gray-700 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt="مصغرة" className="w-full h-full object-contain bg-white" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
