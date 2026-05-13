import { CHESS_USERNAME } from './chess-tracking.js';

export { CHESS_USERNAME };

const WIN_RESULTS = new Set(['win']);
const DRAW_RESULTS = new Set(['agreed', 'repetition', 'stalemate', 'insufficient', 'timevsinsufficient', '50move']);

export function getResult(game, username = CHESS_USERNAME) {
    const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
    const result = isWhite ? game.white.result : game.black.result;
    if (WIN_RESULTS.has(result)) return 'win';
    if (DRAW_RESULTS.has(result)) return 'draw';
    return 'loss';
}

export function getUserRating(game, username = CHESS_USERNAME) {
    return game.white.username.toLowerCase() === username.toLowerCase()
        ? game.white.rating
        : game.black.rating;
}

export function extractOpening(pgn) {
    const ecoMatch = pgn?.match(/\[ECOUrl "https:\/\/www\.chess\.com\/openings\/([^"]+)"\]/);
    if (ecoMatch) {
        const words = ecoMatch[1].split('-');
        const FAMILY_ENDINGS = new Set(['defense', 'opening', 'gambit', 'game', 'system']);
        let end = words.length;
        for (let i = 0; i < words.length; i++) {
            if (FAMILY_ENDINGS.has(words[i].toLowerCase())) { end = i + 1; break; }
        }
        return words.slice(0, end).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
    const openingMatch = pgn?.match(/\[Opening "([^"]+)"\]/);
    if (openingMatch) return openingMatch[1].split(':')[0].trim();
    return 'Unknown';
}

export function termMethod(result) {
    if (result === 'checkmated') return 'Checkmate';
    if (result === 'timeout' || result === 'timevsinsufficient') return 'On time';
    if (result === 'resigned') return 'Resignation';
    if (result === 'abandoned') return 'Abandoned';
    return null;
}

export function sortedMethods(map) {
    return Object.entries(map).sort(([, a], [, b]) => b - a).map(([name, count]) => ({ name, count }));
}

export function computeRatingData(games, granularity, username = CHESS_USERNAME) {
    if (games.length === 0) return [];

    if (granularity === 'game') {
        return games.map(g => ({
            label: new Date(g.end_time * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            rating: getUserRating(g, username),
        }));
    }

    if (granularity === 'day') {
        const byDay = {};
        games.forEach(g => {
            const d = new Date(g.end_time * 1000);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            byDay[key] = getUserRating(g, username);
        });
        const firstD = new Date(games[0].end_time * 1000);
        const lastD = new Date(games[games.length - 1].end_time * 1000);
        const cursor = new Date(firstD);
        cursor.setHours(0, 0, 0, 0);
        let lastRating = getUserRating(games[0], username);
        const result = [];
        while (cursor <= lastD) {
            const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
            if (byDay[key] !== undefined) lastRating = byDay[key];
            result.push({
                label: `${String(cursor.getMonth() + 1).padStart(2, '0')}/${String(cursor.getDate()).padStart(2, '0')}`,
                rating: lastRating,
            });
            cursor.setDate(cursor.getDate() + 1);
        }
        return result;
    }

    if (granularity === 'year') {
        const byYear = {};
        games.forEach(g => {
            const y = String(new Date(g.end_time * 1000).getFullYear());
            byYear[y] = getUserRating(g, username);
        });
        const firstYear = new Date(games[0].end_time * 1000).getFullYear();
        const lastYear = new Date(games[games.length - 1].end_time * 1000).getFullYear();
        let lastRating = getUserRating(games[0], username);
        const result = [];
        for (let y = firstYear; y <= lastYear; y++) {
            const key = String(y);
            if (byYear[key] !== undefined) lastRating = byYear[key];
            result.push({ label: key, rating: lastRating });
        }
        return result;
    }

    if (granularity === 'week') {
        const byWeek = {};
        games.forEach(g => {
            const d = new Date(g.end_time * 1000);
            const daysToMon = d.getDay() === 0 ? -6 : 1 - d.getDay();
            const mon = new Date(d);
            mon.setDate(d.getDate() + daysToMon);
            mon.setHours(0, 0, 0, 0);
            byWeek[mon.toISOString().slice(0, 10)] = getUserRating(g, username);
        });
        const firstD = new Date(games[0].end_time * 1000);
        const cursor = new Date(firstD);
        cursor.setDate(firstD.getDate() + (firstD.getDay() === 0 ? -6 : 1 - firstD.getDay()));
        cursor.setHours(0, 0, 0, 0);
        const lastD = new Date(games[games.length - 1].end_time * 1000);
        let lastRating = getUserRating(games[0], username);
        const result = [];
        while (cursor <= lastD) {
            const key = cursor.toISOString().slice(0, 10);
            if (byWeek[key] !== undefined) lastRating = byWeek[key];
            result.push({
                label: `${String(cursor.getMonth() + 1).padStart(2, '0')}/${String(cursor.getDate()).padStart(2, '0')}`,
                rating: lastRating,
            });
            cursor.setDate(cursor.getDate() + 7);
        }
        return result;
    }

    // month
    const byMonth = {};
    games.forEach(g => {
        const d = new Date(g.end_time * 1000);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        byMonth[key] = getUserRating(g, username);
    });
    const firstDate = new Date(games[0].end_time * 1000);
    const now = new Date();
    let ry = firstDate.getFullYear(), rm = firstDate.getMonth();
    let lastRating = getUserRating(games[0], username);
    const result = [];
    while (ry < now.getFullYear() || (ry === now.getFullYear() && rm <= now.getMonth())) {
        const key = `${ry}-${String(rm + 1).padStart(2, '0')}`;
        if (byMonth[key] !== undefined) lastRating = byMonth[key];
        result.push({ label: key, rating: lastRating });
        rm++;
        if (rm > 11) { rm = 0; ry++; }
    }
    return result;
}

export function computeDeltaData(games, granularity, username = CHESS_USERNAME) {
    if (granularity === 'day') {
        const byDay = {};
        games.forEach(g => {
            const d = new Date(g.end_time * 1000);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (!(key in byDay)) byDay[key] = getUserRating(g, username);
        });
        const days = Object.keys(byDay).sort();
        if (days.length < 2) return [];
        return days.slice(1).map((key, i) => ({
            label: `${key.slice(5, 7)}/${key.slice(8)}`,
            delta: byDay[key] - byDay[days[i]],
        }));
    }
    const rd = computeRatingData(games, granularity, username);
    if (rd.length < 2) return [];
    return rd.slice(1).map((r, i) => ({ label: r.label, delta: r.rating - rd[i].rating }));
}

export function computePeriodStats(games, username = CHESS_USERNAME) {
    const total = games.length;
    const empty = {
        total: 0, wins: 0, draws: 0, losses: 0,
        winRate: 0, drawRate: 0, lossRate: 0,
        whiteGames: 0, whiteWins: 0, whiteWinRate: 0,
        blackGames: 0, blackWins: 0, blackWinRate: 0,
        topOpenings: [],
        hourCounts: new Array(24).fill(0),
        dayCounts: new Array(7).fill(0),
        winMethods: [], lossMethods: [],
    };
    if (total === 0) return empty;

    let wins = 0, draws = 0, losses = 0;
    let whiteWins = 0, whiteDraws = 0, whiteLosses = 0;
    let blackWins = 0, blackDraws = 0, blackLosses = 0;
    const openingMap = {};
    const hourCounts = new Array(24).fill(0);
    const dayCounts = new Array(7).fill(0);
    const winMethodMap = {}, lossMethodMap = {};
    const DAY_MAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/New_York' });
    const hourFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/New_York' });

    games.forEach(g => {
        const result = getResult(g, username);
        if (result === 'win') wins++;
        else if (result === 'draw') draws++;
        else losses++;

        const isWhite = g.white.username.toLowerCase() === username.toLowerCase();
        const myRaw = isWhite ? g.white.result : g.black.result;
        const oppRaw = isWhite ? g.black.result : g.white.result;

        if (isWhite) {
            if (result === 'win') whiteWins++;
            else if (result === 'draw') whiteDraws++;
            else whiteLosses++;
        } else {
            if (result === 'win') blackWins++;
            else if (result === 'draw') blackDraws++;
            else blackLosses++;
        }

        if (result === 'win') {
            const m = termMethod(oppRaw);
            if (m) winMethodMap[m] = (winMethodMap[m] || 0) + 1;
        } else if (result === 'loss') {
            const m = termMethod(myRaw);
            if (m) lossMethodMap[m] = (lossMethodMap[m] || 0) + 1;
        }

        const opening = extractOpening(g.pgn);
        if (!openingMap[opening]) openingMap[opening] = { total: 0, wins: 0, draws: 0, losses: 0 };
        openingMap[opening].total++;
        if (result === 'win') openingMap[opening].wins++;
        else if (result === 'draw') openingMap[opening].draws++;
        else openingMap[opening].losses++;

        const d = new Date(g.end_time * 1000);
        hourCounts[parseInt(hourFmt.format(d), 10) % 24]++;
        dayCounts[DAY_MAP[dayFmt.format(d)]]++;
    });

    const whiteGames = whiteWins + whiteDraws + whiteLosses;
    const blackGames = blackWins + blackDraws + blackLosses;

    const topOpenings = Object.entries(openingMap)
        .sort(([, a], [, b]) => b.total - a.total)
        .slice(0, 10)
        .map(([name, s]) => ({
            name, count: s.total, wins: s.wins, draws: s.draws, losses: s.losses,
            winRate: Math.round((s.wins / s.total) * 100),
        }));

    return {
        total, wins, draws, losses,
        winRate: Math.round((wins / total) * 100),
        drawRate: Math.round((draws / total) * 100),
        lossRate: Math.round((losses / total) * 100),
        whiteGames, whiteWins,
        whiteWinRate: whiteGames > 0 ? Math.round((whiteWins / whiteGames) * 100) : 0,
        blackGames, blackWins,
        blackWinRate: blackGames > 0 ? Math.round((blackWins / blackGames) * 100) : 0,
        topOpenings, hourCounts, dayCounts,
        winMethods: sortedMethods(winMethodMap),
        lossMethods: sortedMethods(lossMethodMap),
    };
}
