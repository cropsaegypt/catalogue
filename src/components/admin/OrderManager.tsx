import React, { useState } from 'react';
import { ShoppingBag, Search, Eye, Phone, MapPin, CheckCircle2, Clock, XCircle, FileSpreadsheet, Printer, Download } from 'lucide-react';
import { Order } from '../../types';
import * as XLSX from 'xlsx';

interface OrderManagerProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  onShowToast: (msg: string, type: 'success' | 'error') => void;
}

export const OrderManager: React.FC<OrderManagerProps> = ({
  orders,
  onUpdateOrderStatus,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = orders.filter((o) => {
    return (
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.phone.includes(searchQuery) ||
      (o.companyName && o.companyName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const exportOrdersToExcel = () => {
    if (orders.length === 0) return;
    const data = orders.flatMap((order) =>
      order.items && order.items.length > 0
        ? order.items.map((item) => ({
            'رقم الطلبية': order.orderNumber,
            'اسم العميل': order.customerName,
            'رقم الهاتف': order.phone,
            'اسم المزرعة/الشركة': order.companyName || '-',
            'المافظة': order.governorate,
            'المدينة/المنطقة': order.city || '-',
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'طلبيات_العملاء');
    XLSX.writeFile(workbook, `طلبيات_كروپسا_${new Date().toISOString().slice(0, 10)}.xlsx`);
    onShowToast('تم تصدير سجل الطلبيات بالمنتجات والكميات إلى ملف إكسيل بنجاح', 'success');
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
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #f8fafc; padding: 15px; rounded: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background-color: #046a47; color: white; padding: 10px; text-align: right; font-size: 13px; }
          .total { margin-top: 20px; text-align: left; font-size: 18px; font-weight: 900; color: #046a47; padding: 10px; border-top: 2px solid #046a47; }
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
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b;">التاريخ: ${order.createdAt.slice(0, 10)}</p>
          </div>
        </div>

        <div class="info-grid">
          <div>
            <p style="margin: 3px 0;"><strong>اسم العميل:</strong> ${order.customerName}</p>
            <p style="margin: 3px 0;"><strong>رقم الهاتف:</strong> ${order.phone}</p>
          </div>
          <div>
            <p style="margin: 3px 0;"><strong>المزرعة / الشركة:</strong> ${order.companyName || 'غير محدد'}</p>
            <p style="margin: 3px 0;"><strong>الموقع:</strong> ${order.governorate} - ${order.city || ''}</p>
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

  return (
    <div className="space-y-6 dir-rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#FAF8F5] p-6 rounded-3xl border border-[#E5E2D9] shadow-xs">
        <div>
          <h2 className="text-xl font-black text-[#2D2D24] flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#046A47]" />
            <span>إدارة طلبيات العملاء ({orders.length})</span>
          </h2>
          <p className="text-xs text-[#8A8A6D] font-medium">استعراض وتصدير الطلبيات الواردة من الكتالوج الرقمي</p>
        </div>

        <button
          onClick={exportOrdersToExcel}
          disabled={orders.length === 0}
          className="bg-[#046A47] hover:bg-[#035237] disabled:opacity-50 text-[#F9F8F6] font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-amber-300" />
          <span>تصدير جميع الطلبيات للإكسيل</span>
        </button>
      </div>

      {/* Filter */}
      <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E5E2D9]">
        <div className="relative">
          <Search className="w-4 h-4 text-[#8A8A6D] absolute right-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث برقم الطلب، اسم العميل، رقم الهاتف، أو الشركة..."
            className="w-full pr-9 pl-3 py-2 bg-[#F1EFEC] border border-[#D4D1C5] rounded-xl text-xs focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#FAF8F5] rounded-3xl border border-[#E5E2D9] shadow-xs overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="bg-[#046A47] text-white text-xs font-bold">
            <tr>
              <th className="p-4">رقم الطلبية</th>
              <th className="p-4">اسم العميل والهاتف</th>
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
                <td colSpan={8} className="p-8 text-center text-xs text-[#8A8A6D] font-bold">
                  لا توجد طلبيات مطابقة حالياً.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-emerald-50/40 transition-colors">
                  <td className="p-4 font-mono text-xs font-bold text-[#046A47]">{order.orderNumber}</td>
                  <td className="p-4">
                    <span className="font-bold text-[#2D2D24] block">{order.customerName}</span>
                    <span className="text-xs text-[#8A8A6D] font-mono">{order.phone}</span>
                  </td>
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
                        onClick={() => setSelectedOrder(order)}
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
              ))
            )}
          </tbody>
        </table>
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
                  <strong>المستندات المرفقة:</strong> صورة البطاقة الشخصية (وش/ظهر) ومستند الضمان مسجلة مع الطلب للمراجعة.
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

