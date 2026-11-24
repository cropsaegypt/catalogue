import {
  Category,
  Company,
  CompanySubCategory,
  Product,
  Package,
  CompanyImage,
  Advertisement,
  PriceHistory,
  Order,
  CatalogSettings,
  ImportLog,
  AuditLog,
  TeamMember,
  PdfDividerAsset,
  SharedCustomCatalog,
  IslamicFinancingRequest,
  AgronomicProgram,
} from '../types';

import {
  INITIAL_CATEGORIES,
  INITIAL_COMPANIES,
  INITIAL_SUBCATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_PACKAGES,
  INITIAL_COMPANY_IMAGES,
  INITIAL_ADVERTISEMENTS,
  INITIAL_CATALOG_SETTINGS,
  INITIAL_ORDERS,
  INITIAL_TEAM,
} from '../data/seedData';
import { idbStorage } from './idbStorage';
import { ALL_PERMISSION_KEYS, ROLE_METADATA } from '../utils/permissions';

export interface DbData {
  categories: Category[];
  companies: Company[];
  subCategories: CompanySubCategory[];
  products: Product[];
  packages: Package[];
  images: CompanyImage[];
  advertisements: Advertisement[];
  orders: Order[];
  financingRequests: IslamicFinancingRequest[];
  teamMembers: TeamMember[];
  priceHistory: PriceHistory[];
  settings: CatalogSettings;
  importLogs: ImportLog[];
  auditLogs: AuditLog[];
  programs?: AgronomicProgram[];
}

const STORAGE_KEYS = {
  CATEGORIES: 'cropsa_categories_v1',
  COMPANIES: 'cropsa_companies_v1',
  SUBCATEGORIES: 'cropsa_subcategories_v1',
  PRODUCTS: 'cropsa_products_v1',
  PACKAGES: 'cropsa_packages_v1',
  IMAGES: 'cropsa_images_v1',
  ADVERTISEMENTS: 'cropsa_advertisements_v1',
  PRICE_HISTORY: 'cropsa_price_history_v1',
  ORDERS: 'cropsa_orders_v1',
  FINANCING_REQUESTS: 'cropsa_financing_requests_v1',
  TEAM: 'cropsa_team_v1',
  SETTINGS: 'cropsa_settings_v1',
  IMPORT_LOGS: 'cropsa_import_logs_v1',
  AUDIT_LOGS: 'cropsa_audit_logs_v1',
  PDF_DIVIDERS: 'cropsa_pdf_dividers_v1',
  CUSTOM_CATALOGS: 'cropsa_custom_catalogs_v1',
  PROGRAMS: 'cropsa_programs_v1',
  PENDING_CLOUD_SYNC: 'cropsa_pending_cloud_sync_v1',
};

// Safe in-memory cache to guarantee zero-latency synchronous access and prevent quota loss
const memoryCache: Record<string, any> = {};

// Safe JSON Parse helper with memory cache backing
function getItem<T>(key: string, defaultValue: T): T {
  if (memoryCache[key] !== undefined) {
    return memoryCache[key] as T;
  }
  try {
    const data = localStorage.getItem(key);
    if (!data) {
      memoryCache[key] = defaultValue;
      try {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      } catch {
        // ignore quota
      }
      return defaultValue;
    }
    const parsed = JSON.parse(data) as T;
    memoryCache[key] = parsed;
    return parsed;
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    memoryCache[key] = defaultValue;
    return defaultValue;
  }
}

function notifyCatalogChange(key: string) {
  const syncKeys: string[] = [
    STORAGE_KEYS.PRODUCTS,
    STORAGE_KEYS.CATEGORIES,
    STORAGE_KEYS.COMPANIES,
    STORAGE_KEYS.SUBCATEGORIES,
    STORAGE_KEYS.PACKAGES,
    STORAGE_KEYS.ADVERTISEMENTS,
    STORAGE_KEYS.SETTINGS,
    STORAGE_KEYS.IMAGES,
  ];
  if (syncKeys.includes(key)) {
    try {
      localStorage.setItem(STORAGE_KEYS.PENDING_CLOUD_SYNC, '1');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cropsa:catalog-updated', { detail: { key } }));
      }
    } catch {}
  }
}

