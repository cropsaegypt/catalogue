import React from 'react';
import { Phone, Mail, Globe, ShieldCheck } from 'lucide-react';
import { CatalogSettings } from '../../types';
import { BrandLogoMark } from './BrandLogoMark';

interface FooterProps {
  settings: CatalogSettings;
}

export const Footer: React.FC<FooterProps> = ({ settings }) => {
  return (
    <footer className="bg-[#2D2D24] text-[#E5E2D9] mt-16 border-t-4 border-[#5A5A40] dir-rtl">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <BrandLogoMark
                logoUrl={settings.logoUrl}
                alt={settings.title || 'CROPSA Logo'}
                sizeClassName="w-11 h-11 rounded-xl"
                fallbackClassName="bg-[#5A5A40] text-[#F9F8F6] font-bold text-lg shadow-inner"
                imageWrapperClassName="bg-white p-0.5 shadow-inner"
                fallbackText="CR"
              />
              <h3 className="text-xl font-bold text-white tracking-wide">CROPSA - كروپسا</h3>
            </div>
            <p className="text-sm text-[#D4D1C5]/80 leading-relaxed">{settings.subtitle}</p>
            <div className="pt-2 flex items-center gap-2 text-xs text-[#D4D1C5]">
              <ShieldCheck className="w-4 h-4 text-[#8A8A6D]" />
              <span>نظام كتالوج زراعي ديناميكي موثوق 100%</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-base font-bold text-white border-r-2 border-[#8A8A6D] pr-3">معلومات التواصل</h4>
            <ul className="space-y-2 text-sm text-[#D4D1C5]">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#8A8A6D] shrink-0" />
                <span>المبيعات: {settings.phone}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#8A8A6D] shrink-0" />
                <span>البريد: {settings.email}</span>
              </li>
              <li className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#8A8A6D] shrink-0" />
                <span>الموقع: {settings.website}</span>
              </li>
            </ul>
          </div>

          {/* Location & Coverage */}
          <div className="space-y-3">
            <h4 className="text-base font-bold text-white border-r-2 border-[#8A8A6D] pr-3">التغطية والخدمات</h4>
            <p className="text-sm text-[#D4D1C5]/80 leading-relaxed">
              تغطي خدمات كروپسا جميع المحافظات والمشاريع الزراعية الكبرى، مع توفير الدعم الفني والاستشارات التسميدية للمزارعين والشركات.
            </p>
          </div>

          {/* QR Code Col */}
          <div className="flex flex-col items-center justify-center bg-[#3D3D32] p-4 rounded-2xl border border-[#5A5A40] text-center">
            <img
              src={settings.qrCodeUrl}
              alt="CROPSA QR Code"
              className="w-24 h-24 bg-white p-1.5 rounded-xl shadow-xs mb-2"
            />
            <span className="text-xs font-semibold text-[#D4D1C5]">امسح الكود لفتح الكتالوج الرقمي</span>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[#3D3D32] text-center text-xs text-[#8A8A6D]">
          <p>{settings.footerText}</p>
        </div>
      </div>
    </footer>
  );
};
