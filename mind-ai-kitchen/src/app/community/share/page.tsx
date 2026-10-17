import { createClient } from '@/lib/supabase/server';
import { ShareRecipeForm } from '@/features/community/share-form';

export default async function SharePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const recipeId = typeof params.recipeId === 'string' ? params.recipeId.slice(0, 100) : '';
  const supabase = await createClient();
  const { data } = supabase ? await supabase.auth.getClaims() : { data: null };
  return <ShareRecipeForm signedIn={Boolean(data?.claims?.sub)} recipeId={recipeId} />;
}
