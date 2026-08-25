const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qbblefawjkdsrhunmbpz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiYmxlZmF3amtkc3JodW5tYnB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTkzNjcsImV4cCI6MjEwMjg5NTM2N30.Y0yTlrlctJSUkpJGX2Z4GUx6P0BDRDhNn3iJ_GnPxNI'; // Tu clave completa de Supabase

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };