import { createClient } from '@supabase/supabase-client';

// Nos aseguramos de limpiar la URL y añadir https:// si falta
let url = (process.env.SUPABASE_URL || '').trim();
if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
  url = `https://${url}`;
}

const key = (process.env.SUPABASE_KEY || '').trim();

export const supabase = createClient(url, key);