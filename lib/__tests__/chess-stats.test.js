import { getResult, getUserRating, computeRatingData, computeDeltaData, computePeriodStats } from '../chess-stats.js';

const U = 'kb-19';

// Build a minimal game object matching Chess.com's structure
function game(myRating, oppRating, myResult, oppResult, endTime) {
    return {
        white: { username: U, rating: myRating, result: myResult },
        black: { username: 'opponent', rating: oppRating, result: oppResult },
        end_time: Math.floor(endTime.getTime() / 1000),
        pgn: '',
        time_class: 'rapid',
        rated: true,
    };
}

// Dates matching the screenshot: May 6-10 2025
const MAY_6  = new Date('2025-05-06T20:00:00Z');
const MAY_7A = new Date('2025-05-07T14:00:00Z');
const MAY_7B = new Date('2025-05-07T15:00:00Z');
const MAY_8  = new Date('2025-05-08T18:00:00Z');
const MAY_9A = new Date('2025-05-09T13:00:00Z');
const MAY_9B = new Date('2025-05-09T14:00:00Z');
const MAY_10A = new Date('2025-05-10T12:00:00Z');
const MAY_10B = new Date('2025-05-10T13:00:00Z');
const MAY_10C = new Date('2025-05-10T14:00:00Z');

// Ratings from the screenshot: 777, 785, 793, 801, 793, 801, 805, 809, 813
const GAMES = [
    game(777, 800, 'win',      'resigned',  MAY_6),
    game(785, 800, 'win',      'resigned',  MAY_7A),
    game(793, 800, 'resigned', 'win',       MAY_7B),
    game(801, 800, 'win',      'resigned',  MAY_8),
    game(793, 800, 'resigned', 'win',       MAY_9A),
    game(801, 800, 'win',      'resigned',  MAY_9B),
    game(805, 800, 'win',      'resigned',  MAY_10A),
    game(809, 800, 'win',      'resigned',  MAY_10B),
    game(813, 800, 'win',      'resigned',  MAY_10C),
];

// ─── getResult ───────────────────────────────────────────────────────────────

describe('getResult', () => {
    test('returns win when white wins', () => {
        expect(getResult(game(1200, 1100, 'win', 'resigned', MAY_6), U)).toBe('win');
    });
    test('returns loss when white resigns', () => {
        expect(getResult(game(1200, 1100, 'resigned', 'win', MAY_6), U)).toBe('loss');
    });
    test('returns draw for stalemate', () => {
        const g = { ...game(1200, 1100, 'stalemate', 'stalemate', MAY_6) };
        g.white.result = 'stalemate'; g.black.result = 'stalemate';
        expect(getResult(g, U)).toBe('draw');
    });
    test('returns loss for timeout', () => {
        const g = game(1200, 1100, 'timeout', 'win', MAY_6);
        expect(getResult(g, U)).toBe('loss');
    });
});

// ─── getUserRating ────────────────────────────────────────────────────────────

describe('getUserRating', () => {
    test('returns white rating when user is white', () => {
        expect(getUserRating(game(1234, 1100, 'win', 'resigned', MAY_6), U)).toBe(1234);
    });
    test('returns black rating when user is black', () => {
        const g = {
            white: { username: 'opponent', rating: 1100, result: 'win' },
            black: { username: U, rating: 1234, result: 'resigned' },
            end_time: Math.floor(MAY_6.getTime() / 1000),
        };
        expect(getUserRating(g, U)).toBe(1234);
    });
});

// ─── computeRatingData ────────────────────────────────────────────────────────

describe('computeRatingData', () => {
    test('returns empty array for no games', () => {
        expect(computeRatingData([], 'game', U)).toEqual([]);
    });

    test('game granularity: one entry per game', () => {
        const result = computeRatingData(GAMES, 'game', U);
        expect(result).toHaveLength(9);
        expect(result.map(r => r.rating)).toEqual([777, 785, 793, 801, 793, 801, 805, 809, 813]);
    });

    test('day granularity: forward-fills non-play days', () => {
        // May 6 and May 8 only — May 7 should be forward-filled with May 6 rating
        const twoDay = [
            game(777, 800, 'win', 'resigned', MAY_6),
            game(801, 800, 'win', 'resigned', MAY_8),
        ];
        const result = computeRatingData(twoDay, 'day', U);
        expect(result).toHaveLength(3); // May 6, May 7 (fill), May 8
        expect(result[0].rating).toBe(777); // May 6 actual
        expect(result[1].rating).toBe(777); // May 7 forward-filled
        expect(result[2].rating).toBe(801); // May 8 actual
    });

    test('year granularity: one entry per calendar year', () => {
        const multiYear = [
            game(1000, 900, 'win', 'resigned', new Date('2022-06-01T12:00:00Z')),
            game(1050, 900, 'win', 'resigned', new Date('2022-12-01T12:00:00Z')),
            game(1100, 900, 'win', 'resigned', new Date('2023-06-01T12:00:00Z')),
        ];
        const result = computeRatingData(multiYear, 'year', U);
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ label: '2022', rating: 1050 }); // last game of 2022
        expect(result[1]).toEqual({ label: '2023', rating: 1100 });
    });
});

