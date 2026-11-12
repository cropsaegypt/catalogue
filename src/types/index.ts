export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl?: string;
  parentId?: string;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  website?: string;
  contactInfo?: string;
  categoryIds: string[];
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyImage {
  id: string;
  companyId: string;
  fileName: string;
  url: string;
  thumbnailUrl?: string;
  altText?: string;
  createdAt: string;
}

export interface Package {
  id: string; // Package ID e.g. KIMA-001-1L
  productId: string;
  quantity: number;
  unit: string; // e.g. لتر, مل, كجم, جرام
  displayName: string; // e.g. "1 لتر"
  price: number;
  costPrice?: number; // سعر التكلفة للعبوة
  stockQuantity?: number; // كمية المخزون المتاحة
  minStockAlert?: number; // حد التنبيه لانخفاض المخزون
  currency: string;
  allowPieceOrder: boolean;
  allowCartonOrder: boolean;
  piecesPerCarton: number;
  active: boolean;
  displayOrder: number;
}

export interface Product {
  id: string; // Product ID e.g. KIMA-001
  companyId: string;
  categoryId: string;
  subCategoryId?: string;
  productType?: 'fertilizer' | 'stimulant' | 'pesticide' | 'seeds' | 'other';
  secondaryCategoryIds?: string[];
  name: string;
  shortDescription: string;
  description?: string;
  characteristics: string[];
  composition: string[];
  usage: string[];
  applicationRate?: string;
  mainImageId?: string;
  mainImageUrl?: string;
  searchTags?: string[]; // وسوم بحث مخفية للآفات والأمراض والمحاصيل والأغراض الزراعية
  costPrice?: number; // سعر التكلفة
  stockQuantity?: number; // المخزون الحالي للمنتج
  minStockAlert?: number; // حد التنبيه لنفاد المخزون
  galleryImageIds?: string[];
  displayOrder: number;
  active: boolean;
  featured?: boolean;
  allowPieceOrder: boolean;
  allowCartonOrder: boolean;
  piecesPerCarton: number;
  createdAt: string;
  updatedAt: string;
}

export interface Advertisement {
  id: string;
  title: string;
  description?: string;
  desktopImageUrl: string;
  mobileImageUrl?: string;
  link?: string;
  active: boolean;
  showOnline: boolean;
  showPdf: boolean;
  placementType: 'after_product_count' | 'after_category' | 'full_page';
  placementValue: number | string;
  categoryId?: string;
  companyId?: string;
  displayOrder: number;
}

export interface PriceHistory {
  id: string;
  productId: string;
  productName: string;
  packageId: string;
  packageDisplayName: string;
  oldPrice: number;
  newPrice: number;
  currency: string;
  source: 'manual' | 'excel';
  updatedBy: string;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  companyId: string;
  companyName: string;
  packageId: string;
  packageDisplayName: string;
  unit: string;
  quantity: number;
  orderUnit: 'piece' | 'carton';
  piecesPerCarton: number;
  piecesEquivalent: number;
  unitPrice: number;
  subtotal: number;
}

