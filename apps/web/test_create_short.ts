import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, supabaseKey);

async function test() {
  const email = 'new_short_pass_222@sebibe.org';
  const password = '123';
  const firstName = 'Test';
  const lastName = 'Student';

  console.log('Creating user with short password...');
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      name: `${firstName} ${lastName}`,
    },
  });

  if (error) {
    console.error('ERROR CREATING USER:', error);
  } else {
    console.log('USER CREATED SUCCESSFULLY:', data.user.id);
  }
}

test();