// ─── computeDeltaData ─────────────────────────────────────────────────────────

describe('computeDeltaData (day granularity)', () => {
    test('returns empty for fewer than 2 play days', () => {
        const oneDay = GAMES.filter(g => g.end_time === Math.floor(MAY_6.getTime() / 1000));
        expect(computeDeltaData(oneDay, 'day', U)).toEqual([]);
    });

    test('produces one fewer entry than distinct play days', () => {
        const result = computeDeltaData(GAMES, 'day', U);
        // 5 play days → 4 deltas
        expect(result).toHaveLength(4);
    });

    test('uses first game of each day as carry-in rating', () => {
        // May 7 first game: 785. May 8 first game: 801.
        // Delta for May 8 = 801 - 785 = +16
        const result = computeDeltaData(GAMES, 'day', U);
        const may8 = result.find(d => d.label === '05/08');
        expect(may8).toBeDefined();
        expect(may8.delta).toBe(16);
    });

    test('computes correct deltas for all screenshot days', () => {
        const result = computeDeltaData(GAMES, 'day', U);
        const byLabel = Object.fromEntries(result.map(d => [d.label, d.delta]));
        // May 7: first game 785, prev day (May 6) first game 777 → +8
        expect(byLabel['05/07']).toBe(8);
        // May 8: first game 801, prev (May 7) first game 785 → +16
        expect(byLabel['05/08']).toBe(16);
        // May 9: first game 793, prev (May 8) first game 801 → -8
        expect(byLabel['05/09']).toBe(-8);
        // May 10: first game 805, prev (May 9) first game 793 → +12
        expect(byLabel['05/10']).toBe(12);
    });

    test('skips non-play days entirely (no zero-delta noise)', () => {
        const result = computeDeltaData(GAMES, 'day', U);
        // Every entry should have a non-zero delta — no forward-fill zeros
        result.forEach(d => expect(d.delta).not.toBe(0));
    });
});

describe('computeDeltaData (year granularity)', () => {
    test('diffs end-of-year ratings', () => {
        const multiYear = [
            game(1000, 900, 'win', 'resigned', new Date('2022-06-01T12:00:00Z')),
            game(1050, 900, 'win', 'resigned', new Date('2022-12-01T12:00:00Z')),
            game(1100, 900, 'win', 'resigned', new Date('2023-06-01T12:00:00Z')),
            game(1080, 900, 'win', 'resigned', new Date('2023-12-01T12:00:00Z')),
        ];
        const result = computeDeltaData(multiYear, 'year', U);
        expect(result).toHaveLength(1);
        // 2023 end-of-year (1080) minus 2022 end-of-year (1050) = +30
        expect(result[0]).toEqual({ label: '2023', delta: 30 });
    });
});

// ─── computePeriodStats ───────────────────────────────────────────────────────

describe('computePeriodStats', () => {
    test('returns all-zero empty stats for no games', () => {
        const s = computePeriodStats([], U);
        expect(s.total).toBe(0);
        expect(s.wins).toBe(0);
        expect(s.winRate).toBe(0);
    });

    test('counts wins draws losses correctly', () => {
        const gs = [
            game(1200, 1100, 'win',      'resigned',  MAY_6),
            game(1200, 1100, 'resigned', 'win',       MAY_7A),
            game(1200, 1100, 'agreed',   'agreed',    MAY_7B),
        ];
        // Patch draw game results
        gs[2].white.result = 'agreed'; gs[2].black.result = 'agreed';
        const s = computePeriodStats(gs, U);
        expect(s.wins).toBe(1);
        expect(s.losses).toBe(1);
        expect(s.draws).toBe(1);
        expect(s.winRate).toBe(33);
    });

    test('win methods: opponent result drives the category', () => {
        const gs = [
            game(1200, 1100, 'win', 'checkmated', MAY_6),
            game(1200, 1100, 'win', 'resigned',   MAY_7A),
            game(1200, 1100, 'win', 'timeout',    MAY_7B),
        ];
        const s = computePeriodStats(gs, U);
        const methods = Object.fromEntries(s.winMethods.map(m => [m.name, m.count]));
        expect(methods['Checkmate']).toBe(1);
        expect(methods['Resignation']).toBe(1);
        expect(methods['On time']).toBe(1);
    });

    test('loss methods: own result drives the category', () => {
        const gs = [
            game(1200, 1100, 'checkmated', 'win', MAY_6),
            game(1200, 1100, 'timeout',    'win', MAY_7A),
        ];
        const s = computePeriodStats(gs, U);
        const methods = Object.fromEntries(s.lossMethods.map(m => [m.name, m.count]));
        expect(methods['Checkmate']).toBe(1);
        expect(methods['On time']).toBe(1);
    });

    test('opening extraction: ECOUrl is parsed correctly', () => {
        const g = game(1200, 1100, 'win', 'resigned', MAY_6);
        g.pgn = '[ECOUrl "https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation"]';
        const s = computePeriodStats([g], U);
        expect(s.topOpenings[0].name).toBe('Sicilian Defense');
    });
});
