import React, { useState } from 'react';
import {
  ShoppingBag,
  Search,
  Eye,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  FileSpreadsheet,
  Printer,
  Download,
  Share2,
  Copy,
  MessageCircle,
  UserCheck,
  ExternalLink,
  Users,
  Filter,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { Order, TeamMember } from '../../types';
import * as XLSX from 'xlsx';
import {
  buildSalesRepStoreUrl,
  buildSalesRepWhatsAppUrl,
  buildSalesRepInvoiceWhatsAppMessage,
  getOrderDirectShortcutUrl,
  formatPhoneForWhatsApp,
} from '../../utils/salesRepReferral';

interface OrderManagerProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
  currentUser?: TeamMember | null;
  teamMembers?: TeamMember[];
}

export const OrderManager: React.FC<OrderManagerProps> = ({
  orders,
  onUpdateOrderStatus,
  onShowToast,
  currentUser,
  teamMembers = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedRepFilter, setSelectedRepFilter] = useState<string>('all');
  const [copiedLink, setCopiedLink] = useState(false);
  const [modalRepPhoneOverride, setModalRepPhoneOverride] = useState('');

  const isSalesRep = currentUser?.role === 'sales_rep';

  // Scope orders based on user role:
  // If sales_rep: only see orders attributed to their id, username, or phone
  // If manager/super_admin: see all orders, with optional filter by rep
  const scopedOrders = orders.filter((o) => {
    if (isSalesRep && currentUser) {
      const uName = (currentUser.username || '').toLowerCase();
      const uPhone = (currentUser.phone || '').replace(/\D/g, '');
      const oUname = (o.salesRepUsername || '').toLowerCase();
      const oPhone = (o.salesRepPhone || '').replace(/\D/g, '');

      const matchId = Boolean(o.salesRepId && o.salesRepId === currentUser.id);
      const matchUname = Boolean(uName && oUname && uName === oUname);
      const matchPhone = Boolean(
        uPhone && oPhone && (uPhone.endsWith(oPhone) || oPhone.endsWith(uPhone))
      );
      return matchId || matchUname || matchPhone;
    }

    if (selectedRepFilter !== 'all') {
      if (selectedRepFilter === '__direct__') {
        return !o.salesRepId && !o.salesRepUsername;
      }
      return (
        o.salesRepId === selectedRepFilter ||
        o.salesRepUsername === selectedRepFilter
      );
    }

    return true;
  });

  const filteredOrders = scopedOrders.filter((o) => {
    const q = searchQuery.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.phone.includes(q) ||
      (o.companyName && o.companyName.toLowerCase().includes(q)) ||
      (o.salesRepName && o.salesRepName.toLowerCase().includes(q)) ||
      (o.salesRepUsername && o.salesRepUsername.toLowerCase().includes(q))
    );
  });

  // Calculate statistics for the active view
  const totalRevenue = scopedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalCashOrders = scopedOrders.filter((o) => o.paymentMethod !== 'installment').length;
  const totalInstallmentOrders = scopedOrders.filter((o) => o.paymentMethod === 'installment').length;

  // Personal referral link for current sales rep
  const repPersonalStoreUrl = isSalesRep && currentUser ? buildSalesRepStoreUrl(currentUser.username) : '';

  const handleCopyRepLink = () => {
    if (!repPersonalStoreUrl) return;
    navigator.clipboard.writeText(repPersonalStoreUrl);
    setCopiedLink(true);
    onShowToast('تم نسخ رابط متجرك التسويقي بنجاح!', 'success');
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleShareRepLinkWhatsApp = () => {
    if (!repPersonalStoreUrl) return;
    const msg = `مرحباً بك! تصفح الكتالوج الزراعي المعتمد لشركة كروپسا واطلب منتجاتك مباشرة من خلال رابطي الشخصي:\n${repPersonalStoreUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const exportOrdersToExcel = () => {
    if (scopedOrders.length === 0) return;
    const data = scopedOrders.flatMap((order) =>
      order.items && order.items.length > 0
        ? order.items.map((item) => ({
            'رقم الطلبية': order.orderNumber,
            'اسم العميل': order.customerName,
            'رقم الهاتف': order.phone,
            'اسم المزرعة/الشركة': order.companyName || '-',
            'المحافظة': order.governorate,
            'المدينة/المنطقة': order.city || '-',
            'طريقة الدفع': order.paymentMethod === 'installment' ? 'تقسيط زراعي' : 'كاش عند الاستلام',
            'مدة التقسيط': order.installmentDetails ? `${order.installmentDetails.durationMonths} شهور` : '-',
            'المندوب المسؤول': order.salesRepName || 'تسوق مباشر',
            'يوزر المندوب': order.salesRepUsername || '-',
            'واتساب المندوب': order.salesRepPhone || '-',
            'مصدر الإحالة': order.referralSource || 'مباشر',
            'اسم المنتج': item.productName,
            'الشركة المصنعة': item.companyName,
            'حجم العبوة': item.packageDisplayName,
            'نوع الوحدة المطلوبة': item.orderUnit === 'carton' ? 'كرتونة' : 'قطعة مفردة',
            'الكمية المطلوبة': item.quantity,
            'ما يعادل بالقطع': item.piecesEquivalent || item.quantity,
            'سعر الوحدة': item.unitPrice,
            'الإجمالي الجزئي': item.subtotal,
            'إجمالي الطلبية': order.totalAmount || 0,
            'حالة الطلبية': order.status,
            'تاريخ الطلب': order.createdAt ? order.createdAt.slice(0, 10) : '',
            'ملاحظات العميل': order.notes || '-',
          }))
        : [
            {
              'رقم الطلبية': order.orderNumber,
              'اسم العميل': order.customerName,
              'رقم الهاتف': order.phone,
              'اسم المزرعة/الشركة': order.companyName || '-',
              'المحافظة': order.governorate,
              'المدينة/المنطقة': order.city || '-',
              'طريقة الدفع': order.paymentMethod === 'installment' ? 'تقسيط زراعي' : 'كاش عند الاستلام',
              'مدة التقسيط': order.installmentDetails ? `${order.installmentDetails.durationMonths} شهور` : '-',
              'المندوب المسؤول': order.salesRepName || 'تسوق مباشر',
              'يوزر المندوب': order.salesRepUsername || '-',
              'واتساب المندوب': order.salesRepPhone || '-',
              'مصدر الإحالة': order.referralSource || 'مباشر',
              'اسم المنتج': 'لا توجد عناصر',
              'الشركة المصنعة': '-',
              'حجم العبوة': '-',
              'نوع الوحدة المطلوبة': '-',
              'الكمية المطلوبة': 0,
              'ما يعادل بالقطع': 0,
              'سعر الوحدة': 0,
              'الإجمالي الجزئي': 0,
              'إجمالي الطلبية': order.totalAmount || 0,
              'حالة الطلبية': order.status,
              'تاريخ الطلب': order.createdAt ? order.createdAt.slice(0, 10) : '',
              'ملاحظات العميل': order.notes || '-',
            },
          ]
    );

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    const sheetTitle = isSalesRep ? `فواتير_${currentUser?.username || 'المندوب'}` : 'طلبيات_العملاء';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle);
    XLSX.writeFile(workbook, `طلبيات_كروپسا_${new Date().toISOString().slice(0, 10)}.xlsx`);
    onShowToast('تم تصدير سجل الطلبيات بالمنتجات والكميات وبيانات المندوبين بنجاح', 'success');
  };

  const handlePrintOrderInvoice = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsRows = (order.items || [])
      .map(
        (item, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; text-align: right;">
          <td style="padding: 10px; font-weight: bold;">${idx + 1}</td>
          <td style="padding: 10px; font-weight: bold; color: #046a47;">${item.productName} <br/><small style="color: #64748b;">${item.companyName}</small></td>
          <td style="padding: 10px;">${item.packageDisplayName}</td>
          <td style="padding: 10px; font-weight: bold;">${item.quantity} ${item.orderUnit === 'carton' ? 'كرتونة' : 'قطعة'}</td>
          <td style="padding: 10px;">${item.unitPrice} ج</td>
          <td style="padding: 10px; font-weight: font-black; color: #046a47;">${item.subtotal} ج</td>
        </tr>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>فاتورة طلبية رقم ${order.orderNumber}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; background-color: #fff; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #046a47; padding-bottom: 15px; margin-bottom: 20px; }
          .title { color: #046a47; margin: 0; font-size: 24px; font-weight: 900; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background-color: #046a47; color: white; padding: 10px; text-align: right; font-size: 13px; }
          .total { margin-top: 20px; text-align: left; font-size: 18px; font-weight: 900; color: #046a47; padding: 10px; border-top: 2px solid #046a47; }
          .rep-tag { background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; padding: 8px 12px; border-radius: 8px; font-size: 12px; margin-bottom: 15px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">شركة كروپسا للحلول والمخصبات الزراعية</h1>
            <p style="margin: 5px 0 0 0; color: #64748b; font-size: 13px;">CROPSA Agricultural Solutions - فاتورة أوردر عميل</p>
          </div>
          <div style="text-align: left;">
            <p style="margin:0; font-weight: bold; color: #046a47;">رقم الطلب: ${order.orderNumber}</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b;">التاريخ: ${order.createdAt ? order.createdAt.slice(0, 10) : ''}</p>
          </div>
        </div>

        ${
          order.salesRepName || order.salesRepUsername
            ? `<div class="rep-tag">👨‍🌾 المستشار الزراعي والمندوب المسؤول: ${order.salesRepName || order.salesRepUsername} ${order.salesRepPhone ? `(هاتف: ${order.salesRepPhone})` : ''}</div>`
            : ''
        }

        <div class="info-grid">
          <div>
            <p style="margin: 3px 0;"><strong>اسم العميل:</strong> ${order.customerName}</p>
            <p style="margin: 3px 0;"><strong>رقم الهاتف:</strong> ${order.phone}</p>
            <p style="margin: 3px 0;"><strong>طريقة الدفع:</strong> ${order.paymentMethod === 'installment' ? 'تقسيط زراعي' : 'كاش عند الاستلام'}</p>
          </div>
          <div>
            <p style="margin: 3px 0;"><strong>المزرعة / الشركة:</strong> ${order.companyName || 'غير محدد'}</p>
            <p style="margin: 3px 0;"><strong>الموقع:</strong> ${order.governorate} - ${order.city || ''}</p>
            <p style="margin: 3px 0;"><strong>حالة الطلب:</strong> ${order.status}</p>
          </div>
        </div>

        <h3>تفاصيل المنتجات المطلوبة</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>المنتج والشركة</th>
              <th>العبوة</th>
              <th>الكمية والوحدة</th>
              <th>سعر الوحدة</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="total">
          إجمالي الفاتورة المستحق: ${Number(order.totalAmount || 0).toLocaleString('en-US')} جنيه مصري
        </div>

        ${order.notes ? `<p style="margin-top: 15px; font-size: 13px; color: #475569;"><strong>ملاحظات العميل:</strong> ${order.notes}</p>` : ''}

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSendInvoiceShortcutToRep = (order: Order, customPhone?: string) => {
    const targetPhone = customPhone || order.salesRepPhone;
    if (!targetPhone) {
      onShowToast('يرجى تحديد رقم واتساب المندوب لإرسال الشورت كت إليه', 'error');
      return;
    }
    const url = buildSalesRepWhatsAppUrl(targetPhone, order);
    window.open(url, '_blank');
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'new':
        return <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full text-xs">جديد ⏳</span>;
      case 'contacted':
        return <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full text-xs">تم التواصل 📞</span>;
      case 'confirmed':
        return <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-xs">مؤكد ✓</span>;
      case 'completed':
        return <span className="bg-green-100 text-green-900 font-bold px-2.5 py-0.5 rounded-full text-xs">مكتمل 🏁</span>;
      case 'cancelled':
        return <span className="bg-red-100 text-red-800 font-bold px-2.5 py-0.5 rounded-full text-xs">ملغي ✕</span>;
    }
  };

  const salesRepsInTeam = teamMembers.filter((m) => m.role === 'sales_rep');

  return (
    <div className="space-y-6 dir-rtl">
      {/* Sales Rep Personal Store Link Hero Banner (Shown when a sales rep is logged in) */}
      {isSalesRep && currentUser && (
        <div className="bg-gradient-to-r from-[#046A47] via-[#057A52] to-[#035237] text-white p-5 sm:p-6 rounded-3xl shadow-lg border border-emerald-400/30 space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-amber-400 text-slate-950 font-black text-[11px] px-2.5 py-0.5 rounded-full">
                  حساب مندوب مبيعات معتمد
                </span>
                <span className="text-xs text-emerald-100 font-medium font-mono">@{currentUser.username}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black">
                أهلاً بك م. {currentUser.name} — فواتيرك وطلبيات عملائك
              </h2>
              <p className="text-xs text-emerald-100/90 font-medium mt-1 max-w-2xl">
                أي عميل يطلب من الكتالوج عبر رابطك التسويقي تُسجل فاتورته باسمك فوراً وتظهر هنا، كما يصلك إشعار شورت كت مباشر على رقم واتسابك الشخصي.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="bg-white/10 backdrop-blur-xs border border-white/20 p-3 rounded-2xl flex-1 md:flex-initial text-center">
                <span className="text-[10px] text-emerald-200 block font-bold">إجمالي فواتيرك</span>
                <span className="text-lg font-black text-amber-300">{scopedOrders.length}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs border border-white/20 p-3 rounded-2xl flex-1 md:flex-initial text-center">
                <span className="text-[10px] text-emerald-200 block font-bold">قيمة مبيعاتك</span>
                <span className="text-lg font-black text-white">{totalRevenue.toLocaleString('en-US')} ج</span>
              </div>
            </div>
          </div>

          {/* Referral URL Bar */}
          <div className="bg-black/25 backdrop-blur-xs border border-white/15 p-3 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-xs font-black text-amber-300 shrink-0">رابط متجرك:</span>
              <span className="text-xs font-mono text-emerald-100 truncate select-all bg-black/30 px-3 py-1.5 rounded-xl border border-white/10 w-full" dir="ltr">
                {repPersonalStoreUrl}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyRepLink}
                className="flex-1 sm:flex-initial bg-white hover:bg-emerald-50 text-[#046A47] font-black text-xs px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'تم النسخ!' : 'نسخ الرابط'}</span>
              </button>
              <button
                type="button"
                onClick={handleShareRepLinkWhatsApp}
                className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>مشاركة للعملاء</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FAF8F5] p-6 rounded-3xl border border-[#E5E2D9] shadow-xs">
        <div>
          <h2 className="text-xl font-black text-[#2D2D24] flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#046A47]" />
            <span>
              {isSalesRep
                ? `طلبيات وفواتير المندوب (${scopedOrders.length})`
                : `إدارة جميع طلبيات وفواتير الكتالوج (${orders.length})`}
            </span>
          </h2>
          <p className="text-xs text-[#8A8A6D] font-medium">
            {isSalesRep
              ? 'متابعة تفاصيل طلبيات العملاء المحالين إليك وإرسال الشورت كت للواتساب'
              : 'استعراض جميع الطلبيات مع فلترة حسب مندوبي المبيعات ووسيلة الدفع (كاش/تقسيط)'}
          </p>
        </div>

        <button
          onClick={exportOrdersToExcel}
          disabled={scopedOrders.length === 0}
          className="bg-[#046A47] hover:bg-[#035237] disabled:opacity-50 text-[#F9F8F6] font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-amber-300" />
          <span>تصدير الطلبيات للإكسيل ({scopedOrders.length})</span>
        </button>
      </div>

      {/* Manager Summary Stats & Filters */}
      {!isSalesRep && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-[#FAF8F5] border border-[#E5E2D9] p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-[#8A8A6D] block">إجمالي قيمة الفواتير المعروضة</span>
              <span className="text-lg font-black text-[#046A47]">{totalRevenue.toLocaleString('en-US')} ج.م</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#046A47] flex items-center justify-center font-black">
              ج
            </div>
          </div>

          <div className="bg-[#FAF8F5] border border-[#E5E2D9] p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-[#8A8A6D] block">فواتير الكاش (عند الاستلام)</span>
              <span className="text-lg font-black text-emerald-800">{totalCashOrders} فاتورة</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
              كاش
            </div>
          </div>

          <div className="bg-[#FAF8F5] border border-[#E5E2D9] p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-[#8A8A6D] block">فواتير التقسيط الزراعي</span>
              <span className="text-lg font-black text-amber-800">{totalInstallmentOrders} طلبية</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs">
              تقسيط
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E5E2D9] flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8A8A6D] absolute right-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث برقم الطلب، اسم العميل، الهاتف، الشركة، أو المندوب..."
            className="w-full pr-9 pl-3 py-2 bg-[#F1EFEC] border border-[#D4D1C5] rounded-xl text-xs focus:bg-white focus:outline-none"
          />
        </div>

        {/* Manager-Only Sales Rep Filter Dropdown */}
        {!isSalesRep && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#8A8A6D]" />
            <select
              value={selectedRepFilter}
              onChange={(e) => setSelectedRepFilter(e.target.value)}
              className="py-2 px-3 bg-[#F1EFEC] border border-[#D4D1C5] rounded-xl text-xs font-bold text-[#2D2D24] focus:bg-white focus:outline-none cursor-pointer"
            >
              <option value="all">جميع المندوبين (عرض كل الفواتير)</option>
              {salesRepsInTeam.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  مندوب: {rep.name} (@{rep.username})
                </option>
              ))}
              <option value="__direct__">تسوق مباشر (بدون مندوب)</option>
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-[#FAF8F5] rounded-3xl border border-[#E5E2D9] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-[#046A47] text-white text-xs font-bold">
              <tr>
                <th className="p-4">رقم الطلبية</th>
                <th className="p-4">اسم العميل والهاتف</th>
                <th className="p-4">المندوب المسؤول</th>
                <th className="p-4">طريقة الدفع</th>
                <th className="p-4">الموقع والعنوان</th>
                <th className="p-4">المنتجات</th>
                <th className="p-4">الإجمالي المستحق</th>
                <th className="p-4">الحالة</th>
                <th className="p-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2D9]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-xs text-[#8A8A6D] font-bold">
                    لا توجد طلبيات مطابقة للبحث أو الفلتر المحدد.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const hasRep = Boolean(order.salesRepName || order.salesRepUsername);
                  return (
                    <tr key={order.id} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="p-4 font-mono text-xs font-bold text-[#046A47]">
                        {order.orderNumber}
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-[#2D2D24] block">{order.customerName}</span>
                        <span className="text-xs text-[#8A8A6D] font-mono">{order.phone}</span>
                      </td>

                      {/* Attributed Sales Rep Column */}
                      <td className="p-4">
                        {hasRep ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-2 py-0.5 rounded-lg text-[11px]">
                              <UserCheck className="w-3 h-3 text-[#046A47]" />
                              <span>{order.salesRepName || order.salesRepUsername}</span>
                            </span>
                            {order.salesRepPhone && (
                              <button
                                type="button"
                                onClick={() => handleSendInvoiceShortcutToRep(order)}
                                title="إرسال شورت كت الفاتورة لواتساب المندوب الشخصي"
                                className="flex items-center gap-1 text-[10px] text-emerald-700 hover:text-emerald-900 hover:underline font-bold cursor-pointer"
                              >
                                <MessageCircle className="w-3 h-3 text-emerald-600" />
                                <span>واتساب المندوب</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-400 text-xs font-medium">تسوق مباشر</span>
                        )}
                      </td>

                      {/* Payment Method Column */}
                      <td className="p-4">
                        {order.paymentMethod === 'installment' ? (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2 py-1 rounded-lg inline-block">
                            تقسيط ({order.installmentDetails?.durationMonths || 6} شهور)
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2 py-1 rounded-lg inline-block">
                            كاش عند الاستلام
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-xs font-semibold text-[#046A47]">
                        <div>{order.governorate} - {order.city || 'المركز'}</div>
                        <span className="text-[10px] text-gray-500 block truncate max-w-44">
                          {order.addressDetails || order.shippingAddress?.addressDetails || order.companyName || '-'}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-bold text-[#2D2D24]">{(order.items || []).length} صنف</td>
                      <td className="p-4 font-black text-[#046A47]">{Number(order.totalAmount || 0).toLocaleString('en-US')} جنيه</td>
                      <td className="p-4">{getStatusBadge(order.status)}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setModalRepPhoneOverride(order.salesRepPhone || '');
                            }}
                            className="p-1.5 bg-[#046A47] hover:bg-[#035237] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                            title="عرض التفاصيل الكاملة"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>عرض</span>
                          </button>
                          <button
                            onClick={() => handlePrintOrderInvoice(order)}
                            className="p-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                            title="طباعة وتحميل الفاتورة PDF"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 dir-rtl animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto border border-emerald-800/20">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
              <div>
                <span className="text-xs font-bold text-[#046A47] block">تفاصيل الطلبية الشاملة</span>
                <h3 className="text-xl font-black text-[#046A47]">{selectedOrder.orderNumber}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Sales Rep Attribution & WhatsApp Shortcut Card */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#046A47]" />
                  <span className="text-xs font-black text-emerald-950">المندوب المسؤول عن هذه الفاتورة:</span>
                </div>
                <span className="text-[11px] font-mono text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                  {selectedOrder.salesRepUsername ? `@${selectedOrder.salesRepUsername}` : 'طلب مباشر'}
                </span>
              </div>

              <div className="text-xs text-emerald-900 space-y-1">
                <div>
                  <strong>اسم المندوب:</strong> {selectedOrder.salesRepName || 'غير مسجل (تسوق مباشر)'}
                </div>
                <div>
                  <strong>طريقة الدفع في الفاتورة:</strong>{' '}
                  <span className={selectedOrder.paymentMethod === 'installment' ? 'text-amber-800 font-black' : 'text-[#046A47] font-black'}>
                    {selectedOrder.paymentMethod === 'installment' ? 'تقسيط زراعي' : 'كاش عند الاستلام'}
                  </span>
                </div>
                <div>
                  <strong>رابط شورت كت الفاتورة المباشر:</strong>
                  <span className="font-mono text-[11px] text-emerald-700 block truncate" dir="ltr">
                    {getOrderDirectShortcutUrl(selectedOrder.orderNumber)}
                  </span>
                </div>
              </div>

              {/* WhatsApp Shortcut Ping Controls */}
              <div className="pt-2 border-t border-emerald-200 space-y-2">
                <label className="text-[11px] font-bold text-emerald-900 block">
                  إرسال شورت كت الفاتورة لواتساب المندوب الشخصي:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="tel"
                    value={modalRepPhoneOverride}
                    onChange={(e) => setModalRepPhoneOverride(e.target.value)}
                    placeholder="رقم واتساب المندوب (010xxxxxxxx)"
                    className="flex-1 bg-white border border-emerald-300 text-xs rounded-xl px-3 py-2 font-mono"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendInvoiceShortcutToRep(selectedOrder, modalRepPhoneOverride)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer transition-all shrink-0"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>إرسال واتساب 🔔</span>
                  </button>
                </div>
                <p className="text-[10px] text-emerald-700 font-medium">
                  الرسالة تحتوي على رابط الشورت كت المباشر، اسم العميل، هاتفه، وتوضيح هل الفاتورة كاش أم تقسيط.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-gray-700 bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
              <div>
                <strong>العميل:</strong> {selectedOrder.customerName}
              </div>
              <div>
                <strong>رقم الهاتف:</strong> {selectedOrder.phone}
              </div>
              <div>
                <strong>المحافظة والمركز:</strong> {selectedOrder.governorate} - {selectedOrder.city}
              </div>
              <div>
                <strong>طريقة الدفع:</strong>{' '}
                <span className={selectedOrder.paymentMethod === 'installment' ? 'text-amber-800 font-black' : 'text-[#046A47] font-black'}>
                  {selectedOrder.paymentMethod === 'installment' ? 'تقسيط زراعي وتجاري' : 'كاش عند الاستلام'}
                </span>
              </div>
              <div className="col-span-2">
                <strong>العنوان التفصيلي:</strong>{' '}
                {selectedOrder.addressDetails || selectedOrder.shippingAddress?.addressDetails || 'حسب المحافظة والمركز'}
              </div>
              <div className="col-span-2">
                <strong>تاريخ ووقت الطلب:</strong> {selectedOrder.createdAt ? selectedOrder.createdAt.slice(0, 16).replace('T', ' ') : '-'}
              </div>
            </div>

            {/* Installment Details Box */}
            {selectedOrder.paymentMethod === 'installment' && selectedOrder.installmentDetails && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-xs space-y-2">
                <div className="font-black text-amber-900 flex items-center justify-between">
                  <span>تفاصيل طلب التقسيط الزراعي:</span>
                  <span className="bg-amber-200 text-amber-950 px-2.5 py-0.5 rounded-full font-bold">
                    {selectedOrder.installmentDetails.durationMonths} شهور
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-amber-950">
                  <div>
                    <strong>القسط الشهري المقدر:</strong> {selectedOrder.installmentDetails.monthlyAmount || Math.ceil(selectedOrder.totalAmount / selectedOrder.installmentDetails.durationMonths)} جنيه / شهر
                  </div>
                  <div>
                    <strong>المهنة أو الحيازة:</strong> {selectedOrder.installmentDetails.applicantJobOrFarm || 'مزارع'}
                  </div>
                </div>
                <div className="pt-1.5 border-t border-amber-200/80 text-[11px] text-amber-800">
                  <strong>المستندات المرفقة:</strong> صورة البطاقة الشخصية ومستند الضمان مسجلة مع الطلب للمراجعة.
                </div>
              </div>
            )}

            {/* Items List */}
            <div className="space-y-2">
              <span className="text-xs font-black text-[#046A47] block">المنتجات المطلوبة ({selectedOrder.items ? selectedOrder.items.length : 0}):</span>
              {selectedOrder.items && selectedOrder.items.length > 0 ? (
                selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-xl border-2 border-emerald-100 flex justify-between items-center text-xs shadow-2xs">
                    <div>
                      <span className="font-black text-[#046A47] text-sm block">{item.productName}</span>
                      <span className="text-gray-600 font-semibold">
                        الشركة: {item.companyName} | العبوة: {item.packageDisplayName}
                      </span>
                      <div className="text-[11px] text-emerald-800 font-bold mt-0.5">
                        الكمية: {item.quantity} {item.orderUnit === 'carton' ? `كرتونة (${item.piecesEquivalent || item.quantity * (item.piecesPerCarton || 12)} قطعة)` : 'قطعة مفردة'}
                      </div>
                    </div>
                    <div className="text-left">
                      <span className="font-black text-[#046A47] text-base block">{item.subtotal} ج</span>
                      <span className="text-[10px] text-gray-500">سعر الوحدة: {item.unitPrice} ج</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs font-bold text-gray-500 text-center py-2">لا توجد منتجات مسجلة في هذه الطلبية.</p>
              )}
            </div>

            {/* Total Amount Banner */}
            <div className="p-3.5 bg-[#046A47] text-white rounded-xl flex items-center justify-between font-black text-sm">
              <span>الإجمالي الكلي المستحق:</span>
              <span className="text-lg text-amber-300">{Number(selectedOrder.totalAmount || 0).toLocaleString('en-US')} جنيه مصري</span>
            </div>

            {/* Notes */}
            {selectedOrder.notes && (
              <div className="p-3 bg-gray-50 rounded-xl border text-xs text-gray-700">
                <strong>ملاحظات العميل:</strong> {selectedOrder.notes}
              </div>
            )}

            {/* Action buttons inside modal */}
            <div className="flex gap-2">
              <button
                onClick={() => handlePrintOrderInvoice(selectedOrder)}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة وتحميل الفاتورة PDF</span>
              </button>
            </div>

            {/* Change Status */}
            <div className="pt-3 border-t space-y-2">
              <label className="text-xs font-bold text-gray-700 block">تغيير حالة الطلبية:</label>
              <div className="flex flex-wrap gap-2">
                {(['new', 'contacted', 'confirmed', 'completed', 'cancelled'] as Order['status'][]).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      onUpdateOrderStatus(selectedOrder.id, st);
                      setSelectedOrder({ ...selectedOrder, status: st });
                      onShowToast('تم تعديل حالة الطلبية بنجاح', 'success');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                      selectedOrder.status === st ? 'bg-[#046A47] text-white border-[#046A47] shadow-xs' : 'bg-white text-gray-700 hover:bg-emerald-50'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

