import { createClient } from '@supabase/supabase-js';

const create_supabase_client = () => {
    console.log(process.env.supabase_url)
    return createClient(process.env.supabase_url, process.env.default_service_role_key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
    })
}

export default async function RecentTracks() {
    
  const { data: notes } = await supabase.from("Tracks").select();

  return <pre>{JSON.stringify(Tracks, null, 2)}</pre>
}

export async function get_most_recent_track() {
    const supabase = create_supabase_client();
    const { data, error } = await supabase
    .from('Tracks')
    .select('*')
    .order('date', { ascending: false })
    .limit(1)
    console.log("🙃", data, error)
    return data[0];
}
