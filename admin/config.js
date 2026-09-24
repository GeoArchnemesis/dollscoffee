/* Supabase კონფიგურაცია.
   Publishable key საჯარო/კლიენტის კოდში ღიად გამოსაყენებლადაა განკუთვნილი —
   წვდომის კონტროლს Row Level Security + public.admin_users უზრუნველყოფს
   (იხ. Supabase SQL Editor-ში გაშვებული schema.sql). service_role/secret
   key აქ არასდროს არ უნდა მოხვდეს. */
const SUPABASE_URL = 'https://kbpakpxrnhmvgblxozia.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_9z7e86IxheobA40rKcWgkA_7cgaQhBx';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
