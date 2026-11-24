import React from 'react';
import {
  BarChart3,
  Layers,
  Building2,
  Package,
  Image as ImageIcon,
  DollarSign,
  FileSpreadsheet,
  Megaphone,
  FileText,
  ShoppingBag,
  History,
  Settings,
  LogOut,
  ChevronLeft,
  Sparkles,
  Users,
  Tag,
  Banknote,
  PanelRightClose,
  PanelRightOpen,
  X,
  Sprout,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { TeamMember } from '../../types';
import { canAccessAdminTab, ROLE_METADATA } from '../../utils/permissions';
import { BrandLogoMark } from '../common/BrandLogoMark';

export type AdminTab =
  | 'overview'
  | 'categories'
  | 'companies'
  | 'products'
  | 'gallery'
  | 'prices'
  | 'excel'
  | 'ai_catalog'
  | 'showcases'
  | 'advertisements'
  | 'layout'
  | 'pdf'
  | 'orders'
  | 'programs'
  | 'financing'
  | 'team'
  | 'audit'
  | 'settings';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onLogout: () => void;
  onBackToCatalog: () => void;
  pendingOrdersCount: number;
  pendingFinancingCount?: number;
  currentUser?: TeamMember | null;
  logoUrl?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onCloseMobile?: () => void;
}

