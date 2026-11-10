import React, { useState } from 'react';
import {
  CheckCircle2,
  Phone,
  MessageCircle,
  MapPin,
  CreditCard,
  Banknote,
  Package,
  Printer,
  ArrowRight,
  User,
  Clock,
  Building2,
  ShieldCheck,
  KeyRound,
  LogIn,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  AlertCircle,
} from 'lucide-react';
import { Order, TeamMember } from '../../types';
import { canViewOrderLink, hasDashboardAccess, ROLE_METADATA } from '../../utils/permissions';
import { firestoreSync } from '../../services/firestoreSync';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

interface OrderDetailsPageProps {
  order: Order;
  currentUser: TeamMember | null;
  onLogin: (
    usernameOrEmail: string,
    pass: string
  ) => { success: boolean; user?: TeamMember; error?: string };
  onLogout: () => void;
  onUpdateStatus: (orderNumber: string, status: Order['status']) => void;
  onBackToCatalog: () => void;
  onOpenAdmin: () => void;
}

export const OrderDetailsPage: React.FC<OrderDetailsPageProps> = ({
  order,
  currentUser,
  onLogin,
  onLogout,
  onUpdateStatus,
  onBackToCatalog,
  onOpenAdmin,
}) => {
  const [currentStatus, setCurrentStatus] = useState<Order['status']>(order.status);
  const [updating, setUpdating] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  const allowed = canViewOrderLink(currentUser);
  const canOpenDash = hasDashboardAccess(currentUser);

  const handleGateLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onLogin(username, password);
    if (!res.success) {
      setLoginError(res.error || 'بيانات الدخول غير صحيحة.');
      return;
    }
    setLoginError('');
    setPassword('');
  };

  if (!currentUser || !allowed) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4 dir-rtl font-sans">
        <div className="bg-white rounded-3xl max-w-md w-full shadow-xl border border-stone-200 overflow-hidden">
          <div className="p-5 bg-gradient-to-r from-[#046A47] to-[#024A31] text-white flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight">
                رابط طلبية خاص بالموظفين
              </h2>
              <p className="text-[11px] text-emerald-100 font-medium mt-0.5 font-mono">
                طلب رقم #{order.orderNumber}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {currentUser && !allowed ? (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-1.5">
                  <AlertCircle className="w-7 h-7 text-rose-600 mx-auto" />
                  <h3 className="text-sm font-black text-rose-950">لا توجد صلاحية لعرض الطلبية</h3>
                  <p className="text-xs text-rose-800 font-medium leading-relaxed">
                    الحساب المسجل حالياً (<strong>{currentUser.name}</strong>) لا يمتلك صلاحية «عرض رابط الطلبية المباشر للموظف». يرجى مراجعة المدير أو الدخول بحساب موظف مخوّل.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex-1 h-11 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>تبديل الحساب</span>
                  </button>
                  <button
                    type="button"
                    onClick={onBackToCatalog}
                    className="flex-1 h-11 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-black cursor-pointer"
                  >
                    العودة للكتالوج
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGateLogin} className="space-y-4">
                <p className="text-xs text-stone-600 font-medium leading-relaxed">
                  هذه الصفحة مخصصة لموظفي الشركة لمتابعة تفاصيل الطلبية وتحديث حالتها. سجل الدخول بحساب الموظف للمتابعة.
                </p>

                {loginError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-black text-stone-800 mb-1">
                    اسم المستخدم أو البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute right-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="مثال: sales_user"
                      className="w-full h-11 pr-10 pl-3 bg-stone-50 border border-stone-300 focus:border-[#046A47] rounded-xl text-sm font-bold focus:outline-none"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-stone-800 mb-1">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-stone-400 absolute right-3.5 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-11 pr-10 pl-10 bg-stone-50 border border-stone-300 focus:border-[#046A47] rounded-xl text-sm font-bold focus:outline-none"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-3 text-stone-400 hover:text-stone-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full h-12 bg-[#046A47] hover:bg-[#035237] text-white font-black text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>دخول وعرض تفاصيل الطلبية</span>
                </button>

                <button
                  type="button"
                  onClick={onBackToCatalog}
                  className="w-full text-xs font-bold text-stone-500 hover:text-stone-800 pt-1 cursor-pointer"
                >
                  ← العودة للكتالوج
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: Order['status']) => {
    setUpdating(true);
    setCurrentStatus(newStatus);
    onUpdateStatus(order.orderNumber, newStatus);
    try {
      await Promise.allSettled([
        firestoreSync.updateOrderStatus(order.orderNumber, newStatus),
        fetch(`/api/orders/${encodeURIComponent(order.orderNumber)}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }),
      ]);
    } catch {
      // Offline / local fallback handled via parent
    } finally {
      setUpdating(false);
    }
  };

  const cleanPhone = order.phone.replace(/[^0-9]/g, '');
  const waPhone = cleanPhone.startsWith('0') ? `2${cleanPhone}` : cleanPhone;

  const statusLabels: Record<Order['status'], { label: string; color: string }> = {
    new: { label: 'طلب جديد - بانتظار المراجعة', color: 'bg-amber-100 text-amber-900 border-amber-300' },
    contacted: { label: 'تم التواصل مع العميل', color: 'bg-sky-100 text-sky-900 border-sky-300' },
    confirmed: { label: 'تم التأكيد وجاري التجهيز', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    completed: { label: 'مكتمل وتم التسليم', color: 'bg-emerald-700 text-white border-emerald-700' },
    cancelled: { label: 'ملغي', color: 'bg-rose-100 text-rose-900 border-rose-300' },
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] py-6 px-3 sm:px-6 dir-rtl font-sans">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Top Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={onBackToCatalog} className="gap-1.5">
              <ArrowRight className="w-4 h-4" />
              <span>العودة للكتالوج</span>
            </Button>
            {canOpenDash && (
              <Button variant="ghost" size="sm" onClick={onOpenAdmin} className="text-xs font-bold">
                لوحة الإدارة
              </Button>
            )}
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-[#046A47] border border-emerald-200 px-2.5 py-1 rounded-xl text-[11px] font-black">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{currentUser.name}</span>
              <span className="text-[10px] opacity-75">({ROLE_METADATA[currentUser.role]?.shortLabel})</span>
            </span>
          </div>

          <Button variant="dark" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-4 h-4" />
            <span>طباعة الفاتورة</span>
          </Button>
        </div>

        {/* Main Order Summary Card */}
        <Card className="overflow-hidden border-2 border-emerald-600/20 shadow-md">
          <div className="bg-gradient-to-r from-[#046A47] to-[#024A31] text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-amber-400 text-stone-950 text-[11px] font-black px-2.5 py-0.5 rounded-full">
                  تفاصيل فاتورة عميل
                </span>
                <span className="text-xs text-emerald-200 font-mono">#{order.orderNumber}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black">طلبية رقم {order.orderNumber}</h1>
              <p className="text-xs text-emerald-100 flex items-center gap-1 mt-1">
                <Clock className="w-3.5 h-3.5" />
                <span>تاريخ الطلب: {new Date(order.createdAt).toLocaleString('ar-EG')}</span>
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-2xl px-4 py-3 text-left sm:text-right">
              <span className="text-[11px] text-emerald-200 block font-bold">إجمالي قيمة الفاتورة</span>
              <span className="text-2xl font-black text-amber-300">
                {Number(order.totalAmount || 0).toLocaleString('en-US')}{' '}
                <span className="text-xs font-bold text-white">جنيه مصري</span>
              </span>
            </div>
          </div>

          <CardContent className="p-5 sm:p-6 space-y-6">
            {/* Status Bar & Employee Quick Actions */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black text-stone-700">حالة الطلبية الحالية:</span>
                <span
                  className={`text-xs font-black px-3 py-1 rounded-full border ${
                    statusLabels[currentStatus]?.color || 'bg-stone-100'
                  }`}
                >
                  {statusLabels[currentStatus]?.label || currentStatus}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-bold text-stone-500">تحديث الحالة (للموظف):</span>
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleStatusChange('contacted')}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black cursor-pointer transition-colors"
                >
                  تم التواصل مع العميل
                </button>
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleStatusChange('confirmed')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer transition-colors"
                >
                  تأكيد الطلبية
                </button>
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleStatusChange('completed')}
                  className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-black cursor-pointer transition-colors"
                >
                  مكتمل / تم التسليم
                </button>
              </div>
            </div>

            {/* Customer Details & Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-3">
                <h3 className="text-xs font-black text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-700" />
                  <span>بيانات العميل</span>
                </h3>
                <div className="space-y-1.5">
                  <div className="text-base font-black text-stone-900">{order.customerName}</div>
                  <div className="text-sm font-bold text-emerald-800 font-mono" dir="ltr">
                    {order.phone}
                  </div>
                  <div className="text-xs text-stone-600 font-medium flex items-start gap-1.5 pt-1">
                    <MapPin className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                    <span>
                      {order.governorate} - {order.city} {order.addressDetails ? `(${order.addressDetails})` : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <a
                    href={`tel:${order.phone}`}
                    className="flex-1 h-10 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5"
                  >
                    <Phone className="w-4 h-4" />
                    <span>اتصال بالعميل</span>
                  </a>
                  <a
                    href={`https://wa.me/${waPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-10 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    <span>واتساب العميل</span>
                  </a>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-3">
                <h3 className="text-xs font-black text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-amber-600" />
                  <span>طريقة الدفع والملاحظات</span>
                </h3>
                <div className="p-3 rounded-xl border flex items-center gap-3 bg-stone-50">
                  {order.paymentMethod === 'installment' ? (
                    <>
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-amber-950">طلب دفع بالتقسيط</div>
                        <div className="text-[11px] text-amber-800 font-bold">
                          يرجى تواصل الموظف مع العميل لتحديد نظام التقسيط
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Banknote className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-emerald-950">كاش عند الاستلام</div>
                        <div className="text-[11px] text-emerald-700 font-bold">
                          التحصيل نقداً عند تسليم البضاعة
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {order.notes && (
                  <div className="text-xs bg-amber-50/70 border border-amber-200 p-3 rounded-xl text-stone-800">
                    <span className="font-black block mb-0.5">ملاحظات العميل:</span>
                    {order.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Products Table */}
            <div className="space-y-3">
              <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-700" />
                <span>المنتجات المطلوبة في الفاتورة ({order.items.length})</span>
              </h3>

              <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white">
                <div className="divide-y divide-stone-100">
                  {order.items.map((item, index) => (
                    <div
                      key={index}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-stone-50"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-black flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="font-black text-sm text-stone-900">
                            {item.productName}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 pr-8">
                          <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 font-bold px-2 py-0.5 rounded-md">
                            <Building2 className="w-3 h-3" />
                            <span>شركة: {item.companyName || 'كروپسا'}</span>
                          </span>
                          <span className="font-bold text-stone-700">
                            العبوة: {item.packageDisplayName}
                          </span>
                          <span>× الكمية: {item.quantity}</span>
                        </div>
                      </div>

                      <div className="text-left sm:text-left pr-8 sm:pr-0">
                        <span className="text-xs text-stone-400 block">الإجمالي</span>
                        <span className="text-base font-black text-emerald-800">
                          {Number(item.subtotal || 0).toLocaleString('en-US')} ج.م
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
