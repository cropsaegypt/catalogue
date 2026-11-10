import React, { useState } from 'react';
import {
  X,
  Trash2,
  ShoppingBag,
  Send,
  CheckCircle2,
  MessageSquare,
  Phone,
  User,
  MapPin,
  CreditCard,
  Banknote,
  FileText,
  Upload,
  Calendar,
  Printer,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { OrderItem, Order, TeamMember } from '../../types';
import { canViewOrderLink } from '../../utils/permissions';

interface BasketDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: OrderItem[];
  onUpdateQuantity: (index: number, newQty: number) => void;
  onRemoveItem: (index: number) => void;
  onClearBasket: () => void;
  onSubmitOrder: (orderPayload: {
    customerName: string;
    phone: string;
    companyName: string;
    governorate: string;
    city: string;
    addressDetails?: string;
    paymentMethod: 'cash' | 'installment';
    installmentDetails?: any;
    shippingAddress?: any;
    notes: string;
    items: OrderItem[];
    totalAmount: number;
  }) => Promise<Order | any>;
  whatsAppNumber?: string;
  currentUser?: TeamMember | null;
}

const EGYPT_GOVERNORATES = [
  'البحيرة', 'كفر الشيخ', 'الدقهلية', 'الشرقية', 'الغربية', 'المنوفية',
  'القليوبية', 'الإسكندرية', 'الجيزة', 'القاهرة', 'الفيوم', 'بني سويف',
  'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'الإسماعيلية',
  'السويس', 'بورسعيد', 'دمياط', 'مطروح', 'الوادي الجديد', 'شمال سيناء', 'جنوب سيناء'
];

