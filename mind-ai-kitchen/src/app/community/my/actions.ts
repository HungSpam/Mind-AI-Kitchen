'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

async function getClient() {
  const client = await createClient();
  if (!client) redirect('/account?notice=setup');
  const { data } = await client.auth.getClaims();
  if (!data?.claims?.sub) redirect('/account');
  return client;
}

export async function resubmitCommunityPost(formData: FormData) {
  const postId = z.string().uuid().safeParse(formData.get('post_id'));
  if (!postId.success) redirect('/community/my?error=action');
  const client = await getClient();
  const { error } = await client.rpc('request_community_review', { post_id: postId.data });
  if (error) redirect('/community/my?error=action');
  revalidatePath('/community/my');
  redirect('/community/my?updated=1');
}

export async function withdrawCommunityPost(formData: FormData) {
  const postId = z.string().uuid().safeParse(formData.get('post_id'));
  if (!postId.success) redirect('/community/my?error=action');
  const client = await getClient();
  const { error } = await client.rpc('withdraw_community_post', { post_id: postId.data });
  if (error) redirect('/community/my?error=action');
  revalidatePath('/community/my');
  revalidatePath('/community');
  revalidatePath(`/community/${postId.data}`);
  redirect('/community/my?updated=1');
}
