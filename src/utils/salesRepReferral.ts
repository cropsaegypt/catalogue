import { Order, TeamMember } from '../types';

export interface SalesRepReferralData {
  id: string;
  name: string;
  username: string;
  phone?: string;
  timestamp?: number;
}

export type StoredSalesRep = SalesRepReferralData;

const STORAGE_KEY = 'cropsa_referral_rep_v1';

/** Extracts sales rep parameter from the current URL if present. */
export function extractSalesRepFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const rep =
    params.get('rep') ||
    params.get('sales') ||
    params.get('agent') ||
    params.get('ref');
  return rep ? rep.trim() : null;
}

/** Retrieves the persisted referral sales rep from localStorage. */
export function getStoredSalesRep(): SalesRepReferralData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.name === 'string' && typeof parsed.username === 'string') {
      return parsed as SalesRepReferralData;
    }
  } catch (e) {
    console.warn('[CROPSA Referral] Failed parsing stored sales rep:', e);
  }
  return null;
}

/** Saves the active sales rep referral attribution to localStorage. */
export function saveStoredSalesRep(data: SalesRepReferralData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...data,
        timestamp: Date.now(),
      })
    );
  } catch (e) {
    console.warn('[CROPSA Referral] Failed storing sales rep:', e);
  }
}

/** Clears the active sales rep referral attribution from localStorage. */
export function clearStoredSalesRep(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('[CROPSA Referral] Failed clearing sales rep:', e);
  }
}

/** Resolves an active sales rep from either URL or storage against existing team members. */
export function resolveActiveSalesRep(
  teamMembers: TeamMember[] = [],
  currentUser?: TeamMember | null
): SalesRepReferralData | null {
  // 1. If currently logged in as a sales rep, prefer their own attribution
  if (currentUser && currentUser.active && currentUser.role === 'sales_rep') {
    return {
      id: currentUser.id,
      name: currentUser.name,
      username: currentUser.username,
      phone: currentUser.phone,
    };
  }

  // 2. Check URL parameter
  const urlParam = extractSalesRepFromUrl();
  if (urlParam && teamMembers.length > 0) {
    const cleanParam = urlParam.toLowerCase();
    const matched = teamMembers.find(
      (m) =>
        m.active &&
        (m.username.toLowerCase() === cleanParam ||
          m.id.toLowerCase() === cleanParam ||
          m.name.toLowerCase() === cleanParam)
    );
    if (matched) {
      const data: SalesRepReferralData = {
        id: matched.id,
        name: matched.name,
        username: matched.username,
        phone: matched.phone,
      };
      saveStoredSalesRep(data);
      return data;
    }
  }

  // 3. Fallback to localStorage
  const stored = getStoredSalesRep();
  if (stored) {
    // If teamMembers is loaded, verify the rep is still active and update phone/name if changed
    if (teamMembers.length > 0) {
      const live = teamMembers.find(
        (m) =>
          m.id === stored.id ||
          m.username.toLowerCase() === stored.username.toLowerCase()
      );
      if (live && live.active) {
        return {
          id: live.id,
          name: live.name,
          username: live.username,
          phone: live.phone,
        };
      }
    }
    return stored;
  }

  return null;
}

/** Constructs the dedicated referral share URL for a given sales rep username. */
export function buildSalesRepStoreUrl(username: string, origin?: string): string {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : 'https://cropsa-catalogue.cropsa.org');
  return `${base}/?rep=${encodeURIComponent(username.trim().toLowerCase())}`;
}

/** Generates a direct shortcut link to view and track an order / invoice. */
export function getOrderDirectShortcutUrl(orderNumber: string, origin?: string): string {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : 'https://cropsa-catalogue.cropsa.org');
  return `${base}/?order=${encodeURIComponent(orderNumber.trim())}`;
}

/** Normalizes Egyptian / Arab phone numbers for wa.me links. */
export function formatPhoneForWhatsApp(raw: string): string {
  let digits = raw.replace(/[^0-9]/g, '');
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('01') && digits.length === 11) {
    // Egyptian mobile standard (010, 011, 012, 015)
    digits = `20${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Builds the notification message sent to the sales rep's personal WhatsApp.
 * Highlights who made the invoice, whether cash or installment, and provides the direct shortcut link.
 */
export function buildSalesRepInvoiceWhatsAppMessage(
  order: Order,
  repName?: string,
  origin?: string
): string {
  const shortcutUrl = getOrderDirectShortcutUrl(order.orderNumber, origin);
  const paymentBadge =
    order.paymentMethod === 'installment'
      ? 'تقسيط (تمويل إسلامي — مطلوب تواصل الموظف) ⏳'
      : 'كاش عند الاستلام 💵';

  const repGreeting = repName ? ` يا ${repName}` : '';

  const itemsList = (order.items || [])
    .map(
      (item, idx) =>
        `${idx + 1}. *${item.productName}*${item.companyName ? ` (${item.companyName})` : ''}\n   الكمية: ${item.quantity} × ${item.packageDisplayName || item.unit} = ${Number(item.subtotal || 0).toLocaleString('en-US')} ج.م`
    )
    .join('\n');

  const lines = [
    `🔔 *إشعار طلبية وفاتورة جديدة${repGreeting}*`,
    `━━━━━━━━━━━━━━━━━`,
    `📄 *رقم الفاتورة:* \`${order.orderNumber}\``,
    `👤 *اسم العميل:* ${order.customerName}`,
    `📞 *رقم العميل:* ${order.phone}`,
    order.companyName ? `🏢 *المزرعة/الشركة:* ${order.companyName}` : '',
    `📍 *المكان:* ${order.governorate} — ${order.city || ''} ${order.addressDetails ? `(${order.addressDetails})` : ''}`,
    `💳 *طريقة الدفع:* ${paymentBadge}`,
    `💰 *إجمالي الفاتورة:* *${Number(order.totalAmount || 0).toLocaleString('en-US')} جنيه مصري*`,
    `━━━━━━━━━━━━━━━━━`,
    `🛒 *المنتجات المطلوبة:*`,
    itemsList,
    order.notes ? `📝 *ملاحظات العميل:* ${order.notes}` : '',
    `━━━━━━━━━━━━━━━━━`,
    `🔗 *شورت كت الفاتورة المباشر للموظف (فتح ومتابعة):*`,
    shortcutUrl,
  ];

  return lines.filter(Boolean).join('\n');
}

/**
 * Generates the full `https://wa.me/...` URL to ping the sales rep with the invoice shortcut.
 */
export function buildSalesRepWhatsAppUrl(
  phone: string,
  order: Order,
  repName?: string,
  origin?: string
): string {
  const cleanPhone = formatPhoneForWhatsApp(phone);
  const message = buildSalesRepInvoiceWhatsAppMessage(order, repName, origin);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
