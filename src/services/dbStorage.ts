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

export interface DbData {
  categories: Category[];
  companies: Company[];
  subCategories: CompanySubCategory[];
  products: Product[];
  packages: Package[];
  images: CompanyImage[];
  advertisements: Advertisement[];
  orders: Order[];
  teamMembers: TeamMember[];
  priceHistory: PriceHistory[];
  settings: CatalogSettings;
  importLogs: ImportLog[];
  auditLogs: AuditLog[];
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
  TEAM: 'cropsa_team_v1',
  SETTINGS: 'cropsa_settings_v1',
  IMPORT_LOGS: 'cropsa_import_logs_v1',
  AUDIT_LOGS: 'cropsa_audit_logs_v1',
  PDF_DIVIDERS: 'cropsa_pdf_dividers_v1',
  CUSTOM_CATALOGS: 'cropsa_custom_catalogs_v1',
  PENDING_CLOUD_SYNC: 'cropsa_pending_cloud_sync_v1',
};

// Safe JSON Parse helper
function getItem<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(data) as T;
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): boolean {
  void idbStorage.set(key, value);
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`LocalStorage quota/write warning for ${key} (saved to IndexedDB instead):`, err);
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
      teamMembers,
      priceHistory,
      settings,
    ] = await Promise.all([
      idbStorage.get<Category[]>(STORAGE_KEYS.CATEGORIES),
      idbStorage.get<Company[]>(STORAGE_KEYS.COMPANIES),
      idbStorage.get<CompanySubCategory[]>(STORAGE_KEYS.SUBCATEGORIES),
      idbStorage.get<Product[]>(STORAGE_KEYS.PRODUCTS),
      idbStorage.get<Package[]>(STORAGE_KEYS.PACKAGES),
      idbStorage.get<CompanyImage[]>(STORAGE_KEYS.IMAGES),
      idbStorage.get<Advertisement[]>(STORAGE_KEYS.ADVERTISEMENTS),
      idbStorage.get<Order[]>(STORAGE_KEYS.ORDERS),
      idbStorage.get<TeamMember[]>(STORAGE_KEYS.TEAM),
      idbStorage.get<PriceHistory[]>(STORAGE_KEYS.PRICE_HISTORY),
      idbStorage.get<CatalogSettings>(STORAGE_KEYS.SETTINGS),
    ]);

    const result: Partial<DbData> = {};
    if (categories?.length) result.categories = categories;
    if (companies?.length) result.companies = companies;
    if (subCategories?.length) result.subCategories = subCategories;
    if (products?.length) result.products = products;
    if (packages?.length) result.packages = packages;
    if (images?.length) result.images = images;
    if (advertisements?.length) result.advertisements = advertisements;
    if (orders?.length) result.orders = orders;
    if (teamMembers?.length) result.teamMembers = teamMembers;
    if (priceHistory?.length) result.priceHistory = priceHistory;
    if (settings) result.settings = settings;
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
      teamMembers: this.getTeamMembers(),
      priceHistory: this.getPriceHistory(),
      settings: this.getCatalogSettings(),
      importLogs: this.getImportLogs(),
      auditLogs: this.getAuditLogs(),
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
    try {
      if (localStorage.getItem('cropsa_perms_v2_migrated') !== '1') {
        team = team.map((m) => {
          const perms = new Set(m.permissions || []);
          if (m.role === 'super_admin' || m.role === 'orders_manager' || m.role === 'installment_officer') {
            perms.add('order_link');
            perms.add('overview');
          } else if (m.role === 'catalog_manager') {
            perms.add('overview');
            perms.add('prices');
            perms.add('excel');
            perms.add('ai_catalog');
            perms.add('gallery');
          }
          return { ...m, permissions: Array.from(perms) };
        });
        setItem(STORAGE_KEYS.TEAM, team);
        localStorage.setItem('cropsa_perms_v2_migrated', '1');
      }
      if (localStorage.getItem('cropsa_perms_v3_migrated') !== '1') {
        team = team.map((m) => {
          if (m.role === 'orders_manager' || m.role === 'sales_rep') {
            const perms = new Set(m.permissions || []);
            perms.add('pdf');
            return { ...m, permissions: Array.from(perms) };
          }
          return m;
        });
        setItem(STORAGE_KEYS.TEAM, team);
        localStorage.setItem('cropsa_perms_v3_migrated', '1');
      }
    } catch {
      // Ignore storage edge errors
    }
    return team;
  },
  saveTeamMembers(team: TeamMember[]): void {
    setItem(STORAGE_KEYS.TEAM, team);
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
    const cleanInput = usernameOrEmail.trim().toLowerCase();
    if (!cleanInput || !passwordAttempt) {
      return { error: 'يرجى إدخال اسم المستخدم وكلمة المرور.' };
    }
    const matched = team.find(
      (m) =>
        m.username.toLowerCase() === cleanInput ||
        (m.email && m.email.toLowerCase() === cleanInput)
    );
    if (!matched || !matched.password || matched.password !== passwordAttempt) {
      return { error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
    }
    if (!matched.active) {
      return { error: 'هذا الحساب معطّل حالياً، يرجى مراجعة المدير العام.' };
    }
    const updatedUser: TeamMember = {
      ...matched,
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
    return getItem<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  },
  saveProducts(products: Product[]): void {
    setItem(STORAGE_KEYS.PRODUCTS, products);
  },

  // Packages
  getPackages(): Package[] {
    return getItem<Package[]>(STORAGE_KEYS.PACKAGES, INITIAL_PACKAGES);
  },
  savePackages(packages: Package[]): void {
    setItem(STORAGE_KEYS.PACKAGES, packages);
  },
  getPackagesForProduct(productId: string): Package[] {
    const packages = this.getPackages();
    return packages
      .filter((pkg) => pkg.productId === productId && pkg.active)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  },

  // Advertisements
  getAdvertisements(): Advertisement[] {
    return getItem<Advertisement[]>(STORAGE_KEYS.ADVERTISEMENTS, INITIAL_ADVERTISEMENTS);
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

  // Catalog Settings
  getCatalogSettings(): CatalogSettings {
    return getItem<CatalogSettings>(STORAGE_KEYS.SETTINGS, INITIAL_CATALOG_SETTINGS);
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
