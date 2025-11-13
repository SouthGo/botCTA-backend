import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[supabase] Faltan SUPABASE_URL o SUPABASE_*_KEY en el entorno');
}

const client = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  })
  : null;

const getClient = () => {
  if (!client) {
    throw new Error('Supabase no está configurado correctamente');
  }

  return client;
};

export async function createCta(payload) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('ctas')
    .insert([{ ...payload, status: payload.status || 'open' }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listCtas({ status, id } = {}) {
  const supabase = getClient();
  let query = supabase
    .from('ctas')
    .select('*')
    .order('date', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }

  if (id) {
    query = query.eq('id', id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function registerPostulant(payload) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('cta_postulants')
    .upsert(payload, { onConflict: 'cta_id,user_id', ignoreDuplicates: false })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function assignRolesToPostulants(ctaId, assignments) {
  const supabase = getClient();

  const updates = assignments.map((assignment) => ({
    cta_id: ctaId,
    user_id: assignment.userId,
    final_role: assignment.finalRole
  }));

  const { data, error } = await supabase
    .from('cta_postulants')
    .upsert(updates, { onConflict: 'cta_id,user_id', ignoreDuplicates: false })
    .select();

  if (error) throw error;
  return data;
}

export async function getCtaPostulants(ctaId) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('cta_postulants')
    .select('*')
    .eq('cta_id', ctaId);

  if (error) throw error;
  return data;
}

export async function closeCta(ctaId) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('ctas')
    .update({ status: 'closed' })
    .eq('id', ctaId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function findCtasStartingIn(minutes) {
  const supabase = getClient();
  const now = new Date();
  const target = new Date(now.getTime() + minutes * 60 * 1000);

  const { data, error } = await supabase
    .from('ctas')
    .select('*')
    .eq('status', 'open')
    .gte('date', now.toISOString())
    .lte('date', target.toISOString());

  if (error) throw error;
  return data;
}

export async function wasNotificationSent(ctaId) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('cta_notifications')
    .select('*')
    .eq('cta_id', ctaId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ? data.sent : false;
}

export async function markNotificationSent(ctaId) {
  const supabase = getClient();
  const { error } = await supabase
    .from('cta_notifications')
    .upsert({
      cta_id: ctaId,
      sent: true,
      sent_at: new Date().toISOString()
    }, { onConflict: 'cta_id', ignoreDuplicates: false });

  if (error) throw error;
}

export async function getPostulantHistory(userId) {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('cta_postulants')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  if (error) throw error;
  return data;
}

