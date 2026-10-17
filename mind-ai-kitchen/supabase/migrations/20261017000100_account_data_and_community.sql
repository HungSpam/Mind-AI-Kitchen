-- User-owned private data and a reviewed public-recipe boundary.
-- Apply only after creating a Supabase project and reviewing the full migration.

create schema if not exists app_private;
create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;
revoke all on schema app_private from public, anon, authenticated;

grant usage on schema public to anon, authenticated;
grant usage on schema app_private to authenticated;

create or replace function app_private.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role' = 'moderator', false);
$$;
revoke all on function app_private.is_moderator() from public;
grant execute on function app_private.is_moderator() to authenticated;

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function app_private.set_updated_at() from public;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  allergies text not null default '' check (char_length(allergies) <= 500),
  goal text not null default 'health' check (char_length(goal) <= 80),
  preferences text not null default '' check (char_length(preferences) <= 500),
  likes text[] not null default '{}',
  dislikes text[] not null default '{}',
  diet_tags text[] not null default '{}',
  default_servings smallint not null default 2 check (default_servings between 1 and 12),
  max_cook_minutes smallint check (max_cook_minutes is null or max_cook_minutes between 1 and 240),
  equipment text[] not null default '{}',
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 80),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  version integer not null check (version > 0),
  profile_snapshot jsonb not null check (jsonb_typeof(profile_snapshot) = 'object'),
  created_at timestamptz not null default now(),
  unique (user_id, version)
);

create table public.user_consents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  personalization_enabled boolean not null default true,
  analytics_enabled boolean not null default false,
  consent_version integer not null default 1 check (consent_version > 0),
  updated_at timestamptz not null default now()
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 150),
  recipe jsonb not null check (jsonb_typeof(recipe) = 'object' and pg_column_size(recipe) <= 200000),
  schema_version smallint not null default 1 check (schema_version > 0),
  recipe_version integer not null default 1 check (recipe_version > 0),
  source text not null default 'generated' check (source in ('generated', 'community', 'manual', 'imported')),
  source_post_id uuid,
  is_favorite boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, id)
);
create index recipes_owner_updated_idx on public.recipes (owner_id, updated_at desc) where deleted_at is null;

create table public.recipe_feedback (
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null,
  rating smallint check (rating is null or rating between 1 and 5),
  notes text check (notes is null or char_length(notes) <= 500),
  reason_tags text[] not null default '{}',
  cooked_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, recipe_id),
  foreign key (user_id, recipe_id) references public.recipes(owner_id, id) on delete cascade
);

create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  normalized_name text not null check (char_length(normalized_name) between 2 and 100),
  display_name text not null check (char_length(display_name) between 2 and 100),
  quantity numeric(10, 2) check (quantity is null or quantity > 0),
  unit text check (unit is null or char_length(unit) <= 24),
  confirmed_at timestamptz,
  expires_on date,
  expiry_confirmed_at timestamptz,
  source text not null check (source in ('manual', 'confirmed_scan', 'imported')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pantry_owner_name_idx on public.pantry_items (owner_id, normalized_name) where deleted_at is null;

create table public.scan_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  result jsonb not null default '{}'::jsonb check (jsonb_typeof(result) = 'object' and pg_column_size(result) <= 100000),
  model_version text check (model_version is null or char_length(model_version) <= 100),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  unique (owner_id, id),
  check (expires_at <= created_at + interval '30 days')
);

create table public.scan_corrections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  scan_session_id uuid not null references public.scan_sessions(id) on delete cascade,
  ingredient_key text not null check (char_length(ingredient_key) between 1 and 100),
  before_value jsonb,
  corrected_value jsonb not null,
  created_at timestamptz not null default now(),
  foreign key (owner_id, scan_session_id) references public.scan_sessions(owner_id, id) on delete cascade
);

