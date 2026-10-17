-- Run after migrations against a disposable Supabase project as a database owner.
-- This checks catalog setup only; complete the two-user API checks in SETUP.md.
do $$
declare
  required_tables text[] := array[
    'profiles', 'profile_revisions', 'user_consents', 'recipes', 'recipe_feedback',
    'pantry_items', 'scan_sessions', 'scan_corrections', 'cooking_sessions', 'meal_logs',
    'public_profiles', 'community_posts', 'community_saves', 'content_reports',
    'moderation_actions', 'user_insights', 'product_events', 'mutation_receipts'
  ];
  table_name text;
begin
  foreach table_name in array required_tables loop
    if not exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = table_name and c.relkind = 'r' and c.relrowsecurity
    ) then
      raise exception 'RLS missing or table absent: public.%', table_name;
    end if;
  end loop;

  if has_table_privilege('anon', 'public.profiles', 'select')
     or has_table_privilege('anon', 'public.meal_logs', 'select')
     or has_table_privilege('anon', 'public.pantry_items', 'select') then
    raise exception 'anonymous role has access to private user data';
  end if;

  if has_table_privilege('authenticated', 'public.product_events', 'insert')
     or has_table_privilege('authenticated', 'public.mutation_receipts', 'insert')
     or has_table_privilege('authenticated', 'public.moderation_actions', 'insert') then
    raise exception 'browser role has direct insert access to service/moderation tables';
  end if;

  if has_function_privilege('anon', 'public.save_community_post(uuid)', 'execute')
     or has_function_privilege('anon', 'public.submit_content_report(uuid,text,text)', 'execute')
     or has_function_privilege('anon', 'public.resolve_content_report(uuid,text,text)', 'execute') then
    raise exception 'anonymous role can invoke an authenticated community function';
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'community_posts' and policyname = 'community_read_published_or_own') then
    raise exception 'community published/author read policy missing';
  end if;
end;
$$;

select 'Catalog checks passed. Complete two-user API checks before enabling accounts/community.' as verification_result;
