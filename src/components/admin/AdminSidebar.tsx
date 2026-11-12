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
  ShieldCheck,
  Users,
  Tag,
  Banknote,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { TeamMember } from '../../types';
import { canAccessAdminTab, ROLE_METADATA } from '../../utils/permissions';

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
        { id: 'advertisements', label: 'إدارة الإعلانات', icon: <Megaphone className="w-4 h-4 text-rose-400" /> },
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
    <aside className="w-72 bg-[#1A1E1A] text-stone-100 min-h-screen p-4 flex flex-col justify-between dir-rtl shrink-0 border-l border-emerald-950/60 shadow-xl select-none">
      <div className="space-y-5">
        {/* Brand Header */}
        <div className="pb-4 border-b border-stone-800 space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-xl flex items-center justify-center font-black text-white text-base shadow-md ring-2 ring-emerald-500/20">
              CR
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-black text-sm tracking-wide text-white">لوحة تحكم كروپسا</h2>
                <Badge variant="success" className="text-[9px] px-1.5 py-0">v2.0</Badge>
              </div>
              <span className="text-[11px] text-stone-400 font-medium block">إدارة الكتالوج الديناميكي</span>
            </div>
          </div>

          {currentUser && (
            <div className="bg-stone-800/80 border border-stone-700/70 rounded-xl px-3 py-2 flex items-center justify-between text-[11px]">
              <div className="min-w-0">
                <div className="font-black text-white truncate">{currentUser.name}</div>
                <div className="text-[10px] text-emerald-400 font-mono truncate">@{currentUser.username}</div>
              </div>
              <span className="bg-emerald-700 text-white text-[9px] font-black px-2 py-0.5 rounded-md shrink-0">
                {ROLE_METADATA[currentUser.role]?.shortLabel || 'موظف'}
              </span>
            </div>
          )}
        </div>

        {/* Grouped Navigation Links */}
        <nav className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
          {filteredGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-1">
              <div className="text-[11px] font-black uppercase tracking-wider text-emerald-400/80 px-2 py-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60"></span>
                <span>{group.title}</span>
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-emerald-700 text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                          : 'text-stone-300 hover:bg-stone-800/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={isActive ? 'text-white' : ''}>{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && item.badge > 0 ? (
                        <span className="bg-amber-500 text-stone-950 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-xs">
                          {item.badge} جديد
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer Controls */}
      <div className="pt-4 border-t border-stone-800 space-y-2">
        <button
          onClick={onBackToCatalog}
          className="w-full bg-stone-800/90 hover:bg-emerald-900/60 text-stone-200 hover:text-emerald-200 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-stone-700/60"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>العودة للكتالوج العام</span>
        </button>

        <button
          onClick={onLogout}
          className="w-full bg-rose-950/40 hover:bg-rose-900 text-rose-300 hover:text-white py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-rose-900/40"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
};
