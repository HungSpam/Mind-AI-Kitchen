export type FeaturedRecipe = {
  id: string;
  title: string;
  summary: string;
  servings: number;
  minutes: number;
  difficulty: string;
  category: string;
  emoji: string;
  tone: 'tomato' | 'herb' | 'gold' | 'plum';
  calories: number;
  tags: string[];
  ingredients: { name: string; amount: string }[];
  steps: string[];
};

// Curated demo recipes are clearly labeled and do not impersonate community members.
export const featuredRecipes: FeaturedRecipe[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    title: 'Gà áp chảo sốt chanh sả',
    summary: 'Thịt gà vàng thơm, vị chua nhẹ; ăn cùng cơm nóng và rau luộc.',
    servings: 2, minutes: 25, difficulty: 'Dễ', category: 'Bữa tối', emoji: '🍗', tone: 'tomato', calories: 385,
    tags: ['Giàu đạm', 'Bữa tối', 'Ít dầu'],
    ingredients: [
      { name: 'Ức gà', amount: '300 g' }, { name: 'Sả', amount: '2 cây' },
      { name: 'Chanh', amount: '1 quả' }, { name: 'Tỏi', amount: '2 tép' },
      { name: 'Nước mắm', amount: '1 thìa canh' }, { name: 'Dầu ăn', amount: '1 thìa cà phê' },
    ],
    steps: [
      'Thái sả và tỏi thật nhỏ. Thấm khô gà, cắt miếng vừa ăn rồi ướp với một nửa sả, tỏi, nước mắm và tiêu trong 10 phút.',
      'Làm nóng chảo với ít dầu. Áp chảo gà ở lửa vừa 4–5 phút mỗi mặt đến khi chín hoàn toàn.',
      'Thêm phần sả còn lại và nước cốt chanh, đảo nhanh 30 giây. Nếm lại cho vừa miệng rồi dùng nóng.',
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    title: 'Canh bí đỏ nấu tôm',
    summary: 'Bát canh ngọt dịu, nấu nhanh với tôm tươi và bí đỏ mềm bùi.',
    servings: 3, minutes: 30, difficulty: 'Dễ', category: 'Món canh', emoji: '🍲', tone: 'gold', calories: 175,
    tags: ['Món canh', 'Gia đình', 'Dễ nấu'],
    ingredients: [
      { name: 'Bí đỏ', amount: '400 g' }, { name: 'Tôm tươi đã bóc vỏ', amount: '180 g' },
      { name: 'Hành tím', amount: '1 củ' }, { name: 'Hành lá', amount: '2 nhánh' },
      { name: 'Nước', amount: '800 ml' }, { name: 'Nước mắm', amount: '1 thìa cà phê' },
    ],
    steps: [
      'Bí đỏ gọt vỏ, bỏ hạt và cắt miếng vừa ăn. Băm nhỏ tôm, ướp nhẹ với chút muối.',
      'Phi thơm hành tím, cho tôm vào đảo đến khi săn. Thêm nước và bí đỏ, đun sôi rồi hạ lửa.',
      'Nấu 12–15 phút đến khi bí mềm. Nêm nước mắm vừa ăn, rắc hành lá rồi tắt bếp.',
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    title: 'Đậu hũ sốt cà chua',
    summary: 'Món chay quen thuộc, sốt cà chua sánh nhẹ và dùng nguyên liệu dễ tìm.',
    servings: 2, minutes: 20, difficulty: 'Dễ', category: 'Món chay', emoji: '🍅', tone: 'herb', calories: 245,
    tags: ['Món chay', 'Tiết kiệm', '20 phút'],
    ingredients: [
      { name: 'Đậu hũ trắng', amount: '300 g' }, { name: 'Cà chua', amount: '250 g' },
      { name: 'Hành lá', amount: '2 nhánh' }, { name: 'Đường', amount: '1/2 thìa cà phê' },
      { name: 'Nước tương', amount: '1 thìa canh' }, { name: 'Dầu ăn', amount: '1 thìa cà phê' },
    ],
    steps: [
      'Cắt đậu hũ thành miếng vuông. Cà chua thái hạt lựu, hành lá cắt nhỏ.',
      'Áp chảo đậu hũ với ít dầu đến khi các mặt vàng nhẹ rồi gắp ra.',
      'Cho cà chua vào chảo, thêm vài thìa nước và nấu đến khi mềm. Nêm nước tương, đường; cho đậu vào rim 4 phút cho thấm sốt.',
      'Rắc hành lá và dùng nóng với cơm.',
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    title: 'Cơm trộn cá ngừ rau củ',
    summary: 'Bữa trưa gọn trong 15 phút, cân bằng tinh bột, đạm và rau tươi.',
    servings: 1, minutes: 15, difficulty: 'Rất dễ', category: 'Bữa trưa', emoji: '🥗', tone: 'plum', calories: 430,
    tags: ['Bữa trưa', 'Nhanh gọn', 'Cân bằng'],
    ingredients: [
      { name: 'Cơm chín', amount: '180 g' }, { name: 'Cá ngừ ngâm nước', amount: '100 g' },
      { name: 'Dưa leo', amount: '1/2 quả' }, { name: 'Cà rốt', amount: '1/2 củ' },
      { name: 'Bắp ngọt', amount: '40 g' }, { name: 'Sữa chua không đường', amount: '1 thìa canh' },
    ],
    steps: [
      'Để ráo cá ngừ. Cắt dưa leo hạt lựu, bào nhỏ cà rốt và làm nóng bắp nếu dùng bắp đông lạnh.',
      'Trộn sữa chua với một ít muối, tiêu và nước cốt chanh để làm sốt nhẹ.',
      'Cho cơm vào tô, xếp cá ngừ và rau củ lên trên. Rưới sốt trước khi ăn.',
    ],
  },
];

export function normalizeCommunitySearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
}
