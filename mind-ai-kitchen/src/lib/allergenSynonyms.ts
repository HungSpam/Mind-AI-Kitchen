import type { AllergenAudit } from '../types/domain';
import { containsPhrase, normalizeText, splitAllergies } from './text';

export const ALLERGEN_GROUPS = [
  {
    id: 'crustaceans_molluscs',
    nameVi: 'Hải sản có vỏ',
    keywords: [
      'hải sản',
      'seafood',
      'shellfish',
      'tôm',
      'cua',
      'ghẹ',
      'ốc',
      'nghêu',
      'ngao',
      'sò',
      'hàu',
      'tép',
      'mắm ruốc',
      'mắm tôm',
      'dầu hào',
      'mực',
      'bạch tuộc',
      'shrimp',
      'prawn',
      'oyster',
      'crab',
    ],
  },
  {
    id: 'fish',
    nameVi: 'Cá',
    keywords: ['cá', 'fish', 'nước mắm', 'mắm nêm', 'anchovy', 'salmon', 'tuna'],
  },
  {
    id: 'peanuts',
    nameVi: 'Đậu phộng',
    keywords: [
      'đậu phộng',
      'đậu phụng',
      'lạc',
      'peanut',
      'peanuts',
      'dầu phộng',
      'dầu lạc',
      'kẹo cu đơ',
    ],
  },
  {
    id: 'soybeans',
    nameVi: 'Đậu nành',
    keywords: [
      'đậu nành',
      'đậu tương',
      'đậu phụ',
      'đậu hũ',
      'tàu hũ',
      'chao',
      'xì dầu',
      'nước tương',
      'tương bần',
      'tương hột',
      'edamame',
      'phù trúc',
      'váng đậu',
      'soy',
      'soya',
      'tofu',
    ],
  },
  {
    id: 'gluten',
    nameVi: 'Lúa mì / gluten',
    keywords: [
      'gluten',
      'lúa mì',
      'bột mì',
      'bánh mì',
      'mì gói',
      'mì tôm',
      'mì trứng',
      'mì căn',
      'bột chiên xù',
      'bột chiên giòn',
      'nui',
      'pasta',
      'wheat',
      'seitan',
      'lúa mạch',
      'mạch nha',
      'bia',
      'nước tương',
      'xì dầu',
    ],
  },
  {
    id: 'dairy',
    nameVi: 'Sữa',
    keywords: [
      'sữa',
      'bơ',
      'phô mai',
      'phô mát',
      'cheese',
      'butter',
      'milk',
      'whey',
      'casein',
      'lactose',
      'kem tươi',
      'whipping cream',
      'yogurt',
    ],
  },
  {
    id: 'eggs',
    nameVi: 'Trứng',
    keywords: ['trứng', 'egg', 'eggs', 'lòng đỏ', 'lòng trắng', 'mayonnaise', 'mayo'],
  },
  { id: 'sesame', nameVi: 'Mè / vừng', keywords: ['mè', 'vừng', 'tahini', 'sesame'] },
  {
    id: 'tree_nuts',
    nameVi: 'Hạt cây',
    keywords: [
      'hạt cây',
      'quả hạch',
      'tree nuts',
      'hạt điều',
      'hạnh nhân',
      'óc chó',
      'mắc ca',
      'hạt dẻ',
      'hồ đào',
      'hạt phỉ',
      'almond',
      'cashew',
      'walnut',
      'pistachio',
    ],
  },
  { id: 'celery', nameVi: 'Cần tây', keywords: ['cần tây', 'celery'] },
  { id: 'mustard', nameVi: 'Mù tạt', keywords: ['mù tạt', 'mustard'] },
  { id: 'lupin', nameVi: 'Đậu lupin', keywords: ['lupin', 'lupine'] },
  {
    id: 'sulphites',
    nameVi: 'Sulphite',
    keywords: ['sulphite', 'sulfite', 'sulphites', 'sulfites', 'sulfur dioxide'],
  },
];

function textForGroup(text: string, group: string): string {
  let value = ' ' + normalizeText(text.replace(/(^|\s)của(?=\s|$)/gi, ' ')) + ' ';
  const exclusions =
    group === 'dairy'
      ? [
          'sữa đậu nành',
          'sữa hạnh nhân',
          'sữa yến mạch',
          'sữa dừa',
          'sữa hạt',
          'bơ đậu phộng',
          'bơ lạc',
          'bơ hạnh nhân',
          'quả bơ',
          'bơ quả',
          'trái bơ',
          'avocado',
          'coconut milk',
          'soy milk',
          'peanut butter',
        ]
      : group === 'fish'
        ? ['cà chua', 'cà rốt', 'cà tím', 'cà phê', 'cà ri', 'cá nhân', 'tất cả']
        : [];
  for (const phrase of exclusions) value = value.replaceAll(' ' + normalizeText(phrase) + ' ', ' ');
  return value.trim();
}

export function scanAllergens(ingredients: string[], input: string): AllergenAudit {
  const flags: AllergenAudit['flags'] = [];
  const entries = splitAllergies(input)
    .flatMap((v) => v.split(/\s+và\s+/i))
    .filter(Boolean);
  for (const entry of entries) {
    const groups = ALLERGEN_GROUPS.filter(
      (g) =>
        containsPhrase(textForGroup(entry, g.id), g.nameVi) ||
        g.keywords.some((k) => containsPhrase(textForGroup(entry, g.id), k)),
    );
    for (const ingredient of ingredients) {
      if (!groups.length && containsPhrase(ingredient, entry))
        flags.push({ ingredient, group: entry, keyword: entry });
      for (const group of groups) {
        const keyword = group.keywords.find((k) =>
          containsPhrase(textForGroup(ingredient, group.id), k),
        );
        if (keyword && !flags.some((f) => f.ingredient === ingredient && f.group === group.nameVi))
          flags.push({ ingredient, group: group.nameVi, keyword });
      }
    }
  }
  return { hasRisk: flags.length > 0, flags, checkedAt: Date.now() };
}

export const ALLERGEN_NOTICE =
  'Không phát hiện từ khóa không đồng nghĩa với không có dị ứng. Kiểm tra nhãn, gia vị và nguy cơ nhiễm chéo; ảnh không thể xác định mọi thành phần.';
