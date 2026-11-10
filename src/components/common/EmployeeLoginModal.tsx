import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  KeyRound,
  LogIn,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { TeamMember } from '../../types';

interface EmployeeLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (
    usernameOrEmail: string,
    password: string
  ) => { success: boolean; user?: TeamMember; error?: string };
}

export const EmployeeLoginModal: React.FC<EmployeeLoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setPassword('');
      setShowPassword(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = onLogin(username, password);
    if (!res.success) {
      setError(res.error || 'اسم المستخدم أو كلمة المرور غير صحيحة.');
      return;
    }
    setUsername('');
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 dir-rtl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        />

        <motion.div
          initial={{ y: 36, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 36, opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden"
        >
          {/* Top Emerald Banner */}
          <div className="p-5 bg-gradient-to-r from-[#046A47] to-[#024A31] text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black leading-tight">
                  دخول موظفي كروپسا
                </h3>
                <p className="text-[11px] text-emerald-100 font-medium mt-0.5">
                  سجل بحساب الموظف لتفعيل صلاحياتك وعرض رابط الطلبية
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-stone-800 mb-1.5">
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
                  placeholder="مثال: sales_user أو rep_user"
                  className="w-full h-11 pr-10 pl-3 bg-stone-50 focus:bg-white border border-stone-300 focus:border-[#046A47] rounded-xl text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#046A47]/20"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-stone-800 mb-1.5">
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
                  className="w-full h-11 pr-10 pl-10 bg-stone-50 focus:bg-white border border-stone-300 focus:border-[#046A47] rounded-xl text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#046A47]/20"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3 text-stone-400 hover:text-stone-700 cursor-pointer"
                  title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-12 bg-[#046A47] hover:bg-[#035237] text-white font-black text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>تسجيل الدخول للكتالوج</span>
            </button>

            <p className="text-[11px] text-center text-stone-500 font-medium leading-relaxed">
              تظهر أزرار الموظفين (مثل رابط الطلبية المباشر ولوحة التحكم) حسب صلاحيات كل حساب.
            </p>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
