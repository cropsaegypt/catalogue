import React, { useMemo } from 'react';
import {
  Package,
  Building2,
  Layers,
  ShoppingBag,
  DollarSign,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  TrendingDown,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  CheckCircle2,
  BarChart3,
  PieChart as PieChartIcon,
  Cloud,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';

import { Product, Package as PackageType, Company, Category, Order, PriceHistory, AdminTab } from '../../types';
import { firebaseConfig } from '../../services/firebase';

interface AdminOverviewProps {
  products: Product[];
  packages?: PackageType[];
  companies: Company[];
  categories: Category[];
  orders: Order[];
  priceHistory: PriceHistory[];
  onNavigateTab: (tab: AdminTab) => void;
  cloudConnected?: boolean;
  isCloudSyncing?: boolean;
  lastCloudSyncAt?: string;
  cloudError?: string;
  onSyncToCloud?: () => Promise<void> | void;
  onConnectGoogleCloud?: () => Promise<void> | void;
}

const CROPSA_COLORS = ['#046A47', '#058E5E', '#5A5A40', '#8A8A6D', '#2D2D24', '#B45309'];

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  products = [],
  packages = [],
  companies = [],
  categories = [],
  orders = [],
  priceHistory = [],
  onNavigateTab,
  cloudConnected = false,
  isCloudSyncing = false,
  lastCloudSyncAt,
  cloudError,
  onSyncToCloud,
  onConnectGoogleCloud,
}) => {
  const activeProducts = products.filter((p) => p.active);
  const pendingOrders = orders.filter((o) => o.status === 'new');
  const recentPriceUpdates = priceHistory.slice(0, 5);
  const recentOrders = orders.slice(0, 5);

  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Alerts: 1. Low stock packages (stockQuantity <= minStockAlert)
  const lowStockAlerts = useMemo(() => {
    return packages
      .filter((pkg) => {
        const stock = pkg.stockQuantity ?? 30;
        const minAlert = pkg.minStockAlert ?? 10;
        return stock <= minAlert;
      })
      .map((pkg) => {
        const prod = products.find((p) => p.id === pkg.productId);
        return {
          pkg,
          prod,
          stock: pkg.stockQuantity ?? 30,
          minStock: pkg.minStockAlert ?? 10,
        };
      });
  }, [packages, products]);

  // Alerts: 2. Price below Cost (price < costPrice)
  const priceBelowCostAlerts = useMemo(() => {
    return packages
      .filter((pkg) => {
        const cost = pkg.costPrice ?? 0;
        return cost > 0 && pkg.price < cost;
      })
      .map((pkg) => {
        const prod = products.find((p) => p.id === pkg.productId);
        return {
          pkg,
          prod,
          price: pkg.price,
          cost: pkg.costPrice ?? 0,
          diff: (pkg.costPrice ?? 0) - pkg.price,
        };
      });
  }, [packages, products]);

  // Chart Data: Top Selling Products (Calculated from Orders)
  const topSellingProducts = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; revenue: number }> = {};
    orders.forEach((ord) => {
      (ord.items || []).forEach((item) => {
        const key = item.productName || item.productId;
        if (!map[key]) {
          map[key] = {
            name: item.productName && item.productName.length > 18 ? item.productName.slice(0, 18) + '...' : (item.productName || 'منتج'),
            quantity: 0,
            revenue: 0,
          };
        }
        map[key].quantity += item.quantity || 1;
        map[key].revenue += item.subtotal || 0;
      });
    });

    const list = Object.values(map).sort((a, b) => b.quantity - a.quantity);
    if (list.length > 0) return list.slice(0, 6);

    // Fallback based on products list if orders is empty
    return products.slice(0, 5).map((p, idx) => ({
      name: p.name.length > 18 ? p.name.slice(0, 18) + '...' : p.name,
      quantity: 45 - idx * 7,
      revenue: (45 - idx * 7) * 220,
    }));
  }, [orders, products]);

  // Chart Data: Top Demanded Companies
  const topCompaniesData = useMemo(() => {
    const map: Record<string, { name: string; count: number; totalSales: number }> = {};
    orders.forEach((ord) => {
      (ord.items || []).forEach((item) => {
        const comp = item.companyName || 'أخرى';
        if (!map[comp]) {
          map[comp] = { name: comp, count: 0, totalSales: 0 };
        }
        map[comp].count += item.quantity || 1;
        map[comp].totalSales += item.subtotal || 0;
      });
    });

    const list = Object.values(map).sort((a, b) => b.totalSales - a.totalSales);
    if (list.length > 0) return list.slice(0, 6);

    // Fallback based on companies list
    return companies.slice(0, 5).map((c, idx) => ({
      name: c.name,
      count: 35 - idx * 5,
      totalSales: 28000 - idx * 4500,
    }));
  }, [orders, companies]);

  return (
    <div className="space-y-6 dir-rtl">
      {/* Welcome & Quick Action Header */}
      <div className="bg-[#2D2D24] p-8 rounded-3xl text-[#F9F8F6] shadow-xs border border-[#5A5A40] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-[#046A47] text-emerald-100 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/40">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>لوحة المؤشرات والبيانات الحية - كروپسا</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#F9F8F6]">لوحة إدارة الكتالوج والمبيعات</h2>
          <p className="text-sm text-[#D4D1C5] max-w-xl leading-relaxed">
            متابعة دقيقة لأكثر المنتجات مبيعاً، والشركات الأكثر طلباً عبر الرسوم البيانية، مع رصد تنبيهات الأسعار ومخزون العبوات فورياً.
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => onNavigateTab('ai_catalog')}
            className="bg-[#046A47] hover:bg-[#035136] text-white font-black text-xs px-4 py-3 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>استخراج الكتالوج القديم (AI)</span>
          </button>
          <button
            onClick={() => onNavigateTab('prices')}
            className="bg-white/10 hover:bg-white/20 text-[#F9F8F6] font-bold text-xs px-4 py-3 rounded-xl border border-[#D4D1C5]/30 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <DollarSign className="w-4 h-4" />
            <span>إدارة الأسعار والتكلفة</span>
          </button>
        </div>
      </div>

      {/* Firebase Cloud Firestore Live Sync Strip */}
      {(onSyncToCloud || onConnectGoogleCloud) && (
        <div
          className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${
            cloudConnected
              ? 'bg-emerald-50/70 border-emerald-200'
              : 'bg-amber-50/70 border-amber-200'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                cloudConnected ? 'bg-[#046A47] text-white' : 'bg-amber-500 text-stone-950'
              }`}
            >
              <Cloud className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-stone-900">
                  مزامنة Firebase Cloud Firestore:
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    cloudConnected
                      ? 'bg-emerald-700 text-white'
                      : 'bg-amber-200 text-amber-950'
                  }`}
                >
                  {cloudConnected ? 'متصل بالسحابة ✓' : 'وضع محلي (بحاجة لربط/نشر القواعد)'}
                </span>
                <span className="text-[10px] font-mono text-stone-500">
                  {firebaseConfig.projectId}
                </span>
              </div>
              <p className="text-[11px] text-stone-600 font-medium">
                {cloudError
                  ? cloudError
                  : lastCloudSyncAt
                  ? `آخر مزامنة: ${new Date(lastCloudSyncAt).toLocaleString('ar-EG')}`
                  : 'تتم مزامنة المنتجات والطلبيات وروابط العملاء تلقائياً مع السحابة.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onConnectGoogleCloud && (
              <button
                type="button"
                onClick={onConnectGoogleCloud}
                className="px-3.5 py-2 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                تسجيل Google للسحابة
              </button>
            )}
            {onSyncToCloud && (
              <button
                type="button"
                disabled={isCloudSyncing}
                onClick={onSyncToCloud}
                className="px-4 py-2 bg-[#046A47] hover:bg-[#035237] disabled:opacity-60 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                <span>{isCloudSyncing ? 'جاري المزامنة...' : 'رفع ومزامنة الآن'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* --- ACTIVE SYSTEM ALERTS (Low stock & Price < Cost) --- */}
      {(lowStockAlerts.length > 0 || priceBelowCostAlerts.length > 0) && (
        <div className="bg-amber-50/80 border border-amber-300 rounded-3xl p-6 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-amber-200">
            <div className="flex items-center gap-2 text-amber-900 font-black text-base">
              <ShieldAlert className="w-5 h-5 text-amber-700" />
              <span>تنبيهات الإدارة العاجلة ({lowStockAlerts.length + priceBelowCostAlerts.length} تنبيه نشط)</span>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-200/60 px-2.5 py-1 rounded-full">
              يتطلب إجراء من الإدارة
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Low Stock Alerts */}
            {lowStockAlerts.length > 0 && (
              <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>تنبيه اقتراب نفاد المخزون ({lowStockAlerts.length} عبوة):</span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {lowStockAlerts.map(({ pkg, prod, stock, minStock }, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-xl bg-amber-50/50 border border-amber-100 text-xs"
                    >
                      <div>
                        <span className="font-bold text-[#2D2D24] block">{prod?.name || pkg.displayName}</span>
                        <span className="text-[10px] text-[#5A5A40]">
                          عبوة: {pkg.displayName} | حد التنبيه: {minStock}
                        </span>
                      </div>
                      <div className="text-left">
                        <span className="inline-block px-2 py-0.5 rounded-md font-black bg-amber-100 text-amber-900 text-xs">
                          باقي {stock} فقط
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Price Below Cost Alerts */}
            {priceBelowCostAlerts.length > 0 && (
              <div className="bg-white p-4 rounded-2xl border border-red-200 shadow-2xs space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-900 mb-1">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span>تنبيه: سعر البيع أقل من التكلفة المحددة ({priceBelowCostAlerts.length} عبوة):</span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {priceBelowCostAlerts.map(({ pkg, prod, price, cost, diff }, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-xl bg-red-50/50 border border-red-100 text-xs"
                    >
                      <div>
                        <span className="font-bold text-[#2D2D24] block">{prod?.name || pkg.displayName}</span>
                        <span className="text-[10px] text-red-700">
                          البيع: {price} ج | التكلفة: {cost} ج
                        </span>
                      </div>
                      <div className="text-left">
                        <span className="inline-block px-2 py-0.5 rounded-md font-black bg-red-100 text-red-900 text-xs">
                          عجز: -{diff} ج
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigateTab('products')}
          className="bg-[#FAF8F5] p-5 rounded-3xl border border-[#E5E2D9] shadow-xs hover:border-[#046A47] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#8A8A6D]">إجمالي المنتجات</span>
            <div className="w-9 h-9 bg-emerald-100 text-[#046A47] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#2D2D24]">{products.length}</div>
          <span className="text-[11px] text-[#046A47] font-bold block mt-1">{activeProducts.length} منتج نشط بالكتالوج</span>
        </div>

        <div
          onClick={() => onNavigateTab('companies')}
          className="bg-[#FAF8F5] p-5 rounded-3xl border border-[#E5E2D9] shadow-xs hover:border-[#046A47] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#8A8A6D]">الشركات المصنعة</span>
            <div className="w-9 h-9 bg-[#E5E2D9] text-[#5A5A40] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#2D2D24]">{companies.length}</div>
          <span className="text-[11px] text-[#8A8A6D] font-medium block mt-1">شركات زراعية شريكة</span>
        </div>

        <div
          onClick={() => onNavigateTab('orders')}
          className="bg-[#FAF8F5] p-5 rounded-3xl border border-[#E5E2D9] shadow-xs hover:border-[#046A47] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#8A8A6D]">إجمالي المبيعات</span>
            <div className="w-9 h-9 bg-emerald-100 text-[#046A47] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#2D2D24]">{Number(totalRevenue || 0).toLocaleString('en-US')} ج</div>
          <span className="text-[11px] text-[#046A47] font-bold block mt-1">{orders.length} طلبية مسجلة</span>
        </div>

        <div
          onClick={() => onNavigateTab('orders')}
          className="bg-[#FAF8F5] p-5 rounded-3xl border border-[#E5E2D9] shadow-xs hover:border-[#046A47] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#8A8A6D]">طلبيات قيد الانتظار</span>
            <div className="w-9 h-9 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-900">{pendingOrders.length}</div>
          <span className="text-[11px] text-amber-800 font-bold block mt-1">بانتظار التواصل والتأكيد</span>
        </div>
      </div>

      {/* --- RECHARTS ANALYTICS SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Top Selling Products BarChart */}
        <div className="bg-[#FAF8F5] p-6 rounded-3xl border border-[#E5E2D9] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-[#2D2D24] text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#046A47]" />
                <span>أكثر المنتجات مبيعاً (بالكمية المطلوبة)</span>
              </h3>
              <p className="text-[11px] text-[#8A8A6D]">معدل الطلب على المركبات الزراعية من واقع طلبيات الكتالوج</p>
            </div>
            <span className="text-xs font-bold text-[#046A47] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              تحديث حي
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSellingProducts} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E2D9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#5A5A40' }}
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#5A5A40' }} />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    name === 'quantity' ? `${value ?? 0} عبوة` : `${Number(value || 0).toLocaleString()} ج.م`,
                    name === 'quantity' ? 'الكمية المطلوبة' : 'قيمة المبيعات',
                  ]}
                  contentStyle={{ backgroundColor: '#FAF8F5', borderRadius: '12px', borderColor: '#E5E2D9', direction: 'rtl' }}
                />
                <Legend
                  formatter={(value) => (value === 'quantity' ? 'الكمية المباعة (عبوة)' : 'الإيرادات (ج.م)')}
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                />
                <Bar dataKey="quantity" fill="#046A47" radius={[6, 6, 0, 0]} name="quantity" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Top Demanded Companies PieChart */}
        <div className="bg-[#FAF8F5] p-6 rounded-3xl border border-[#E5E2D9] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-[#2D2D24] text-sm flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-[#046A47]" />
                <span>أكثر الشركات طلباً (الحصة السوقية بالطلبيات)</span>
              </h3>
              <p className="text-[11px] text-[#8A8A6D]">توزيع مبيعات الشركات المصنعة والموردة للأسمدة</p>
            </div>
            <span className="text-xs font-bold text-[#5A5A40] bg-[#E5E2D9] px-2.5 py-1 rounded-lg">
              حسب الإيراد
            </span>
          </div>

          <div className="h-64 w-full flex items-center justify-center pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topCompaniesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="totalSales"
                  nameKey="name"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {topCompaniesData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CROPSA_COLORS[index % CROPSA_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [`${Number(value || 0).toLocaleString()} جنيه مصري`, 'حجم الطلب']}
                  contentStyle={{ backgroundColor: '#FAF8F5', borderRadius: '12px', borderColor: '#E5E2D9', direction: 'rtl' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables Row: Recent Orders & Recent Price Updates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-[#FAF8F5] p-6 rounded-3xl border border-[#E5E2D9] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-[#2D2D24] text-sm flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#046A47]" />
              <span>أحدث طلبيات الشراء الواردة:</span>
            </h3>
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-xs font-bold text-[#046A47] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>عرض كل الطلبيات</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {recentOrders.length === 0 ? (
              <p className="text-xs text-[#8A8A6D] py-4 text-center">لا توجد طلبات واردة حتى الآن.</p>
            ) : (
              recentOrders.map((o) => (
                <div
                  key={o.id}
                  className="p-3 bg-white rounded-2xl border border-[#E5E2D9] flex items-center justify-between text-xs hover:border-[#046A47] transition-all"
                >
                  <div>
                    <span className="font-black text-[#2D2D24] block">{o.customerName}</span>
                    <span className="text-[#8A8A6D] text-[11px]">{o.governorate} | {(o.items || []).length} منتجات</span>
                  </div>
                  <div className="text-left font-bold text-[#046A47]">
                    <span className="text-xs font-black">{Number(o.totalAmount || 0).toLocaleString('en-US')} ج</span>
                    <span className={`block text-[10px] ${o.status === 'new' ? 'text-amber-800' : 'text-emerald-700'}`}>
                      {o.status === 'new' ? 'جديد' : 'تم التواصل'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Price Updates */}
        <div className="bg-[#FAF8F5] p-6 rounded-3xl border border-[#E5E2D9] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-[#2D2D24] text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#046A47]" />
              <span>أحدث حركات تغيير الأسعار:</span>
            </h3>
            <button
              onClick={() => onNavigateTab('prices')}
              className="text-xs font-bold text-[#046A47] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>سجل الأسعار</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {recentPriceUpdates.length === 0 ? (
              <p className="text-xs text-[#8A8A6D] py-4 text-center">لم يتم تعديل أي سعر مؤخراً.</p>
            ) : (
              recentPriceUpdates.map((ph) => (
                <div
                  key={ph.id}
                  className="p-3 bg-white rounded-2xl border border-[#E5E2D9] flex items-center justify-between text-xs hover:border-[#046A47] transition-all"
                >
                  <div>
                    <span className="font-black text-[#2D2D24] block">{ph.productName}</span>
                    <span className="text-[#8A8A6D] text-[11px]">عبوة {ph.packageDisplayName}</span>
                  </div>
                  <div className="text-left font-bold">
                    <span className="text-gray-400 line-through text-[10px] ml-1">{ph.oldPrice}</span>
                    <span className="text-[#046A47] font-black">{ph.newPrice} ج</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