create table public.cooking_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid,
  recipe_snapshot jsonb not null check (jsonb_typeof(recipe_snapshot) = 'object' and pg_column_size(recipe_snapshot) <= 200000),
  current_step smallint not null default 0 check (current_step >= 0),
  timer_deadline timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'discarded')),
  version integer not null default 1 check (version > 0),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (owner_id, id),
  foreign key (owner_id, recipe_id) references public.recipes(owner_id, id) on delete set null (recipe_id)
);
create index cooking_sessions_owner_active_idx on public.cooking_sessions (owner_id, updated_at desc) where status = 'in_progress';

create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  cooking_session_id uuid,
  recipe_id uuid,
  recipe_snapshot jsonb not null check (jsonb_typeof(recipe_snapshot) = 'object' and pg_column_size(recipe_snapshot) <= 200000),
  servings numeric(5, 2) not null check (servings > 0 and servings <= 12),
  meal_type text not null check (meal_type in ('Bữa Sáng', 'Bữa Trưa', 'Bữa Tối', 'Bữa Phụ')),
  consumed_at timestamptz not null default now(),
  calories numeric(8, 2) check (calories is null or calories >= 0),
  macros jsonb check (macros is null or jsonb_typeof(macros) = 'object'),
  created_at timestamptz not null default now(),
  unique (owner_id, cooking_session_id),
  foreign key (owner_id, recipe_id) references public.recipes(owner_id, id) on delete set null (recipe_id),
  foreign key (owner_id, cooking_session_id) references public.cooking_sessions(owner_id, id) on delete set null (cooking_session_id)
);
create index meal_logs_owner_time_idx on public.meal_logs (owner_id, consumed_at desc);

create table public.public_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  bio text not null default '' check (char_length(bio) <= 240),
  avatar_path text check (avatar_path is null or char_length(avatar_path) <= 300),
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 150),
  summary text not null default '' check (char_length(summary) <= 500),
  servings smallint not null check (servings between 1 and 12),
  minutes smallint not null check (minutes between 1 and 1440),
  difficulty text not null check (difficulty in ('Dễ', 'Vừa', 'Khó')),
  ingredients jsonb not null check (jsonb_typeof(ingredients) = 'array' and pg_column_size(ingredients) <= 50000),
  steps jsonb not null check (jsonb_typeof(steps) = 'array' and pg_column_size(steps) <= 50000),
  nutrition jsonb check (nutrition is null or (jsonb_typeof(nutrition) = 'object' and pg_column_size(nutrition) <= 20000)),
  sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array' and pg_column_size(sources) <= 20000),
  tags text[] not null default '{}',
  image_path text check (image_path is null or char_length(image_path) <= 500),
  search_text text not null default '',
  schema_version smallint not null default 1 check (schema_version > 0),
  recipe_version integer not null default 1 check (recipe_version > 0),
  status text not null default 'draft' check (status in ('draft', 'pending', 'published', 'rejected', 'hidden', 'withdrawn')),
  moderation_reason text check (moderation_reason is null or char_length(moderation_reason) <= 1000),
  source_recipe_id uuid,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (author_id, source_recipe_id) references public.recipes(owner_id, id) on delete set null (source_recipe_id)
);
create index community_published_recent_idx on public.community_posts (published_at desc, id) where status = 'published';
create index community_published_tags_idx on public.community_posts using gin (tags) where status = 'published';
create index community_published_search_idx on public.community_posts using gin (search_text extensions.gin_trgm_ops) where status = 'published';

create or replace function app_private.update_community_search_text()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_text := extensions.unaccent(
    'extensions.unaccent'::pg_catalog.regdictionary,
    lower(new.title || ' ' || new.summary || ' ' || new.tags::text || ' ' || new.ingredients::text)
  );
  return new;
end;
$$;
revoke all on function app_private.update_community_search_text() from public;
create trigger community_search_text_before_write
before insert or update of title, summary, tags, ingredients on public.community_posts
for each row execute function app_private.update_community_search_text();

