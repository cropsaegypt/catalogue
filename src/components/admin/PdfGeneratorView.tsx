import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  Settings2,
  Image as ImageIcon,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  X,
  ZoomIn,
  ZoomOut,
  Building2,
  Layers,
  Search,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  UserCheck,
  Link2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  ArrowRight,
  ExternalLink,
  Images,
} from 'lucide-react';
import {
  Product,
  Package,
  Category,
  Company,
  CatalogSettings,
  Advertisement,
  PdfDividerAsset,
  SharedCustomCatalog,
  TeamMember,
} from '../../types';
import { pdfService, RenderedCatalogImage } from '../../services/pdfService';
import { dbStorage } from '../../services/dbStorage';
import { firestoreSync } from '../../services/firestoreSync';
import { aiCatalogService } from '../../services/aiCatalogService';
import { FALLBACK_BOTTLE_SVG_DATA_URL } from '../../utils/agriculturalImages';
import { ImageFileInput } from '../common/ImageFileInput';

type CatalogSequenceItem =
  | {
      uid: string;
      type: 'divider';
      title: string;
      imageUrl: string;
      companyId?: string;
      companyName?: string;
      companyLogoUrl?: string;
      productsCount?: number;
      dividerAssetId?: string;
      sourceKind: 'cover' | 'company_custom' | 'generic_rotating' | 'auto_branded' | 'manual';
    }
  | {
      uid: string;
      type: 'products';
      companyId: string;
      companyName: string;
      products: Product[];
    };

interface PdfPageLayoutSpec {
  count: number;
  cols: 1 | 2 | 3;
  rows: 1 | 2 | 3 | 4;
  label: string;
  gridLabel: string;
  gapClass: string;
  cardPaddingClass: string;
  orientation: 'horizontal' | 'vertical';
  imageBoxClass: string;
  titleClass: string;
  companyBadgeClass: string;
  pkgBadgeClass: string;
  specTextClass: string;
  charClampClass: string;
  compClampClass: string;
  usageClampClass: string;
}

const PDF_PAGE_LAYOUTS: Record<number, PdfPageLayoutSpec> = {
  1: {
    count: 1,
    cols: 1,
    rows: 1,
    label: 'منتج واحد (صفحة كاملة)',
    gridLabel: '1×1',
    gapClass: 'gap-4',
    cardPaddingClass: 'p-6',
    orientation: 'horizontal',
    imageBoxClass: 'w-[224px] h-[288px]',
    titleClass: 'text-3xl',
    companyBadgeClass: 'text-xs',
    pkgBadgeClass: 'text-sm px-4 py-1.5',
    specTextClass: 'text-[13px]',
    charClampClass: 'line-clamp-8',
    compClampClass: 'line-clamp-6',
    usageClampClass: 'line-clamp-6',
  },
  2: {
    count: 2,
    cols: 1,
    rows: 2,
    label: 'منتجان (صفوف عريضة)',
    gridLabel: '1×2',
    gapClass: 'gap-4',
    cardPaddingClass: 'p-4',
    orientation: 'horizontal',
    imageBoxClass: 'w-[162px] h-[206px]',
    titleClass: 'text-[26px]',
    companyBadgeClass: 'text-xs',
    pkgBadgeClass: 'text-[13px] px-3.5 py-1',
    specTextClass: 'text-[12.5px]',
    charClampClass: 'line-clamp-5',
    compClampClass: 'line-clamp-3',
    usageClampClass: 'line-clamp-3',
  },
  3: {
    count: 3,
    cols: 1,
    rows: 3,
    label: '3 منتجات (صفوف متوازنة)',
    gridLabel: '1×3',
    gapClass: 'gap-3.5',
    cardPaddingClass: 'p-3',
    orientation: 'horizontal',
    imageBoxClass: 'w-[120px] h-[152px]',
    titleClass: 'text-[22px]',
    companyBadgeClass: 'text-[11.5px]',
    pkgBadgeClass: 'text-xs px-3 py-1',
    specTextClass: 'text-[11.5px]',
    charClampClass: 'line-clamp-3',
    compClampClass: 'line-clamp-2',
    usageClampClass: 'line-clamp-2',
  },
  4: {
    count: 4,
    cols: 2,
    rows: 2,
    label: '4 منتجات (التنسيق الكلاسيكي 2×2)',
    gridLabel: '2×2',
    gapClass: 'gap-3.5',
    cardPaddingClass: 'p-3.5',
    orientation: 'horizontal',
    imageBoxClass: 'w-[132px] h-[170px]',
    titleClass: 'text-[23px]',
    companyBadgeClass: 'text-[11.5px]',
    pkgBadgeClass: 'text-[12.5px] px-3.5 py-1',
    specTextClass: 'text-[11.5px]',
    charClampClass: 'line-clamp-5',
    compClampClass: 'line-clamp-2',
    usageClampClass: 'line-clamp-2',
  },
  6: {
    count: 6,
    cols: 2,
    rows: 3,
    label: '6 منتجات (شبكة 2×3)',
    gridLabel: '2×3',
    gapClass: 'gap-3',
    cardPaddingClass: 'p-2.5',
    orientation: 'horizontal',
    imageBoxClass: 'w-[96px] h-[122px]',
    titleClass: 'text-[17px]',
    companyBadgeClass: 'text-[10.5px]',
    pkgBadgeClass: 'text-[11px] px-2.5 py-0.5',
    specTextClass: 'text-[10.5px]',
    charClampClass: 'line-clamp-3',
    compClampClass: 'line-clamp-2',
    usageClampClass: 'line-clamp-1',
  },
  8: {
    count: 8,
    cols: 2,
    rows: 4,
    label: '8 منتجات (مقارنة 2×4)',
    gridLabel: '2×4',
    gapClass: 'gap-2.5',
    cardPaddingClass: 'p-2',
    orientation: 'horizontal',
    imageBoxClass: 'w-[76px] h-[96px]',
    titleClass: 'text-[15px]',
    companyBadgeClass: 'text-[10px]',
    pkgBadgeClass: 'text-[10px] px-2 py-0.5',
    specTextClass: 'text-[10px]',
    charClampClass: 'line-clamp-2',
    compClampClass: 'line-clamp-1',
    usageClampClass: 'line-clamp-1',
  },
  9: {
    count: 9,
    cols: 3,
    rows: 3,
    label: '9 منتجات (شبكة 3×3)',
    gridLabel: '3×3',
    gapClass: 'gap-3',
    cardPaddingClass: 'p-2.5',
    orientation: 'vertical',
    imageBoxClass: 'w-[96px] h-[112px]',
    titleClass: 'text-[15px]',
    companyBadgeClass: 'text-[10px]',
    pkgBadgeClass: 'text-[10.5px] px-2.5 py-0.5',
    specTextClass: 'text-[10px]',
    charClampClass: 'line-clamp-2',
    compClampClass: 'line-clamp-1',
    usageClampClass: 'line-clamp-1',
  },
};

const ALLOWED_PER_PAGE_COUNTS = [1, 2, 3, 4, 6, 8, 9] as const;

interface AdaptiveTierSpec {
  maxVolume: number;
  imageBoxClass: string;
  specLabelClass: string;
  specBodyClass: string;
  specWrapperClass: string;
  specSectionClass: string;
  charClampClass: string;
  compClampClass: string;
  usageClampClass: string;
}

interface AdaptiveCardMetrics {
  imageBoxClass: string;
  titleClass: string;
  pkgBadgeClass: string;
  specLabelClass: string;
  specBodyClass: string;
  charBodyClass: string;
  compBodyClass: string;
  usageBodyClass: string;
  blockCharacteristicsHeading: boolean;
  specWrapperClass: string;
  specSectionClass: string;
  charClampClass: string;
  compClampClass: string;
  usageClampClass: string;
  hasSpecs: boolean;
}