export interface InstallmentDetails {
  durationMonths: number;
  monthlyAmount?: number;
  downPayment?: number;
  idCardFrontUrl?: string;
  idCardBackUrl?: string;
  guaranteeDocUrl?: string;
  applicantJobOrFarm?: string;
  status: 'pending_review' | 'contacted' | 'approved' | 'rejected';
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  companyName?: string;
  governorate: string;
  city: string;
  addressDetails?: string;
  paymentMethod?: 'cash' | 'installment';
  installmentDetails?: InstallmentDetails;
  shippingAddress?: {
    governorate: string;
    city: string;
    addressDetails: string;
    landmark?: string;
  };
  notes?: string;
  items: OrderItem[];
  totalItems: number;
  totalAmount: number;
  status: 'new' | 'contacted' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export type HomeShowcaseKey = 'latest' | 'merchant_deals' | 'seasonal';

export interface HomeShowcaseItem {
  id: string;
  productId: string;
  discountPercent?: number;
  discountLabel?: string;
  note?: string;
}

export interface HomeShowcaseSection {
  key: HomeShowcaseKey;
  title: string;
  subtitle?: string;
  badgeText?: string;
  enabled: boolean;
  customized?: boolean;
  items: HomeShowcaseItem[];
}

export interface IslamicFinancingFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface IslamicFinancingDocRequirement {
  id: string;
  label: string;
  description?: string;
  required: boolean;
}

export interface IslamicFinancingCustomQuestion {
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}

export interface IslamicFinancingConfig {
  headline?: string;
  subheadline?: string;
  faqs: IslamicFinancingFaqItem[];
  requiredDocs: IslamicFinancingDocRequirement[];
  customQuestions?: IslamicFinancingCustomQuestion[];
}

export interface IslamicFinancingUploadedDoc {
  docId: string;
  label: string;
  imageUrl: string;
}

export interface IslamicFinancingRequest {
  id: string;
  requestNumber: string;
  applicantName: string;
  phone: string;
  governorate: string;
  city: string;
  applicantType: 'farmer' | 'merchant' | 'company';
  farmAreaOrScale: string;
  cropsOrActivity: string;
  requestedAmount: number;
  repaymentPlan: 'after_harvest' | 'monthly_3' | 'monthly_6' | 'monthly_12';
  notes?: string;
  customAnswers?: Record<string, string>;
  uploadedDocs: IslamicFinancingUploadedDoc[];
  linkedItems?: OrderItem[];
  status: 'new' | 'reviewing' | 'approved' | 'rejected' | 'completed';
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogSettings {
  title: string;
  subtitle: string;
  logoUrl: string;
  heroBannerMode?: 'default_carousel' | 'text_and_image' | 'full_image';
  heroBannerUrl?: string;
  heroBannerMobileUrl?: string;
  heroBannerTitle?: string;
  heroBannerSubtitle?: string;
  heroBannerBadge?: string;
  heroBannerCtaText?: string;
  heroBannerLink?: string;
  primaryColor: string;
  secondaryColor: string;
  footerText: string;
  website: string;
  phone: string;
  whatsApp: string;
  orderWebhookUrl?: string;
  email: string;
  qrCodeUrl: string;
  productsPerPage: number;
  showPrices: boolean;
  showCharacteristics: boolean;
  showComposition: boolean;
  showUsage: boolean;
  showAdvertisements: boolean;
  showProductIds: boolean;
  pdfOrientation: 'portrait' | 'landscape';
  showHomeShowcases?: boolean;
  homeShowcases?: Partial<Record<HomeShowcaseKey, HomeShowcaseSection>>;
  islamicFinancingConfig?: IslamicFinancingConfig;
}

export interface ImportLogError {
  row: number;
  productId?: string;
  packageId?: string;
  message: string;
}

export interface ImportLog {
  id: string;
  fileName: string;
  companyId: string;
  totalRows: number;
  successfulRows: number;
  updatedRows: number;
  newRows: number;
  errorRows: number;
  errors: ImportLogError[];
  uploadedBy: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  timestamp: string;
}

export interface UserSession {
  isLoggedIn: boolean;
  email: string;
  role: 'admin' | 'editor';
}

export interface ExtractedPackage {
  id?: string;
  displayName: string;
  quantity: number;
  unit: string;
  price: number;
  piecesPerCarton?: number;
}

export interface ExtractedProductItem {
  id: string;
  name: string;
  productType?: 'fertilizer' | 'stimulant' | 'pesticide' | 'seeds' | 'other';
  categoryName: string;
  categoryId?: string;
  subCategoryId?: string;
  shortDescription: string;
  description?: string;
  characteristics: string[];
  composition: string[];
  usage: string[];
  applicationRate?: string;
  imageHint?: string;
  imageUrl?: string;
  extractedFromCatalogImage?: boolean;
  searchTags?: string[];
  packages: ExtractedPackage[];
  selectedForImport: boolean;
}

export interface CompanySubCategory {
  id: string;
  companyId: string;
  name: string;
  type: 'fertilizer' | 'stimulant' | 'pesticide' | 'seeds' | 'other';
  description?: string;
  displayOrder: number;
  active?: boolean;
}

export type TeamRole =
  | 'super_admin'
  | 'catalog_manager'
  | 'orders_manager'
  | 'installment_officer'
  | 'sales_rep';

export interface TeamMember {
  id: string;
  name: string;
  username: string;
  email: string;
  password?: string;
  role: TeamRole;
  phone?: string;
  active: boolean;
  permissions: string[];
  createdAt: string;
  lastLogin?: string;
}

export interface PdfDividerAsset {
  id: string;
  title: string;
  imageUrl: string;
  kind: 'cover' | 'generic' | 'company';
  companyId?: string;
  createdAt: string;
}

export interface SharedCustomCatalog {
  id: string;
  clientName: string;
  createdByName?: string;
  createdByUsername?: string;
  createdAt: string;
  productIds: string[];
  productsSnapshot: Product[];
  packagesSnapshot: Package[];
  companiesSnapshot: Company[];
  categoriesSnapshot: Category[];
  settingsSnapshot: {
    title: string;
    subtitle: string;
    phone: string;
    whatsApp: string;
    logoUrl?: string;
  };
  displayOptions: {
    showPrices: boolean;
    showCharacteristics: boolean;
    showComposition: boolean;
    showUsage: boolean;
    productsPerPage: number;
    mergeCompaniesOnPages: boolean;
  };
}

export type CatalogSelectionMode = 'choose' | 'by_product' | 'by_company';

export type AdminTab =
  | 'overview'
  | 'products'
  | 'categories'
  | 'companies'
  | 'images'
  | 'prices'
  | 'excel_import'
  | 'advertisements'
  | 'pdf_generator'
  | 'orders'
  | 'team'
  | 'settings'
  | 'audit_logs'
  | 'ai_catalog';



