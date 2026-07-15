import { createClient } from '@supabase/supabase-js';
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: list } = await s.auth.admin.listUsers();
const u = list.users.find(u => u.email === 'usgibsons2004@gmail.com');
if (!u) { console.log('NOT FOUND'); process.exit(1); }
const { error } = await s.auth.admin.updateUserById(u.id, { password: 'Roost-Test-2026!xK9', email_confirm: true });
console.log(error ? 'ERR '+error.message : 'OK '+u.id);
