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

export async function get_all_tracks() {
    const supabase = create_supabase_client();
    const PAGE_SIZE = 1000;
    let all = [];
    let from = 0;
    while (true) {
        const { data, error } = await supabase
            .from('Tracks')
            .select('name, artist, album, date')
            .gte('date', 946684800)
            .order('date', { ascending: true })
            .range(from, from + PAGE_SIZE - 1);
        if (error || !data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }
    return all;
}

export async function get_most_recent_track() {
    const supabase = create_supabase_client();
    const { data, error } = await supabase
    .from('Tracks')
    .select('*')
    .order('date', { ascending: false })
    .limit(1)
    return data[0];
}