create table public.community_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  post_version integer not null check (post_version > 0),
  saved_recipe_id uuid,
  saved_snapshot jsonb not null check (jsonb_typeof(saved_snapshot) = 'object' and pg_column_size(saved_snapshot) <= 200000),
  created_at timestamptz not null default now(),
  primary key (user_id, post_id),
  foreign key (user_id, saved_recipe_id) references public.recipes(owner_id, id) on delete set null (saved_recipe_id)
);

create or replace function public.save_community_post(p_post_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_row public.community_posts%rowtype;
  v_saved_recipe_id uuid;
  v_save_exists boolean := false;
  recipe_payload jsonb;
  profile_row public.profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text || ':' || p_post_id::text, 0));
  select * into post_row from public.community_posts where id = p_post_id and status = 'published';
  if not found then raise exception 'published recipe not found'; end if;

  select cs.saved_recipe_id into v_saved_recipe_id from public.community_saves as cs
    where cs.user_id = auth.uid() and cs.post_id = p_post_id;
  v_save_exists := found;
  if v_saved_recipe_id is not null then return v_saved_recipe_id; end if;

  if jsonb_array_length(post_row.ingredients) not between 1 and 30
     or exists (select 1 from pg_catalog.jsonb_array_elements(post_row.ingredients) as elements(item)
       where pg_catalog.char_length(coalesce(item->>'name', '')) not between 2 and 100) then
    raise exception 'recipe ingredients are not in a supported format';
  end if;
  if jsonb_array_length(post_row.steps) not between 2 and 12
     or exists (select 1 from pg_catalog.jsonb_array_elements(post_row.steps) as elements(item)
       where pg_catalog.char_length(coalesce(item->>'text', case when pg_catalog.jsonb_typeof(item) = 'string' then item #>> '{}' else '' end, '')) not between 10 and 1200) then
    raise exception 'recipe steps are not in a supported format';
  end if;

  select * into profile_row from public.profiles where user_id = auth.uid();
  if not found then raise exception 'user profile is not available'; end if;
  v_saved_recipe_id := pg_catalog.gen_random_uuid();
  recipe_payload := pg_catalog.jsonb_build_object(
    'id', v_saved_recipe_id,
    'name', post_row.title,
    'summary', post_row.summary,
    'servings', post_row.servings,
    'minutes', least(post_row.minutes, 240),
    'difficulty', post_row.difficulty,
    'ingredients', (select pg_catalog.jsonb_agg(pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
      'id', coalesce(item->>'id', 'community-' || ordinality::text),
      'name', item->>'name',
      'grams', case when coalesce(item->>'grams', '') ~ '^[0-9]+(\.[0-9]+)?$' and (item->>'grams')::numeric between 0.01 and 10000 then (item->>'grams')::numeric else null end,
      'confirmed', true,
      'source', 'manual'
    )) order by ordinality) from pg_catalog.jsonb_array_elements(post_row.ingredients) with ordinality as ingredient(item, ordinality)),
    'steps', (select pg_catalog.jsonb_agg(pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
      'id', ordinality,
      'text', coalesce(item->>'text', item #>> '{}'),
      'durationSeconds', case when coalesce(item->>'durationSeconds', '') ~ '^[0-9]+$' and (item->>'durationSeconds')::integer between 0 and 14400 then (item->>'durationSeconds')::integer else null end
    )) order by ordinality) from pg_catalog.jsonb_array_elements(post_row.steps) with ordinality as instruction(item, ordinality)),
    'createdAt', (extract(epoch from now()) * 1000)::bigint,
    'model', 'Community',
    'sources', post_row.sources,
    'profileSnapshot', pg_catalog.jsonb_build_object(
      'bodyType', '', 'goal', profile_row.goal, 'allergies', profile_row.allergies,
      'preferences', profile_row.preferences
    )
  );

  insert into public.recipes (id, owner_id, title, recipe, source, source_post_id, is_favorite)
  values (v_saved_recipe_id, auth.uid(), post_row.title, recipe_payload, 'community', post_row.id, true);
  if v_save_exists then
    update public.community_saves set post_version = post_row.recipe_version,
      saved_recipe_id = v_saved_recipe_id, saved_snapshot = recipe_payload
    where user_id = auth.uid() and post_id = p_post_id;
  else
    insert into public.community_saves (user_id, post_id, post_version, saved_recipe_id, saved_snapshot)
    values (auth.uid(), post_row.id, post_row.recipe_version, v_saved_recipe_id, recipe_payload);
  end if;
  return v_saved_recipe_id;