export const BasketDrawer: React.FC<BasketDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearBasket,
  onSubmitOrder,
  whatsAppNumber = '201012345678',
  currentUser = null,
}) => {
  if (!isOpen) return null;

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState('البحيرة');
  const [city, setCity] = useState('');
  const [addressDetails, setAddressDetails] = useState('');
  const [notes, setNotes] = useState('');

  // Payment & Installment State
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'installment'>('cash');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);

  const totalAmount = items.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    if (!customerName.trim() || !phone.trim()) {
      alert('يرجى إدخال الاسم ورقم الهاتف للتواصل وإصدار الفاتورة.');
      return;
    }
    if (!city.trim() || !addressDetails.trim()) {
      alert('يرجى كتابة المركز/المدينة والعنوان بالتفصيل لتسليم الطلبية.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        phone: phone.trim(),
        companyName: items[0]?.companyName || '',
        governorate,
        city: city.trim(),
        addressDetails: addressDetails.trim(),
        paymentMethod,
        installmentDetails:
          paymentMethod === 'installment'
            ? {
                durationMonths: 0,
                status: 'pending_review' as const,
                notes: 'طلب تقسيط — بانتظار تواصل الموظف مع العميل',
              }
            : undefined,
        shippingAddress: {
          governorate,
          city: city.trim(),
          addressDetails: addressDetails.trim(),
        },
        notes: notes.trim(),
        items,
        totalAmount,
      };

      const result = await onSubmitOrder(payload);
      setSubmittedOrder(
        result || {
          id: 'ORD-' + Date.now(),
          orderNumber: `CR-${Date.now().toString().slice(-6)}`,
          customerName: customerName.trim(),
          phone: phone.trim(),
          governorate,
          city: city.trim(),
          addressDetails: addressDetails.trim(),
          paymentMethod,
          installmentDetails: payload.installmentDetails,
          items,
          totalItems: items.reduce((sum, it) => sum + it.quantity, 0),
          totalAmount,
          status: 'new',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إرسال الطلبية، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getEmployeeActionUrl = (orderNumber: string) => {
    return `${window.location.origin}/?order=${encodeURIComponent(orderNumber)}`;
  };

  const generateWhatsAppMessage = () => {
    if (!submittedOrder) return '';
    const actionUrl = getEmployeeActionUrl(submittedOrder.orderNumber);
    const paymentText =
      submittedOrder.paymentMethod === 'installment'
        ? 'تقسيط (مطلوب تواصل الموظف)'
        : 'كاش عند الاستلام';

    let msg = `🧾 *فاتورة وطلبية جديدة — كروپسا CROPSA*\n`;
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += `📄 *رقم الطلبية:* ${submittedOrder.orderNumber}\n`;
    msg += `👤 *اسم العميل:* ${submittedOrder.customerName}\n`;
    msg += `📞 *رقم العميل:* ${submittedOrder.phone}\n`;
    msg += `📍 *العنوان:* ${submittedOrder.governorate} - ${submittedOrder.city || ''} (${submittedOrder.addressDetails || ''})\n`;
    msg += `💳 *نوع الدفع:* ${paymentText}\n`;
    msg += `💰 *قيمة الفاتورة:* ${Number(submittedOrder.totalAmount || 0).toLocaleString('en-US')} جنيه مصري\n`;
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += `🛒 *تفاصيل المنتجات:*\n`;
    submittedOrder.items.forEach((item, idx) => {
      msg += `${idx + 1}. ${item.productName}${item.companyName ? ` (${item.companyName})` : ''} — ${item.quantity} × ${item.packageDisplayName} = ${item.subtotal} ج.م\n`;
    });
    if (submittedOrder.notes) {
      msg += `📝 *ملاحظات:* ${submittedOrder.notes}\n`;
    }
    msg += `━━━━━━━━━━━━━━━━━\n`;
    msg += `🔗 *فتح الطلبية والمنتجات للموظف في الموقع:*\n`;
    msg += `${actionUrl}\n`;
    return encodeURIComponent(msg);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden dir-rtl animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-xl bg-[#FAF8F5] shadow-2xl flex flex-col justify-between border-l border-[#E5E2D9] overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-[#046A47] to-[#035237] text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-300" />
              <div>
                <h3 className="font-black text-base leading-tight">سلة المشتريات والطلبيات</h3>
                <p className="text-[11px] text-emerald-100 font-medium">خطوات بسيطة وميسرة للمزارعين والتجار</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 1. If Order is Submitted: Show Invoice & Reassurance */}
          {submittedOrder ? (
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div className="bg-white rounded-3xl p-6 border-2 border-emerald-500/30 text-center shadow-lg space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-[#046A47] rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    تم استلام طلبك بنجاح
                  </span>
                  <h3 className="text-xl font-black text-gray-900 mt-2">
                    {submittedOrder.paymentMethod === 'installment'
                      ? 'تم تسجيل طلب التقسيط وتجهيز الفاتورة المبدئية'
                      : 'تم تأكيد طلب الشراء النقدي بنجاح'}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1 font-bold">
                    رقم الطلب والفاتورة: <span className="font-mono text-[#046A47] font-black">{submittedOrder.orderNumber}</span>
                  </p>
                </div>

                {/* Installment reassurance message if applicable */}
                {submittedOrder.paymentMethod === 'installment' && (
                  <div className="bg-amber-50 border border-amber-300/80 rounded-2xl p-4 text-right space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-950 font-black text-sm">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>حد من فريق المبيعات هيتواصل معاك قريباً</span>
                    </div>
                    <p className="text-xs text-amber-900 font-medium leading-relaxed">
                      تم إرسال طلب التقسيط الخاص بك بنجاح. سيتم الاتصال بك على رقم الهاتف ({submittedOrder.phone}) لتأكيد تفاصيل التقسيط وموعد التوصيل.
                    </p>
                  </div>
                )}

                {/* Printable Invoice Card */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-right text-xs space-y-3 font-mono">
                  <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-500 font-sans">اسم العميل:</span>
                    <span className="font-bold text-gray-900">{submittedOrder.customerName}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-500 font-sans">رقم الهاتف:</span>
                    <span className="font-bold text-gray-900">{submittedOrder.phone}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-500 font-sans">العنوان:</span>
                    <span className="font-bold text-gray-900">
                      {submittedOrder.governorate} - {submittedOrder.city || ''} ({submittedOrder.addressDetails || ''})
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-500 font-sans">طريقة الدفع:</span>
                    <span className="font-bold text-emerald-800">
                      {submittedOrder.paymentMethod === 'installment'
                        ? 'تقسيط (مطلوب تواصل الموظف)'
                        : 'كاش عند الاستلام'}
                    </span>
                  </div>

                  <div className="pt-1">
                    <div className="font-bold text-gray-700 font-sans mb-1">المنتجات ({submittedOrder.items.length}):</div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {submittedOrder.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] text-gray-600">
                          <span>{it.quantity}x {it.productName} ({it.packageDisplayName})</span>
                          <span className="font-bold text-gray-900">{it.subtotal} ج</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t-2 border-dashed border-gray-300 flex justify-between text-sm font-black text-gray-900 font-sans">
                    <span>إجمالي الطلبية:</span>
                    <span className="text-[#046A47]">{submittedOrder.totalAmount} جنيه مصري</span>
                  </div>
                </div>

                {/* Actions: WhatsApp, Employee Action Link, Print */}
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <a
                      href={`https://wa.me/${whatsAppNumber.replace(/[^0-9]/g, '')}?text=${generateWhatsAppMessage()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white font-black py-3 px-4 rounded-xl shadow-md transition-all text-xs"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>إرسال الفاتورة عبر واتساب</span>
                    </a>

                    <button
                      onClick={handlePrint}
                      className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all text-xs cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>طباعة</span>
                    </button>
                  </div>

                  {canViewOrderLink(currentUser) && (
                    <a
                      href={getEmployeeActionUrl(submittedOrder.orderNumber)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-[#046A47] border border-emerald-200 font-black py-2.5 px-4 rounded-xl transition-all text-xs"
                    >
                      <FileText className="w-4 h-4" />
                      <span>عرض رابط الطلبية المباشر للموظف</span>
                    </a>
                  )}
                </div>

                <button
                  onClick={() => {
                    setSubmittedOrder(null);
                    onClearBasket();
                    onClose();
                  }}
                  className="w-full text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors pt-2 cursor-pointer"
                >
                  العودة للكتالوج والطلب مرة أخرى
                </button>
              </div>
            </div>
          ) : (
            /* 2. Standard Basket & Checkout Form */
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Product Items List */}
              {items.length === 0 ? (
                <div className="text-center py-12 space-y-3 bg-white rounded-3xl p-6 border border-gray-200">
                  <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-gray-800">السلة فارغة حالياً</h4>
                  <p className="text-xs text-gray-500">اختر المركبات والأسمدة المطلوبة من الكتالوج واضغط إضافة.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-gray-700">الأصناف المختارة ({items.length}):</span>
                    <button
                      onClick={onClearBasket}
                      className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>إفراغ السلة</span>
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-xs text-gray-900 truncate">{item.productName}</h5>
                          <div className="flex items-center gap-2 text-[11px] text-gray-500">
                            <span>{item.companyName}</span>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold">{item.packageDisplayName}</span>
                          </div>
                          <div className="text-xs font-black text-[#046A47] mt-0.5">
                            {item.subtotal} جنيه
                          </div>
                        </div>

                        {/* Quantity Controls (- / Direct Editable Input / +) */}
                        <div className="flex items-center gap-1 bg-stone-100 border border-stone-200 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(idx, item.quantity - 1)}
                            className="w-8 h-8 rounded-lg bg-white text-stone-800 hover:bg-stone-200 flex items-center justify-center font-black text-sm cursor-pointer shadow-2xs"
                            title="إنقاص"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            value={item.quantity}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const parsed = parseInt(e.target.value, 10);
                              if (!isNaN(parsed) && parsed >= 1) {
                                onUpdateQuantity(idx, parsed);
                              }
                            }}
                            className="w-12 h-8 text-center font-black text-sm text-[#046A47] bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-[#046A47]"
                          />
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(idx, item.quantity + 1)}
                            className="w-8 h-8 rounded-lg bg-[#046A47] text-white hover:bg-[#035237] flex items-center justify-center font-black text-sm cursor-pointer shadow-2xs"
                            title="زيادة"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveItem(idx)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Subtotal Banner */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex justify-between items-center text-sm">
                    <span className="font-bold text-gray-800">إجمالي الطلبية:</span>
                    <span className="text-lg font-black text-[#046A47]">{Number(totalAmount).toLocaleString('en-US')} جنيه</span>
                  </div>
                </div>
              )}

              {/* Checkout Form */}
              {items.length > 0 && (
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-xs font-black text-gray-900 mb-3 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-[#046A47]" />
                      <span>بيانات المستلم وعنوان التوصيل:</span>
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">الاسم بالكامل *</label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="مثال: الحاج أحمد عبد السلام"
                          className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#046A47] focus:outline-hidden bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">رقم الهاتف المحمول (واتساب) *</label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="010xxxxxxxx"
                          className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#046A47] focus:outline-hidden bg-white font-mono"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">المحافظة *</label>
                          <select
                            value={governorate}
                            onChange={(e) => setGovernorate(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#046A47] focus:outline-hidden bg-white"
                          >
                            {EGYPT_GOVERNORATES.map((gov) => (
                              <option key={gov} value={gov}>
                                {gov}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">المركز / المدينة *</label>
                          <input
                            type="text"
                            required
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="مثال: إيتاي البارود"
                            className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#046A47] focus:outline-hidden bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">العنوان بالتفصيل (القرية، المزرعة، الحوض، أقرب علامة) *</label>
                        <input
                          type="text"
                          required
                          value={addressDetails}
                          onChange={(e) => setAddressDetails(e.target.value)}
                          placeholder="مثال: طريق المزرعة، بجوار الجمعية الزراعية"
                          className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#046A47] focus:outline-hidden bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Method Selector: Cash vs Installment */}
                  <div className="border-t border-gray-200 pt-4 space-y-3">
                    <h4 className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-[#046A47]" />
                      <span>اختر طريقة الدفع المناسبة لك:</span>
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <label
                        className={`p-3 rounded-2xl border-2 flex flex-col gap-1.5 cursor-pointer transition-all ${
                          paymentMethod === 'cash'
                            ? 'border-[#046A47] bg-emerald-50/70 shadow-xs'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === 'cash'}
                            onChange={() => setPaymentMethod('cash')}
                            className="text-[#046A47] focus:ring-[#046A47]"
                          />
                          <Banknote className={`w-5 h-5 ${paymentMethod === 'cash' ? 'text-[#046A47]' : 'text-gray-400'}`} />
                        </div>
                        <span className="font-black text-xs text-gray-900">دفع كاش / نقدي</span>
                        <span className="text-[10px] text-gray-500 font-medium">عند استلام وفحص الطلبية</span>
                      </label>

                      <label
                        className={`p-3 rounded-2xl border-2 flex flex-col gap-1.5 cursor-pointer transition-all ${
                          paymentMethod === 'installment'
                            ? 'border-amber-600 bg-amber-50/70 shadow-xs ring-1 ring-amber-500'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === 'installment'}
                            onChange={() => setPaymentMethod('installment')}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <Sparkles className={`w-5 h-5 ${paymentMethod === 'installment' ? 'text-amber-600' : 'text-gray-400'}`} />
                        </div>
                        <span className="font-black text-xs text-amber-950">تقسيط زراعي وتجاري</span>
                        <span className="text-[10px] text-amber-800 font-medium">سداد مرن حتى 12 شهراً</span>
                      </label>
                    </div>

                    {/* Simple Installment Reassurance Notice */}
                    {paymentMethod === 'installment' && (
                      <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in duration-200">
                        <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h5 className="text-xs font-black text-amber-950">
                            حد من فريقنا هيتواصل معاك!
                          </h5>
                          <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
                            عند إرسال الطلب، سيتواصل معك أحد ممثلي المبيعات هاتفياً لتحديد خطة التقسيط المناسبة لك وتأكيد الفاتورة بدون أي أوراق معقدة هنا.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">ملاحظات إضافية (اختياري)</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="أي تعليمات تخص مواعيد الاستلام أو التركيبات المطلوبة..."
                      className="w-full text-xs p-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#046A47] focus:outline-hidden bg-white"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-[#046A47] to-[#035237] hover:from-[#035237] hover:to-[#023E29] text-white font-black text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>جاري إرسال الطلبية وحفظ الفاتورة...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>
                          {paymentMethod === 'installment'
                            ? 'إرسال طلب التقسيط وإصدار الفاتورة'
                            : 'تأكيد الطلبية وإصدار الفاتورة'}
                        </span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
