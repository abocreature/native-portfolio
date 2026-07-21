import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gxenxzrrivucvwlfupqp.supabase.co/';
const SUPABASE_ANON_KEY = 'sb_publishable_KjtApIBAIdh9lOhmcTZBnw_3arbQ1DD';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
