import React from 'react';
import { Advertisement } from '../../types';
import { ExternalLink, Megaphone } from 'lucide-react';

interface AdvertisementBannerProps {
  ad: Advertisement;
}

export const AdvertisementBanner: React.FC<AdvertisementBannerProps> = ({ ad }) => {
  if (!ad || !ad.active) return null;

  return (
    <div className="bg-[#2D2D24] rounded-3xl overflow-hidden shadow-xs border border-[#5A5A40] my-6 text-[#F9F8F6] dir-rtl">
      <div className="flex flex-col md:flex-row items-center justify-between p-6 gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 bg-[#5A5A40] text-[#E5E2D9] text-xs font-bold px-3 py-1 rounded-full border border-[#8A8A6D]/40">
            <Megaphone className="w-3.5 h-3.5" />
            <span>إعلان مميز</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-[#F9F8F6] leading-tight">{ad.title}</h3>
          {ad.description && <p className="text-sm text-[#D4D1C5] leading-relaxed">{ad.description}</p>}
        </div>

        {ad.desktopImageUrl && (
          <div className="w-full md:w-64 h-36 rounded-2xl overflow-hidden shrink-0 border-2 border-[#D4D1C5]/30 shadow-inner">
            <img src={ad.desktopImageUrl} alt={ad.title} className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    </div>
  );
};
