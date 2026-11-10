import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Lock,
  Mail,
  Phone,
  Database,
  CloudCheck,
  Eye,
  EyeOff,
  Sparkles,
  Link2,
} from 'lucide-react';
import { TeamMember, TeamRole } from '../../types';
import {
  PERMISSION_DEFINITIONS,
  ALL_PERMISSION_KEYS,
  ROLE_METADATA,
} from '../../utils/permissions';

interface TeamManagerProps {
  teamMembers: TeamMember[];
  onSaveTeamMembers: (members: TeamMember[]) => void;
  currentUser?: TeamMember | null;
}

const ROLE_CARD_COLORS: Record<TeamRole, string> = {
  super_admin: 'border-purple-300 bg-purple-50 text-purple-900',
  catalog_manager: 'border-blue-300 bg-blue-50 text-blue-900',
  orders_manager: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  installment_officer: 'border-amber-300 bg-amber-50 text-amber-900',
  sales_rep: 'border-teal-300 bg-teal-50 text-teal-900',
};

export const TeamManager: React.FC<TeamManagerProps> = ({
  teamMembers,
  onSaveTeamMembers,
  currentUser,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<TeamRole>('orders_manager');
  const [permissions, setPermissions] = useState<string[]>(ROLE_METADATA.orders_manager.defaultPermissions);
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const openAddModal = () => {
    setEditingMember(null);
    setName('');
    setUsername('');
    setEmail('');
    setPassword('');
    setRole('sales_rep');
    setPermissions(ROLE_METADATA.sales_rep.defaultPermissions);
    setPhone('');
    setIsModalOpen(true);
  };

  const openEditModal = (member: TeamMember) => {
    setEditingMember(member);
    setName(member.name);
    setUsername(member.username);
    setEmail(member.email);
    setPassword(member.password || '');
    setRole(member.role);
    setPermissions(
      Array.isArray(member.permissions) && member.permissions.length > 0
        ? member.permissions
        : ROLE_METADATA[member.role]?.defaultPermissions || []
    );
    setPhone(member.phone || '');
    setIsModalOpen(true);
  };

  const handleRoleChange = (newRole: TeamRole) => {
    setRole(newRole);
    setPermissions(ROLE_METADATA[newRole]?.defaultPermissions || []);
  };

  const togglePermission = (key: string) => {
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password.trim()) {
      alert('يرجى ملء الاسم، اسم المستخدم، وكلمة المرور.');
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanPermissions = role === 'super_admin' ? ALL_PERMISSION_KEYS : permissions;

    if (editingMember) {
      const collision = teamMembers.some(
        (m) => m.id !== editingMember.id && m.username.toLowerCase() === cleanUsername
      );
      if (collision) {
        alert('اسم المستخدم هذا مستخدم لحساب آخر، يرجى اختيار اسم مختلف.');
        return;
      }
      const updated = teamMembers.map((m) =>
        m.id === editingMember.id
          ? {
              ...m,
              name: name.trim(),
              username: cleanUsername,
              email: email.trim().toLowerCase(),
              password: password.trim(),
              role,
              permissions: cleanPermissions,
              phone: phone.trim(),
            }
          : m
      );
      onSaveTeamMembers(updated);
    } else {
      if (teamMembers.some((m) => m.username.toLowerCase() === cleanUsername)) {
        alert('اسم المستخدم هذا مستخدم بالفعل، يرجى اختيار اسم مستخدم آخر.');
        return;
      }
      const newMember: TeamMember = {
        id: 'USER-' + Date.now(),
        name: name.trim(),
        username: cleanUsername,
        email: email.trim().toLowerCase() || `${cleanUsername}@cropsa.com`,
        password: password.trim(),
        role,
        phone: phone.trim(),
        active: true,
        permissions: cleanPermissions,
        createdAt: new Date().toISOString(),
      };
      onSaveTeamMembers([...teamMembers, newMember]);
    }

    setIsModalOpen(false);
  };

  const handleToggleActive = (memberId: string) => {
    const updated = teamMembers.map((m) =>
      m.id === memberId ? { ...m, active: !m.active } : m
    );
    onSaveTeamMembers(updated);
  };

  const handleDelete = (memberId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الحساب من فريق العمل؟')) {
      const updated = teamMembers.filter((m) => m.id !== memberId);
      onSaveTeamMembers(updated);
    }
  };

  return (
    <div className="space-y-6 dir-rtl">
      {/* Top Banner with Firebase Sync Status */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-black text-gray-900">إدارة فريق العمل وصلاحيات الدخول</h2>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>ربط الفايربيز مفعل (Cloud Firestore)</span>
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium">
            تعيين كلمات مرور خاصة لكل موظف وتحديد صلاحيات محددة لإدارة الكتالوج، متابعة الطلبيات، أو فحص التقسيط
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-[#046A47] hover:bg-[#035237] text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة عضو فريق جديد</span>
        </button>
      </div>

      {/* Team Members Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teamMembers.map((member) => {
          const roleMeta = ROLE_METADATA[member.role] || ROLE_METADATA.catalog_manager;
          const cardColor = ROLE_CARD_COLORS[member.role] || 'border-gray-200 bg-gray-50';
          const effectivePerms =
            member.role === 'super_admin' ? ALL_PERMISSION_KEYS : member.permissions || [];
          const hasOrderLinkPerm = effectivePerms.includes('order_link');
          return (
            <div
              key={member.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                member.active ? 'border-gray-200' : 'border-red-200 bg-red-50/20 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#046A47]/10 text-[#046A47] flex items-center justify-center font-black text-base shadow-inner">
                      {member.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-sm text-gray-900">{member.name}</h4>
                        {!member.active && (
                          <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-md font-bold">
                            معطل
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-gray-500 font-bold block">
                        @{member.username}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${roleMeta.badge}`}>
                    {roleMeta.shortLabel}
                  </span>
                </div>

                <div className={`rounded-xl p-3 text-xs space-y-2 mb-3 border ${cardColor}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-purple-700" />
                      <span className="font-bold">{roleMeta.label}</span>
                    </div>
                  </div>
                  <p className="text-[11px] opacity-85 leading-relaxed font-medium">
                    {roleMeta.desc}
                  </p>

                  {/* Explicit Permission Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md border ${
                        hasOrderLinkPerm
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white/70 text-gray-400 border-gray-300 line-through'
                      }`}
                    >
                      <Link2 className="w-3 h-3" />
                      <span>رابط الطلبية للموظف</span>
                    </span>
                    {PERMISSION_DEFINITIONS.filter(
                      (p) => p.key !== 'order_link' && effectivePerms.includes(p.key)
                    )
                      .slice(0, 4)
                      .map((p) => (
                        <span
                          key={p.key}
                          className="text-[10px] font-bold bg-white/85 text-gray-800 border border-gray-200 px-2 py-0.5 rounded-md"
                        >
                          {p.label.split('(')[0].trim()}
                        </span>
                      ))}
                    {effectivePerms.filter((k) => k !== 'order_link').length > 4 && (
                      <span className="text-[10px] font-black bg-white/80 text-gray-700 px-2 py-0.5 rounded-md">
                        +{effectivePerms.filter((k) => k !== 'order_link').length - 4} صلاحيات
                      </span>
                    )}
                  </div>

                  <div className="pt-1.5 border-t border-black/10 flex flex-wrap gap-3 text-[11px] opacity-80">
                    {member.email && (
                      <span className="flex items-center gap-1 font-mono">
                        <Mail className="w-3 h-3" />
                        <span>{member.email}</span>
                      </span>
                    )}
                    {member.phone && (
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3" />
                        <span>{member.phone}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleToggleActive(member.id)}
                  className={`text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                    member.active
                      ? 'text-emerald-700 hover:text-emerald-900'
                      : 'text-red-700 hover:text-red-900'
                  }`}
                >
                  {member.active ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>الحساب نشط</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-red-600" />
                      <span>تفعيل الحساب</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(member)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 font-bold"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>تعديل وكلمة السر</span>
                  </button>

                  {teamMembers.length > 1 && (
                    <button
                      onClick={() => handleDelete(member.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 dir-rtl animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#046A47]" />
                <span>{editingMember ? 'تعديل بيانات الحساب والصلاحيات' : 'إضافة عضو فريق جديد'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">الاسم بالكامل *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: م. أحمد عبد السلام"
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#046A47] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">اسم المستخدم للدخول *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ahmed_sales"
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#046A47] focus:outline-hidden font-mono"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">كلمة المرور *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#046A47] focus:outline-hidden font-mono pl-8"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">الدور الوظيفي (قالب الصلاحيات) *</label>
                <select
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value as TeamRole)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#046A47] focus:outline-hidden font-bold"
                >
                  <option value="sales_rep">مندوب مبيعات بالكتالوج — دخول الكتالوج وإظهار رابط الطلبية</option>
                  <option value="orders_manager">مسؤول مبيعات وطلبيات — متابعة الطلبات + رابط الطلبية</option>
                  <option value="installment_officer">مسؤول فحص واعتماد التقسيط — التقسيط + رابط الطلبية</option>
                  <option value="catalog_manager">أخصائي كتالوجات ومنتجات — إدارة الكتالوجات والشركات والأسعار</option>
                  <option value="super_admin">مدير عام للنظام (Super Admin) — كامل الصلاحيات</option>
                </select>
              </div>

              {/* Granular Permissions Selection */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-stone-900">الصلاحيات المحددة لهذا الموظف</h4>
                    <p className="text-[10px] text-stone-500">
                      {role === 'super_admin'
                        ? 'المدير العام يمتلك جميع الصلاحيات تلقائياً'
                        : 'حدد الصلاحيات المسموح بها لهذا الحساب داخل الكتالوج ولوحة التحكم'}
                    </p>
                  </div>
                  {role !== 'super_admin' && (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPermissions(ALL_PERMISSION_KEYS)}
                        className="text-[10px] font-black text-[#046A47] hover:underline cursor-pointer"
                      >
                        تحديد الكل
                      </button>
                      <span className="text-stone-300">|</span>
                      <button
                        type="button"
                        onClick={() => setPermissions([])}
                        className="text-[10px] font-bold text-stone-500 hover:underline cursor-pointer"
                      >
                        مسح الكل
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-0.5">
                  {PERMISSION_DEFINITIONS.map((perm) => {
                    const checked = role === 'super_admin' || permissions.includes(perm.key);
                    return (
                      <label
                        key={perm.key}
                        className={`flex items-start gap-2 p-2.5 rounded-xl border text-right cursor-pointer transition-all ${
                          perm.highlight
                            ? checked
                              ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500/20 sm:col-span-2'
                              : 'bg-amber-50/70 border-amber-300 sm:col-span-2'
                            : checked
                            ? 'bg-white border-[#046A47]/60'
                            : 'bg-white/60 border-stone-200 opacity-75'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={role === 'super_admin'}
                          checked={checked}
                          onChange={() => togglePermission(perm.key)}
                          className="mt-0.5 w-4 h-4 accent-[#046A47] rounded cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-black text-stone-900 flex items-center gap-1">
                            {perm.highlight && <Link2 className="w-3.5 h-3.5 text-[#046A47]" />}
                            <span>{perm.label}</span>
                          </div>
                          <p className="text-[10px] text-stone-500 leading-snug mt-0.5">
                            {perm.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@cropsa.com"
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#046A47] focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">الهاتف</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010xxxxxxxx"
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#046A47] focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black bg-[#046A47] hover:bg-[#035237] text-white rounded-xl shadow-md cursor-pointer"
                >
                  حفظ الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
