import { supabase } from './supabase';
import {
  Product,
  Category,
  Company,
  CompanySubCategory,
  Package,
  CatalogSettings,
  Order,
  IslamicFinancingRequest,
} from '../types';
import { DbData } from './dbStorage';

export const supabaseSync = {
  /**
   * Fast unified single-document snapshot pull (Instant < 30ms hydration)
   */
  async pullSingleDocumentSnapshot(): Promise<{
    success: boolean;
    data?: Partial<DbData>;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('catalog_snapshots')
        .select('data')
        .eq('id', 'latest')
        .maybeSingle();

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && data.data) {
        return {
          success: true,
          data: data.data,
        };
      }

      return { success: false };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  },

  /**
   * Pulls all core collections from Supabase with relational efficiency
   */
  async pullAllFromCloud(): Promise<{
    connected: boolean;
    data: Partial<DbData>;
    error?: string;
  }> {
    try {
      const [
        { data: companies, error: compErr },
        { data: categories, error: catErr },
        { data: subCategories, error: subErr },
        { data: products, error: prodErr },
        { data: packages, error: pkgErr },
        { data: settingsRow, error: setErr },
      ] = await Promise.all([
        supabase.from('companies').select('*').order('display_order', { ascending: true }),
        supabase.from('categories').select('*').order('display_order', { ascending: true }),
        supabase.from('sub_categories').select('*').order('display_order', { ascending: true }),
        supabase.from('products').select('*'),
        supabase.from('packages').select('*').order('display_order', { ascending: true }),
        supabase.from('settings').select('data').eq('id', 'main').maybeSingle(),
      ]);

      if (compErr || catErr || prodErr) {
        const errorMsg = compErr?.message || catErr?.message || prodErr?.message;
        return { connected: false, data: {}, error: errorMsg };
      }

      const mappedCompanies: Company[] = (companies || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        slug: c.slug || '',
        logoUrl: c.logo_url || '',
        description: c.description || '',
        website: c.website || '',
        contactInfo: c.contact_info || '',
        categoryIds: c.category_ids || [],
        displayOrder: c.display_order ?? 0,
        active: c.active !== false,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));

      const mappedCategories: Category[] = (categories || []).map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug || '',
        description: cat.description || '',
        imageUrl: cat.image_url || '',
        parentId: cat.parent_id || undefined,
        displayOrder: cat.display_order ?? 0,
        active: cat.active !== false,
        createdAt: cat.created_at,
        updatedAt: cat.updated_at,
      }));

      const mappedSubCategories: CompanySubCategory[] = (subCategories || []).map((s: any) => ({
        id: s.id,
        companyId: s.company_id || '',
        name: s.name,
        type: s.type || 'fertilizer',
        description: s.description || '',
        displayOrder: s.display_order ?? 0,
        active: s.active !== false,
      }));

      const mappedProducts: Product[] = (products || []).map((p: any) => ({
        id: p.id,
        companyId: p.company_id,
        categoryId: p.category_id,
        subCategoryId: p.sub_category_id || undefined,
        productType: p.product_type || undefined,
        secondaryCategoryIds: p.secondary_category_ids || [],
        name: p.name,
        shortDescription: p.short_description || '',
        description: p.description || '',
        characteristics: p.characteristics || [],
        composition: p.composition || [],
        usage: p.usage || [],
        applicationRate: p.application_rate || '',
        mainImageId: p.main_image_id || undefined,
        mainImageUrl: p.main_image_url || '',
        imageRotation: p.image_rotation ?? 0,
        searchTags: p.search_tags || [],
        costPrice: p.cost_price ? Number(p.cost_price) : undefined,
        stockQuantity: p.stock_quantity !== null ? Number(p.stock_quantity) : undefined,
        minStockAlert: p.min_stock_alert !== null ? Number(p.min_stock_alert) : undefined,
        isOutOfStock: Boolean(p.is_out_of_stock),
        galleryImageIds: p.gallery_image_ids || [],
        displayOrder: p.display_order ?? 0,
        active: p.active !== false,
        featured: Boolean(p.featured),
        allowPieceOrder: p.allow_piece_order !== false,
        allowCartonOrder: Boolean(p.allow_carton_order),
        piecesPerCarton: p.pieces_per_carton || 1,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));

      const mappedPackages: Package[] = (packages || []).map((pkg: any) => ({
        id: pkg.id,
        productId: pkg.product_id,
        quantity: pkg.quantity !== null ? Number(pkg.quantity) : 1,
        unit: pkg.unit,
        displayName: pkg.display_name,
        price: Number(pkg.price),
        costPrice: pkg.cost_price ? Number(pkg.cost_price) : undefined,
        currency: pkg.currency || 'EGP',
        allowPieceOrder: pkg.allow_piece_order !== false,
        allowCartonOrder: Boolean(pkg.allow_carton_order),
        piecesPerCarton: pkg.pieces_per_carton || 1,
        stockQuantity: pkg.stock_quantity !== null ? Number(pkg.stock_quantity) : undefined,
        minStockAlert: pkg.min_stock_alert !== null ? Number(pkg.min_stock_alert) : undefined,
        isOutOfStock: Boolean(pkg.is_out_of_stock),
        active: pkg.active !== false,
        displayOrder: pkg.display_order ?? 0,
      }));

      const resultData: Partial<DbData> = {
        companies: mappedCompanies,
        categories: mappedCategories,
        subCategories: mappedSubCategories,
        products: mappedProducts,
        packages: mappedPackages,
        settings: settingsRow?.data as CatalogSettings | undefined,
      };

      return {
        connected: true,
        data: resultData,
      };
    } catch (err: any) {
      return { connected: false, data: {}, error: err?.message };
    }
  },

  /**
   * Pushes full catalog snapshot to Supabase (single SQL Upsert, 0 quota issues!)
   */
  async pushSingleDocumentSnapshot(payload: Partial<DbData>): Promise<{ ok: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('catalog_snapshots').upsert({
        id: 'latest',
        version: (payload as any).version || 1,
        data: payload,
        synced_at: new Date().toISOString(),
      });

      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message };
    }
  },

  /**
   * Submits customer order directly to Supabase
   */
  async submitOrder(orderData: any): Promise<{ ok: boolean; id?: string; error?: string }> {
    try {
      const id = orderData.id || `ORD-${Date.now()}`;
      const payload = {
        id,
        order_number: orderData.orderNumber || id,
        customer_name: orderData.customerName || orderData.name || '',
        customer_phone: orderData.customerPhone || orderData.phone || '',
        governorate: orderData.governorate || '',
        address: orderData.address || '',
        notes: orderData.notes || '',
        total_amount: Number(orderData.totalAmount || orderData.total || 0),
        items: orderData.items || [],
        status: orderData.status || 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('orders').insert(payload);
      if (error) return { ok: false, error: error.message };
      return { ok: true, id };
    } catch (err: any) {
      return { ok: false, error: err?.message };
    }
  },

  /**
   * Submits Islamic financing request directly to Supabase
   */
  async submitFinancingRequest(
    reqData: any
  ): Promise<{ ok: boolean; id?: string; error?: string }> {
    try {
      const id = reqData.id || `FIN-${Date.now()}`;
      const payload = {
        id,
        request_number: reqData.requestNumber || id,
        customer_name: reqData.customerName || '',
        national_id: reqData.nationalId || '',
        phone: reqData.phone || '',
        governorate: reqData.governorate || '',
        address: reqData.address || '',
        land_area: reqData.landArea || '',
        crop_type: reqData.cropType || '',
        requested_amount: Number(reqData.requestedAmount || 0),
        financing_type: reqData.financingType || 'morabaha',
        tenor_months: Number(reqData.tenorMonths || 6),
        notes: reqData.notes || '',
        status: reqData.status || 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('financing_requests').insert(payload);
      if (error) return { ok: false, error: error.message };
      return { ok: true, id };
    } catch (err: any) {
      return { ok: false, error: err?.message };
    }
  },
};
