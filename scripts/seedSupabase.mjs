import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://krxghdnhqqjjospwspaf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_uaVnPKGEq4vKVPlL761I_g_ox2L9Q0O';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
  console.log('Connecting to Supabase at:', SUPABASE_URL);

  const snapshotPath = path.resolve('public/catalog-snapshot.json');
  if (!fs.existsSync(snapshotPath)) {
    console.error('Snapshot file not found at:', snapshotPath);
    process.exit(1);
  }

  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  console.log(`Loaded snapshot with ${snapshot.products.length} products, ${snapshot.companies.length} companies, ${snapshot.packages.length} packages`);

  // 1. Seed Companies
  console.log('Upserting companies...');
  const companiesPayload = snapshot.companies.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug || null,
    logo_url: c.logoUrl || null,
    description: c.description || null,
    website: c.website || null,
    contact_info: c.contactInfo || null,
    category_ids: c.categoryIds || [],
    display_order: c.displayOrder || 0,
    active: c.active !== false,
  }));
  const { error: compErr } = await supabase.from('companies').upsert(companiesPayload);
  if (compErr) console.error('Error seeding companies:', compErr.message);
  else console.log(`✓ Seeded ${companiesPayload.length} companies`);

  // 2. Seed Categories
  console.log('Upserting categories...');
  const categoriesPayload = snapshot.categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug || null,
    description: cat.description || null,
    image_url: cat.imageUrl || null,
    parent_id: cat.parentId || null,
    display_order: cat.displayOrder || 0,
    active: cat.active !== false,
  }));
  const { error: catErr } = await supabase.from('categories').upsert(categoriesPayload);
  if (catErr) console.error('Error seeding categories:', catErr.message);
  else console.log(`✓ Seeded ${categoriesPayload.length} categories`);

  // 3. Seed SubCategories
  if (snapshot.subCategories?.length) {
    console.log('Upserting sub-categories...');
    const subPayload = snapshot.subCategories.map((s) => ({
      id: s.id,
      company_id: s.companyId || null,
      name: s.name,
      type: s.type || null,
      description: s.description || null,
      display_order: s.displayOrder || 0,
      active: s.active !== false,
    }));
    const { error: subErr } = await supabase.from('sub_categories').upsert(subPayload);
    if (subErr) console.error('Error seeding sub-categories:', subErr.message);
    else console.log(`✓ Seeded ${subPayload.length} sub-categories`);
  }

  // 4. Seed Products in batches of 100
  console.log('Upserting products in batches...');
  const productsPayload = snapshot.products.map((p) => ({
    id: p.id,
    company_id: p.companyId,
    category_id: p.categoryId,
    sub_category_id: p.subCategoryId || null,
    product_type: p.productType || null,
    secondary_category_ids: p.secondaryCategoryIds || [],
    name: p.name,
    short_description: p.shortDescription || null,
    description: p.description || null,
    characteristics: p.characteristics || [],
    composition: p.composition || [],
    usage: p.usage || [],
    application_rate: p.applicationRate || null,
    main_image_id: p.mainImageId || null,
    main_image_url: p.mainImageUrl || null,
    image_rotation: p.imageRotation || 0,
    search_tags: p.searchTags || [],
    cost_price: p.costPrice || null,
    stock_quantity: p.stockQuantity || null,
    min_stock_alert: p.minStockAlert || null,
    is_out_of_stock: p.isOutOfStock || false,
    gallery_image_ids: p.galleryImageIds || [],
    display_order: p.displayOrder || 0,
    active: p.active !== false,
    featured: p.featured || false,
    allow_piece_order: p.allowPieceOrder !== false,
    allow_carton_order: p.allowCartonOrder || false,
    pieces_per_carton: p.piecesPerCarton || 1,
  }));

  for (let i = 0; i < productsPayload.length; i += 100) {
    const chunk = productsPayload.slice(i, i + 100);
    const { error: prodErr } = await supabase.from('products').upsert(chunk);
    if (prodErr) {
      console.error(`Error seeding products chunk ${i}..${i + chunk.length}:`, prodErr.message);
    } else {
      console.log(`✓ Seeded products ${i + 1}..${i + chunk.length}`);
    }
  }

  // 5. Seed Packages in batches of 100
  console.log('Upserting packages in batches...');
  const packagesPayload = snapshot.packages.map((pkg) => ({
    id: pkg.id,
    product_id: pkg.productId,
    quantity: pkg.quantity || 1,
    unit: pkg.unit || 'عبوة',
    display_name: pkg.displayName || `${pkg.quantity || 1} ${pkg.unit || 'عبوة'}`,
    price: pkg.price || 0,
    cost_price: pkg.costPrice || null,
    currency: pkg.currency || 'EGP',
    allow_piece_order: pkg.allowPieceOrder !== false,
    allow_carton_order: pkg.allowCartonOrder || false,
    pieces_per_carton: pkg.piecesPerCarton || 1,
    stock_quantity: pkg.stockQuantity || null,
    min_stock_alert: pkg.minStockAlert || null,
    is_out_of_stock: pkg.isOutOfStock || false,
    active: pkg.active !== false,
    display_order: pkg.displayOrder || 0,
  }));

  for (let i = 0; i < packagesPayload.length; i += 100) {
    const chunk = packagesPayload.slice(i, i + 100);
    const { error: pkgErr } = await supabase.from('packages').upsert(chunk);
    if (pkgErr) {
      console.error(`Error seeding packages chunk ${i}..${i + chunk.length}:`, pkgErr.message);
    } else {
      console.log(`✓ Seeded packages ${i + 1}..${i + chunk.length}`);
    }
  }

  // 6. Seed Settings
  if (snapshot.settings) {
    console.log('Upserting settings...');
    const { error: setErr } = await supabase
      .from('settings')
      .upsert({ id: 'main', data: snapshot.settings, updated_at: new Date().toISOString() });
    if (setErr) console.error('Error seeding settings:', setErr.message);
    else console.log('✓ Seeded settings');
  }

  // 7. Seed Unified Catalog Snapshot
  console.log('Upserting unified catalog snapshot...');
  const { error: snapErr } = await supabase.from('catalog_snapshots').upsert({
    id: 'latest',
    version: snapshot.version || 1,
    data: snapshot,
    synced_at: new Date().toISOString(),
  });
  if (snapErr) console.error('Error seeding snapshot:', snapErr.message);
  else console.log('✓ Seeded catalog snapshot (latest)');

  console.log('\n--- VERIFICATION ---');
  const { count: prodCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
  console.log('Total products in Supabase:', prodCount);

  const { data: stimData } = await supabase
    .from('products')
    .select('id')
    .eq('category_id', 'CAT-01');
  console.log('Stimulants in Supabase (CAT-01):', stimData?.length);

  const { data: fertData } = await supabase
    .from('products')
    .select('id')
    .eq('category_id', 'CAT-02');
  console.log('Fertilizers in Supabase (CAT-02):', fertData?.length);

  const { data: pestData } = await supabase
    .from('products')
    .select('id')
    .eq('category_id', 'CAT-759728');
  console.log('Pesticides in Supabase (CAT-759728):', pestData?.length);

  console.log('Seeding completed successfully!');
}

seed().catch((e) => console.error('Seed exception:', e));