const ADAPTIVE_CARD_TIERS: Record<number, AdaptiveTierSpec[]> = {
  1: [
    {
      maxVolume: 280,
      imageBoxClass: 'w-[248px] h-[318px]',
      specLabelClass: 'text-[19px]',
      specBodyClass: 'text-[18.5px] leading-[1.78]',
      specWrapperClass: 'mt-4 flex-1 flex flex-col justify-evenly gap-4 min-h-0 overflow-hidden',
      specSectionClass: 'bg-[#F6FAF7] border border-[#DCEAE1] rounded-2xl px-5 py-4',
      charClampClass: '',
      compClampClass: '',
      usageClampClass: '',
    },
    {
      maxVolume: 520,
      imageBoxClass: 'w-[232px] h-[296px]',
      specLabelClass: 'text-[17px]',
      specBodyClass: 'text-[16.5px] leading-[1.7]',
      specWrapperClass: 'mt-4 flex-1 flex flex-col justify-between gap-3 min-h-0 overflow-hidden',
      specSectionClass: 'bg-[#F6FAF7] border border-[#DFECE4] rounded-2xl px-4 py-3',
      charClampClass: '',
      compClampClass: '',
      usageClampClass: '',
    },
    {
      maxVolume: Infinity,
      imageBoxClass: 'w-[215px] h-[274px]',
      specLabelClass: 'text-[15px]',
      specBodyClass: 'text-[14.5px] leading-[1.6]',
      specWrapperClass: 'mt-3 flex-1 flex flex-col justify-between gap-2.5 min-h-0 overflow-hidden',
      specSectionClass: 'bg-[#F7FAF8] border border-[#E2EDE6] rounded-xl px-4 py-2.5',
      charClampClass: 'line-clamp-8',
      compClampClass: 'line-clamp-6',
      usageClampClass: 'line-clamp-6',
    },
  ],
  2: [
    {
      maxVolume: 260,
      imageBoxClass: 'w-[170px] h-[214px]',
      specLabelClass: 'text-[16.5px]',
      specBodyClass: 'text-[16px] leading-[1.7]',
      specWrapperClass: 'mt-3 flex-1 flex flex-col justify-evenly gap-2.5 min-h-0 overflow-hidden',
      specSectionClass: 'bg-[#F6FAF7] border border-[#DCEAE1] rounded-xl px-4 py-2.5',
      charClampClass: '',
      compClampClass: '',
      usageClampClass: '',
    },
    {
      maxVolume: 440,
      imageBoxClass: 'w-[158px] h-[198px]',
      specLabelClass: 'text-[15px]',
      specBodyClass: 'text-[14.5px] leading-[1.6]',
      specWrapperClass: 'mt-3 flex-1 flex flex-col justify-between gap-2 min-h-0 overflow-hidden',
      specSectionClass: 'bg-[#F6FAF7] border border-[#DFECE4] rounded-xl px-3.5 py-2',
      charClampClass: 'line-clamp-6',
      compClampClass: 'line-clamp-4',
      usageClampClass: 'line-clamp-4',
    },
    {
      maxVolume: Infinity,
      imageBoxClass: 'w-[144px] h-[182px]',
      specLabelClass: 'text-[13.5px]',
      specBodyClass: 'text-[13px] leading-[1.5]',
      specWrapperClass: 'mt-2.5 flex-1 flex flex-col justify-between gap-1.5 min-h-0 overflow-hidden',
      specSectionClass: 'bg-[#F7FAF8] border border-[#E2EDE6] rounded-xl px-3 py-1.5',
      charClampClass: 'line-clamp-5',
      compClampClass: 'line-clamp-3',
      usageClampClass: 'line-clamp-3',
    },
  ],
  3: [
    {
      maxVolume: 220,
      imageBoxClass: 'w-[126px] h-[156px]',
      specLabelClass: 'text-[14px]',
      specBodyClass: 'text-[13.5px] leading-[1.56]',
      specWrapperClass: 'mt-2 flex-1 flex flex-col justify-evenly gap-1.5 min-h-0 overflow-hidden',
      specSectionClass: 'bg-[#F6FAF7] border border-[#DFECE4] rounded-xl px-3 py-1.5',
      charClampClass: '',
      compClampClass: '',
      usageClampClass: '',
    },
    {
      maxVolume: 370,
      imageBoxClass: 'w-[118px] h-[146px]',
      specLabelClass: 'text-[13px]',
      specBodyClass: 'text-[12.5px] leading-[1.46]',
      specWrapperClass: 'mt-2 flex-1 flex flex-col justify-between gap-1 min-h-0 overflow-hidden',
      specSectionClass: 'bg-[#F6FAF7] border border-[#E2EDE6] rounded-lg px-2.5 py-1',
      charClampClass: 'line-clamp-4',
      compClampClass: 'line-clamp-2',
      usageClampClass: 'line-clamp-2',
    },
    {
      maxVolume: Infinity,
      imageBoxClass: 'w-[110px] h-[136px]',
      specLabelClass: 'text-[11.5px]',
      specBodyClass: 'text-[11px] leading-[1.36]',
      specWrapperClass: 'mt-1.5 flex-1 flex flex-col justify-start gap-1 min-h-0 overflow-hidden',
      specSectionClass: 'pt-1 border-t border-[#C4D6CA] first:pt-0 first:border-t-0',
      charClampClass: 'line-clamp-3',
      compClampClass: 'line-clamp-2',
      usageClampClass: 'line-clamp-2',
    },
  ],
  4: [
    {
      maxVolume: 225,
      imageBoxClass: 'w-[140px] h-[176px]',
      specLabelClass: 'text-[15.5px]',
      specBodyClass: 'text-[15px] leading-[1.66]',
      specWrapperClass: 'mt-3 flex-1 flex flex-col justify-evenly gap-2.5 min-h-0 overflow-hidden',
      specSectionClass: 'bg-[#F6FAF7] border border-[#DCEAE1] rounded-xl px-3.5 py-2.5',
      charClampClass: '',
      compClampClass: '',
      usageClampClass: '',
    },
    {
      maxVolume: 365,
      imageBoxClass: 'w-[134px] h-[168px]',
      specLabelClass: 'text-[14.5px]',
      specBodyClass: 'text-[14px] leading-[1.56]',
      specWrapperClass: 'mt-2.5 flex-1 flex flex-col justify-between gap-2 min-h-0 overflow-hidden',
      specSectionClass: 'bg-[#F6FAF7] border border-[#DFECE4] rounded-xl px-3 py-2',
      charClampClass: 'line-clamp-5',
      compClampClass: 'line-clamp-4',
      usageClampClass: 'line-clamp-4',
    },
    {
      maxVolume: 470,
      imageBoxClass: 'w-[132px] h-[164px]',
      specLabelClass: 'text-[14px]',
      specBodyClass: 'text-[13.5px] leading-[1.48]',
      specWrapperClass: 'mt-2.5 flex-1 flex flex-col justify-between gap-1.5 min-h-0 overflow-hidden',
      specSectionClass: 'bg-[#F6FAF7] border border-[#E2EDE6] rounded-xl px-3 py-1.5',
      charClampClass: 'line-clamp-5',
      compClampClass: 'line-clamp-4',
      usageClampClass: 'line-clamp-4',
    },
    {
      maxVolume: 590,
      imageBoxClass: 'w-[126px] h-[158px]',
      specLabelClass: 'text-[13px]',
      specBodyClass: 'text-[12.5px] leading-[1.42]',
      specWrapperClass: 'mt-2 flex-1 flex flex-col justify-between gap-1.5 min-h-0 overflow-hidden',
      specSectionClass: 'bg-[#F7FAF8] border border-[#E5EFE9] rounded-xl px-2.5 py-1.5',
      charClampClass: 'line-clamp-5',
      compClampClass: 'line-clamp-3',
      usageClampClass: 'line-clamp-4',
    },
    {
      maxVolume: Infinity,
      imageBoxClass: 'w-[122px] h-[152px]',
      specLabelClass: 'text-[12px]',
      specBodyClass: 'text-[11.5px] leading-[1.36]',
      specWrapperClass: 'mt-2 flex-1 flex flex-col justify-between gap-1 min-h-0 overflow-hidden',
      specSectionClass: 'bg-[#F7FAF8] border border-[#E5EFE9] rounded-lg px-2.5 py-1',
      charClampClass: 'line-clamp-6',
      compClampClass: 'line-clamp-3',
      usageClampClass: 'line-clamp-3',
    },
  ],
  6: [
    {
      maxVolume: 190,
      imageBoxClass: 'w-[98px] h-[122px]',
      specLabelClass: 'text-[13px]',
      specBodyClass: 'text-[12.5px] leading-[1.52]',
      specWrapperClass: 'mt-2 flex-1 flex flex-col justify-between gap-1.5 min-h-0 overflow-hidden',
      specSectionClass: 'bg-[#F6FAF7] border border-[#E2EDE6] rounded-lg px-2.5 py-1.5',
      charClampClass: 'line-clamp-4',
      compClampClass: 'line-clamp-3',
      usageClampClass: 'line-clamp-3',
    },
    {
      maxVolume: 310,
      imageBoxClass: 'w-[92px] h-[116px]',
      specLabelClass: 'text-[12px]',
      specBodyClass: 'text-[11.5px] leading-[1.42]',
      specWrapperClass: 'mt-1.5 flex-1 flex flex-col justify-between gap-1 min-h-0 overflow-hidden',
      specSectionClass: 'bg-[#F6FAF7] border border-[#E5EFE9] rounded-lg px-2 py-1',
      charClampClass: 'line-clamp-3',
      compClampClass: 'line-clamp-2',
      usageClampClass: 'line-clamp-3',
    },
    {
      maxVolume: Infinity,
      imageBoxClass: 'w-[86px] h-[108px]',
      specLabelClass: 'text-[11px]',
      specBodyClass: 'text-[10.5px] leading-[1.35]',
      specWrapperClass: 'mt-1.5 flex-1 flex flex-col justify-start gap-1 min-h-0 overflow-hidden',
      specSectionClass: 'pt-1 border-t border-[#C4D6CA] first:pt-0 first:border-t-0',
      charClampClass: 'line-clamp-3',
      compClampClass: 'line-clamp-2',
      usageClampClass: 'line-clamp-2',
    },
  ],
  8: [
    {
      maxVolume: 185,
      imageBoxClass: 'w-[78px] h-[98px]',
      specLabelClass: 'text-[12px]',
      specBodyClass: 'text-[11.5px] leading-[1.4]',
      specWrapperClass: 'mt-1.5 flex-1 flex flex-col justify-between gap-1 min-h-0 overflow-hidden',
      specSectionClass: 'bg-[#F6FAF7] border border-[#E5EFE9] rounded-md px-2 py-1',
      charClampClass: 'line-clamp-3',
      compClampClass: 'line-clamp-2',
      usageClampClass: 'line-clamp-2',
    },
    {
      maxVolume: Infinity,
      imageBoxClass: 'w-[72px] h-[90px]',
      specLabelClass: 'text-[10.5px]',
      specBodyClass: 'text-[10px] leading-[1.3]',
      specWrapperClass: 'mt-1 flex-1 flex flex-col justify-start gap-0.5 min-h-0 overflow-hidden',
      specSectionClass: 'pt-0.5 border-t border-[#C4D6CA] first:pt-0 first:border-t-0',
      charClampClass: 'line-clamp-2',
      compClampClass: 'line-clamp-1',
      usageClampClass: 'line-clamp-1',
    },
  ],
  9: [
    {
      maxVolume: 185,
      imageBoxClass: 'w-[98px] h-[114px]',
      specLabelClass: 'text-[12px]',
      specBodyClass: 'text-[11.5px] leading-[1.45]',
      specWrapperClass: 'mt-1.5 flex-1 flex flex-col justify-between gap-1.5 min-h-0 overflow-hidden',
      specSectionClass: 'bg-[#F6FAF7] border border-[#E2EDE6] rounded-lg px-2 py-1',
      charClampClass: 'line-clamp-3',
      compClampClass: 'line-clamp-2',
      usageClampClass: 'line-clamp-2',
    },
    {
      maxVolume: 290,
      imageBoxClass: 'w-[92px] h-[106px]',
      specLabelClass: 'text-[11px]',
      specBodyClass: 'text-[10.5px] leading-[1.38]',
      specWrapperClass: 'mt-1.5 flex-1 flex flex-col justify-between gap-1 min-h-0 overflow-hidden',
      specSectionClass: 'pt-1 border-t border-[#C4D6CA] first:pt-0 first:border-t-0',
      charClampClass: 'line-clamp-3',
      compClampClass: 'line-clamp-2',
      usageClampClass: 'line-clamp-2',
    },
    {
      maxVolume: Infinity,
      imageBoxClass: 'w-[86px] h-[98px]',
      specLabelClass: 'text-[10px]',
      specBodyClass: 'text-[9.5px] leading-[1.32]',
      specWrapperClass: 'mt-1 flex-1 flex flex-col justify-start gap-0.5 min-h-0 overflow-hidden',
      specSectionClass: 'pt-0.5 border-t border-[#C4D6CA] first:pt-0 first:border-t-0',
      charClampClass: 'line-clamp-2',
      compClampClass: 'line-clamp-1',
      usageClampClass: 'line-clamp-1',
    },
  ],
};

/** Isolates Latin/parenthetical segments (e.g. "(Triton - K)") in RTL headings so parentheses never flip awkwardly across wrapped lines. */
function renderBidiTitle(name: string): React.ReactNode {
  const parts = name.split(/(\([^)]*[A-Za-z][^)]*\))/g);
  if (parts.length <= 1) return name;
  return parts.map((part, idx) =>
    /^\([^)]*[A-Za-z][^)]*\)$/.test(part) ? (
      <bdi key={idx} dir="ltr" className="inline-block whitespace-nowrap">
        {part}
      </bdi>
    ) : (
      <React.Fragment key={idx}>{part}</React.Fragment>
    )
  );
}

/** Coordinates text size cleanly inside an individual spec box so dense copy (especially usage rates) fits inside full-size boxes without clipping. */
function coordinateSectionBodyClass(
  sectionLength: number,
  defaultBodyClass: string,
  layoutCount: number,
  cardHasLongCopy: boolean
): string {
  if (sectionLength === 0) return defaultBodyClass;
  if (layoutCount === 4 && cardHasLongCopy) {
    if (sectionLength > 125) return 'text-[12px] leading-[1.38]';
    if (sectionLength > 82) return 'text-[12.5px] leading-[1.42]';
  } else if (layoutCount <= 2 && cardHasLongCopy) {
    if (sectionLength > 210) return 'text-[13.5px] leading-[1.48]';
  }
  return defaultBodyClass;
}

