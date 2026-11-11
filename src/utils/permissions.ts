import { TeamMember, TeamRole } from '../types';
import type { AdminTab } from '../components/admin/AdminSidebar';

export interface PermissionDefinition {
  key: string;
  label: string;
  description: string;
  group: 'catalog' | 'sales' | 'inventory' | 'system';
  highlight?: boolean;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    key: 'order_link',
    label: 'عرض رابط الطلبية المباشر للموظف',
    description: 'يُظهر للموظف زرار «عرض رابط الطلبية المباشر للموظف» بعد تأكيد الطلبية ويسمح بفتح صفحة الطلبية.',
    group: 'catalog',
    highlight: true,
  },
  {
    key: 'orders',
    label: 'إدارة ومتابعة الطلبيات',
    description: 'استعراض طلبيات العملاء وتحديث حالة الطلبية (تم التواصل / تأكيد / مكتمل).',
    group: 'sales',
  },
  {
    key: 'installments',
    label: 'فحص واعتماد التقسيط',
    description: 'مراجعة طلبات الشراء بالتقسيط والتواصل لاعتمادها.',
    group: 'sales',
  },
  {
    key: 'overview',
    label: 'لوحة الإحصائيات العامة',
    description: 'مشاهدة ملخص المبيعات والمنتجات والطلبيات في الرئيسية.',
    group: 'sales',
  },
  {
    key: 'products',
    label: 'المنتجات والعبوات',
    description: 'إضافة وتعديل وحذف المنتجات والعبوات.',
    group: 'inventory',
  },
  {
    key: 'categories',
    label: 'الأقسام الرئيسية',
    description: 'إدارة أقسام الكتالوج الرئيسية.',
    group: 'inventory',
  },
  {
    key: 'companies',
    label: 'الشركات والموردين',
    description: 'إدارة الشركات المصنعة والشعارات.',
    group: 'inventory',
  },
  {
    key: 'prices',
    label: 'الأسعار وسجل التعديلات',
    description: 'تحديث أسعار المنتجات ومتابعة سجل تغيّر الأسعار.',
    group: 'inventory',
  },
  {
    key: 'excel',
    label: 'استيراد أسعار إكسيل',
    description: 'رفع وتحديث الأسعار من ملفات Excel.',
    group: 'inventory',
  },
  {
    key: 'ai_catalog',
    label: 'استخراج الكتالوج بالذكاء الاصطناعي (AI)',
    description: 'تحويل كتالوجات PDF إلى منتجات تلقائياً.',
    group: 'inventory',
  },
  {
    key: 'pdf',
    label: 'إنشاء وتصدير كتالوج مخصص (PDF / صور / رابط)',
    description: 'تجهيز كتالوج مخصص للعملاء وتصديره كـ PDF أو صور أو رابط مباشر من الكتالوج أو الإدارة.',
    group: 'catalog',
  },
  {
    key: 'gallery',
    label: 'معرض صور الشركات',
    description: 'إدارة ورفع صور المنتجات والعبوات.',
    group: 'catalog',
  },
  {
    key: 'advertisements',
    label: 'إدارة الإعلانات والبانرات',
    description: 'التحكم في البانرات الدعائية في المتجر.',
    group: 'catalog',
  },
  {
    key: 'settings',
    label: 'إعدادات الكتالوج والهوية',
    description: 'تعديل اسم المتجر، الواتساب، رابط إرسال الطلبيات، والبانر العلوي.',
    group: 'system',
  },
  {
    key: 'team',
    label: 'فريق العمل والصلاحيات',
    description: 'إنشاء وتعديل حسابات الموظفين وكلمات المرور والصلاحيات.',
    group: 'system',
  },
  {
    key: 'audit',
    label: 'سجل النظام والأمان',
    description: 'مراجعة سجل العمليات والدخول داخل النظام.',
    group: 'system',
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_DEFINITIONS.map((p) => p.key);

export const ROLE_METADATA: Record<
  TeamRole,
  { label: string; shortLabel: string; desc: string; badge: string; defaultPermissions: string[] }
> = {
  super_admin: {
    label: 'مدير عام للنظام (Super Admin)',
    shortLabel: 'مدير عام',
    desc: 'كامل الصلاحيات (الشركات، المنتجات، الأسعار، الطلبيات، روابط الطلبية، التقسيط، وإدارة الفريق)',
    badge: 'bg-purple-700 text-white',
    defaultPermissions: ALL_PERMISSION_KEYS,
  },
  catalog_manager: {
    label: 'أخصائي كتالوجات ومنتجات',
    shortLabel: 'أخصائي كتالوج',
    desc: 'إدارة وتوليد الكتالوجات، الشركات، الأقسام، الأسعار، والمعرض والتحليل الذكي',
    badge: 'bg-blue-700 text-white',
    defaultPermissions: ['overview', 'products', 'categories', 'companies', 'prices', 'excel', 'ai_catalog', 'gallery', 'pdf'],
  },
  orders_manager: {
    label: 'مسؤول مبيعات وطلبيات',
    shortLabel: 'مسؤول مبيعات',
    desc: 'استقبال الطلبيات، تجهيز كتالوجات العملاء، وعرض رابط الطلبية للموظف',
    badge: 'bg-emerald-700 text-white',
    defaultPermissions: ['overview', 'orders', 'order_link', 'pdf'],
  },
  installment_officer: {
    label: 'مسؤول فحص واعتماد التقسيط',
    shortLabel: 'مسؤول تقسيط',
    desc: 'مراجعة طلبات التقسيط وعرض رابط الطلبية والتواصل لاعتماد التقسيط',
    badge: 'bg-amber-600 text-white',
    defaultPermissions: ['overview', 'orders', 'installments', 'order_link'],
  },
  sales_rep: {
    label: 'مندوب مبيعات بالكتالوج',
    shortLabel: 'مندوب مبيعات',
    desc: 'دخول من الكتالوج لتجهيز كتالوج مخصص للعميل وتسجيل الطلبيات وعرض رابط الطلبية',
    badge: 'bg-teal-700 text-white',
    defaultPermissions: ['order_link', 'pdf'],
  },
};

export function hasPermission(user: TeamMember | null | undefined, permission: string): boolean {
  if (!user || !user.active) return false;
  if (user.role === 'super_admin') return true;
  return Array.isArray(user.permissions) && user.permissions.includes(permission);
}

export function canViewOrderLink(user: TeamMember | null | undefined): boolean {
  return hasPermission(user, 'order_link');
}

export function canBuildCustomCatalog(user: TeamMember | null | undefined): boolean {
  return hasPermission(user, 'pdf');
}

const TAB_REQUIRED_PERMISSIONS: Record<AdminTab, string[]> = {
  overview: ['overview'],
  products: ['products'],
  categories: ['categories'],
  companies: ['companies'],
  prices: ['prices'],
  excel: ['excel'],
  ai_catalog: ['ai_catalog'],
  orders: ['orders', 'installments'],
  showcases: ['advertisements', 'products', 'settings'],
  advertisements: ['advertisements'],
  gallery: ['gallery'],
  pdf: ['pdf'],
  layout: ['settings'],
  settings: ['settings'],
  team: ['team'],
  audit: ['audit'],
};

const TAB_FALLBACK_ORDER: AdminTab[] = [
  'overview',
  'orders',
  'products',
  'categories',
  'companies',
  'prices',
  'excel',
  'ai_catalog',
  'showcases',
  'pdf',
  'gallery',
  'advertisements',
  'settings',
  'team',
  'audit',
];

export function canAccessAdminTab(user: TeamMember | null | undefined, tab: AdminTab): boolean {
  if (!user || !user.active) return false;
  if (user.role === 'super_admin') return true;
  const required = TAB_REQUIRED_PERMISSIONS[tab] || [];
  return required.some((perm) => hasPermission(user, perm));
}

export function getFirstAllowedTab(user: TeamMember | null | undefined): AdminTab | null {
  if (!user || !user.active) return null;
  for (const tab of TAB_FALLBACK_ORDER) {
    if (canAccessAdminTab(user, tab)) return tab;
  }
  return null;
}

export function hasDashboardAccess(user: TeamMember | null | undefined): boolean {
  return getFirstAllowedTab(user) !== null;
}
