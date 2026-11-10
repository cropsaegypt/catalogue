import React from 'react';
import {
  ShoppingBag,
  ShieldCheck,
  Sparkles,
  MessageCircle,
  Search,
  X,
  PhoneCall,
  UserCheck,
  LogOut,
  FileText,
} from 'lucide-react';
import { motion } from 'motion/react';
import { TeamMember } from '../../types';
import { ROLE_METADATA } from '../../utils/permissions';

interface HeaderProps {
  cartItemCount: number;
  onOpenBasket: () => void;
  onOpenAdmin: () => void;
  isAdminLoggedIn: boolean;
  currentUser?: TeamMember | null;
  hasDashboardAccess?: boolean;
  canBuildCatalog?: boolean;
  onOpenCatalogBuilder?: () => void;
  onOpenLogin?: () => void;
  onLogout?: () => void;
  onNavigateHome: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  whatsAppNumber?: string;
  phone?: string;
}

export const Header: React.FC<HeaderProps> = ({
  cartItemCount,
  onOpenBasket,
  onOpenAdmin,
  isAdminLoggedIn,
  currentUser = null,
  hasDashboardAccess = false,
  canBuildCatalog = false,
  onOpenCatalogBuilder,
  onOpenLogin,
  onLogout,
  onNavigateHome,
  searchQuery = '',
  onSearchChange,
  whatsAppNumber = '201000000000',
  phone = '01012345678',
}) => {
  const cleanWa = whatsAppNumber.replace(/[^0-9]/g, '');

  return (
    <header className="sticky top-0 z-40 bg-white/98 backdrop-blur-md border-b border-stone-200/80 shadow-xs dir-rtl">
      {/* Slim Top Trust Strip (Desktop) */}
      <div className="hidden sm:block bg-[#046A47] text-white py-1 px-4 text-[11px] font-bold">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>متجر كروپسا CROPSA — أسمدة ومبيدات ومخصبات معتمدة 100%</span>
          </div>

          <div className="flex items-center gap-4 text-emerald-100">
            <span className="flex items-center gap-1">🚚 توصيل مباشر لباب المزرعة والمخزن</span>
            <span className="opacity-40">|</span>
            <a href={`tel:${phone}`} className="hover:text-amber-300 transition-colors flex items-center gap-1">
              <PhoneCall className="w-3 h-3" />
              <span>المبيعات والاستشارات: {phone}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Noon/Amazon Style Header */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-5">
        {/* Right: Brand Logo */}
        <motion.div
          whileTap={{ scale: 0.96 }}
          onClick={onNavigateHome}
          className="flex items-center gap-2 cursor-pointer shrink-0 group"
        >
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-br from-[#046A47] to-[#024A31] rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-xs group-hover:shadow-md transition-all">
            🌱
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-base sm:text-2xl font-black text-[#046A47] tracking-tight leading-none">
                CROPSA
              </span>
              <span className="bg-amber-400 text-stone-950 text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-md">
                مصر
              </span>
            </div>
            <p className="hidden sm:block text-[10px] text-stone-500 font-bold leading-none mt-1">
              سوق الحلول الزراعية
            </p>
          </div>
        </motion.div>

        {/* Center (Desktop): Prominent Noon/Amazon Search Bar */}
        {onSearchChange && (
          <div className="hidden md:flex flex-1 max-w-2xl relative items-center">
            <div className="absolute right-3.5 text-stone-400 pointer-events-none">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="بتدور على إيه؟ ابحث باسم المنتج، المادة الفعالة، المحصول (طماطم، دودة، سماد...)"
              className="w-full h-11 pr-10 pl-10 bg-stone-100 hover:bg-stone-100/80 focus:bg-white border border-stone-200 focus:border-[#046A47] rounded-xl text-sm font-bold text-stone-900 placeholder:text-stone-400 placeholder:font-medium focus:outline-none focus:ring-2 focus:ring-[#046A47]/15 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute left-3 p-1 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200 transition-colors cursor-pointer"
                title="مسح البحث"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Left: Actions (WhatsApp, Admin, Cart) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick WhatsApp */}
          <a
            href={`https://wa.me/${cleanWa}`}
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 sm:h-10 flex items-center justify-center gap-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#075E54] px-2.5 sm:px-3 rounded-xl text-xs font-black border border-[#25D366]/30 transition-colors"
            title="تواصل مع مهندس زراعي عبر الواتساب"
          >
            <MessageCircle className="w-4 h-4 text-[#25D366] fill-[#25D366]/20" />
            <span className="hidden sm:inline">استشارة وطلب</span>
          </a>

          {/* Employee Auth & Dashboard Access */}
          {currentUser ? (
            <div className="flex items-center gap-1.5">
              <div
                className="hidden sm:flex h-10 items-center gap-1.5 bg-emerald-50 text-[#046A47] border border-emerald-200 px-2.5 rounded-xl text-[11px] font-black"
                title={`${currentUser.name} (@${currentUser.username})`}
              >
                <UserCheck className="w-3.5 h-3.5 text-[#046A47] shrink-0" />
                <span className="max-w-[90px] truncate">{currentUser.name.split(' ')[0]}</span>
                <span className="bg-emerald-700 text-white text-[9px] px-1.5 py-0.5 rounded-md">
                  {ROLE_METADATA[currentUser.role]?.shortLabel || 'موظف'}
                </span>
              </div>

              {canBuildCatalog && onOpenCatalogBuilder && (
                <button
                  type="button"
                  onClick={onOpenCatalogBuilder}
                  className="hidden sm:flex h-9 sm:h-10 items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 px-3 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
                  title="إنشاء وإرسال كتالوج مخصص للعميل (رابط / صور / PDF)"
                >
                  <FileText className="w-4 h-4" />
                  <span>إنشاء كتالوج</span>
                </button>
              )}

              {hasDashboardAccess && (
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="h-9 sm:h-10 flex items-center gap-1 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer"
                  title="فتح لوحة التحكم"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span className="hidden sm:inline">الإدارة</span>
                </button>
              )}

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="h-9 sm:h-10 flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  title="تسجيل خروج الموظف"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline text-[11px]">خروج</span>
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin || onOpenAdmin}
              className="h-9 sm:h-10 flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200/80 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="دخول موظفي كروپسا"
            >
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span className="sm:hidden text-[11px]">دخول</span>
              <span className="hidden sm:inline">{isAdminLoggedIn ? 'الإدارة' : 'دخول الموظفين'}</span>
            </button>
          )}

          {/* Cart Button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={onOpenBasket}
            className="h-9 sm:h-10 relative flex items-center gap-1.5 sm:gap-2 bg-[#046A47] hover:bg-[#035237] text-white px-2.5 sm:px-4 rounded-xl font-black text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
            id="header-basket-btn"
          >
            <ShoppingBag className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">السلة</span>
            <span
              className={`text-[11px] font-black px-1.5 py-0.2 rounded-full ${
                cartItemCount > 0
                  ? 'bg-amber-400 text-stone-950 animate-pulse'
                  : 'bg-emerald-800 text-emerald-200'
              }`}
            >
              {cartItemCount}
            </span>
          </motion.button>
        </div>
      </div>

      {/* Slim Employee Strip on Mobile when logged in */}
      {currentUser && (
        <div className="sm:hidden px-3 pb-1.5">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px] font-black text-[#046A47]">
            <span className="flex items-center gap-1 truncate">
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{currentUser.name}</span>
              <span className="bg-emerald-700 text-white text-[9px] px-1.5 py-0.5 rounded-md shrink-0">
                {ROLE_METADATA[currentUser.role]?.shortLabel || 'موظف'}
              </span>
            </span>

            {canBuildCatalog && onOpenCatalogBuilder && (
              <button
                type="button"
                onClick={onOpenCatalogBuilder}
                className="flex items-center gap-1 bg-amber-400 hover:bg-amber-300 text-stone-950 text-[10px] font-black px-2 py-0.5 rounded-lg shrink-0 cursor-pointer"
              >
                <FileText className="w-3 h-3" />
                <span>عمل كتالوج للعميل</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Search Bar (Directly in Sticky Header like Noon & Amazon App) */}
      {onSearchChange && (
        <div className="md:hidden px-3 pb-2.5">
          <div className="relative flex items-center">
            <div className="absolute right-3 text-emerald-700 pointer-events-none">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ابحث باسم السماد، المبيد، أو المحصول..."
              className="w-full h-10 pr-9 pl-9 bg-stone-100 border border-stone-200 focus:border-[#046A47] focus:bg-white rounded-xl text-xs font-bold text-stone-900 placeholder:text-stone-400 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute left-2.5 p-1 text-stone-400 hover:text-stone-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
