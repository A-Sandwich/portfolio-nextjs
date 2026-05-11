const BASE = 'https://api.chess.com/pub';
export const CHESS_USERNAME = 'kb-19';

async function fetchJSON(url) {
    const res = await fetch(url, {
        headers: { 'User-Agent': 'portfolio-nextjs/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    return res.json();
}

export async function get_all_rapid_games() {
    const { archives } = await fetchJSON(`${BASE}/player/${CHESS_USERNAME}/games/archives`);
    let allGames = [];
    const BATCH = 5;
    for (let i = 0; i < archives.length; i += BATCH) {
        const batch = archives.slice(i, i + BATCH);
        const results = await Promise.all(
            batch.map(url => fetchJSON(url).catch(() => ({ games: [] })))
        );
        for (const { games } of results) {
            const rapid = (games || []).filter(g => g.time_class === 'rapid' && g.rated);
            allGames = allGames.concat(rapid);
        }
    }
    allGames.sort((a, b) => a.end_time - b.end_time);
    return allGames;
}

export async function get_player_stats() {
    return fetchJSON(`${BASE}/player/${CHESS_USERNAME}/stats`).catch(() => null);
}