/** Computes responsive card typography and vertical fill based on grid density and product copy volume. */
function getAdaptiveCardMetrics(
  product: Product,
  layout: PdfPageLayoutSpec,
  opts: {
    showCharacteristics: boolean;
    showComposition: boolean;
    showUsage: boolean;
    visiblePackageCount: number;
  }
): AdaptiveCardMetrics {
  const charLen = opts.showCharacteristics && product.characteristics?.length
    ? product.characteristics.join(' • ').length
    : 0;
  const compLen = opts.showComposition && product.composition?.length
    ? product.composition.join(' • ').length
    : 0;
  const usageLen = opts.showUsage && product.usage?.length
    ? product.usage.join(' • ').length
    : 0;
  const sectionsCount = (charLen > 0 ? 1 : 0) + (compLen > 0 ? 1 : 0) + (usageLen > 0 ? 1 : 0);
  const nameLen = product.name.trim().length;
  const volume = charLen + compLen + usageLen + sectionsCount * 28;
  const cardHasLongCopy = charLen + compLen + usageLen > 240;

  const tiers = ADAPTIVE_CARD_TIERS[layout.count] || ADAPTIVE_CARD_TIERS[4];
  const matched = tiers.find((t) => volume <= t.maxVolume) || tiers[tiers.length - 1];
  let titleClass = layout.titleClass;
  if (layout.count === 1) {
    titleClass = nameLen > 24 ? 'text-[28px]' : 'text-[34px]';
  } else if (layout.count === 2) {
    titleClass = nameLen > 24 ? 'text-[23px]' : 'text-[27px]';
  } else if (layout.count === 3) {
    titleClass = nameLen > 24 ? 'text-[19px]' : 'text-[22px]';
  } else if (layout.count === 4) {
    titleClass = nameLen > 26 ? 'text-[19px]' : nameLen > 17 ? 'text-[21.5px]' : 'text-[24px]';
  } else if (layout.count === 6) {
    titleClass = nameLen > 22 ? 'text-[16px]' : 'text-[18.5px]';
  } else if (layout.count >= 8) {
    titleClass = nameLen > 20 ? 'text-[14px]' : 'text-[16px]';
  }

  let pkgBadgeClass = layout.pkgBadgeClass;
  if (layout.count === 4) {
    // Keep up to 2 prices cleanly side-by-side on one row without growing the hero height
    pkgBadgeClass =
      opts.visiblePackageCount >= 2
        ? 'text-[11.5px] px-2.5 py-0.5 whitespace-nowrap'
        : 'text-[13px] px-3.5 py-1 whitespace-nowrap';
  } else if (layout.count === 6) {
    pkgBadgeClass =
      opts.visiblePackageCount >= 2
        ? 'text-[10.5px] px-2 py-0.5 whitespace-nowrap'
        : 'text-[11.5px] px-3 py-0.5 whitespace-nowrap';
  }

  return {
    imageBoxClass: matched.imageBoxClass,
    titleClass,
    pkgBadgeClass,
    specLabelClass: matched.specLabelClass,
    specBodyClass: matched.specBodyClass,
    charBodyClass: coordinateSectionBodyClass(charLen, matched.specBodyClass, layout.count, cardHasLongCopy),
    compBodyClass: coordinateSectionBodyClass(compLen, matched.specBodyClass, layout.count, cardHasLongCopy),
    usageBodyClass: coordinateSectionBodyClass(usageLen, matched.specBodyClass, layout.count, cardHasLongCopy),
    blockCharacteristicsHeading: layout.count <= 4 && charLen + compLen + usageLen <= 340,
    specWrapperClass: matched.specWrapperClass,
    specSectionClass: matched.specSectionClass,
    charClampClass: matched.charClampClass,
    compClampClass: matched.compClampClass,
    usageClampClass: matched.usageClampClass,
    hasSpecs: sectionsCount > 0,
  };
}

/** Shared responsive specs block used by both vertical and horizontal PDF product cards. */
function renderProductSpecsBlock(
  product: Product,
  metrics: AdaptiveCardMetrics,
  opts: { showCharacteristics: boolean; showComposition: boolean; showUsage: boolean }
): React.ReactNode {
  if (!metrics.hasSpecs) return null;

  return (
    <div className={`${metrics.specWrapperClass} text-right`}>
      {opts.showCharacteristics && product.characteristics && product.characteristics.length > 0 && (
        <div className={metrics.specSectionClass}>
          {metrics.blockCharacteristicsHeading ? (
            <>
              <span className={`${metrics.specLabelClass} font-black text-[#0A623B] block mb-0.5`}>
                الخصائص :
              </span>
              <p className={`${metrics.charBodyClass} font-bold text-stone-900 ${metrics.charClampClass}`}>
                {product.characteristics.join(' • ')}
              </p>
            </>
          ) : (
            <p className={`${metrics.charBodyClass} font-bold text-stone-900 ${metrics.charClampClass}`}>
              <span className={`${metrics.specLabelClass} font-black text-[#0A623B] ml-1`}>الخصائص :</span>
              {product.characteristics.join(' • ')}
            </p>
          )}
        </div>
      )}

      {opts.showComposition && product.composition && product.composition.length > 0 && (
        <div className={metrics.specSectionClass}>
          <p className={`${metrics.compBodyClass} font-extrabold text-stone-950 ${metrics.compClampClass}`}>
            <span className={`${metrics.specLabelClass} font-black text-[#0A623B] ml-1`}>التركيب :</span>
            {product.composition.join(' • ')}
          </p>
        </div>
      )}

      {opts.showUsage && product.usage && product.usage.length > 0 && (
        <div className={metrics.specSectionClass}>
          <p className={`${metrics.usageBodyClass} font-bold text-stone-900 ${metrics.usageClampClass}`}>
            <span className={`${metrics.specLabelClass} font-black text-[#0A623B] ml-1`}>معدلات الاستخدام :</span>
            {product.usage.join(' • ')}
          </p>
        </div>
      )}
    </div>
  );
}

interface PdfGeneratorViewProps {
  products: Product[];
  packages: Package[];
  categories: Category[];
  companies: Company[];
  settings: CatalogSettings;
  advertisements: Advertisement[];
  onShowToast: (msg: string, type: 'success' | 'error') => void;
  currentUser?: TeamMember | null;
  onBackToCatalog?: () => void;
}