end;
$$;
revoke all on function public.save_community_post(uuid) from public, anon;
grant execute on function public.save_community_post(uuid) to authenticated;

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  reason text not null check (reason in ('ingredient_safety', 'misleading', 'spam', 'rights', 'other')),
  detail text check (detail is null or char_length(detail) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text check (resolution is null or char_length(resolution) <= 1000)
);
create index content_reports_open_idx on public.content_reports (created_at) where status in ('open', 'reviewing');

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references auth.users(id) on delete restrict,
  post_id uuid references public.community_posts(id) on delete set null,
  report_id uuid references public.content_reports(id) on delete set null,
  decision text not null check (decision in ('approve', 'reject', 'hide', 'restore', 'report_resolved', 'report_dismissed')),
  reason text not null check (char_length(reason) between 3 and 1000),
  created_at timestamptz not null default now()
);

create table public.user_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  insight_key text not null check (char_length(insight_key) between 1 and 80),
  value jsonb not null check (jsonb_typeof(value) in ('object', 'array', 'string', 'number', 'boolean')),
  source_event_ids uuid[] not null default '{}',
  confidence numeric(4, 3) not null check (confidence between 0 and 1),
  generated_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (user_id, insight_key)
);

create table public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null check (event_name in ('recipe_generated', 'recipe_saved', 'cooking_started', 'cooking_completed', 'suggestion_accepted', 'suggestion_dismissed', 'community_saved', 'community_cooked')),
  event_version smallint not null default 1 check (event_version > 0),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 2000),
  created_at timestamptz not null default now()
);
create index product_events_retention_idx on public.product_events (created_at);

create table public.mutation_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  mutation_id uuid not null,
  entity_kind text not null check (entity_kind in ('profile', 'recipe', 'feedback', 'pantry', 'cooking_session', 'meal_log', 'community_save')),
  entity_id uuid,
  result_version integer,
  created_at timestamptz not null default now(),
  primary key (user_id, mutation_id)
);
create index mutation_receipts_retention_idx on public.mutation_receipts (created_at);

create or replace function app_private.create_private_user_rows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id);
  insert into public.user_consents (user_id) values (new.id);
  return new;
end;
$$;
revoke all on function app_private.create_private_user_rows() from public;
create trigger create_private_user_rows_after_signup
after insert on auth.users
for each row execute function app_private.create_private_user_rows();

create or replace function app_private.validate_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id <> old.user_id or new.created_at <> old.created_at then
    raise exception 'profile identity is immutable';
  end if;
  if new is distinct from old then
    new.version := old.version + 1;
    new.updated_at := now();
  end if;
  return new;
end;
$$;
revoke all on function app_private.validate_profile_update() from public;
create trigger profiles_version_before_update
before update on public.profiles
for each row execute function app_private.validate_profile_update();

create or replace function app_private.capture_profile_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile_revisions (user_id, version, profile_snapshot)
  values (new.user_id, new.version, to_jsonb(new) - 'user_id');
  return new;
end;
$$;
revoke all on function app_private.capture_profile_revision() from public;
create trigger profile_revision_after_update
after update on public.profiles
for each row when (new.version <> old.version)
execute function app_private.capture_profile_revision();

