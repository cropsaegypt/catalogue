import React from 'react';
import {
  Maximize2,
  Minimize2,
  MoveVertical,
  Eye,
  Sliders,
  Check,
  Smartphone,
  Monitor,
} from 'lucide-react';
import {
  BannerImageSettings,
  getBannerHeightClass,
  getBannerPositionStyle,
} from '../../utils/bannerHelper';

interface BannerViewportSelectorProps {
  settings: BannerImageSettings;
  onChange: (updated: BannerImageSettings) => void;
  title?: string;
  showPreview?: boolean;
}

export const BannerViewportSelector: React.FC<BannerViewportSelectorProps> = ({
  settings,
  onChange,
  title = 'تحديد جزء الصورة المراد ظهوره وضبط الأبعاد',
  showPreview = true,
}) => {
  const [previewDevice, setPreviewDevice] = React.useState<'desktop' | 'mobile'>('desktop');

  const { position, height, fit, url } = settings;

  // Convert position to a slider percentage (0 to 100)
  const getSliderValue = (): number => {
    if (!position || position === 'center') return 50;
    if (position === 'top') return 10;
    if (position === 'bottom') return 90;
    if (position.endsWith('%')) {
      const parsed = parseInt(position, 10);
      return isNaN(parsed) ? 50 : Math.max(0, Math.min(100, parsed));
    }
    return 50;
  };

  const sliderVal = getSliderValue();

  const handleSliderChange = (newVal: number) => {
    let posStr: string;
    if (newVal <= 15) posStr = 'top';
    else if (newVal >= 85) posStr = 'bottom';
    else if (newVal >= 45 && newVal <= 55) posStr = 'center';
    else posStr = `${newVal}%`;

    onChange({
      ...settings,
      position: posStr,
    });
  };

  const handlePresetPosition = (pos: 'top' | 'center' | 'bottom') => {
    onChange({
      ...settings,
      position: pos,
    });
  };

  const handleHeightChange = (h: 'compact' | 'standard' | 'tall' | 'auto') => {
    onChange({
      ...settings,
      height: h,
    });
  };

  const handleFitChange = (f: 'cover' | 'contain') => {
    onChange({
      ...settings,
      fit: f,
    });
  };

  return (
    <div className="bg-[#FAF8F5] border border-[#E5E2D9] rounded-2xl p-4 space-y-4 text-xs font-bold text-gray-800 dir-rtl">
      <div className="flex items-center justify-between border-b border-gray-200/80 pb-2.5">
        <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-[#046A47]" />
          <span>{title}</span>
        </span>
        <span className="text-[10px] text-gray-500 font-medium">
          تحكم كامل في جزء الصورة والارتفاع
        </span>
      </div>

      {/* 1. Quick Focal Point Presets */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-black text-gray-700 block">
          جزء الصورة المطلوب ظهوره (Focal Point):
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handlePresetPosition('top')}
            className={`py-2 px-3 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              position === 'top' || sliderVal <= 20
                ? 'bg-[#046A47] text-white border-[#046A47] shadow-xs'
                : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300'
            }`}
          >
            <span>أعلى الصورة</span>
            <span>⬆️</span>
          </button>

          <button
            type="button"
            onClick={() => handlePresetPosition('center')}
            className={`py-2 px-3 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              position === 'center' || (sliderVal > 20 && sliderVal < 80)
                ? 'bg-[#046A47] text-white border-[#046A47] shadow-xs'
                : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300'
            }`}
          >
            <span>وسط الصورة</span>
            <span>⏺️</span>
          </button>

          <button
            type="button"
            onClick={() => handlePresetPosition('bottom')}
            className={`py-2 px-3 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              position === 'bottom' || sliderVal >= 80
                ? 'bg-[#046A47] text-white border-[#046A47] shadow-xs'
                : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300'
            }`}
          >
            <span>أسفل الصورة</span>
            <span>⬇️</span>
          </button>
        </div>
      </div>

      {/* 2. Fine-tuning Slider */}
      <div className="space-y-1 bg-white p-3 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-black text-gray-700 flex items-center gap-1">
            <MoveVertical className="w-3.5 h-3.5 text-[#046A47]" />
            <span>شريط ضبط الموضع الرأسي بدقة:</span>
          </span>
          <span className="font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
            {sliderVal}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={sliderVal}
          onChange={(e) => handleSliderChange(parseInt(e.target.value, 10))}
          className="w-full accent-[#046A47] cursor-pointer"
        />
        <div className="flex justify-between text-[9px] text-gray-400 font-bold">
          <span>0% (أعلى الصورة تماماً)</span>
          <span>50% (المنتصف)</span>
          <span>100% (أسفل الصورة تماماً)</span>
        </div>
      </div>

      {/* 3. Height & Fit Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Height */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-gray-700 block">
            ارتفاع مساحة البانر:
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'compact', label: 'مدمج (نحيف)', desc: '175px' },
              { id: 'standard', label: 'قياسي (المثالي)', desc: '240px' },
              { id: 'tall', label: 'عريض وبارز', desc: '320px' },
              { id: 'auto', label: 'أوتوماتيك كامل', desc: 'بدون قص' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleHeightChange(opt.id as any)}
                className={`p-2 rounded-xl border text-right transition-all cursor-pointer ${
                  height === opt.id
                    ? 'bg-emerald-50 text-emerald-950 border-[#046A47] ring-1 ring-[#046A47]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="font-black text-xs block leading-tight">{opt.label}</span>
                <span className="text-[9.5px] text-gray-400 font-mono block">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Fit Mode */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-gray-700 block">
            طريقة احتواء الصورة:
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleFitChange('cover')}
              className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                fit === 'cover'
                  ? 'bg-emerald-50 text-emerald-950 border-[#046A47] ring-1 ring-[#046A47]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="font-black text-xs block leading-tight">ملء المساحة (Cover)</span>
              <span className="text-[9.5px] text-gray-400 font-bold block mt-0.5">
                تغطي العرض كاملاً مع قص الجزء غير المطلوب
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleFitChange('contain')}
              className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                fit === 'contain'
                  ? 'bg-emerald-50 text-emerald-950 border-[#046A47] ring-1 ring-[#046A47]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="font-black text-xs block leading-tight">احتواء كامل (Contain)</span>
              <span className="text-[9.5px] text-gray-400 font-bold block mt-0.5">
                تظهر الصورة بالكامل دون قص أي طرف
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Live Interactive Preview */}
      {showPreview && url && (
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-gray-800 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-[#046A47]" />
              <span>معاينة حية ومباشرة للبانر الآن:</span>
            </span>
            <div className="flex bg-white rounded-xl border border-gray-200 p-0.5">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  previewDevice === 'desktop' ? 'bg-[#046A47] text-white shadow-2xs' : 'text-gray-500'
                }`}
              >
                <Monitor className="w-3 h-3" />
                <span>كمبيوتر</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  previewDevice === 'mobile' ? 'bg-[#046A47] text-white shadow-2xs' : 'text-gray-500'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                <span>موبايل</span>
              </button>
            </div>
          </div>

          <div
            className={`mx-auto bg-stone-900 rounded-2xl overflow-hidden border-2 border-emerald-600/40 shadow-inner transition-all ${
              previewDevice === 'mobile' ? 'max-w-[340px]' : 'w-full'
            }`}
          >
            <div className="relative w-full overflow-hidden">
              <img
                src={url}
                alt="معاينة البانر"
                className={`w-full ${getBannerHeightClass(height, previewDevice === 'mobile')} ${
                  fit === 'contain' ? 'object-contain' : 'object-cover'
                }`}
                style={{ objectPosition: getBannerPositionStyle(position) }}
              />
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[9.5px] font-bold px-2 py-0.5 rounded-md pointer-events-none">
                موضع الظهور: {position === 'top' ? 'أعلى' : position === 'bottom' ? 'أسفل' : position === 'center' ? 'وسط' : position}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