function setItem<T>(key: string, value: T): boolean {
  memoryCache[key] = value;
  // Always persist full data to high-capacity IndexedDB
  void idbStorage.set(key, value);
  notifyCatalogChange(key);
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    // If LocalStorage quota (5MB) is reached, save lightweight version (strip huge base64 images)
    // so that all product metadata, names, counts, and prices STILL persist synchronously in LocalStorage!
    try {
      if (Array.isArray(value)) {
        const lightweight = (value as any[]).map((item) => {
          if (item && typeof item === 'object') {
            const copy = { ...item };
            if (
              typeof copy.mainImageUrl === 'string' &&
              copy.mainImageUrl.startsWith('data:image/') &&
              copy.mainImageUrl.length > 30000
            ) {
              copy.mainImageUrl = '';
            }
            return copy;
          }
          return item;
        });
        localStorage.setItem(key, JSON.stringify(lightweight));
      }
    } catch {
      console.warn(`LocalStorage quota reached for ${key}; fully persisted in memory & IndexedDB`);
    }
    return false;
  }
}

export const dbStorage = {
  hasPendingCloudSync(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEYS.PENDING_CLOUD_SYNC) === '1';
    } catch {
      return false;
    }
  },
  setPendingCloudSync(pending: boolean): void {
    try {
      if (pending) {
        localStorage.setItem(STORAGE_KEYS.PENDING_CLOUD_SYNC, '1');
      } else {
        localStorage.removeItem(STORAGE_KEYS.PENDING_CLOUD_SYNC);
      }
    } catch {
      // ignore
    }
  },
  async loadFromIndexedDb(): Promise<Partial<DbData>> {
    const [
      categories,
      companies,
      subCategories,
      products,
      packages,
      images,
      advertisements,
      orders,
      financingRequests,
      teamMembers,
      priceHistory,
      settings,
      programs,
    ] = await Promise.all([
      idbStorage.get<Category[]>(STORAGE_KEYS.CATEGORIES),
      idbStorage.get<Company[]>(STORAGE_KEYS.COMPANIES),
      idbStorage.get<CompanySubCategory[]>(STORAGE_KEYS.SUBCATEGORIES),
      idbStorage.get<Product[]>(STORAGE_KEYS.PRODUCTS),
      idbStorage.get<Package[]>(STORAGE_KEYS.PACKAGES),
      idbStorage.get<CompanyImage[]>(STORAGE_KEYS.IMAGES),
      idbStorage.get<Advertisement[]>(STORAGE_KEYS.ADVERTISEMENTS),
      idbStorage.get<Order[]>(STORAGE_KEYS.ORDERS),
      idbStorage.get<IslamicFinancingRequest[]>(STORAGE_KEYS.FINANCING_REQUESTS),
      idbStorage.get<TeamMember[]>(STORAGE_KEYS.TEAM),
      idbStorage.get<PriceHistory[]>(STORAGE_KEYS.PRICE_HISTORY),
      idbStorage.get<CatalogSettings>(STORAGE_KEYS.SETTINGS),
      idbStorage.get<AgronomicProgram[]>(STORAGE_KEYS.PROGRAMS),
    ]);

    const result: Partial<DbData> = {};
    if (categories?.length) {
      result.categories = categories;
      memoryCache[STORAGE_KEYS.CATEGORIES] = categories;
    }
    if (companies?.length) {
      result.companies = companies;
      memoryCache[STORAGE_KEYS.COMPANIES] = companies;
    }
    if (subCategories?.length) {
      result.subCategories = subCategories;
      memoryCache[STORAGE_KEYS.SUBCATEGORIES] = subCategories;
    }
    if (products?.length) {
      result.products = products.map((p) => ({ ...p, active: p.active !== false }));
      memoryCache[STORAGE_KEYS.PRODUCTS] = result.products;
    }
    if (packages?.length) {
      result.packages = packages.map((p) => ({ ...p, active: p.active !== false }));
      memoryCache[STORAGE_KEYS.PACKAGES] = result.packages;
    }
    if (images?.length) {
      result.images = images;
      memoryCache[STORAGE_KEYS.IMAGES] = images;
    }
    if (advertisements?.length) {
      result.advertisements = advertisements;
      memoryCache[STORAGE_KEYS.ADVERTISEMENTS] = advertisements;
    }
    if (orders?.length) {
      result.orders = orders;
      memoryCache[STORAGE_KEYS.ORDERS] = orders;
    }
    if (financingRequests?.length) {
      result.financingRequests = financingRequests;
      memoryCache[STORAGE_KEYS.FINANCING_REQUESTS] = financingRequests;
    }
    if (teamMembers?.length) {
      result.teamMembers = teamMembers;
      memoryCache[STORAGE_KEYS.TEAM] = teamMembers;
    }
    if (priceHistory?.length) {
      result.priceHistory = priceHistory;
      memoryCache[STORAGE_KEYS.PRICE_HISTORY] = priceHistory;
    }
    if (settings) {
      result.settings = settings;
      memoryCache[STORAGE_KEYS.SETTINGS] = settings;
    }
    if (programs?.length) {
      result.programs = programs;
      memoryCache[STORAGE_KEYS.PROGRAMS] = programs;
    }
    return result;
  },
  getData(): DbData {
    return {
      categories: this.getCategories(),
      companies: this.getCompanies(),
      subCategories: this.getSubCategories(),
      products: this.getProducts(),
      packages: this.getPackages(),
      images: this.getCompanyImages(),
      advertisements: this.getAdvertisements(),
      orders: this.getOrders(),
      financingRequests: this.getFinancingRequests(),
      teamMembers: this.getTeamMembers(),
      priceHistory: this.getPriceHistory(),
      settings: this.getCatalogSettings(),
      importLogs: this.getImportLogs(),
      auditLogs: this.getAuditLogs(),
      programs: this.getPrograms(),
    };
  },

  // Categories
  getCategories(): Category[] {
    return getItem<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  },
  saveCategories(categories: Category[]): void {
    setItem(STORAGE_KEYS.CATEGORIES, categories);
  },

  // Companies
  getCompanies(): Company[] {
    return getItem<Company[]>(STORAGE_KEYS.COMPANIES, INITIAL_COMPANIES);
  },
  saveCompanies(companies: Company[]): void {
    setItem(STORAGE_KEYS.COMPANIES, companies);
  },

  // SubCategories (Company-First Organization)
  getSubCategories(): CompanySubCategory[] {
    return getItem<CompanySubCategory[]>(STORAGE_KEYS.SUBCATEGORIES, INITIAL_SUBCATEGORIES);
  },
  saveSubCategories(subs: CompanySubCategory[]): void {
    setItem(STORAGE_KEYS.SUBCATEGORIES, subs);
  },
  getSubCategoriesByCompany(companyId: string): CompanySubCategory[] {
    const list = this.getSubCategories();
    return list.filter((s) => s.companyId === companyId);
  },

  // Team Members & Role-Based Auth
  getTeamMembers(): TeamMember[] {
    let team = getItem<TeamMember[]>(STORAGE_KEYS.TEAM, INITIAL_TEAM);
    if (!Array.isArray(team) || team.length === 0) {
      team = [...INITIAL_TEAM];
    }

    // 1. Sanitize every member: ensure valid username, password, permissions, and active flag
    team = team.map((m, idx) => {
      const derivedUsername = (
        m.username ||
        (m.email ? m.email.split('@')[0] : '') ||
        (m.role === 'super_admin' ? 'admin' : `user_${idx + 1}`)
      ).trim().toLowerCase();

      const derivedPassword = m.password || (m.role === 'super_admin' ? 'admin' : '123456');
      const perms = Array.isArray(m.permissions) && m.permissions.length > 0
        ? m.permissions
        : m.role === 'super_admin'
        ? ALL_PERMISSION_KEYS
        : ROLE_METADATA[m.role]?.defaultPermissions || ['order_link', 'pdf', 'orders', 'programs'];

      return {
        ...m,
        username: derivedUsername,
        password: derivedPassword,
        permissions: perms,
        active: m.active !== false,
      };
    });

    // 2. Ensure a super_admin always exists with username 'admin'
    const hasSuperAdmin = team.some((m) => m.role === 'super_admin' && m.active);
    if (!hasSuperAdmin) {
      team.unshift({
        id: 'ADMIN-01',
        name: 'المهندس المشرف (مدير عام)',
        username: 'admin',
        email: 'admin@cropsa.org',
        password: 'admin',
        role: 'super_admin',
        active: true,
        phone: '01000000001',
        permissions: ALL_PERMISSION_KEYS,
        createdAt: '2026-01-01T00:00:00.000Z',
      });
    }

    setItem(STORAGE_KEYS.TEAM, team);
    return team;
  },
  saveTeamMembers(team: TeamMember[]): void {
    const sanitized = team.map((m, idx) => {
      const derivedUsername = (
        m.username ||
        (m.email ? m.email.split('@')[0] : '') ||
        (m.role === 'super_admin' ? 'admin' : `user_${idx + 1}`)
      ).trim().toLowerCase();

      const derivedPassword = m.password || (m.role === 'super_admin' ? 'admin' : '123456');
      const perms = Array.isArray(m.permissions) && m.permissions.length > 0
        ? m.permissions
        : m.role === 'super_admin'
        ? ALL_PERMISSION_KEYS
        : ROLE_METADATA[m.role]?.defaultPermissions || ['order_link', 'pdf', 'orders', 'programs'];

      return {
        ...m,
        username: derivedUsername,
        password: derivedPassword,
        permissions: perms,
        active: m.active !== false,
      };
    });
    setItem(STORAGE_KEYS.TEAM, sanitized);
    idbStorage.set(STORAGE_KEYS.TEAM, sanitized).catch(() => {});
  },
  authenticateUser(usernameOrEmail: string, passwordAttempt: string): TeamMember | null {
    const result = this.authenticateWithReason(usernameOrEmail, passwordAttempt);
    return result.user || null;
  },
  authenticateWithReason(
    usernameOrEmail: string,
    passwordAttempt: string
  ): { user?: TeamMember; error?: string } {
    const team = this.getTeamMembers();
    const cleanInput = (usernameOrEmail || '').trim().toLowerCase();
    const cleanPass = (passwordAttempt || '').trim();
    if (!cleanInput || !cleanPass) {
      return { error: 'يرجى إدخال اسم المستخدم وكلمة المرور.' };
    }

    // 1. Direct Master Admin Emergency Bypass:
    const isMasterAdminAttempt =
      cleanInput === 'admin' ||
      cleanInput === 'admin@cropsa.org' ||
      cleanInput === 'admin@cropsa.com' ||
      cleanInput === 'cropsa';

    const isMasterPassword =
      cleanPass === 'admin' ||
      cleanPass === 'admin123' ||
      cleanPass === '123456' ||
      cleanPass === 'cropsa' ||
      cleanPass === 'cropsa2026';

    if (isMasterAdminAttempt && isMasterPassword) {
      let adminUser = team.find((m) => m.role === 'super_admin');
      if (!adminUser) {
        adminUser = {
          id: 'ADMIN-01',
          name: 'المهندس المشرف (مدير عام)',
          username: 'admin',
          email: 'admin@cropsa.org',
          password: 'admin',
          role: 'super_admin',
          active: true,
          phone: '01000000001',
          permissions: ALL_PERMISSION_KEYS,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };
        team.unshift(adminUser);
      } else {
        adminUser = {
          ...adminUser,
          active: true,
          username: adminUser.username || 'admin',
          password: cleanPass,
          lastLogin: new Date().toISOString(),
        };
        const idx = team.findIndex((m) => m.id === adminUser!.id);
        if (idx >= 0) team[idx] = adminUser;
      }
      this.saveTeamMembers(team);
      return { user: adminUser };
    }

    // 2. Safe matching for all registered team members
    const matched = team.find((m) => {
      const u = (m.username || '').toLowerCase();
      const e = (m.email || '').toLowerCase();
      return u === cleanInput || e === cleanInput;
    });

    if (!matched) {
      return { error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
    }

    const storedPass = matched.password || (matched.role === 'super_admin' ? 'admin' : '123456');
    const isPasswordCorrect =
      storedPass === cleanPass ||
      (matched.role === 'super_admin' && isMasterPassword);

    if (!isPasswordCorrect) {
      return { error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
    }

    if (!matched.active) {
      return { error: 'هذا الحساب معطّل حالياً، يرجى مراجعة المدير العام.' };
    }

    const updatedUser: TeamMember = {
      ...matched,
      password: storedPass,
      lastLogin: new Date().toISOString(),
    };
    const nextTeam = team.map((m) => (m.id === matched.id ? updatedUser : m));
    this.saveTeamMembers(nextTeam);
    return { user: updatedUser };
  },
  getCurrentUser(): TeamMember | null {
    try {
      const savedId = localStorage.getItem('cropsa_current_user_id');
      if (!savedId) return null;
      const team = this.getTeamMembers();
      const user = team.find((m) => m.id === savedId && m.active);
      return user || null;
    } catch {
      return null;
    }
  },
  setCurrentUserId(userId: string | null): void {
    try {
      if (userId) {
        localStorage.setItem('cropsa_current_user_id', userId);
        localStorage.setItem('cropsa_admin_logged', 'true');
      } else {
        localStorage.removeItem('cropsa_current_user_id');
        localStorage.removeItem('cropsa_admin_logged');
      }
    } catch {
      // ignore
    }
  },

  // Company Images
  getCompanyImages(): CompanyImage[] {
    return getItem<CompanyImage[]>(STORAGE_KEYS.IMAGES, INITIAL_COMPANY_IMAGES);
  },
  saveCompanyImages(images: CompanyImage[]): void {
    setItem(STORAGE_KEYS.IMAGES, images);
  },
  saveImages(images: CompanyImage[]): void {
    this.saveCompanyImages(images);
  },
  getCompanyImagesByCompany(companyId: string): CompanyImage[] {
    const images = this.getCompanyImages();
    return images.filter((img) => img.companyId === companyId);
  },

  // Products
  getProducts(): Product[] {
    const list = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    return list.map((p) => ({ ...p, active: p.active !== false }));
  },
  saveProducts(products: Product[]): void {
    const sanitized = products.map((p) => ({ ...p, active: p.active !== false }));
    setItem(STORAGE_KEYS.PRODUCTS, sanitized);
  },

  // Packages
  getPackages(): Package[] {
    const list = getItem<Package[]>(STORAGE_KEYS.PACKAGES, INITIAL_PACKAGES);
    return list.map((p) => ({ ...p, active: p.active !== false }));
  },
  savePackages(packages: Package[]): void {
    const sanitized = packages.map((p) => ({ ...p, active: p.active !== false }));
    setItem(STORAGE_KEYS.PACKAGES, sanitized);
  },
  getPackagesForProduct(productId: string): Package[] {
    const packages = this.getPackages();
    return packages
      .filter((pkg) => pkg.productId === productId && pkg.active !== false)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  },

  // Advertisements
  getAdvertisements(): Advertisement[] {
    const ads = getItem<Advertisement[]>(STORAGE_KEYS.ADVERTISEMENTS, INITIAL_ADVERTISEMENTS);
    if (!ads || !Array.isArray(ads) || ads.length === 0 || ads.every((a) => !a.desktopImageUrl && !a.mobileImageUrl)) {
      this.saveAdvertisements(INITIAL_ADVERTISEMENTS);
      return INITIAL_ADVERTISEMENTS;
    }
    return ads;
  },
  saveAdvertisements(ads: Advertisement[]): void {
    setItem(STORAGE_KEYS.ADVERTISEMENTS, ads);
  },

  // Custom PDF Dividers Library (Cover / Generic Rotating / Company-Specific)
  getPdfDividers(): PdfDividerAsset[] {
    return getItem<PdfDividerAsset[]>(STORAGE_KEYS.PDF_DIVIDERS, []);
  },
  savePdfDividers(dividers: PdfDividerAsset[]): void {
    setItem(STORAGE_KEYS.PDF_DIVIDERS, dividers);
  },

  // Shareable Custom Catalogs (Local cache mirror of server-persisted client links)
  getSharedCatalogs(): SharedCustomCatalog[] {
    return getItem<SharedCustomCatalog[]>(STORAGE_KEYS.CUSTOM_CATALOGS, []);
  },
  saveSharedCatalog(catalog: SharedCustomCatalog): void {
    const existing = this.getSharedCatalogs().filter((c) => c.id !== catalog.id);
    setItem(STORAGE_KEYS.CUSTOM_CATALOGS, [catalog, ...existing].slice(0, 40));
  },
  getSharedCatalogById(id: string): SharedCustomCatalog | null {
    return this.getSharedCatalogs().find((c) => c.id === id) || null;
  },

  // Islamic Financing Requests
  getFinancingRequests(): IslamicFinancingRequest[] {
    return getItem<IslamicFinancingRequest[]>(STORAGE_KEYS.FINANCING_REQUESTS, []);
  },
  saveFinancingRequests(requests: IslamicFinancingRequest[]): void {
    setItem(STORAGE_KEYS.FINANCING_REQUESTS, requests);
  },

  // Catalog Settings
  getCatalogSettings(): CatalogSettings {
    const settings = getItem<CatalogSettings>(STORAGE_KEYS.SETTINGS, INITIAL_CATALOG_SETTINGS);
    if (!settings || !settings.heroBannerUrl) {
      const merged = { ...INITIAL_CATALOG_SETTINGS, ...(settings || {}), heroBannerUrl: INITIAL_CATALOG_SETTINGS.heroBannerUrl };
      this.saveCatalogSettings(merged);
      return merged;
    }
    return settings;
  },
  saveCatalogSettings(settings: CatalogSettings): void {
    setItem(STORAGE_KEYS.SETTINGS, settings);
  },
  saveSettings(settings: CatalogSettings): void {
    this.saveCatalogSettings(settings);
  },

  // Price History
  getPriceHistory(): PriceHistory[] {
    return getItem<PriceHistory[]>(STORAGE_KEYS.PRICE_HISTORY, []);
  },
  addPriceHistoryEntry(entry: Omit<PriceHistory, 'id' | 'createdAt'>): void {
    const history = this.getPriceHistory();
    const newEntry: PriceHistory = {
      ...entry,
      id: 'PH-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString(),
    };
    history.unshift(newEntry);
    setItem(STORAGE_KEYS.PRICE_HISTORY, history);
  },
  addPriceHistory(entry: Omit<PriceHistory, 'id' | 'createdAt'>): void {
    this.addPriceHistoryEntry(entry);
  },

  // Orders
  getOrders(): Order[] {
    const rawOrders = getItem<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    return (rawOrders || []).map((o) => {
      const items = Array.isArray(o.items) ? o.items : [];
      const totalAmount =
        typeof o.totalAmount === 'number' && !isNaN(o.totalAmount)
          ? o.totalAmount
          : items.reduce((sum, it) => sum + (it.subtotal || 0), 0);
      return {
        ...o,
        items,
        totalItems: o.totalItems ?? items.reduce((sum, it) => sum + (it.quantity || 1), 0),
        totalAmount,
      };
    });
  },
  saveOrders(orders: Order[]): void {
    setItem(STORAGE_KEYS.ORDERS, orders);
  },
  addOrder(orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt' | 'status'>): Order {
    const orders = this.getOrders();
    const orderCount = orders.length + 1;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `CR-${dateStr}-${String(orderCount).padStart(3, '0')}`;
    const newOrder: Order = {
      ...orderData,
      id: 'ORD-' + Date.now(),
      orderNumber,
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    orders.unshift(newOrder);
    setItem(STORAGE_KEYS.ORDERS, orders);

    this.addAuditLog({
      userId: 'customer',
      userEmail: 'customer@cropsa-agri.com',
      action: 'CREATE_ORDER',
      entityType: 'Order',
      entityId: newOrder.id,
      details: `طلب جديد رقم ${orderNumber} من العميل: ${newOrder.customerName}`,
    });

    return newOrder;
  },
  updateOrderStatus(orderId: string, status: Order['status']): void {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      order.status = status;
      order.updatedAt = new Date().toISOString();
      setItem(STORAGE_KEYS.ORDERS, orders);
      this.addAuditLog({
        userId: 'admin',
        userEmail: 'admin@cropsa-agri.com',
        action: 'UPDATE_ORDER_STATUS',
        entityType: 'Order',
        entityId: orderId,
        details: `تغيير حالة الطلب رقم ${order.orderNumber} إلى ${status}`,
      });
    }
  },

  // Import Logs
  getImportLogs(): ImportLog[] {
    return getItem<ImportLog[]>(STORAGE_KEYS.IMPORT_LOGS, []);
  },
  addImportLog(log: Omit<ImportLog, 'id' | 'createdAt'>): void {
    const logs = this.getImportLogs();
    const newLog: ImportLog = {
      ...log,
      id: 'IMP-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    logs.unshift(newLog);
    setItem(STORAGE_KEYS.IMPORT_LOGS, logs);
  },

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    return getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  },
  addAuditLog(
    actionOrEntry: string | Omit<AuditLog, 'id' | 'timestamp'>,
    entityType?: string,
    details?: string
  ): void {
    const logs = this.getAuditLogs();
    let newEntry: AuditLog;

    if (typeof actionOrEntry === 'object') {
      newEntry = {
        ...actionOrEntry,
        id: 'AUD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        timestamp: new Date().toISOString(),
      };
    } else {
      newEntry = {
        id: 'AUD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        userId: 'admin',
        userEmail: 'admin@cropsa-agri.com',
        action: actionOrEntry,
        entityType: entityType || 'System',
        entityId: 'system',
        details: details || '',
        timestamp: new Date().toISOString(),
      };
    }

    logs.unshift(newEntry);
    setItem(STORAGE_KEYS.AUDIT_LOGS, logs.slice(0, 200)); // Keep last 200 logs
  },

  // Batch Update Prices
  batchUpdatePrices(
    updates: { productId: string; packageId: string; newPrice: number }[],
    source: 'manual' | 'excel',
    updatedBy: string
  ): { updatedCount: number; errors: string[] } {
    const packages = this.getPackages();
    const products = this.getProducts();
    let updatedCount = 0;
    const errors: string[] = [];

    updates.forEach(({ productId, packageId, newPrice }) => {
      const pkgIndex = packages.findIndex((p) => p.id === packageId || (p.productId === productId && p.id === packageId));
      if (pkgIndex !== -1) {
        const pkg = packages[pkgIndex];
        const product = products.find((pr) => pr.id === pkg.productId);
        const oldPrice = pkg.price;
        if (oldPrice !== newPrice) {
          pkg.price = newPrice;
          updatedCount++;

          this.addPriceHistoryEntry({
            productId: pkg.productId,
            productName: product ? product.name : pkg.productId,
            packageId: pkg.id,
            packageDisplayName: pkg.displayName,
            oldPrice,
            newPrice,
            currency: pkg.currency || 'EGP',
            source,
            updatedBy,
          });
        }
      } else {
        errors.push(`لم يتم العثور على العبوة رقم ${packageId} للمنتج ${productId}`);
      }
    });

    if (updatedCount > 0) {
      this.savePackages(packages);
      this.addAuditLog({
        userId: updatedBy,
        userEmail: `${updatedBy}@cropsa-agri.com`,
        action: 'BATCH_UPDATE_PRICES',
        entityType: 'Package',
        entityId: 'multiple',
        details: `تحديث أسعار عدد ${updatedCount} عبوات عبر ${source === 'excel' ? 'استيراد إكسيل' : 'تعديل يدوي'}`,
      });
    }

    return { updatedCount, errors };
  },

  // Agronomic Programs (برامج التسميد والمكافحة)
  getPrograms(): AgronomicProgram[] {
    return getItem<AgronomicProgram[]>(STORAGE_KEYS.PROGRAMS, []);
  },
  savePrograms(programs: AgronomicProgram[]): void {
    setItem(STORAGE_KEYS.PROGRAMS, programs);
    idbStorage.set(STORAGE_KEYS.PROGRAMS, programs).catch(() => {});
  },
  saveProgram(program: AgronomicProgram): void {
    const list = this.getPrograms();
    const idx = list.findIndex((p) => p.id === program.id);
    if (idx >= 0) {
      list[idx] = program;
    } else {
      list.unshift(program);
    }
    this.savePrograms(list);
  },
  getProgramById(id: string): AgronomicProgram | undefined {
    return this.getPrograms().find((p) => p.id === id);
  },
  deleteProgram(id: string): void {
    const list = this.getPrograms().filter((p) => p.id !== id);
    this.savePrograms(list);
  },

  // Reset demo data
  resetToSeedData(): void {
    localStorage.clear();
    this.getCategories();
    this.getCompanies();
    this.getProducts();
    this.getPackages();
    this.getCompanyImages();
    this.getAdvertisements();
    this.getCatalogSettings();
  },
};
