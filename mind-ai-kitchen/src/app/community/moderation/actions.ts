'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

async function moderatorClient() {
  const client = await createClient();
  if (!client) return null;
  const { data } = await client.auth.getClaims();
  const metadata = data?.claims?.app_metadata;
  const role = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? (metadata as { role?: unknown }).role : null;
  return role === 'moderator' ? client : null;
}

export async function reviewCommunityPost(formData: FormData) {
  const input = z.object({ postId: z.string().uuid(), decision: z.enum(['approve', 'reject']), reason: z.string().trim().min(3).max(1000) }).safeParse({
    postId: formData.get('post_id'), decision: formData.get('decision'), reason: formData.get('reason'),
  });
  if (!input.success) redirect('/community/moderation?error=action');
  const client = await moderatorClient();
  if (!client) redirect('/community');
  const { error } = await client.rpc('moderate_community_post', { post_id: input.data.postId, decision: input.data.decision, reason: input.data.reason });
  if (error) redirect('/community/moderation?error=action');
  revalidatePath('/community/moderation');
  revalidatePath('/community');
  revalidatePath(`/community/${input.data.postId}`);
  redirect('/community/moderation?updated=1');
}

export async function resolveCommunityReport(formData: FormData) {
  const input = z.object({ reportId: z.string().uuid(), decision: z.enum(['resolved', 'dismissed']), resolution: z.string().trim().min(3).max(1000) }).safeParse({
    reportId: formData.get('report_id'), decision: formData.get('decision'), resolution: formData.get('resolution'),
  });
  if (!input.success) redirect('/community/moderation?error=action');
  const client = await moderatorClient();
  if (!client) redirect('/community');
  const { error } = await client.rpc('resolve_content_report', { p_report_id: input.data.reportId, p_decision: input.data.decision, p_resolution: input.data.resolution });
  if (error) redirect('/community/moderation?error=action');
  revalidatePath('/community/moderation');
  redirect('/community/moderation?updated=1');
}

export async function hideReportedPost(formData: FormData) {
  const input = z.object({ postId: z.string().uuid(), reason: z.string().trim().min(3).max(1000) }).safeParse({
    postId: formData.get('post_id'), reason: formData.get('reason'),
  });
  if (!input.success) redirect('/community/moderation?error=action');
  const client = await moderatorClient();
  if (!client) redirect('/community');
  const { error } = await client.rpc('moderate_community_post', { post_id: input.data.postId, decision: 'hide', reason: input.data.reason });
  if (error) redirect('/community/moderation?error=action');
  revalidatePath('/community/moderation');
  revalidatePath('/community');
  redirect('/community/moderation?updated=1');
}
