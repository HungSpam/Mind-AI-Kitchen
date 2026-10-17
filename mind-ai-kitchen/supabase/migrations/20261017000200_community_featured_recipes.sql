-- Curated sample recipes for the community landing page.
-- These are clearly labeled editorial examples, not member submissions.

create table if not exists public.community_featured_recipes (
  id uuid primary key,
  title text not null check (char_length(title) between 1 and 150),
  summary text not null check (char_length(summary) <= 500),
  servings smallint not null check (servings between 1 and 12),
  minutes smallint not null check (minutes between 1 and 240),
  difficulty text not null check (difficulty in ('Rất dễ', 'Dễ', 'Vừa', 'Khó')),
  category text not null check (char_length(category) between 1 and 40),
  emoji text not null check (char_length(emoji) <= 12),
  tone text not null check (tone in ('tomato', 'herb', 'gold', 'plum')),
  calories integer not null check (calories between 0 and 5000),
  tags text[] not null default '{}',
  ingredients jsonb not null check (jsonb_typeof(ingredients) = 'array' and jsonb_array_length(ingredients) between 1 and 100),
  steps jsonb not null check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) between 1 and 60),
  display_order smallint not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.community_featured_recipes enable row level security;
revoke all on public.community_featured_recipes from anon, authenticated;
grant select on public.community_featured_recipes to anon, authenticated;
drop policy if exists community_featured_recipes_public_read on public.community_featured_recipes;
create policy community_featured_recipes_public_read
  on public.community_featured_recipes
  for select to anon, authenticated
  using (is_active);

insert into public.community_featured_recipes (
  id, title, summary, servings, minutes, difficulty, category, emoji, tone, calories, tags, ingredients, steps, display_order
) values
(
  '00000000-0000-4000-8000-000000000001', 'Gà áp chảo sốt chanh sả',
  'Thịt gà vàng thơm, vị chua nhẹ; ăn cùng cơm nóng và rau luộc.', 2, 25, 'Dễ', 'Bữa tối', '🍗', 'tomato', 385,
  array['Giàu đạm', 'Bữa tối', 'Ít dầu'],
  '[{"name":"Ức gà","amount":"300 g"},{"name":"Sả","amount":"2 cây"},{"name":"Chanh","amount":"1 quả"},{"name":"Tỏi","amount":"2 tép"},{"name":"Nước mắm","amount":"1 thìa canh"},{"name":"Dầu ăn","amount":"1 thìa cà phê"}]'::jsonb,
  '["Thái sả và tỏi thật nhỏ. Thấm khô gà, cắt miếng vừa ăn rồi ướp với một nửa sả, tỏi, nước mắm và tiêu trong 10 phút.","Làm nóng chảo với ít dầu. Áp chảo gà ở lửa vừa 4–5 phút mỗi mặt đến khi chín hoàn toàn.","Thêm phần sả còn lại và nước cốt chanh, đảo nhanh 30 giây. Nếm lại cho vừa miệng rồi dùng nóng."]'::jsonb,
  1
),
(
  '00000000-0000-4000-8000-000000000002', 'Canh bí đỏ nấu tôm',
  'Bát canh ngọt dịu, nấu nhanh với tôm tươi và bí đỏ mềm bùi.', 3, 30, 'Dễ', 'Món canh', '🍲', 'gold', 175,
  array['Món canh', 'Gia đình', 'Dễ nấu'],
  '[{"name":"Bí đỏ","amount":"400 g"},{"name":"Tôm tươi đã bóc vỏ","amount":"180 g"},{"name":"Hành tím","amount":"1 củ"},{"name":"Hành lá","amount":"2 nhánh"},{"name":"Nước","amount":"800 ml"},{"name":"Nước mắm","amount":"1 thìa cà phê"}]'::jsonb,
  '["Bí đỏ gọt vỏ, bỏ hạt và cắt miếng vừa ăn. Băm nhỏ tôm, ướp nhẹ với chút muối.","Phi thơm hành tím, cho tôm vào đảo đến khi săn. Thêm nước và bí đỏ, đun sôi rồi hạ lửa.","Nấu 12–15 phút đến khi bí mềm. Nêm nước mắm vừa ăn, rắc hành lá rồi tắt bếp."]'::jsonb,
  2
),
(
  '00000000-0000-4000-8000-000000000003', 'Đậu hũ sốt cà chua',
  'Món chay quen thuộc, sốt cà chua sánh nhẹ và dùng nguyên liệu dễ tìm.', 2, 20, 'Dễ', 'Món chay', '🍅', 'herb', 245,
  array['Món chay', 'Tiết kiệm', '20 phút'],
  '[{"name":"Đậu hũ trắng","amount":"300 g"},{"name":"Cà chua","amount":"250 g"},{"name":"Hành lá","amount":"2 nhánh"},{"name":"Đường","amount":"1/2 thìa cà phê"},{"name":"Nước tương","amount":"1 thìa canh"},{"name":"Dầu ăn","amount":"1 thìa cà phê"}]'::jsonb,
  '["Cắt đậu hũ thành miếng vuông. Cà chua thái hạt lựu, hành lá cắt nhỏ.","Áp chảo đậu hũ với ít dầu đến khi các mặt vàng nhẹ rồi gắp ra.","Cho cà chua vào chảo, thêm vài thìa nước và nấu đến khi mềm. Nêm nước tương, đường; cho đậu vào rim 4 phút cho thấm sốt.","Rắc hành lá và dùng nóng với cơm."]'::jsonb,
  3
),
(
  '00000000-0000-4000-8000-000000000004', 'Cơm trộn cá ngừ rau củ',
  'Bữa trưa gọn trong 15 phút, cân bằng tinh bột, đạm và rau tươi.', 1, 15, 'Rất dễ', 'Bữa trưa', '🥗', 'plum', 430,
  array['Bữa trưa', 'Nhanh gọn', 'Cân bằng'],
  '[{"name":"Cơm chín","amount":"180 g"},{"name":"Cá ngừ ngâm nước","amount":"100 g"},{"name":"Dưa leo","amount":"1/2 quả"},{"name":"Cà rốt","amount":"1/2 củ"},{"name":"Bắp ngọt","amount":"40 g"},{"name":"Sữa chua không đường","amount":"1 thìa canh"}]'::jsonb,
  '["Để ráo cá ngừ. Cắt dưa leo hạt lựu, bào nhỏ cà rốt và làm nóng bắp nếu dùng bắp đông lạnh.","Trộn sữa chua với một ít muối, tiêu và nước cốt chanh để làm sốt nhẹ.","Cho cơm vào tô, xếp cá ngừ và rau củ lên trên. Rưới sốt trước khi ăn."]'::jsonb,
  4
)
on conflict (id) do update set
  title = excluded.title,
  summary = excluded.summary,
  servings = excluded.servings,
  minutes = excluded.minutes,
  difficulty = excluded.difficulty,
  category = excluded.category,
  emoji = excluded.emoji,
  tone = excluded.tone,
  calories = excluded.calories,
  tags = excluded.tags,
  ingredients = excluded.ingredients,
  steps = excluded.steps,
  display_order = excluded.display_order,
  is_active = true,
  updated_at = now();