create or replace function app_private.guard_community_post()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.author_id is distinct from auth.uid() or new.status <> 'draft' then
      raise exception 'community posts must start as the signed-in author draft';
    end if;
  else
    if new.id is distinct from old.id or new.author_id is distinct from old.author_id
      or new.created_at is distinct from old.created_at then
      raise exception 'post identity is immutable';
    end if;
    if old.status = 'published' and (
      new.title is distinct from old.title or new.summary is distinct from old.summary
      or new.servings is distinct from old.servings or new.minutes is distinct from old.minutes
      or new.difficulty is distinct from old.difficulty or new.ingredients is distinct from old.ingredients
      or new.steps is distinct from old.steps or new.nutrition is distinct from old.nutrition
      or new.sources is distinct from old.sources or new.tags is distinct from old.tags
      or new.image_path is distinct from old.image_path
    ) then
      raise exception 'published recipes require a reviewed revision';
    end if;
    if new.status is distinct from old.status and not app_private.is_moderator()
       and not (old.author_id = auth.uid() and old.status in ('draft', 'rejected') and new.status = 'pending')
       and not (old.author_id = auth.uid() and old.status = 'published' and new.status = 'withdrawn') then
      raise exception 'invalid post state transition';
    end if;
  end if;
  new.updated_at := now();
  if new.status = 'published' and old.status is distinct from 'published' then
    new.published_at := now();
  end if;
  if new.status <> 'published' then new.published_at := null; end if;
  return new;
end;
$$;
revoke all on function app_private.guard_community_post() from public;
create trigger community_posts_guard_before_write
before insert or update on public.community_posts
for each row execute function app_private.guard_community_post();

