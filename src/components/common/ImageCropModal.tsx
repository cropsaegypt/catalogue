import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Check, Move } from 'lucide-react';

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (croppedDataUrl: string) => void;
  title?: string;
}

const PREVIEW_SIZE = 260;
const OUTPUT_SIZE = 512;

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  onCancel,
  onConfirm,
  title = 'قص وتظبيط الشعار داخل الدائرة',
}) => {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number }>({ w: 1, h: 1 });
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [bgMode, setBgMode] = useState<'white' | 'transparent'>('white');
  const [isDragging, setIsDragging] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    if (!isOpen || !imageSrc) return;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  // Base cover scale so natural image fills the 260px square at zoom = 1
  const baseCoverScale = Math.max(
    PREVIEW_SIZE / (naturalSize.w || 1),
    PREVIEW_SIZE / (naturalSize.h || 1)
  );
  const effectiveScale = baseCoverScale * zoom;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      origX: offset.x,
      origY: offset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset({
      x: dragStartRef.current.origX + dx,
      y: dragStartRef.current.origY + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if not captured
      }
    }
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleBakeCrop = () => {
    const img = imgRef.current;
    if (!img || !naturalSize.w || !naturalSize.h) return;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = OUTPUT_SIZE / PREVIEW_SIZE;
    const drawW = naturalSize.w * effectiveScale * ratio;
    const drawH = naturalSize.h * effectiveScale * ratio;
    const drawX = OUTPUT_SIZE / 2 + offset.x * ratio - drawW / 2;
    const drawY = OUTPUT_SIZE / 2 + offset.y * ratio - drawH / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (bgMode === 'white') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    } else {
      ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/webp', 0.9);
    onConfirm(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 dir-rtl">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-stone-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-base font-black text-stone-900">{title}</h3>
            <p className="text-[11px] text-stone-500 font-medium">
              اسحب الصورة وحرّك شريط التكبير ليظهر الجزء المطلوب داخل الدائرة بالضبط
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Circular Interactive Viewport */}
        <div className="flex flex-col items-center justify-center gap-3">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE, touchAction: 'none' }}
            className={`relative rounded-full overflow-hidden border-4 border-[#046A47] shadow-lg select-none cursor-grab active:cursor-grabbing ${
              bgMode === 'white'
                ? 'bg-white'
                : 'bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#ffffff_0%_50%)] bg-[length:14px_14px]'
            }`}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              draggable={false}
              onLoad={(e) => {
                const el = e.currentTarget;
                setNaturalSize({ w: el.naturalWidth || 1, h: el.naturalHeight || 1 });
              }}
              style={{
                width: naturalSize.w * effectiveScale,
                height: naturalSize.h * effectiveScale,
                maxWidth: 'none',
                maxHeight: 'none',
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                pointerEvents: 'none',
              }}
            />

            {/* Subtle Guide Ring */}
            <div className="absolute inset-0 rounded-full ring-1 ring-inset ring-black/10 pointer-events-none" />
          </div>

          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-400">
            <Move className="w-3.5 h-3.5" />
            <span>اسحب الصورة بالماوس أو الإصبع لضبط الموضع</span>
          </span>
        </div>

        {/* Controls */}
        <div className="space-y-3 bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80">
          {/* Zoom Slider */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
              className="p-1.5 bg-white border border-stone-200 rounded-lg text-stone-700 hover:bg-stone-100 cursor-pointer"
              title="تصغير"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min={0.4}
              max={3}
              step={0.02}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-[#046A47] cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, Number((z + 0.1).toFixed(2))))}
              className="p-1.5 bg-white border border-stone-200 rounded-lg text-stone-700 hover:bg-stone-100 cursor-pointer"
              title="تكبير"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Background Mode + Center Reset */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-stone-500">خلفية الدائرة:</span>
              <button
                type="button"
                onClick={() => setBgMode('white')}
                className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer border ${
                  bgMode === 'white'
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-white text-stone-700 border-stone-200'
                }`}
              >
                أبيض نظيف
              </button>
              <button
                type="button"
                onClick={() => setBgMode('transparent')}
                className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer border ${
                  bgMode === 'transparent'
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-white text-stone-700 border-stone-200'
                }`}
              >
                شفاف
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
              className="inline-flex items-center gap-1 font-bold text-[#046A47] hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>توسيط</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-bold text-stone-700 cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleBakeCrop}
            className="px-5 py-2.5 bg-[#046A47] hover:bg-[#035237] rounded-xl text-xs font-black text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>قص واعتماد الشعار</span>
          </button>
        </div>
      </div>
    </div>
  );
};