interface NavGroup {
  title: string;
  items: {
    id: AdminTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    highlight?: boolean;
  }[];
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onTabChange,
  onLogout,
  onBackToCatalog,
  pendingOrdersCount,
  pendingFinancingCount = 0,
  currentUser = null,
  logoUrl,
  isCollapsed = false,
  onToggleCollapse,
  onCloseMobile,
}) => {
  const navGroups: NavGroup[] = [
    {
      title: 'إدارة الكتالوج والمنتجات',
      items: [
        { id: 'products', label: 'المنتجات والعبوات', icon: <Package className="w-4 h-4 text-emerald-400" /> },
        { id: 'categories', label: 'الأقسام الرئيسية', icon: <Layers className="w-4 h-4 text-emerald-400" /> },
        { id: 'companies', label: 'الشركات والموردين', icon: <Building2 className="w-4 h-4 text-emerald-400" /> },
        { id: 'prices', label: 'الأسعار وسجل التعديلات', icon: <DollarSign className="w-4 h-4 text-emerald-400" /> },
        { id: 'excel', label: 'استيراد أسعار إكسيل', icon: <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> },
        { id: 'ai_catalog', label: 'استخراج ذكي (AI)', icon: <Sparkles className="w-4 h-4 text-amber-300" />, highlight: true },
      ],
    },
    {
      title: 'المبيعات والطلبيات',
      items: [
        { id: 'overview', label: 'لوحة الإحصائيات', icon: <BarChart3 className="w-4 h-4 text-sky-400" /> },
        {
          id: 'orders',
          label: 'طلبيات العملاء والتقسيط',
          icon: <ShoppingBag className="w-4 h-4 text-amber-400" />,
          badge: pendingOrdersCount,
        },
        {
          id: 'programs',
          label: 'برامج التسميد والمكافحة',
          icon: <Sprout className="w-4 h-4 text-emerald-400" />,
          highlight: true,
        },
        {
          id: 'financing',
          label: 'التمويل الإسلامي والطلبات',
          icon: <Banknote className="w-4 h-4 text-emerald-400" />,
          badge: pendingFinancingCount,
          highlight: true,
        },
      ],
    },
    {
      title: 'التسويق والميديا',
      items: [
        { id: 'showcases', label: 'مربعات الرئيسية والعروض', icon: <Tag className="w-4 h-4 text-amber-400" />, highlight: true },
        { id: 'advertisements', label: 'بانرات الصفحة الرئيسية', icon: <Megaphone className="w-4 h-4 text-amber-400" />, highlight: true },
        { id: 'gallery', label: 'معرض صور الشركات', icon: <ImageIcon className="w-4 h-4 text-purple-400" /> },
        { id: 'pdf', label: 'توليد الكتالوج PDF', icon: <FileText className="w-4 h-4 text-amber-400" /> },
      ],
    },
    {
      title: 'النظام والإعدادات',
      items: [
        { id: 'settings', label: 'إعدادات الكتالوج والهوية', icon: <Settings className="w-4 h-4 text-stone-300" /> },
        { id: 'team', label: 'فريق العمل والصلاحيات', icon: <Users className="w-4 h-4 text-stone-300" /> },
        { id: 'audit', label: 'سجل النظام والأمان', icon: <History className="w-4 h-4 text-stone-300" /> },
      ],
    },
  ];

  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !currentUser || canAccessAdminTab(currentUser, item.id)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside
      className={`h-screen bg-[#181C18] text-stone-100 flex flex-col justify-between dir-rtl shrink-0 border-l border-emerald-950/60 shadow-2xl select-none transition-all duration-300 z-30 touch-pan-y ${
        isCollapsed ? 'w-20 p-2.5' : 'w-72 p-4'
      }`}
    >
      <div className="space-y-4">
        {/* Brand Header */}
        <div className={`pb-3.5 border-b border-stone-800/90 ${isCollapsed ? 'space-y-2' : 'space-y-3'}`}>
          <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2 justify-center' : 'justify-between gap-2'}`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5 min-w-0'}`}>
              <BrandLogoMark
                logoUrl={logoUrl}
                alt="CROPSA"
                sizeClassName={isCollapsed ? 'w-10 h-10 rounded-xl' : 'w-10 h-10 rounded-xl shrink-0'}
                fallbackClassName="bg-gradient-to-br from-emerald-600 to-emerald-800 font-black text-white text-base shadow-md ring-2 ring-emerald-500/20"
                imageWrapperClassName="bg-white p-0.5 shadow-md ring-2 ring-emerald-500/20"
                fallbackText="CR"
              />
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-black text-sm tracking-wide text-white truncate">لوحة تحكم كروپسا</h2>
                    <Badge variant="success" className="text-[9px] px-1.5 py-0 shrink-0">v2.0</Badge>
                  </div>
                  <span className="text-[11px] text-stone-400 font-medium block truncate">إدارة الكتالوج الديناميكي</span>
                </div>
              )}
            </div>

            {/* Collapse toggle button on desktop */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1.5 text-stone-400 hover:text-white bg-stone-800/60 hover:bg-stone-700/80 rounded-lg transition-colors cursor-pointer shrink-0"
                title={isCollapsed ? 'فرد القائمة الجانبية (توسيع)' : 'طي القائمة الجانبية (تصغير)'}
              >
                {isCollapsed ? (
                  <PanelRightOpen className="w-4 h-4 text-emerald-400" />
                ) : (
                  <PanelRightClose className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Close button on mobile drawer */}
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 text-stone-400 hover:text-white bg-stone-800/80 rounded-lg cursor-pointer"
                title="إغلاق القائمة"
              >
                <X className="w-5 h-5 text-stone-300" />
              </button>
            )}
          </div>

          {/* User Status Strip */}
          {currentUser && (
            isCollapsed ? (
              <div
                className="group relative flex justify-center py-1 cursor-default"
                title={`${currentUser.name} (@${currentUser.username}) - ${ROLE_METADATA[currentUser.role]?.shortLabel || 'موظف'}`}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-900/60 border border-emerald-700/60 text-emerald-200 font-black text-xs flex items-center justify-center">
                  {currentUser.name.charAt(0)}
                </div>
                {/* Collapsed Tooltip */}
                <div className="absolute right-full mr-2 px-2.5 py-1.5 bg-[#252A25] text-white text-xs font-bold rounded-lg shadow-xl border border-stone-700/80 pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  <div>{currentUser.name}</div>
                  <div className="text-[10px] text-emerald-400">@{currentUser.username} • {ROLE_METADATA[currentUser.role]?.shortLabel || 'موظف'}</div>
                </div>
              </div>
            ) : (
              <div className="bg-stone-800/80 border border-stone-700/70 rounded-xl px-3 py-2 flex items-center justify-between text-[11px]">
                <div className="min-w-0">
                  <div className="font-black text-white truncate">{currentUser.name}</div>
                  <div className="text-[10px] text-emerald-400 font-mono truncate">@{currentUser.username}</div>
                </div>
                <span className="bg-emerald-700 text-white text-[9px] font-black px-2 py-0.5 rounded-md shrink-0">
                  {ROLE_METADATA[currentUser.role]?.shortLabel || 'موظف'}
                </span>
              </div>
            )
          )}
        </div>

        {/* Grouped Navigation Links */}
        <nav className="space-y-3 max-h-[calc(100vh-230px)] overflow-y-auto overflow-x-hidden pr-0.5 scrollbar-thin scrollbar-thumb-stone-700">
          {filteredGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-1">
              {!isCollapsed && (
                <div className="text-[10.5px] font-black uppercase tracking-wider text-emerald-400/80 px-2.5 py-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60"></span>
                  <span>{group.title}</span>
                </div>
              )}
              {isCollapsed && groupIndex > 0 && (
                <div className="w-6 h-px bg-stone-800/80 mx-auto my-1.5" />
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeTab === item.id;
                  const hasBadge = item.badge !== undefined && item.badge > 0;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onTabChange(item.id);
                        onCloseMobile?.();
                      }}
                      className={`relative group transition-all cursor-pointer ${
                        isCollapsed
                          ? `w-11 h-11 mx-auto rounded-xl flex items-center justify-center ${
                              isActive
                                ? 'bg-emerald-700 text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                                : 'text-stone-300 hover:bg-stone-800/80 hover:text-white'
                            }`
                          : `w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold ${
                              isActive
                                ? 'bg-emerald-700 text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                                : 'text-stone-300 hover:bg-stone-800/80 hover:text-white'
                            }`
                      }`}
                    >
                      {/* Icon */}
                      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5 min-w-0'}`}>
                        <span className={`shrink-0 ${isActive ? 'text-white' : ''}`}>{item.icon}</span>
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {/* Badge in Expanded mode */}
                      {!isCollapsed && hasBadge && (
                        <span className="bg-amber-500 text-stone-950 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-xs shrink-0">
                          {item.badge} جديد
                        </span>
                      )}

                      {/* Badge dot in Collapsed mode */}
                      {isCollapsed && hasBadge && (
                        <span className="absolute top-1 left-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-[#181C18] animate-pulse" />
                      )}

                      {/* Collapsed Hover Tooltip (displayed to the left in RTL) */}
                      {isCollapsed && (
                        <div className="absolute right-full mr-2.5 px-3 py-1.5 bg-[#252A25] text-white text-xs font-bold rounded-lg shadow-xl border border-stone-700/80 pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-2">
                          <span>{item.label}</span>
                          {hasBadge && (
                            <span className="bg-amber-400 text-stone-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer Controls */}
      <div className={`pt-3.5 border-t border-stone-800/90 ${isCollapsed ? 'space-y-1.5' : 'space-y-2'}`}>
        {isCollapsed ? (
          <>
            <button
              type="button"
              onClick={onBackToCatalog}
              className="group relative w-11 h-11 mx-auto bg-stone-800/90 hover:bg-emerald-900/60 text-stone-300 hover:text-emerald-200 rounded-xl flex items-center justify-center transition-all border border-stone-700/60 cursor-pointer"
              title="العودة للكتالوج العام"
            >
              <ChevronLeft className="w-4 h-4" />
              <div className="absolute right-full mr-2.5 px-2.5 py-1.5 bg-[#252A25] text-white text-xs font-bold rounded-lg shadow-xl border border-stone-700/80 pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
                العودة للكتالوج العام
              </div>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="group relative w-11 h-11 mx-auto bg-rose-950/40 hover:bg-rose-900 text-rose-300 hover:text-white rounded-xl flex items-center justify-center transition-all border border-rose-900/40 cursor-pointer"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
              <div className="absolute right-full mr-2.5 px-2.5 py-1.5 bg-[#252A25] text-white text-xs font-bold rounded-lg shadow-xl border border-stone-700/80 pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
                تسجيل الخروج
              </div>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onBackToCatalog}
              className="w-full bg-stone-800/90 hover:bg-emerald-900/60 text-stone-200 hover:text-emerald-200 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-stone-700/60 cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>العودة للكتالوج العام</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="w-full bg-rose-950/40 hover:bg-rose-900 text-rose-300 hover:text-white py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-rose-900/40 cursor-pointer shadow-2xs"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
};
