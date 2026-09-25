import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET() {
  const adminClient = getSupabaseServerAdminClient();
  
  const { data, error } = await adminClient
    .from('lessons')
    .update({ is_published: true })
    .not('id', 'is', null) // Match all rows
    .select();
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({ success: true, updated: data?.length });
}