create or replace function public.request_community_review(post_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  update public.community_posts set status = 'pending'
  where id = post_id and author_id = auth.uid() and status in ('draft', 'rejected');
  if not found then raise exception 'post is not available for review'; end if;
end;
$$;
revoke all on function public.request_community_review(uuid) from public, anon;
grant execute on function public.request_community_review(uuid) to authenticated;

create or replace function public.withdraw_community_post(post_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  update public.community_posts set status = 'withdrawn'
  where id = post_id and author_id = auth.uid() and status = 'published';
  if not found then raise exception 'published post is not available'; end if;
end;
$$;
revoke all on function public.withdraw_community_post(uuid) from public, anon;
grant execute on function public.withdraw_community_post(uuid) to authenticated;

create or replace function public.moderate_community_post(post_id uuid, decision text, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_status text;
begin
  if not app_private.is_moderator() then raise exception 'moderator role required'; end if;
  if char_length(trim(reason)) < 3 then raise exception 'a moderation reason is required'; end if;
  next_status := case decision
    when 'approve' then 'published'
    when 'reject' then 'rejected'
    when 'hide' then 'hidden'
    when 'restore' then 'published'
    else null end;
  if next_status is null then raise exception 'unsupported moderation decision'; end if;
  update public.community_posts set status = next_status, moderation_reason = trim(reason)
  where id = post_id and (
    (decision in ('approve', 'reject') and status = 'pending')
    or (decision = 'hide' and status = 'published')
    or (decision = 'restore' and status = 'hidden')
  );
  if not found then raise exception 'post is not in a moderatable state'; end if;
  insert into public.moderation_actions (moderator_id, post_id, decision, reason)
  values (auth.uid(), post_id, decision, trim(reason));
end;
$$;
revoke all on function public.moderate_community_post(uuid, text, text) from public, anon;
grant execute on function public.moderate_community_post(uuid, text, text) to authenticated;

create or replace function public.submit_content_report(post_id uuid, reason text, detail text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare report_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if reason not in ('ingredient_safety', 'misleading', 'spam', 'rights', 'other') then
    raise exception 'unsupported report reason';
  end if;
  if not exists (select 1 from public.community_posts where id = post_id and status = 'published') then
    raise exception 'post is not reportable';
  end if;
  insert into public.content_reports (reporter_id, post_id, reason, detail)
  values (auth.uid(), post_id, reason, nullif(left(trim(detail), 1000), ''))
  returning id into report_id;
  return report_id;
end;
$$;
revoke all on function public.submit_content_report(uuid, text, text) from public, anon;
grant execute on function public.submit_content_report(uuid, text, text) to authenticated;

create or replace function public.resolve_content_report(p_report_id uuid, p_decision text, p_resolution text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare report_row public.content_reports%rowtype;
begin
  if not app_private.is_moderator() then raise exception 'moderator role required'; end if;
  if p_decision not in ('resolved', 'dismissed') or char_length(trim(p_resolution)) not between 3 and 1000 then
    raise exception 'invalid report resolution';
  end if;
  select * into report_row from public.content_reports where id = p_report_id and status in ('open', 'reviewing') for update;
  if not found then raise exception 'report is not open'; end if;
  update public.content_reports set status = p_decision, resolution = trim(p_resolution), resolved_at = now()
    where id = p_report_id;
  insert into public.moderation_actions (moderator_id, post_id, report_id, decision, reason)
    values (auth.uid(), report_row.post_id, report_row.id, case when p_decision = 'resolved' then 'report_resolved' else 'report_dismissed' end, trim(p_resolution));
end;
$$;
revoke all on function public.resolve_content_report(uuid, text, text) from public, anon;
grant execute on function public.resolve_content_report(uuid, text, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.profile_revisions enable row level security;
alter table public.user_consents enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_feedback enable row level security;
alter table public.pantry_items enable row level security;
alter table public.scan_sessions enable row level security;
alter table public.scan_corrections enable row level security;
alter table public.cooking_sessions enable row level security;
alter table public.meal_logs enable row level security;
alter table public.public_profiles enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_saves enable row level security;
alter table public.content_reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.user_insights enable row level security;
alter table public.product_events enable row level security;
alter table public.mutation_receipts enable row level security;

create policy profiles_read_own on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy profile_revisions_read_own on public.profile_revisions for select to authenticated using (user_id = (select auth.uid()));
create policy user_consents_read_own on public.user_consents for select to authenticated using (user_id = (select auth.uid()));
create policy user_consents_update_own on public.user_consents for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy recipes_read_own on public.recipes for select to authenticated using (owner_id = (select auth.uid()));
create policy recipes_insert_own on public.recipes for insert to authenticated with check (owner_id = (select auth.uid()));
create policy recipes_update_own on public.recipes for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy recipes_delete_own on public.recipes for delete to authenticated using (owner_id = (select auth.uid()));

create policy feedback_read_own on public.recipe_feedback for select to authenticated using (user_id = (select auth.uid()));
create policy feedback_insert_own on public.recipe_feedback for insert to authenticated with check (user_id = (select auth.uid()));
create policy feedback_update_own on public.recipe_feedback for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy feedback_delete_own on public.recipe_feedback for delete to authenticated using (user_id = (select auth.uid()));

create policy pantry_read_own on public.pantry_items for select to authenticated using (owner_id = (select auth.uid()));
create policy pantry_insert_own on public.pantry_items for insert to authenticated with check (owner_id = (select auth.uid()));
create policy pantry_update_own on public.pantry_items for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy pantry_delete_own on public.pantry_items for delete to authenticated using (owner_id = (select auth.uid()));

create policy scans_read_own on public.scan_sessions for select to authenticated using (owner_id = (select auth.uid()));
create policy scans_insert_own on public.scan_sessions for insert to authenticated with check (owner_id = (select auth.uid()));
create policy scans_delete_own on public.scan_sessions for delete to authenticated using (owner_id = (select auth.uid()));
create policy corrections_read_own on public.scan_corrections for select to authenticated using (owner_id = (select auth.uid()));
create policy corrections_insert_own on public.scan_corrections for insert to authenticated with check (owner_id = (select auth.uid()));
create policy corrections_delete_own on public.scan_corrections for delete to authenticated using (owner_id = (select auth.uid()));

create policy cooking_read_own on public.cooking_sessions for select to authenticated using (owner_id = (select auth.uid()));
create policy cooking_insert_own on public.cooking_sessions for insert to authenticated with check (owner_id = (select auth.uid()));
create policy cooking_update_own on public.cooking_sessions for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy cooking_delete_own on public.cooking_sessions for delete to authenticated using (owner_id = (select auth.uid()));
create policy meals_read_own on public.meal_logs for select to authenticated using (owner_id = (select auth.uid()));
create policy meals_insert_own on public.meal_logs for insert to authenticated with check (owner_id = (select auth.uid()));
create policy meals_update_own on public.meal_logs for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy meals_delete_own on public.meal_logs for delete to authenticated using (owner_id = (select auth.uid()));

create policy public_profiles_read_public on public.public_profiles for select to anon, authenticated using (true);
create policy public_profiles_insert_own on public.public_profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy public_profiles_update_own on public.public_profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy public_profiles_delete_own on public.public_profiles for delete to authenticated using (user_id = (select auth.uid()));

create policy community_read_published_or_own on public.community_posts for select to anon, authenticated using (
  status = 'published' or author_id = (select auth.uid())
);
create policy community_moderator_read on public.community_posts for select to authenticated using (app_private.is_moderator());
create policy community_insert_draft_own on public.community_posts for insert to authenticated with check (author_id = (select auth.uid()) and status = 'draft');
create policy community_update_own_content on public.community_posts for update to authenticated using (author_id = (select auth.uid()) and status in ('draft', 'rejected')) with check (author_id = (select auth.uid()) and status in ('draft', 'rejected'));
create policy community_update_moderator on public.community_posts for update to authenticated using (app_private.is_moderator()) with check (app_private.is_moderator());

create policy community_saves_read_own on public.community_saves for select to authenticated using (user_id = (select auth.uid()));
create policy community_saves_insert_own on public.community_saves for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.community_posts where id = post_id and status = 'published'));
create policy community_saves_delete_own on public.community_saves for delete to authenticated using (user_id = (select auth.uid()));

create policy reports_read_own_or_moderator on public.content_reports for select to authenticated using (reporter_id = (select auth.uid()) or app_private.is_moderator());
create policy reports_update_moderator on public.content_reports for update to authenticated using (app_private.is_moderator()) with check (app_private.is_moderator());
create policy moderation_actions_read_moderator on public.moderation_actions for select to authenticated using (app_private.is_moderator());

create policy insights_read_own on public.user_insights for select to authenticated using (user_id = (select auth.uid()));
create policy insights_delete_own on public.user_insights for delete to authenticated using (user_id = (select auth.uid()));
create policy events_read_own on public.product_events for select to authenticated using (user_id = (select auth.uid()));
create policy receipts_read_own on public.mutation_receipts for select to authenticated using (user_id = (select auth.uid()));

revoke all on all tables in schema public from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.profile_revisions to authenticated;
grant select, update on public.user_consents to authenticated;
grant select, insert, update, delete on public.recipes to authenticated;
grant select, insert, update, delete on public.recipe_feedback to authenticated;
grant select, insert, update, delete on public.pantry_items to authenticated;
grant select, insert, delete on public.scan_sessions to authenticated;
grant select, insert, delete on public.scan_corrections to authenticated;
grant select, insert, update, delete on public.cooking_sessions to authenticated;
grant select, insert, update, delete on public.meal_logs to authenticated;
grant select, insert, update, delete on public.public_profiles to authenticated;
grant select on public.public_profiles to anon;
grant select, insert, update on public.community_posts to authenticated;
grant select on public.community_posts to anon;
grant select, insert, delete on public.community_saves to authenticated;
grant select on public.content_reports to authenticated;
grant update (status, resolved_at, resolution) on public.content_reports to authenticated;
grant select on public.moderation_actions to authenticated;
grant select, delete on public.user_insights to authenticated;
grant select on public.mutation_receipts to authenticated;

-- Keep service-only operational tables inaccessible to browser roles.
revoke all on public.profile_revisions, public.scan_corrections, public.user_insights,
  public.product_events, public.mutation_receipts from anon;
