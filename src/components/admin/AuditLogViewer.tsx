import React from 'react';
import { History, ShieldCheck, Clock } from 'lucide-react';
import { AuditLog } from '../../types';

interface AuditLogViewerProps {
  logs: AuditLog[];
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs }) => {
  return (
    <div className="space-y-6 dir-rtl">
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-emerald-950 flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            <span>سجل عمليات النظام والأمان</span>
          </h2>
          <p className="text-xs text-gray-500 font-medium">سجل زمني لجميع عمليات التحديث وتغيير الأسعار وإضافة الطلبيات</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden">
        <table className="w-full text-right text-xs">
          <thead className="bg-emerald-950 text-white font-bold">
            <tr>
              <th className="p-3.5">الوقت والتاريخ</th>
              <th className="p-3.5">المستخدم</th>
              <th className="p-3.5">الإجراء</th>
              <th className="p-3.5">نوع الكيان</th>
              <th className="p-3.5">التفاصيل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-400 font-bold">
                  لا توجد عمليات مسجلة بالسجل بعد.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="p-3.5 font-mono text-gray-500">{log.timestamp.slice(0, 19).replace('T', ' ')}</td>
                  <td className="p-3.5 font-bold text-emerald-950">{log.userEmail}</td>
                  <td className="p-3.5 font-bold text-emerald-700">{log.action}</td>
                  <td className="p-3.5 font-semibold text-gray-700">{log.entityType}</td>
                  <td className="p-3.5 text-gray-800">{log.details}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
