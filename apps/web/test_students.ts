import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await adminClient.from('students').select('modality').limit(1);
  if (error) {
    console.error('ERROR:', error.message);
  } else {
    console.log('MODALITY EXISTS!');
  }
}

test();
