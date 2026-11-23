import fs from 'fs';
import path from 'path';

const STIM_IDS = new Set([
  'PRD-الوا-7686-59', // ديور (أقوى مركب مغذي عام ورافع إجهاد)
  'PRD-كفر -5240-9', // سماد كزد فولفات
  'PRD-اجرو-7507-23', // أحماض أمينية 60%
  'PRD-نوفا-9140-2', // أبو شنب
  'PRD-زين-6765-7', // سماد زين السحري
  'PRD-اورك-1669-6', // هيوستيك
  'PRD-كفر -9839-1', // بروسويل
  'PRD-كفر -9839-2', // برو أكتيف
  'PRD-كفر -9839-5', // جيوكر كزد
  'PRD-كفر -9839-7', // سلفيتو
  'PRD-شركة-6840-27', // سالت كلير بريميوم
  'PRD-شركة-6850-32', // فوس باور بلس
  'PRD-شركة-8516-6', // كاس سال
  'PRD-شركة-8529-15', // اند سال
  'PRD-ايجي-4216-1', // كيورسال
  'PRD-ايجي-4224-3', // هيوماسول
  'PRD-ايجي-4227-4', // اورسال
  'PRD-ايجي-4230-5', // ميلانو جيت
  'PRD-ايجي-4232-6', // سيتو ايجلز
  'PRD-ايجي-4237-8', // مادوفيت ال
  'PRD-ايجي-4251-15', // سيناتور
  'PRD-ايجي-4264-21', // سوبرانو
  'PRD-ايجي-4267-23', // ستار ليكس
  'PRD-اجرو-7638-2', // أحماض امينية مكة
  'PRD-اجرو-7647-5', // بيكون رووت
  'PRD-زين-6529-7', // أمينو أسيد
  'PRD-زين-6534-8', // معالج ملوحة
  'PRD-زين-6536-10', // نترو بلس منشط جذور
  'PRD-زين-6552-14', // نفثالين أسيتك أسيد
  'PRD-زين-6557-16', // احماض امينية
  'PRD-نوفا-8366-4', // نوفاندول
  'PRD-نوفا-8366-5', // امي نو نوفا
  'PRD-نوفا-8366-7', // أجروتونك
  'PRD-نوفا-8366-9', // هومو نوفا (هيومات بوتاسيوم 12 %)
  'PRD-نوفا-8371-10', // نوفا نوسلت (معالج ملوحة)
  'PRD-بايو-5532-1', // رووت اون
  'PRD-بايو-5536-2', // جراند جرو
  'PRD-اجرو-5861-1', // جبريكين
  'PRD-اجرو-5867-5', // جبريليك اسيد 10%
  'PRD-اجرو-5873-6', // كيميكالز جيب بلس 4%
  'PRD-اجرو-5873-7', // بروميكس
  'PRD-اجرو-5873-8', // اجروبلكس
  'PRD-اجرو-5873-9', // فوتشنر
  'PRD-اجرو-5873-10', // سلفادول
]);

const snapshotPath = path.resolve('public/catalog-snapshot.json');
const distSnapshotPath = path.resolve('dist/catalog-snapshot.json');
const storePath = path.resolve('catalog-data-store.json');
const seedPath = path.resolve('src/data/seedData.ts');

const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

console.log('Before update:');
const beforeCounts = {};
for (const p of snapshot.products) {
  beforeCounts[p.categoryId] = (beforeCounts[p.categoryId] || 0) + 1;
}
console.log('Category counts:', beforeCounts);

const nowIso = new Date().toISOString();
let modifiedCount = 0;

const updatedProducts = snapshot.products.map((p) => {
  if (STIM_IDS.has(p.id)) {
    modifiedCount++;
    return {
      ...p,
      categoryId: 'CAT-01',
      productType: 'stimulant',
      updatedAt: nowIso,
    };
  }
  return p;
});

console.log(`Reclassified ${modifiedCount} products to CAT-01 (stimulant)`);

const afterCounts = {};
for (const p of updatedProducts) {
  afterCounts[p.categoryId] = (afterCounts[p.categoryId] || 0) + 1;
}
console.log('After update category counts:', afterCounts);

// Update snapshot object
snapshot.products = updatedProducts;
snapshot.syncedAt = nowIso;
snapshot.lastSyncedAt = nowIso;
snapshot.version = (snapshot.version || 1) + 1;
snapshot.dataVersion = '2026.11.23.v2';
snapshot.syncToken = 'cropsa_live_sync_2026';

// 1. Save public/catalog-snapshot.json
fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf8');
console.log('Updated public/catalog-snapshot.json');

// 2. Save dist/catalog-snapshot.json if exists
if (fs.existsSync(distSnapshotPath)) {
  fs.writeFileSync(distSnapshotPath, JSON.stringify(snapshot, null, 2), 'utf8');
  console.log('Updated dist/catalog-snapshot.json');
}

// 3. Save catalog-data-store.json
if (fs.existsSync(storePath)) {
  const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
  store.products = updatedProducts;
  store.syncedAt = nowIso;
  store.lastSyncedAt = nowIso;
  store.version = snapshot.version;
  store.dataVersion = '2026.11.23.v2';
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
  console.log('Updated catalog-data-store.json');
}

// 4. Update src/data/seedData.ts
if (fs.existsSync(seedPath)) {
  const seedContent = fs.readFileSync(seedPath, 'utf8');
  const prodStart = seedContent.indexOf('export const INITIAL_PRODUCTS: Product[] = [');
  const prodEnd = seedContent.indexOf('export const INITIAL_PACKAGES: Package[] = [', prodStart);
  if (prodStart !== -1 && prodEnd !== -1) {
    const newSeedContent =
      seedContent.slice(0, prodStart) +
      'export const INITIAL_PRODUCTS: Product[] = ' +
      JSON.stringify(updatedProducts, null, 2) +
      ';\n\n' +
      seedContent.slice(prodEnd);
    fs.writeFileSync(seedPath, newSeedContent, 'utf8');
    console.log('Updated src/data/seedData.ts INITIAL_PRODUCTS successfully');
  } else {
    console.error('Could not find bounds in seedData.ts');
  }
}

console.log('Done updating all data files!');
