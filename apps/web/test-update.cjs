const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

supabase
  .from('lessons')
  .update({ title: 'Test Update' })
  .eq('title', 'Normas parlamentarias.')
  .then(console.log)
  .catch(console.error);