export const PdfGeneratorView: React.FC<PdfGeneratorViewProps> = ({
  products = [],
  packages = [],
  categories = [],
  companies = [],
  settings,
  onShowToast,
  currentUser = null,
  onBackToCatalog,
}) => {
  // Custom Client Title & Layout Config
  const [activeStep, setActiveStep] = useState<'products' | 'layout' | 'preview'>('products');
  const [showAdvancedDividers, setShowAdvancedDividers] = useState<boolean>(false);
  const [customClientName, setCustomClientName] = useState<string>('');
  const [productsPerPage, setProductsPerPage] = useState<number>(() =>
    PDF_PAGE_LAYOUTS[settings.productsPerPage] ? settings.productsPerPage : 4
  );
  const [autoInsertCompanyDividers, setAutoInsertCompanyDividers] = useState<boolean>(true);
  const [mergeCompaniesOnPages, setMergeCompaniesOnPages] = useState<boolean>(false);

  const [showPrices, setShowPrices] = useState<boolean>(true);
  const [showCharacteristics, setShowCharacteristics] = useState<boolean>(true);
  const [showComposition, setShowComposition] = useState<boolean>(true);
  const [showUsage, setShowUsage] = useState<boolean>(true);

  // Multi-select Filters (Companies + Categories + Types + Search)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(() =>
    products.filter((p) => p.active).map((p) => p.id)
  );

  // Persistent Dividers Library
  const [dividerLibrary, setDividerLibrary] = useState<PdfDividerAsset[]>(() =>
    dbStorage.getPdfDividers()
  );

  // New Divider Form State
  const [showDividerForm, setShowDividerForm] = useState(false);
  const [newDividerTitle, setNewDividerTitle] = useState('');
  const [newDividerImage, setNewDividerImage] = useState('');
  const [newDividerKind, setNewDividerKind] = useState<'generic' | 'company' | 'cover'>('generic');
  const [newDividerCompanyId, setNewDividerCompanyId] = useState<string>(companies[0]?.id || '');
  const [isSavingDivider, setIsSavingDivider] = useState(false);

  // Editable Catalog Page Sequence
  const [catalogSequence, setCatalogSequence] = useState<CatalogSequenceItem[]>([]);
  const [isManuallyEdited, setIsManuallyEdited] = useState(false);

  // Modal Preview, Images Export & Shareable Link State
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(0.85);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  const [generatedImages, setGeneratedImages] = useState<RenderedCatalogImage[]>([]);
  const [isImagesModalOpen, setIsImagesModalOpen] = useState(false);

  const [isCreatingShareLink, setIsCreatingShareLink] = useState(false);
  const [shareLinkData, setShareLinkData] = useState<{
    url: string;
    catalog: SharedCustomCatalog;
  } | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  const pageContainerRef = useRef<HTMLDivElement>(null);

  // Toggle helpers
  const toggleSelection = (
    id: string,
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  // 1. Filter Matching Products (Multi-company + Multi-category + Multi-type + Search)
  const matchingProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.active) return false;

      const matchesSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.shortDescription && p.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesComp =
        selectedCompanyIds.length === 0 || selectedCompanyIds.includes(p.companyId);

      const matchesCat =
        selectedCategoryIds.length === 0 || selectedCategoryIds.includes(p.categoryId);

      let matchesType = true;
      if (selectedProductTypes.length > 0) {
        const text = `${p.name} ${p.shortDescription || ''} ${p.description || ''} ${(p.characteristics || []).join(' ')}`.toLowerCase();
        matchesType = selectedProductTypes.some((type) => {
          if (type === 'weed_pesticide') {
            return text.includes('حشائش') || text.includes('عريضة') || text.includes('رفيعة');
          }
          if (type === 'fungal_pesticide') {
            return text.includes('فطر') || text.includes('بياض') || text.includes('لفحة') || text.includes('أعفان');
          }
          if (type === 'insect_pesticide') {
            return text.includes('حشر') || text.includes('ديدان') || text.includes('توتا') || text.includes('أكاروس') || text.includes('ذبابة');
          }
          if (type === 'fertilizer') {
            return p.productType === 'fertilizer' || text.includes('بودر') || text.includes('سماد') || text.includes('npk');
          }
          if (type === 'stimulant') {
            return p.productType === 'stimulant' || text.includes('سائل') || text.includes('مخصب') || text.includes('طحالب') || text.includes('أحماض');
          }
          return true;
        });
      }

      return matchesSearch && matchesComp && matchesCat && matchesType;
    });
  }, [products, searchQuery, selectedCompanyIds, selectedCategoryIds, selectedProductTypes]);

  // 2. Final selected products included in PDF
  const pdfProducts = useMemo(
    () => matchingProducts.filter((p) => selectedProductIds.includes(p.id)),
    [matchingProducts, selectedProductIds]
  );

  // 3. Smart Company-Grouped Sequence Builder with Anti-Consecutive-Duplicate Divider Rule
  const buildStructuredSequence = useMemo(() => {
    return (): CatalogSequenceItem[] => {
      const seq: CatalogSequenceItem[] = [];
      let lastDividerId: string | null = null;
      let lastDividerImage: string | null = null;

      // A) Put Cover Dividers first (if any)
      const coverDividers = dividerLibrary.filter((d) => d.kind === 'cover');
      coverDividers.forEach((cov, idx) => {
        seq.push({
          uid: `SEQ-COVER-${cov.id}-${idx}`,
          type: 'divider',
          title: cov.title || 'غلاف الكتالوج',
          imageUrl: cov.imageUrl,
          dividerAssetId: cov.id,
          sourceKind: 'cover',
        });
        lastDividerId = cov.id;
        lastDividerImage = cov.imageUrl;
      });

      if (pdfProducts.length === 0) return seq;

      // B) Group products cleanly by Company
      const companyMap = new Map<string, Product[]>();
      pdfProducts.forEach((p) => {
        const cid = p.companyId || 'UNKNOWN';
        if (!companyMap.has(cid)) companyMap.set(cid, []);
        companyMap.get(cid)!.push(p);
      });

      // Order companies consistently by displayOrder
      const orderedCompanyIds = Array.from(companyMap.keys()).sort((a, b) => {
        const compA = companies.find((c) => c.id === a)?.displayOrder ?? 999;
        const compB = companies.find((c) => c.id === b)?.displayOrder ?? 999;
        return compA - compB;
      });

      const genericPool = dividerLibrary.filter((d) => d.kind === 'generic');
      let genericCursor = 0;

      // Mode 1: Merge companies to fill every A4 page up to `productsPerPage`
      if (mergeCompaniesOnPages) {
        const orderedProducts = orderedCompanyIds.flatMap((cid) => companyMap.get(cid) || []);
        const mergedChunks = pdfService.chunkProducts(orderedProducts, productsPerPage);
        mergedChunks.forEach((chunk, pIdx) => {
          const pageCompanyNames = Array.from(
            new Set(chunk.map((p) => companies.find((c) => c.id === p.companyId)?.name || 'كروپسا'))
          );
          seq.push({
            uid: `SEQ-MERGED-${pIdx}`,
            type: 'products',
            companyId: chunk[0]?.companyId || 'MIXED',
            companyName:
              pageCompanyNames.length <= 2
                ? pageCompanyNames.join(' • ')
                : `${pageCompanyNames[0]} و ${pageCompanyNames.length - 1} شركات`,
            products: chunk,
          });
        });
        return seq;
      }

      // C) Default Mode: For each company, insert Company Divider -> Then Company Product Pages!
      orderedCompanyIds.forEach((compId, cIdx) => {
        const comp = companies.find((c) => c.id === compId);
        const compName = comp?.name || 'منتجات كروپسا';
        const compProducts = companyMap.get(compId) || [];

        if (autoInsertCompanyDividers) {
          // 1. Check if this company has its own dedicated divider(s)
          const companySpecificDividers = dividerLibrary.filter(
            (d) => d.kind === 'company' && d.companyId === compId
          );

          if (companySpecificDividers.length > 0) {
            // Pick one avoiding consecutive repeat if multiple exist
            const chosen =
              companySpecificDividers.find(
                (d) => d.id !== lastDividerId && d.imageUrl !== lastDividerImage
              ) || companySpecificDividers[0];

            seq.push({
              uid: `SEQ-DIV-${compId}-${cIdx}`,
              type: 'divider',
              title: chosen.title || `فاصل ${compName}`,
              imageUrl: chosen.imageUrl,
              companyId: compId,
              companyName: compName,
              companyLogoUrl: comp?.logoUrl,
              productsCount: compProducts.length,
              dividerAssetId: chosen.id,
              sourceKind: 'company_custom',
            });
            lastDividerId = chosen.id;
            lastDividerImage = chosen.imageUrl;
          } else if (genericPool.length > 0) {
            // 2. Rotate through Generic Dividers strictly obeying NO-CONSECUTIVE-DUPLICATE rule
            let chosen: PdfDividerAsset | null = null;
            for (let step = 0; step < genericPool.length; step++) {
              const candidate = genericPool[(genericCursor + step) % genericPool.length];
              if (
                candidate.id !== lastDividerId &&
                candidate.imageUrl !== lastDividerImage
              ) {
                chosen = candidate;
                genericCursor = (genericCursor + step + 1) % genericPool.length;
                break;
              }
            }
            if (!chosen) {
              // Fallback only if library literally has 1 generic image
              chosen = genericPool[genericCursor % genericPool.length];
              genericCursor = (genericCursor + 1) % genericPool.length;
            }

            seq.push({
              uid: `SEQ-DIV-${compId}-${cIdx}`,
              type: 'divider',
              title: `${chosen.title} — ${compName}`,
              imageUrl: chosen.imageUrl,
              companyId: compId,
              companyName: compName,
              companyLogoUrl: comp?.logoUrl,
              productsCount: compProducts.length,
              dividerAssetId: chosen.id,
              sourceKind: 'generic_rotating',
            });
            lastDividerId = chosen.id;
            lastDividerImage = chosen.imageUrl;
          } else {
            // 3. Auto-generated Branded Company Separator Page
            seq.push({
              uid: `SEQ-DIV-AUTO-${compId}-${cIdx}`,
              type: 'divider',
              title: `قسم ومنتجات ${compName}`,
              imageUrl: '',
              companyId: compId,
              companyName: compName,
              companyLogoUrl: comp?.logoUrl,
              productsCount: compProducts.length,
              sourceKind: 'auto_branded',
            });
            lastDividerId = `AUTO-${compId}`;
            lastDividerImage = null;
          }
        }

        // Chunk ONLY this company's products into A4 pages (never mixing two companies on the same page)
        const compChunks = pdfService.chunkProducts(compProducts, productsPerPage);
        compChunks.forEach((chunk, pIdx) => {
          seq.push({
            uid: `SEQ-PRD-${compId}-${pIdx}`,
            type: 'products',
            companyId: compId,
            companyName: compName,
            products: chunk,
          });
        });
      });

      return seq;
    };
  }, [pdfProducts, companies, dividerLibrary, autoInsertCompanyDividers, mergeCompaniesOnPages, productsPerPage]);

  // Auto-sync catalogSequence whenever underlying selections change (unless locked by manual edit)
  useEffect(() => {
    if (!isManuallyEdited) {
      setCatalogSequence(buildStructuredSequence());
    }
  }, [buildStructuredSequence, isManuallyEdited]);

  const handleRebuildAutoSequence = () => {
    setIsManuallyEdited(false);
    setCatalogSequence(buildStructuredSequence());
    onShowToast('تم إعادة ترتيب الصفحات والفواصل تلقائياً بقاعدة عدم التكرار ✓', 'success');
  };

  // Manual Sequence Controls
  const handleMoveSequenceItem = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= catalogSequence.length) return;
    const updated = [...catalogSequence];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setCatalogSequence(updated);
    setIsManuallyEdited(true);
  };

  const handleRemoveSequenceDivider = (uid: string) => {
    setCatalogSequence((prev) => prev.filter((item) => item.uid !== uid));
    setIsManuallyEdited(true);
    onShowToast('تم حذف الفاصل من تسلسل الصفحات', 'success');
  };

  const handleSwapSequenceDividerAsset = (uid: string, assetId: string) => {
    const asset = dividerLibrary.find((d) => d.id === assetId);
    if (!asset) return;
    setCatalogSequence((prev) =>
      prev.map((item) =>
        item.uid === uid && item.type === 'divider'
          ? {
              ...item,
              imageUrl: asset.imageUrl,
              title: item.companyName ? `${asset.title} — ${item.companyName}` : asset.title,
              dividerAssetId: asset.id,
              sourceKind: 'manual',
            }
          : item
      )
    );
    setIsManuallyEdited(true);
  };

  const handleInsertManualDivider = (afterIndex: number, assetId?: string) => {
    const chosen =
      (assetId ? dividerLibrary.find((d) => d.id === assetId) : null) ||
      dividerLibrary[0];
    if (!chosen) {
      onShowToast('أضف صورة فاصل أولاً في مكتبة الفواصل لإدراجه يدوياً', 'error');
      return;
    }
    const newItem: CatalogSequenceItem = {
      uid: `SEQ-MANUAL-${Date.now()}`,
      type: 'divider',
      title: chosen.title,
      imageUrl: chosen.imageUrl,
      dividerAssetId: chosen.id,
      sourceKind: 'manual',
    };
    const updated = [...catalogSequence];
    updated.splice(afterIndex + 1, 0, newItem);
    setCatalogSequence(updated);
    setIsManuallyEdited(true);
    onShowToast('تم إدراج الفاصل يدوياً في الموضع المحدد', 'success');
  };

  // Add Divider to Persistent Library
  const handleAddDividerToLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDividerImage) {
      onShowToast('يرجى رفع أو اختيار صورة الفاصل', 'error');
      return;
    }

    setIsSavingDivider(true);
    try {
      let persistedUrl = newDividerImage;
      if (newDividerImage.startsWith('data:image/')) {
        persistedUrl = await aiCatalogService.uploadExtractedImage(newDividerImage, 'divider');
      }

      const comp = newDividerKind === 'company'
        ? companies.find((c) => c.id === newDividerCompanyId)
        : undefined;

      const newAsset: PdfDividerAsset = {
        id: 'DIV-' + Date.now(),
        title:
          newDividerTitle.trim() ||
          (newDividerKind === 'cover'
            ? 'غلاف رئيسي'
            : newDividerKind === 'company'
            ? `فاصل شركة ${comp?.name || ''}`
            : `فاصل عام رقم ${dividerLibrary.filter((d) => d.kind === 'generic').length + 1}`),
        imageUrl: persistedUrl,
        kind: newDividerKind,
        companyId: newDividerKind === 'company' ? newDividerCompanyId : undefined,
        createdAt: new Date().toISOString(),
      };

      const updatedLib = [...dividerLibrary, newAsset];
      setDividerLibrary(updatedLib);
      dbStorage.savePdfDividers(updatedLib);
      void firestoreSync.syncCollection('pdfDividers', updatedLib);

      setNewDividerTitle('');
      setNewDividerImage('');
      setShowDividerForm(false);
      setIsManuallyEdited(false); // Trigger smart auto-layout with the new divider!
      onShowToast('تم حفظ الفاصل في مكتبة الفواصل الدائمة بنجاح ✓', 'success');
    } finally {
      setIsSavingDivider(false);
    }
  };

  const handleDeleteDividerFromLibrary = (id: string) => {
    const updatedLib = dividerLibrary.filter((d) => d.id !== id);
    setDividerLibrary(updatedLib);
    dbStorage.savePdfDividers(updatedLib);
    void firestoreSync.syncCollection('pdfDividers', updatedLib);
    setIsManuallyEdited(false);
    onShowToast('تم حذف الفاصل من المكتبة', 'success');
  };

  // Select / Deselect Products
  const toggleProductSelect = (id: string) => {
    setIsManuallyEdited(false);
    if (selectedProductIds.includes(id)) {
      setSelectedProductIds(selectedProductIds.filter((pid) => pid !== id));
    } else {
      setSelectedProductIds([...selectedProductIds, id]);
    }
  };

  const handleSelectAllMatching = () => {
    setIsManuallyEdited(false);
    const matchingIds = matchingProducts.map((p) => p.id);
    const set = new Set([...selectedProductIds, ...matchingIds]);
    setSelectedProductIds(Array.from(set));
    onShowToast(`تم تحديد جميع المنتجات المطابقة (${matchingProducts.length} منتج)`, 'success');
  };

  const handleDeselectAllMatching = () => {
    setIsManuallyEdited(false);
    const matchingIds = new Set(matchingProducts.map((p) => p.id));
    setSelectedProductIds(selectedProductIds.filter((id) => !matchingIds.has(id)));
    onShowToast('تم إلغاء تحديد المنتجات المعروضة', 'success');
  };

  const handleDownloadPdf = async () => {
    if (!pageContainerRef.current) return;
    const pageNodes = Array.from(
      pageContainerRef.current.querySelectorAll('.pdf-a4-page')
    ) as HTMLElement[];

    if (pageNodes.length === 0) {
      onShowToast('لا توجد صفحات متاحة لتصدير الكتالوج', 'error');
      return;
    }

    setIsGeneratingPdf(true);
    setGenerationProgress(0);

    try {
      const clientSlug = customClientName.trim()
        ? customClientName.trim().replace(/\s+/g, '_')
        : 'مخصص';
      const fileName = `CROPSA_Catalog_${clientSlug}_${new Date().toISOString().slice(0, 10)}.pdf`;

      await pdfService.generatePdfFromPages(pageNodes, fileName, (pct) => {
        setGenerationProgress(pct);
      });

      onShowToast('تم إنشاء وتنزيل كتالوج PDF المخصص بنجاح!', 'success');
      setIsPreviewModalOpen(false);
    } catch (err: any) {
      onShowToast(err.message || 'حدث خطأ أثناء تصدير PDF.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleGenerateImages = async () => {
    if (!pageContainerRef.current) return;
    const pageNodes = Array.from(
      pageContainerRef.current.querySelectorAll('.pdf-a4-page')
    ) as HTMLElement[];

    if (pageNodes.length === 0) {
      onShowToast('لا توجد صفحات متاحة لتحويلها إلى صور', 'error');
      return;
    }

    setIsGeneratingImages(true);
    setGenerationProgress(0);
    try {
      const clientSlug = customClientName.trim()
        ? customClientName.trim().replace(/\s+/g, '_')
        : 'مخصص';
      const imgs = await pdfService.generateImagesFromPages(
        pageNodes,
        `CROPSA_${clientSlug}`,
        (pct) => setGenerationProgress(pct)
      );
      setGeneratedImages(imgs);
      setIsImagesModalOpen(true);
      onShowToast(`تم تجهيز ${imgs.length} صورة عالية الجودة جاهزة للتحميل والمشاركة ✓`, 'success');
    } catch (err: any) {
      onShowToast(err.message || 'حدث خطأ أثناء تجهيز الصور.', 'error');
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const handleDownloadAllImagesSequentially = async () => {
    for (let i = 0; i < generatedImages.length; i++) {
      const img = generatedImages[i];
      pdfService.downloadImageDataUrl(img.dataUrl, img.filename);
      await new Promise((r) => setTimeout(r, 260));
    }
    onShowToast(`تم تنزيل ${generatedImages.length} صورة إلى جهازك`, 'success');
  };

  const handleCreateShareLink = async () => {
    if (pdfProducts.length === 0) {
      onShowToast('اختر منتجاً واحداً على الأقل لإنشاء رابط الكتالوج', 'error');
      return;
    }

    setIsCreatingShareLink(true);
    setCopiedShareLink(false);
    try {
      const catalogId = `CAT-${Math.floor(100000 + Math.random() * 900000)}`;
      const selectedSet = new Set(pdfProducts.map((p) => p.id));
      const relatedCompanyIds = new Set(pdfProducts.map((p) => p.companyId));
      const relatedCategoryIds = new Set(pdfProducts.map((p) => p.categoryId));

      const catalogObj: SharedCustomCatalog = {
        id: catalogId,
        clientName: customClientName.trim(),
        createdByName: currentUser?.name,
        createdByUsername: currentUser?.username,
        createdAt: new Date().toISOString(),
        productIds: pdfProducts.map((p) => p.id),
        productsSnapshot: pdfProducts,
        packagesSnapshot: packages.filter((pkg) => selectedSet.has(pkg.productId) && pkg.active),
        companiesSnapshot: companies.filter((c) => relatedCompanyIds.has(c.id)),
        categoriesSnapshot: categories.filter((c) => relatedCategoryIds.has(c.id)),
        settingsSnapshot: {
          title: settings.title,
          subtitle: settings.subtitle,
          phone: settings.phone,
          whatsApp: settings.whatsApp,
          logoUrl: settings.logoUrl,
        },
        displayOptions: {
          showPrices,
          showCharacteristics,
          showComposition,
          showUsage,
          productsPerPage,
          mergeCompaniesOnPages,
        },
      };

      dbStorage.saveSharedCatalog(catalogObj);
      void firestoreSync.saveSharedCatalog(catalogObj);

      let finalUrl = `${window.location.origin}/?catalog=${encodeURIComponent(catalogId)}`;
      try {
        const res = await fetch('/api/custom-catalogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            catalog: catalogObj,
            origin: window.location.origin,
          }),
        });
        const data = await res.json();
        if (res.ok && data?.shareUrl) {
          finalUrl = data.shareUrl;
        }
      } catch {
        // Local cache fallback still allows same-browser opening cleanly
      }

      setShareLinkData({ url: finalUrl, catalog: catalogObj });
      onShowToast('تم إنشاء رابط الكتالوج المخصص بنجاح!', 'success');
    } finally {
      setIsCreatingShareLink(false);
    }
  };

  const handleCopyShareUrl = async () => {
    if (!shareLinkData) return;
    try {
      await navigator.clipboard.writeText(shareLinkData.url);
      setCopiedShareLink(true);
      onShowToast('تم نسخ رابط الكتالوج بنجاح ✓', 'success');
      setTimeout(() => setCopiedShareLink(false), 2500);
    } catch {
      onShowToast('يرجى تحديد الرابط ونسخه يدوياً', 'error');
    }
  };

  const handlePrint = () => {
    pdfService.printCatalog();
  };

  const productPagesCount = catalogSequence.filter((i) => i.type === 'products').length;

  // Shared A4 Page Renderer (used identically in Main View AND Fullscreen Preview Modal!)
  const renderCatalogPageNode = (item: CatalogSequenceItem, seqIndex: number, includePdfClass = true) => {
    const classBase = `${includePdfClass ? 'pdf-a4-page ' : ''}w-[794px] h-[1123px] border border-[#B7CCC0] shadow-2xl flex flex-col justify-between dir-rtl relative overflow-hidden shrink-0`;

    // 1. Divider / Cover Page
    if (item.type === 'divider') {
      if (item.imageUrl) {
        return (
          <div key={item.uid} className={`${classBase} bg-white p-0`} style={{ boxSizing: 'border-box' }}>
            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
          </div>
        );
      }

      // Auto-Generated Branded Company Divider Page (when no image uploaded for generic/company)
      return (
        <div
          key={item.uid}
          className={`${classBase} bg-gradient-to-br from-[#0A623B] via-[#074E2F] to-[#03321D] text-white p-12`}
          style={{ boxSizing: 'border-box' }}
        >
          <div className="flex items-center justify-between border-b border-white/20 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white text-[#0A623B] rounded-2xl flex items-center justify-center font-black text-2xl shadow-md">
                🌱
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight">كروپسا CROPSA</h2>
                <span className="text-xs text-emerald-200 font-bold">
                  {customClientName ? `كتالوج خاص: ${customClientName}` : settings.title}
                </span>
              </div>
            </div>
            <span className="bg-amber-400 text-stone-950 font-black text-xs px-4 py-1.5 rounded-full">
              فاصل قسم وشركة
            </span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-48 h-48 rounded-3xl bg-white p-4 shadow-2xl border-4 border-amber-400/80 flex items-center justify-center overflow-hidden">
              {item.companyLogoUrl ? (
                <img
                  src={item.companyLogoUrl}
                  alt={item.companyName}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Building2 className="w-24 h-24 text-[#0A623B]" />
              )}
            </div>

            <div className="space-y-2">
              <span className="text-sm font-black text-amber-300 uppercase tracking-widest block">
                منتجات وحلول شركة
              </span>
              <h1 className="text-4xl font-black text-white leading-tight">
                {item.companyName || item.title}
              </h1>
              {typeof item.productsCount === 'number' && (
                <p className="text-base text-emerald-100 font-bold pt-2">
                  يتضمن هذا القسم {item.productsCount} منتج ومركب زراعي معتمد
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-white/20 pt-5 flex items-center justify-between text-xs text-emerald-200 font-bold">
            <span>{settings.website || 'www.cropsaegypt.com'}</span>
            <span>تواصل معنا: {settings.phone}</span>
          </div>
        </div>
      );
    }

    // 2. Product Grid Page — Canva Botanical Brochure Design + Fixed Layout Geometry
    const pageProducts = item.products;
    const layout = PDF_PAGE_LAYOUTS[productsPerPage] || PDF_PAGE_LAYOUTS[4];

    const pageCompanyObj = companies.find((c) => c.id === item.companyId);
    const pageCategoryNames = Array.from(
      new Set(
        pageProducts
          .map((p) => categories.find((c) => c.id === p.categoryId)?.name)
          .filter(Boolean)
      )
    );
    const sectionHeaderLabel =
      customClientName.trim()
        ? `كتالوج: ${customClientName.trim()}`
        : pageCategoryNames[0] || 'الأسمدة والمخصبات';

    const qrSrc =
      settings.qrCodeUrl ||
      `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
        settings.website ? `https://${settings.website.replace(/^https?:\/\//, '')}` : 'https://cropsaegypt.com'
      )}`;

    // Calculate product page number
    const productPageNumber =
      catalogSequence.slice(0, seqIndex + 1).filter((s) => s.type === 'products').length;

    return (
      <div
        key={item.uid}
        className={`${classBase} bg-gradient-to-br from-[#F7FAF8] via-[#EDF4F0] to-[#E5EFE9] px-4 py-3.5`}
        style={{ boxSizing: 'border-box' }}
      >
        {/* Top Forest-Green Canva Header Pill */}
        <div className="bg-[#0A623B] text-white px-5 py-2.5 rounded-2xl flex items-center justify-between gap-3 shrink-0 shadow-sm mb-3">
          {/* Right (RTL): Company Brand + Divider + Full Section Name */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex items-center gap-2 shrink-0">
              {pageCompanyObj?.logoUrl ? (
                <div className="w-8 h-8 bg-white rounded-xl p-1 flex items-center justify-center shrink-0">
                  <img
                    src={pageCompanyObj.logoUrl}
                    alt={item.companyName}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <Building2 className="w-5 h-5 text-amber-300 shrink-0" />
              )}
              <span className="text-[15px] font-black tracking-tight max-w-[215px] leading-tight">
                {item.companyName}
              </span>
            </div>

            <span className="w-px h-7 bg-white/40 shrink-0" />

            <span
              className={`${
                sectionHeaderLabel.length > 26
                  ? 'text-[12.5px]'
                  : sectionHeaderLabel.length > 16
                    ? 'text-[13.5px]'
                    : 'text-[15px]'
              } font-black text-emerald-50 leading-tight whitespace-normal flex-1`}
            >
              {sectionHeaderLabel}
            </span>
          </div>

          {/* Left (RTL): CROPSA Logo Emblem */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-left">
              <div className="text-base font-black leading-none tracking-tight">كروپسا</div>
              <div className="text-[10px] font-bold text-emerald-200 tracking-widest uppercase leading-none mt-0.5">
                CROPSA
              </div>
            </div>
            <div className="w-8 h-8 bg-white text-[#0A623B] font-black rounded-xl flex items-center justify-center text-base shadow-xs">
              🌱
            </div>
          </div>
        </div>

        {/* Fixed Equal-Cell Framed Editorial Grid (Zero empty middle holes!) */}
        <div
          className={`flex-1 min-h-0 grid ${layout.gapClass}`}
          style={{
            gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
          }}
        >
          {pageProducts.map((product) => {
            const comp = companies.find((c) => c.id === product.companyId);
            const prodPackages = packages.filter((p) => p.productId === product.id && p.active);
            const rawImg = product.mainImageUrl || '';
            const safeImgSrc =
              !rawImg || rawImg.includes('photo-1592417817098-8f3d6ef23a81')
                ? FALLBACK_BOTTLE_SVG_DATA_URL
                : rawImg;
            const isStockScene =
              safeImgSrc.includes('unsplash.com') || safeImgSrc.includes('pexels.com');
            const maxPackagesShown = layout.count >= 8 ? 2 : 3;
            const visiblePackages = prodPackages.slice(0, maxPackagesShown);
            const metrics = getAdaptiveCardMetrics(product, layout, {
              showCharacteristics,
              showComposition,
              showUsage,
              visiblePackageCount: visiblePackages.length,
            });
            const cardAlignClass = metrics.hasSpecs ? 'justify-start' : 'justify-center';

            if (layout.orientation === 'vertical') {
              return (
                <div
                  key={product.id}
                  className={`${layout.cardPaddingClass} bg-white/95 border-[1.5px] border-[#8FB39D] rounded-2xl shadow-xs flex flex-col ${cardAlignClass} h-full min-h-0 overflow-hidden text-right`}
                >
                  <div className="flex flex-col items-center text-center space-y-1.5 shrink-0">
                    <div
                      className={`${metrics.imageBoxClass} bg-[#F3F2EC] border border-[#82A18E] rounded-2xl ${isStockScene ? 'p-0' : 'p-1.5'} flex items-center justify-center overflow-hidden shadow-sm`}
                    >
                      <img
                        src={safeImgSrc}
                        alt={product.name}
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_BOTTLE_SVG_DATA_URL;
                        }}
                        className={`w-full h-full ${isStockScene ? 'object-cover' : 'object-contain'} rounded-xl`}
                      />
                    </div>

                    <h3 className={`font-black text-[#0A623B] leading-tight line-clamp-2 ${metrics.titleClass}`}>
                      {renderBidiTitle(product.name)}
                    </h3>

                    {showPrices && visiblePackages.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1">
                        {visiblePackages.map((pkg) => (
                          <span
                            key={pkg.id}
                            className={`bg-[#CF3B2B] text-white font-black ${metrics.pkgBadgeClass} rounded-md shadow-2xs inline-block`}
                          >
                            {pkg.displayName}{pkg.price ? ` / ${pkg.price} ج` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {renderProductSpecsBlock(product, metrics, {
                    showCharacteristics,
                    showComposition,
                    showUsage,
                  })}
                </div>
              );
            }

            // Horizontal Canva Brochure Card: Title + Red Prices RIGHT | Tall Rounded Cream Bottle Frame LEFT | Responsive Specs Filling Card
            return (
              <div
                key={product.id}
                className={`${layout.cardPaddingClass} bg-white/95 border-[1.5px] border-[#8FB39D] rounded-2xl shadow-xs flex flex-col ${cardAlignClass} h-full min-h-0 overflow-hidden`}
              >
                {/* Top Row: Title & Prices (Right in RTL) + Tall Rounded Bottle Box (Left in RTL) */}
                <div className="flex items-start justify-between gap-2.5 shrink-0">
                  <div className="flex-1 min-w-0 text-right pt-0.5 space-y-1.5">
                    <div>
                      <h3 className={`font-black text-[#0A623B] leading-tight line-clamp-2 ${metrics.titleClass}`}>
                        {renderBidiTitle(product.name)}
                      </h3>
                      {mergeCompaniesOnPages && (
                        <span className={`${layout.companyBadgeClass} font-bold text-stone-600 block mt-0.5 truncate`}>
                          شركة: {comp?.name || item.companyName}
                        </span>
                      )}
                    </div>

                    {showPrices && visiblePackages.length > 0 && (
                      <div className="space-y-1 pt-0.5">
                        {layout.count <= 6 && (
                          <span className="text-[11.5px] font-extrabold text-[#0A623B] block">
                            الأسعار وأحجام العبوات :
                          </span>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {visiblePackages.map((pkg) => (
                            <span
                              key={pkg.id}
                              className={`bg-[#CF3B2B] text-white font-black ${metrics.pkgBadgeClass} rounded-md shadow-2xs inline-flex items-center justify-center`}
                            >
                              {pkg.displayName}{pkg.price ? ` / ${pkg.price} ج` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Upright Portrait Cream Photo Frame */}
                  <div
                    className={`${metrics.imageBoxClass} bg-[#F3F2EC] border-[1.5px] border-[#82A18E] rounded-2xl ${isStockScene ? 'p-0' : 'p-1.5'} flex items-center justify-center shrink-0 overflow-hidden shadow-sm`}
                  >
                    <img
                      src={safeImgSrc}
                      alt={product.name}
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_BOTTLE_SVG_DATA_URL;
                      }}
                      className={`w-full h-full ${isStockScene ? 'object-cover' : 'object-contain'} rounded-xl`}
                    />
                  </div>
                </div>

                {/* Responsive Specs & Composition Flowing Naturally to Fill the Framed Card */}
                {renderProductSpecsBlock(product, metrics, {
                  showCharacteristics,
                  showComposition,
                  showUsage,
                })}
              </div>
            );
          })}
        </div>

        {/* Bottom Forest-Green Canva Footer Pill with QR Code */}
        <div className="bg-[#0A623B] text-white px-5 py-2.5 rounded-2xl flex items-center justify-between gap-3 shrink-0 mt-3 shadow-sm">
          {/* Right (RTL): QR Code + Page Badge */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-10 h-10 bg-white rounded-lg p-0.5 flex items-center justify-center overflow-hidden shadow-xs">
              <img src={qrSrc} alt="QR" className="w-full h-full object-contain" />
            </div>
            <div className="bg-white/15 border border-white/25 px-2.5 py-1 rounded-lg text-[10px] font-mono font-black text-emerald-50">
              {productPageNumber} / {productPagesCount}
            </div>
          </div>

          {/* Center: Promo Message + Website */}
          <div className="text-center flex-1 min-w-0">
            <div className="text-[11px] font-extrabold text-emerald-100 leading-tight truncate">
              عروض حصرية هتلاقيها على الابليكشن أو الويب سايت
            </div>
            <div className="text-xs font-black text-white tracking-wide mt-0.5 font-mono" dir="ltr">
              {settings.website || 'www.cropsaegypt.com'}
            </div>
          </div>

          {/* Left (RTL): Phone / Website */}
          <div className="text-left shrink-0 text-[11px] font-bold text-emerald-100">
            <span className="block text-[9.5px] text-emerald-200">للطلب والاستفسار</span>
            <span className="font-mono font-black text-white" dir="ltr">
              {settings.phone || '01000000000'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5 dir-rtl">
      {/* Top Simple Guided Header + Instant Export Actions */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            {onBackToCatalog && (
              <button
                type="button"
                onClick={onBackToCatalog}
                className="h-10 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <ArrowRight className="w-4 h-4" />
                <span>الكتالوج</span>
              </button>
            )}
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#046A47] flex items-center gap-2">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-[#046A47]" />
                <span>تجهيز وإرسال كتالوج مخصص للعميل</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-stone-500 font-medium mt-0.5">
                اختر المنتجات في خطوة واحدة، ثم ابعتها للعميل كـ <strong>رابط مباشر</strong> أو <strong>صور واتساب</strong> أو <strong>ملف PDF</strong>
              </p>
            </div>
          </div>

          {/* Client Name Field */}
          <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-2xl px-3 py-2 shrink-0">
            <UserCheck className="w-4 h-4 text-[#046A47] shrink-0" />
            <input
              type="text"
              value={customClientName}
              onChange={(e) => setCustomClientName(e.target.value)}
              placeholder="اكتب اسم العميل (اختياري)..."
              className="bg-transparent text-xs font-black text-stone-900 w-44 sm:w-52 focus:outline-none"
            />
          </div>
        </div>

        {/* Always-Ready Multi-Format Export Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-stone-100">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-black">
            <span className="bg-emerald-50 text-[#046A47] border border-emerald-200 px-3 py-1 rounded-full">
              {pdfProducts.length} منتج مختار
            </span>
            <span className="bg-stone-100 text-stone-700 px-3 py-1 rounded-full">
              {catalogSequence.length} صفحة ({productsPerPage} / صفحة)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Share Link */}
            <button
              type="button"
              onClick={handleCreateShareLink}
              disabled={isCreatingShareLink || pdfProducts.length === 0}
              className="h-10 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-stone-950 font-black text-xs px-4 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Link2 className="w-4 h-4" />
              <span>{isCreatingShareLink ? 'جاري إنشاء الرابط...' : 'رابط مباشر للعميل'}</span>
            </button>

            {/* 2. Export Images */}
            <button
              type="button"
              onClick={handleGenerateImages}
              disabled={isGeneratingImages || isGeneratingPdf || catalogSequence.length === 0}
              className="h-10 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-black text-xs px-4 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Images className="w-4 h-4" />
              <span>
                {isGeneratingImages ? `جاري التحويل (${generationProgress}%)` : 'تنزيل كصور'}
              </span>
            </button>

            {/* 3. Export PDF */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || isGeneratingImages || catalogSequence.length === 0}
              className="h-10 bg-[#046A47] hover:bg-[#035237] disabled:opacity-50 text-white font-black text-xs px-4 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>
                {isGeneratingPdf ? `جاري التصدير (${generationProgress}%)` : 'تنزيل PDF'}
              </span>
            </button>

            {/* Quick Zoom Modal & Print */}
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              className="h-10 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs px-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              title="معاينة الصفحات مكبرة"
            >
              <Eye className="w-4 h-4 text-[#046A47]" />
              <span className="hidden sm:inline">معاينة</span>
            </button>
          </div>
        </div>

        {/* Clean 3-Step Switcher Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-stone-100 p-1.5 rounded-2xl">
          {[
            { id: 'products' as const, num: '١', label: 'اختيار المنتجات', sub: `${pdfProducts.length} منتج` },
            { id: 'layout' as const, num: '٢', label: 'الشكل والمحتوى', sub: `${productsPerPage} / صفحة` },
            { id: 'preview' as const, num: '٣', label: 'المعاينة والتصدير', sub: `${catalogSequence.length} صفحة` },
          ].map((tab) => {
            const isActive = activeStep === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveStep(tab.id)}
                className={`py-2 px-2 sm:px-3 rounded-xl text-right transition-all cursor-pointer flex items-center justify-center sm:justify-between gap-2 ${
                  isActive
                    ? 'bg-white text-[#046A47] shadow-xs font-black ring-1 ring-emerald-500/20'
                    : 'text-stone-600 hover:text-stone-900 font-bold'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-5 h-5 rounded-full text-[11px] font-black flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-[#046A47] text-white' : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {tab.num}
                  </span>
                  <span className="text-[11px] sm:text-xs truncate">{tab.label}</span>
                </div>
                <span className="hidden md:inline text-[10px] font-mono text-stone-400">
                  {tab.sub}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 1 CONTAINER: Filters + Products Selection */}
      {activeStep === 'products' && (
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-[#046A47]" />
            <span>حدّد الشركات أو الأقسام أو ابحث بالاسم:</span>
          </h3>
          <button
            type="button"
            onClick={() => setActiveStep('layout')}
            className="text-xs font-black text-[#046A47] bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
          >
            التالي: الشكل والعدد ←
          </button>
        </div>

        {/* Multi-Select Companies Pills */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-stone-800 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#046A47]" />
              <span>الشركات المصنعة (يمكنك اختيار أكثر من شركة معاً):</span>
            </label>
            {selectedCompanyIds.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setIsManuallyEdited(false);
                  setSelectedCompanyIds([]);
                }}
                className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
              >
                عرض كل الشركات
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {companies.map((comp) => {
              const isSelected = selectedCompanyIds.includes(comp.id);
              const hasCustomDivider = dividerLibrary.some(
                (d) => d.kind === 'company' && d.companyId === comp.id
              );
              return (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => {
                    setIsManuallyEdited(false);
                    toggleSelection(comp.id, selectedCompanyIds, setSelectedCompanyIds);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#046A47] text-white border-[#046A47] shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-emerald-50'
                  }`}
                >
                  <span>{comp.name}</span>
                  {hasCustomDivider && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-amber-400 text-stone-950' : 'bg-emerald-100 text-emerald-800'
                      }`}
                      title="هذه الشركة لها فاصل مخصص تلقائي"
                    >
                      فاصل جاهز ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Multi-Select Categories Pills */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-stone-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>الأقسام الرئيسية (يمكنك اختيار أكثر من قسم):</span>
            </label>
            {selectedCategoryIds.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setIsManuallyEdited(false);
                  setSelectedCategoryIds([]);
                }}
                className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
              >
                عرض كل الأقسام
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const isSelected = selectedCategoryIds.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setIsManuallyEdited(false);
                    toggleSelection(cat.id, selectedCategoryIds, setSelectedCategoryIds);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-xs font-black'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-amber-50'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Multi-Select Product Types & Per Page Layout Controls */}
        <div className="space-y-3 pt-2 border-t border-stone-100">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-stone-700 block">
              تصفية بالنوع الدقيق (اختر أكثر من نوع):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'fertilizer', label: 'أسمدة بودرة NPK' },
                { id: 'stimulant', label: 'مخصبات سائلة' },
                { id: 'weed_pesticide', label: 'مبيدات حشائش' },
                { id: 'fungal_pesticide', label: 'مبيدات فطرية' },
                { id: 'insect_pesticide', label: 'مبيدات حشرية' },
              ].map((t) => {
                const isSelected = selectedProductTypes.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setIsManuallyEdited(false);
                      toggleSelection(t.id, selectedProductTypes, setSelectedProductTypes);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Search & Product Selection Checkboxes */}
        <div className="bg-stone-50/70 rounded-2xl border border-stone-200 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن منتج محدد سأل عنه العميل..."
                  className="w-full bg-white border border-stone-200 rounded-xl pr-9 pl-3 py-2 text-xs font-bold focus:outline-none focus:border-[#046A47]"
                />
              </div>
              <span className="bg-emerald-100 text-[#046A47] text-[11px] font-black px-2.5 py-1 rounded-full shrink-0">
                {pdfProducts.length} / {matchingProducts.length} محدد
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={handleSelectAllMatching}
                className="font-black text-[#046A47] hover:underline cursor-pointer"
              >
                تحديد كل المطابق
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={handleDeselectAllMatching}
                className="font-bold text-stone-500 hover:text-rose-600 cursor-pointer"
              >
                إلغاء التحديد
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
            {matchingProducts.map((p) => {
              const isChecked = selectedProductIds.includes(p.id);
              const comp = companies.find((c) => c.id === p.companyId);
              const firstPkg = packages.find((pkg) => pkg.productId === p.id);

              return (
                <label
                  key={p.id}
                  className={`p-2 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-emerald-50/80 border-[#046A47] shadow-2xs'
                      : 'bg-white border-stone-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleProductSelect(p.id)}
                    className="rounded text-[#046A47] focus:ring-[#046A47] w-4 h-4 shrink-0"
                  />
                  <div className="w-9 h-9 rounded-lg bg-white border border-stone-200 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={p.mainImageUrl || 'https://images.unsplash.com/photo-1628102491629-778571d893a3?w=100&auto=format&fit=crop&q=80'}
                      alt={p.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-xs text-stone-900 truncate">{p.name}</div>
                    <div className="text-[10px] text-stone-500 truncate">
                      {comp?.name} {firstPkg ? `• ${firstPkg.price} ج` : ''}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-bold text-stone-500">
            تم تحديد {pdfProducts.length} منتج وجاهز للتصدير فوراً من الأزرار أعلى الشاشة
          </span>
          <button
            type="button"
            onClick={() => setActiveStep('layout')}
            className="bg-[#046A47] hover:bg-[#035237] text-white text-xs font-black px-5 py-2.5 rounded-xl cursor-pointer shadow-xs"
          >
            التالي: الشكل والعدد ←
          </button>
        </div>
      </div>
      )}

      {/* STEP 2 CONTAINER: Layout Grid + Display Toggles + Collapsible Advanced Dividers */}
      {activeStep === 'layout' && (
      <div className="space-y-4">
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-[#046A47]" />
              <span>عدد المنتجات في الصفحة وما يظهر للعميل:</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveStep('products')}
                className="text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl cursor-pointer"
              >
                → رجوع للمنتجات
              </button>
              <button
                type="button"
                onClick={() => setActiveStep('preview')}
                className="text-xs font-black text-white bg-[#046A47] hover:bg-[#035237] px-3.5 py-1.5 rounded-xl cursor-pointer"
              >
                معاينة الكتالوج ←
              </button>
            </div>
          </div>

          {/* Preset Layout Buttons (1, 2, 3, 4, 6, 8, 9) + Company Merge Option */}
          <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-black text-stone-900 block">
                  عدد المنتجات في الصفحة A4 ({PDF_PAGE_LAYOUTS[productsPerPage]?.label}):
                </span>
                <span className="text-[10px] text-stone-500 font-medium">
                  حجم الكروت ثابت ومتناسق في كل الصفحات حتى في آخر صفحة من الشركة
                </span>
              </div>

              <label
                className={`flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-xl border cursor-pointer transition-all ${
                  mergeCompaniesOnPages
                    ? 'bg-amber-50 text-amber-950 border-amber-400'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-emerald-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={mergeCompaniesOnPages}
                  onChange={(e) => {
                    setIsManuallyEdited(false);
                    setMergeCompaniesOnPages(e.target.checked);
                  }}
                  className="rounded text-[#046A47] accent-[#046A47]"
                />
                <span>دمج الشركات لملء العدد الكامل في الصفحة</span>
              </label>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {ALLOWED_PER_PAGE_COUNTS.map((count) => {
                const spec = PDF_PAGE_LAYOUTS[count];
                const isSelected = productsPerPage === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => {
                      setIsManuallyEdited(false);
                      setProductsPerPage(count);
                    }}
                    className={`p-2 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                      isSelected
                        ? 'bg-[#046A47] text-white border-[#046A47] shadow-sm'
                        : 'bg-white text-stone-800 border-stone-200 hover:border-emerald-400'
                    }`}
                  >
                    <span className="text-sm font-black leading-none">{count}</span>
                    <span
                      className={`text-[9px] font-bold ${
                        isSelected ? 'text-emerald-100' : 'text-stone-400'
                      }`}
                    >
                      شبكة {spec.gridLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Display Toggles */}
          <div className="flex flex-wrap gap-3 text-xs font-bold text-stone-700">
            <label className="flex items-center gap-2 bg-stone-50 border border-stone-200 px-3 py-2 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={showPrices}
                onChange={(e) => setShowPrices(e.target.checked)}
                className="rounded text-[#046A47]"
              />
              <span>إظهار الأسعار والعبوات</span>
            </label>
            <label className="flex items-center gap-2 bg-stone-50 border border-stone-200 px-3 py-2 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={showCharacteristics}
                onChange={(e) => setShowCharacteristics(e.target.checked)}
                className="rounded text-[#046A47]"
              />
              <span>إظهار الخصائص</span>
            </label>
            <label className="flex items-center gap-2 bg-stone-50 border border-stone-200 px-3 py-2 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={showComposition}
                onChange={(e) => setShowComposition(e.target.checked)}
                className="rounded text-[#046A47]"
              />
              <span>إظهار التركيب الكيميائي</span>
            </label>
            <label className="flex items-center gap-2 bg-stone-50 border border-stone-200 px-3 py-2 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={showUsage}
                onChange={(e) => setShowUsage(e.target.checked)}
                className="rounded text-[#046A47]"
              />
              <span>إظهار طرق الاستخدام</span>
            </label>
          </div>
        </div>

        {/* Collapsible Advanced Options Toggle (Dividers & Manual Page Reordering) */}
        <button
          type="button"
          onClick={() => setShowAdvancedDividers(!showAdvancedDividers)}
          className="w-full bg-white hover:bg-stone-50 border border-stone-200 rounded-2xl px-5 py-3.5 flex items-center justify-between text-xs font-black text-stone-800 cursor-pointer transition-colors shadow-2xs"
        >
          <span className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#046A47]" />
            <span>خيارات متقدمة: إدارة الفواصل بين الشركات وترتيب الصفحات يدوياً</span>
            <span className="text-[10px] font-bold bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
              {dividerLibrary.length} فاصل محفوظ
            </span>
          </span>
          {showAdvancedDividers ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

      {showAdvancedDividers && (
      <div className="space-y-4">
      {/* Step 2: Smart Dividers Library (Generic Rotating + Company-Specific + Cover) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div>
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#046A47]" />
              <span>2. مكتبة الفواصل والتنويع الذكي بين الشركات</span>
            </h3>
            <p className="text-[11px] text-stone-500 font-medium mt-0.5">
              أضف عدة فواصل عامة (ينوع بينها النظام تلقائياً بدون تكرار فاصلين ورا بعض) أو فواصل خاصة بشركات محددة توضع تلقائياً أمامها
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border ${
                mergeCompaniesOnPages
                  ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                  : 'text-[#046A47] bg-emerald-50 border-emerald-200 cursor-pointer'
              }`}
              title={
                mergeCompaniesOnPages
                  ? 'موقف مؤقتاً لأن خيار دمج الشركات لملء الصفحة مفعّل'
                  : 'إدراج فاصل تلقائي قبل منتجات كل شركة'
              }
            >
              <input
                type="checkbox"
                disabled={mergeCompaniesOnPages}
                checked={autoInsertCompanyDividers && !mergeCompaniesOnPages}
                onChange={(e) => {
                  setAutoInsertCompanyDividers(e.target.checked);
                  setIsManuallyEdited(false);
                }}
                className="rounded text-[#046A47]"
              />
              <span>
                {mergeCompaniesOnPages
                  ? 'الفواصل الوسطية موقوفة (وضع دمج الشركات)'
                  : 'فاصل تلقائي بين كل شركة والأخرى'}
              </span>
            </label>

            <button
              type="button"
              onClick={() => setShowDividerForm(!showDividerForm)}
              className="bg-[#046A47] hover:bg-[#035237] text-white font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة فاصل جديد</span>
            </button>
          </div>
        </div>

        {/* Add Divider Form */}
        {showDividerForm && (
          <form
            onSubmit={handleAddDividerToLibrary}
            className="p-4 bg-emerald-50/40 border border-emerald-200 rounded-2xl space-y-4"
          >
            <h4 className="text-xs font-black text-[#046A47]">
              إضافة فاصل جديد إلى مكتبة الفواصل الدائمة:
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-800 block mb-1">نوع الفاصل:</label>
                <select
                  value={newDividerKind}
                  onChange={(e) => setNewDividerKind(e.target.value as any)}
                  className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-xs font-bold"
                >
                  <option value="generic">فاصل عام (يتنوع تلقائياً بين الشركات)</option>
                  <option value="company">فاصل خاص بشركة محددة (يوضع أمامها تلقائياً)</option>
                  <option value="cover">غلاف رئيسي لأول الكتالوج</option>
                </select>
              </div>

              {newDividerKind === 'company' && (
                <div>
                  <label className="text-xs font-bold text-stone-800 block mb-1">
                    الشركة المخصصة لهذا الفاصل:
                  </label>
                  <select
                    value={newDividerCompanyId}
                    onChange={(e) => setNewDividerCompanyId(e.target.value)}
                    className="w-full p-2.5 bg-white border border-emerald-400 rounded-xl text-xs font-bold text-[#046A47]"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-stone-800 block mb-1">
                  اسم/عنوان الفاصل (اختياري):
                </label>
                <input
                  type="text"
                  value={newDividerTitle}
                  onChange={(e) => setNewDividerTitle(e.target.value)}
                  placeholder="مثال: فاصل تصميم 1 أو غلاف كيما"
                  className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            <ImageFileInput
              value={newDividerImage}
              onChange={setNewDividerImage}
              label="صورة الفاصل (مقاس A4 طولي — رفع ملف أو وضع رابط):"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDividerForm(false)}
                className="px-4 py-2 bg-stone-200 rounded-xl text-xs font-bold text-stone-800 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSavingDivider}
                className="px-5 py-2 bg-[#046A47] hover:bg-[#035237] text-white rounded-xl text-xs font-black cursor-pointer shadow-xs"
              >
                {isSavingDivider ? 'جاري الحفظ...' : 'حفظ الفاصل في المكتبة'}
              </button>
            </div>
          </form>
        )}

        {/* Saved Dividers Gallery */}
        {dividerLibrary.length === 0 ? (
          <div className="p-4 rounded-2xl bg-stone-50 border border-dashed border-stone-300 text-center text-xs text-stone-500 font-medium">
            لم تضف صور فواصل بعد — عند عدم إضافة صور فواصل، يقوم النظام تلقائياً بإنشاء صفحة فاصل أنيقة تحمل شعار واسم كل شركة قبل منتجاتها!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {dividerLibrary.map((div) => {
              const linkedComp = div.companyId
                ? companies.find((c) => c.id === div.companyId)
                : null;
              return (
                <div
                  key={div.id}
                  className="group relative rounded-2xl border border-stone-200 bg-stone-50 overflow-hidden flex flex-col"
                >
                  <div className="aspect-[3/4] bg-white overflow-hidden relative">
                    <img
                      src={div.imageUrl}
                      alt={div.title}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteDividerFromLibrary(div.id)}
                      className="absolute top-1.5 left-1.5 p-1.5 bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                      title="حذف من المكتبة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="p-2 text-right space-y-0.5">
                    <span className="text-[11px] font-black text-stone-900 line-clamp-1 block">
                      {div.title}
                    </span>
                    <span
                      className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded ${
                        div.kind === 'company'
                          ? 'bg-emerald-100 text-[#046A47]'
                          : div.kind === 'cover'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-sky-100 text-sky-900'
                      }`}
                    >
                      {div.kind === 'company'
                        ? `شركة: ${linkedComp?.name || ''}`
                        : div.kind === 'cover'
                        ? 'غلاف رئيسي'
                        : 'عام (تنويع تلقائي)'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Step 3: Editable Page Sequence List (Manual Reorder, Swap Divider, Insert/Delete) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-100">
          <div>
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>3. ترتيب صفحات الكتالوج ({catalogSequence.length} صفحة) — يمكنك التعديل يدوياً</span>
            </h3>
            <p className="text-[11px] text-stone-500 font-medium">
              النظام مرتب الصفحات بحيث يفصل بين كل شركة والأخرى ولا يكرر نفس الفاصل مرتين وراء بعض، ويمكنك تحريك أو تغيير أي فاصل يدوياً
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isManuallyEdited && (
              <span className="text-[10px] font-black bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full">
                تعديل يدوي نشط
              </span>
            )}
            <button
              type="button"
              onClick={handleRebuildAutoSequence}
              className="bg-stone-100 hover:bg-stone-200 text-stone-800 font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#046A47]" />
              <span>إعادة الترتيب التلقائي الذكي</span>
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {catalogSequence.map((item, idx) => (
            <div
              key={item.uid}
              className={`p-2.5 rounded-2xl border flex flex-wrap items-center justify-between gap-2 ${
                item.type === 'divider'
                  ? 'bg-emerald-50/60 border-emerald-200'
                  : 'bg-stone-50 border-stone-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-white border border-stone-200 font-mono text-xs font-black flex items-center justify-center text-stone-800 shrink-0">
                  {idx + 1}
                </span>

                {item.type === 'divider' ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-10 rounded-md bg-white border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-4 h-4 text-[#046A47]" />
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-black text-[#046A47] block">
                        فاصل: {item.title}
                      </span>
                      <span className="text-[10px] text-stone-500 font-bold">
                        {item.sourceKind === 'company_custom'
                          ? 'فاصل مخصص للشركة تلقائياً'
                          : item.sourceKind === 'generic_rotating'
                          ? 'فاصل منوع تلقائياً'
                          : item.sourceKind === 'cover'
                          ? 'غلاف البداية'
                          : item.sourceKind === 'manual'
                          ? 'مُضاف يدوياً'
                          : 'فاصل شركة تلقائي بالشعار'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-black text-stone-900 block">
                      صفحة منتجات شركة: {item.companyName} ({item.products.length} أصناف)
                    </span>
                    <span className="text-[10px] text-stone-500 font-medium line-clamp-1">
                      {item.products.map((p) => p.name).join(' • ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Manual Actions for this page/divider */}
              <div className="flex items-center gap-1.5">
                {item.type === 'divider' && dividerLibrary.length > 0 && (
                  <select
                    value={item.dividerAssetId || ''}
                    onChange={(e) => handleSwapSequenceDividerAsset(item.uid, e.target.value)}
                    className="bg-white border border-stone-300 rounded-lg px-2 py-1 text-[11px] font-bold text-stone-800"
                    title="تغيير صورة الفاصل يدوياً"
                  >
                    <option value="" disabled>
                      تبديل صورة الفاصل...
                    </option>
                    {dividerLibrary.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                )}

                {dividerLibrary.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleInsertManualDivider(idx)}
                    className="px-2 py-1 bg-white hover:bg-emerald-50 border border-stone-200 rounded-lg text-[10px] font-bold text-[#046A47] cursor-pointer"
                    title="إدراج فاصل بعد هذه الصفحة"
                  >
                    + فاصل بعده
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleMoveSequenceItem(idx, 'up')}
                  disabled={idx === 0}
                  className="p-1.5 bg-white hover:bg-stone-200 border border-stone-200 rounded-lg disabled:opacity-30 cursor-pointer"
                  title="تحريك لأعلى"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveSequenceItem(idx, 'down')}
                  disabled={idx === catalogSequence.length - 1}
                  className="p-1.5 bg-white hover:bg-stone-200 border border-stone-200 rounded-lg disabled:opacity-30 cursor-pointer"
                  title="تحريك لأسفل"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>

                {item.type === 'divider' && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSequenceDivider(item.uid)}
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg cursor-pointer"
                    title="حذف الفاصل"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
      )}
      </div>
      )}

      {/* STEP 3 CONTAINER: Scaled Live Visual Preview */}
      {activeStep === 'preview' && (
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <div>
              <h3 className="text-sm font-black text-stone-900">
                معاينة صفحات الكتالوج ({catalogSequence.length} صفحة • {pdfProducts.length} منتج)
              </h3>
              <p className="text-[11px] text-stone-500 font-medium">
                يمكنك مشاركته الآن كرابط للعميل أو تنزيله كصور للواتساب أو ملف PDF للطباعة
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveStep('layout')}
                className="text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 px-3 py-2 rounded-xl cursor-pointer"
              >
                → تعديل الشكل
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="text-xs font-bold text-stone-800 bg-stone-100 hover:bg-stone-200 px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#046A47]" />
                <span>طباعة</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(true)}
                className="text-xs font-black text-[#046A47] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
                <span>تكبير ملء الشاشة</span>
              </button>
            </div>
          </div>

          {catalogSequence.length === 0 ? (
            <div className="py-16 text-center space-y-2 text-stone-500">
              <p className="text-sm font-black">لا توجد منتجات محددة حالياً</p>
              <button
                type="button"
                onClick={() => setActiveStep('products')}
                className="text-xs font-black text-[#046A47] underline cursor-pointer"
              >
                ارجع للخطوة ١ واختر المنتجات
              </button>
            </div>
          ) : (
            <div className="bg-stone-100/80 rounded-2xl p-4 sm:p-6 overflow-x-auto flex flex-col items-center gap-6">
              {catalogSequence.map((item, idx) => (
                <div
                  key={item.uid}
                  className="origin-top transform scale-[0.42] sm:scale-[0.65] lg:scale-[0.82] -mb-[630px] sm:-mb-[375px] lg:-mb-[185px]"
                >
                  {renderCatalogPageNode(item, idx, false)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Always-mounted Unscaled Off-screen A4 Capture Container (Zero CSS transform distortion!) */}
      <div
        ref={pageContainerRef}
        aria-hidden="true"
        className="fixed left-[-99999px] top-0 pointer-events-none space-y-4 print:static print:left-0"
      >
        {catalogSequence.map((item, idx) => renderCatalogPageNode(item, idx, true))}
      </div>

      {/* Share Link Ready Modal */}
      {shareLinkData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs dir-rtl">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-[#046A47] to-[#024A31] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-white/15 rounded-2xl flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-black">رابط الكتالوج جاهز للإرسال!</h3>
                  <p className="text-[11px] text-emerald-100 font-medium">
                    {shareLinkData.catalog.clientName
                      ? `مخصص لـ: ${shareLinkData.catalog.clientName}`
                      : `يتضمن ${shareLinkData.catalog.productsSnapshot.length} منتج مختار`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShareLinkData(null)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 space-y-2">
                <span className="text-[11px] font-black text-stone-500 block">
                  رابط العميل المباشر (يعمل من أي موبايل):
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareLinkData.url}
                    onFocus={(e) => e.target.select()}
                    className="flex-1 bg-white border border-stone-300 rounded-xl px-2.5 py-2 text-xs font-mono text-stone-800"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={handleCopyShareUrl}
                    className="h-9 px-3 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {copiedShareLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedShareLink ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `أهلاً بك${
                      shareLinkData.catalog.clientName ? ` يا ${shareLinkData.catalog.clientName}` : ''
                    } 🌱\nجهزنا لك كتالوج خاص بالمنتجات والأسعار المطلوبة من كروپسا (${shareLinkData.catalog.productsSnapshot.length} منتج):\n${shareLinkData.url}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-11 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm"
                >
                  <MessageCircle className="w-4 h-4 fill-white/20" />
                  <span>إرسال عبر واتساب</span>
                </a>

                <a
                  href={shareLinkData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-11 bg-emerald-50 hover:bg-emerald-100 text-[#046A47] border border-emerald-200 rounded-xl text-xs font-black flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>فتح ومعاينة الرابط</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exported Images Modal (Ready for WhatsApp / Phone Gallery) */}
      {isImagesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs dir-rtl">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-stone-200">
            <div className="p-4 sm:p-5 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 bg-stone-50">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Images className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-stone-900">
                    صور الكتالوج جاهزة للتحميل ({generatedImages.length} صورة)
                  </h3>
                  <p className="text-[11px] text-stone-500 font-medium">
                    حمل كل الصور دفعة واحدة أو احفظ أي صفحة منفردة لإرسالها على واتساب
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadAllImagesSequentially}
                  className="h-9 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل جميع الصور</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsImagesModalOpen(false)}
                  className="p-2 bg-stone-200/70 hover:bg-stone-300 rounded-full text-stone-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 bg-stone-100/70">
              {generatedImages.map((img) => (
                <div
                  key={img.pageNumber}
                  className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs flex flex-col justify-between"
                >
                  <div className="aspect-[794/1123] bg-stone-50 overflow-hidden border-b border-stone-100">
                    <img
                      src={img.dataUrl}
                      alt={`صفحة ${img.pageNumber}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="p-2.5 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black text-stone-700">
                      صفحة {img.pageNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => pdfService.downloadImageDataUrl(img.dataUrl, img.filename)}
                      className="px-2.5 py-1 bg-[#046A47] hover:bg-[#035237] text-white rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>تنزيل</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Zoomable Preview Modal */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-xs p-4 dir-rtl">
          <div className="bg-[#FAF8F5] p-3 sm:p-4 rounded-2xl border border-[#E5E2D9] flex flex-wrap items-center justify-between gap-3 mb-4 shrink-0 shadow-lg">
            <div className="flex items-center gap-2 text-[#046A47] font-black">
              <Eye className="w-5 h-5" />
              <span className="text-sm sm:text-base">
                معاينة الكتالوج ({catalogSequence.length} صفحة)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-[#E5E2D9] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.4, z - 0.1))}
                  className="p-1.5 hover:bg-[#D4D1C5] rounded-lg text-[#2D2D24] cursor-pointer"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold px-2">{Math.round(zoomLevel * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.1))}
                  className="p-1.5 hover:bg-[#D4D1C5] rounded-lg text-[#2D2D24] cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleGenerateImages}
                disabled={isGeneratingImages || isGeneratingPdf}
                className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Images className="w-4 h-4" />
                <span>{isGeneratingImages ? `${generationProgress}%` : 'صور'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf || isGeneratingImages}
                className="bg-[#046A47] hover:bg-[#035237] text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  {isGeneratingPdf ? `جاري التصدير (${generationProgress}%)...` : 'تنزيل PDF'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto flex flex-col items-center p-4 sm:p-6 space-y-8">
            <div
              className="transition-transform duration-200 origin-top flex flex-col items-center space-y-8"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {catalogSequence.map((item, idx) => renderCatalogPageNode(item, idx, false))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
