import { useState } from 'react';
import Head from 'next/head';
import Layout from '../components/layout';
import utilStyles from '../styles/utils.module.css';
import styles from '../styles/chess-stats.module.css';
import { get_all_rapid_games, get_player_stats } from '../lib/chess-tracking';
import {
    CHESS_USERNAME,
    getResult,
    getUserRating,
    extractOpening,
    computeRatingData,
    computeDeltaData,
    computePeriodStats,
} from '../lib/chess-stats';

export async function getStaticProps() {
    const [games, playerStats] = await Promise.all([
        get_all_rapid_games(),
        get_player_stats(),
    ]);

    if (!games || games.length === 0) {
        return { props: { stats: null }, revalidate: 3600 };
    }

    const epochNow = Math.floor(Date.now() / 1000);
    const yearGames    = games.filter(g => g.end_time >= epochNow - 365 * 24 * 3600);
    const ninetyGames  = games.filter(g => g.end_time >= epochNow - 90  * 24 * 3600);
    const thirtyGames  = games.filter(g => g.end_time >= epochNow - 30  * 24 * 3600);
    const sevenGames   = games.filter(g => g.end_time >= epochNow - 7   * 24 * 3600);
    const periodData = {
        all:        { ...computePeriodStats(games),        ratingData: computeRatingData(games,        'month'), deltaData: computeDeltaData(games,        'year')  },
        year:       { ...computePeriodStats(yearGames),    ratingData: computeRatingData(yearGames,    'week'),  deltaData: computeDeltaData(yearGames,    'month') },
        ninetyDays: { ...computePeriodStats(ninetyGames),  ratingData: computeRatingData(ninetyGames,  'game'),  deltaData: computeDeltaData(ninetyGames,  'day')   },
        thirtyDays: { ...computePeriodStats(thirtyGames),  ratingData: computeRatingData(thirtyGames,  'game'),  deltaData: computeDeltaData(thirtyGames,  'day')   },
        sevenDays:  { ...computePeriodStats(sevenGames),   ratingData: computeRatingData(sevenGames,   'game'),  deltaData: computeDeltaData(sevenGames,   'day')   },
    };

    const firstDate = new Date(games[0].end_time * 1000);
    const now = new Date();

    // Games per month (last 12)
    const monthCounts = {};
    games.forEach(g => {
        const d = new Date(g.end_time * 1000);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthCounts[key] = (monthCounts[key] || 0) + 1;
    });
    const months = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const monthData = months.map(m => ({ label: m.slice(5), count: monthCounts[m] || 0 }));

    // Games per year
    const yearCounts = {};
    games.forEach(g => {
        const y = String(new Date(g.end_time * 1000).getFullYear());
        yearCounts[y] = (yearCounts[y] || 0) + 1;
    });
    const firstYear = firstDate.getFullYear();
    const lastYear = now.getFullYear();
    const yearData = [];
    for (let y = firstYear; y <= lastYear; y++) {
        yearData.push({ label: String(y), count: yearCounts[y] || 0 });
    }

    // Win/loss streaks (all time)
    let maxWinStreak = 0, curWin = 0, maxLossStreak = 0, curLoss = 0;
    games.forEach(g => {
        const r = getResult(g);
        if (r === 'win') { curWin++; curLoss = 0; }
        else if (r === 'loss') { curLoss++; curWin = 0; }
        else { curWin = 0; curLoss = 0; }
        if (curWin > maxWinStreak) maxWinStreak = curWin;
        if (curLoss > maxLossStreak) maxLossStreak = curLoss;
    });

    // Best win (vs highest-rated opponent)
    let bestWin = null;
    games.forEach(g => {
        if (getResult(g) === 'win') {
            const isW = g.white.username.toLowerCase() === CHESS_USERNAME.toLowerCase();
            const oppRating = isW ? g.black.rating : g.white.rating;
            const oppName = isW ? g.black.username : g.white.username;
            if (!bestWin || oppRating > bestWin.oppRating) {
                bestWin = {
                    oppRating,
                    oppName,
                    date: new Date(g.end_time * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                };
            }
        }
    });

    // Average accuracy (subset of games have this)
    let accSum = 0, accCnt = 0;
    games.forEach(g => {
        if (g.accuracies) {
            const isW = g.white.username.toLowerCase() === CHESS_USERNAME.toLowerCase();
            const acc = isW ? g.accuracies.white : g.accuracies.black;
            if (typeof acc === 'number') { accSum += acc; accCnt++; }
        }
    });

    // Player stats from API
    const rapid = playerStats?.chess_rapid;
    const currentRating = rapid?.last?.rating ?? getUserRating(games[games.length - 1]);
    const bestRating = rapid?.best?.rating ?? currentRating;
    const puzzleRating = playerStats?.tactics?.highest?.rating ?? null;
    const puzzleRushBest = playerStats?.puzzle_rush?.best?.score ?? null;

    // Most active month (all time)
    const mostActiveMonth = Object.entries(monthCounts)
        .sort(([, a], [, b]) => b - a)[0] ?? null;

    return {
        props: {
            stats: {
                periodData,
                monthData,
                yearData,
                firstGameDate: firstDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                bestWin,
                currentRating,
                bestRating,
                puzzleRating,
                puzzleRushBest,
                maxWinStreak,
                maxLossStreak,
                avgAccuracy: accCnt > 0 ? (accSum / accCnt).toFixed(1) : null,
                mostActiveMonth: mostActiveMonth
                    ? { label: mostActiveMonth[0], count: mostActiveMonth[1] }
                    : null,
                totalGamesAllTime: games.length,
                lastUpdated: new Date().toLocaleString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                    hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York', timeZoneName: 'short',
                }),
            },
        },
        revalidate: 3600,
    };
}

function WdlBar({ wins, draws, losses, total }) {
    if (!total) return null;
    const wp = (wins / total) * 100;
    const dp = (draws / total) * 100;
    const lp = (losses / total) * 100;
    return (
        <div className={styles.wdlWrap}>
            <div className={styles.wdlBar}>
                <div
                    className={`${styles.wdlSeg} ${styles.wdlWin}`}
                    style={{ width: `${wp}%` }}
                    title={`${wins.toLocaleString()} wins`}
                />
                <div
                    className={`${styles.wdlSeg} ${styles.wdlDraw}`}
                    style={{ width: `${dp}%` }}
                    title={`${draws.toLocaleString()} draws`}
                />
                <div
                    className={`${styles.wdlSeg} ${styles.wdlLoss}`}
                    style={{ width: `${lp}%` }}
                    title={`${losses.toLocaleString()} losses`}
                />
            </div>
            <div className={styles.wdlLegend}>
                <span className={styles.wdlWinLabel}>{wins.toLocaleString()} W &middot; {Math.round(wp)}%</span>
                <span className={styles.wdlDrawLabel}>{draws.toLocaleString()} D &middot; {Math.round(dp)}%</span>
                <span className={styles.wdlLossLabel}>{losses.toLocaleString()} L &middot; {Math.round(lp)}%</span>
            </div>
        </div>
    );
}

function RatingLineChart({ ratingData }) {
    if (!ratingData || ratingData.length === 0) return <p>No games in this period.</p>;
    if (ratingData.length === 1) {
        return <p className={styles.ratingNoData}>Only one data point ({ratingData[0].rating}) — play more games to see a trend.</p>;
    }

    const W = 600, H = 160;
    const pad = { top: 20, right: 10, bottom: 28, left: 42 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    const ratings = ratingData.map(r => r.rating);
    const minR = Math.min(...ratings);
    const maxR = Math.max(...ratings);
    const rRange = maxR - minR || 40;
    const displayMin = minR - Math.ceil(rRange * 0.1);
    const displayMax = maxR + Math.ceil(rRange * 0.1);
    const displayRange = displayMax - displayMin;
    const n = ratingData.length;

    const px = i => pad.left + (i / Math.max(n - 1, 1)) * plotW;
    const py = rating => pad.top + (1 - (rating - displayMin) / displayRange) * plotH;

    const linePoints = ratingData.map((r, i) => `${px(i).toFixed(1)},${py(r.rating).toFixed(1)}`).join(' ');
    const fillPoints = [
        ...ratingData.map((r, i) => `${px(i).toFixed(1)},${py(r.rating).toFixed(1)}`),
        `${px(n - 1).toFixed(1)},${(pad.top + plotH).toFixed(1)}`,
        `${px(0).toFixed(1)},${(pad.top + plotH).toFixed(1)}`,
    ].join(' ');

    const yTickCount = 4;
    const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => {
        const rating = displayMin + (i / yTickCount) * displayRange;
        return { rating: Math.round(rating), y: py(rating) };
    });

    const isYearMonth = /^\d{4}-\d{2}$/.test(ratingData[0].label);
    const maxXLabels = 10;
    const xStep = Math.ceil(n / maxXLabels);

    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const tooltipLabel = label => {
        if (/^\d{4}-\d{2}$/.test(label)) {
            const [year, month] = label.split('-');
            return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
        }
        return label;
    };

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible', marginTop: '1rem' }}
            aria-label="Rating history line chart"
        >
            <defs>
                <linearGradient id="ratingLineFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f34e00" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#f34e00" stopOpacity="0.02" />
                </linearGradient>
            </defs>

            {yTicks.map((t, i) => (
                <g key={i}>
                    <line x1={pad.left} y1={t.y.toFixed(1)} x2={W - pad.right} y2={t.y.toFixed(1)} stroke="#e5e7eb" strokeWidth="1" />
                    <text x={pad.left - 5} y={t.y.toFixed(1)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#9ca3af">{t.rating}</text>
                </g>
            ))}

            <polygon points={fillPoints} fill="url(#ratingLineFill)" />

            <polyline points={linePoints} fill="none" stroke="#f34e00" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

            {n <= 60 && ratingData.map((r, i) => (
                <circle
                    key={i}
                    cx={px(i).toFixed(1)}
                    cy={py(r.rating).toFixed(1)}
                    r="3"
                    fill="#f34e00"
                    stroke="white"
                    strokeWidth="1.5"
                    aria-label={`${tooltipLabel(r.label)}: ${r.rating}`}
                />
            ))}

            {ratingData.map((r, i) => {
                if (isYearMonth) {
                    if (!r.label.endsWith('-01') && i !== 0) return null;
                    return (
                        <text key={i} x={px(i).toFixed(1)} y={H - 5} textAnchor="middle" fontSize="10" fill="#9ca3af">{r.label.slice(0, 4)}</text>
                    );
                }
                if (i % xStep !== 0) return null;
                return (
                    <text key={i} x={px(i).toFixed(1)} y={H - 5} textAnchor="middle" fontSize="10" fill="#9ca3af">{r.label}</text>
                );
            })}
        </svg>
    );
}

function OpeningList({ openings }) {
    if (!openings.length) return <p>No data for this period.</p>;
    const maxCount = openings[0].count;
    return (
        <ul className={styles.openingList}>
            {openings.map((o, i) => (
                <li key={i} className={styles.openingItem}>
                    <div className={styles.openingMeta}>
                        <span className={styles.openingName}>{i + 1}. {o.name}</span>
                        <span className={styles.openingStats}>{o.count} games &middot; {o.winRate}% win</span>
                    </div>
                    <div className={styles.barTrack}>
                        <div className={styles.bar} style={{ width: `${(o.count / maxCount) * 100}%` }} />
                    </div>
                </li>
            ))}
        </ul>
    );
}

const PERIODS = [
    { key: 'all',        label: 'All time'     },
    { key: 'year',       label: 'Past year'    },
    { key: 'ninetyDays', label: 'Past 90 days' },
    { key: 'thirtyDays', label: 'Past 30 days' },
    { key: 'sevenDays',  label: 'Past 7 days'  },
];

const DELTA_LABEL = {
    all: 'Yearly',
    year: 'Monthly',
    ninetyDays: 'Daily',
    thirtyDays: 'Daily',
    sevenDays: 'Daily',
};

export default function ChessStats({ stats }) {
    const [period, setPeriod] = useState('thirtyDays');

    if (!stats) {
        return (
            <Layout wide>
                <Head><title>Chess Stats</title></Head>
                <p>No chess data available.</p>
            </Layout>
        );
    }

    const pd = stats.periodData[period];
    const maxHour = Math.max(...pd.hourCounts, 1);
    const maxMonth = Math.max(...stats.monthData.map(m => m.count), 1);

    return (
        <Layout wide>
            <Head><title>Chess Stats — Kyle Burkholder</title></Head>

            <section className={utilStyles.headingMd}>
                <h1 className={utilStyles.headingXl}>Chess Stats</h1>
                <p className={styles.lastUpdated}>Updated {stats.lastUpdated}</p>
            </section>

            <div className={styles.periodToggle}>
                {PERIODS.map(p => (
                    <button
                        key={p.key}
                        className={`${styles.periodBtn}${period === p.key ? ` ${styles.periodBtnActive}` : ''}`}
                        onClick={() => setPeriod(p.key)}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            <div className={styles.heroGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statNumber}>{pd.total.toLocaleString()}</div>
                    <div className={styles.statLabel}>Games Played</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statNumber}>{pd.winRate}%</div>
                    <div className={styles.statLabel}>Win Rate</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statNumber}>{stats.currentRating.toLocaleString()}</div>
                    <div className={styles.statLabel}>Current Rating</div>
                </div>
            </div>

            <section>
                <h2 className={utilStyles.headingLg}>Results</h2>
                <WdlBar wins={pd.wins} draws={pd.draws} losses={pd.losses} total={pd.total} />
            </section>

            <section>
                <h2 className={utilStyles.headingLg}>Rating History</h2>
                <RatingLineChart ratingData={pd.ratingData} />
            </section>

            {(pd.winMethods.length > 0 || pd.lossMethods.length > 0) && (
                <section>
                    <h2 className={utilStyles.headingLg}>How Games End</h2>
                    <div className={styles.termGrid}>
                        {pd.winMethods.length > 0 && (
                            <div>
                                <h3 className={styles.termHeading}>How I win</h3>
                                <ul className={styles.openingList}>
                                    {pd.winMethods.map((m, i) => (
                                        <li key={i} className={styles.openingItem}>
                                            <div className={styles.openingMeta}>
                                                <span className={styles.openingName}>{m.name}</span>
                                                <span className={styles.openingStats}>{m.count}</span>
                                            </div>
                                            <div className={styles.barTrack}>
                                                <div className={styles.barWin} style={{ width: `${(m.count / pd.winMethods[0].count) * 100}%` }} />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {pd.lossMethods.length > 0 && (
                            <div>
                                <h3 className={styles.termHeading}>How I lose</h3>
                                <ul className={styles.openingList}>
                                    {pd.lossMethods.map((m, i) => (
                                        <li key={i} className={styles.openingItem}>
                                            <div className={styles.openingMeta}>
                                                <span className={styles.openingName}>{m.name}</span>
                                                <span className={styles.openingStats}>{m.count}</span>
                                            </div>
                                            <div className={styles.barTrack}>
                                                <div className={styles.barLoss} style={{ width: `${(m.count / pd.lossMethods[0].count) * 100}%` }} />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </section>
            )}

            <section>
                <h2 className={utilStyles.headingLg}>Performance by Color</h2>
                <div className={styles.colorGrid}>
                    <div className={`${styles.colorCard} ${styles.colorWhite}`}>
                        <div className={styles.colorPiece}>♔</div>
                        <div className={styles.colorLabel}>White</div>
                        <div className={styles.colorRate}>{pd.whiteWinRate}%</div>
                        <div className={styles.colorSub}>{pd.whiteGames} games</div>
                    </div>
                    <div className={`${styles.colorCard} ${styles.colorBlack}`}>
                        <div className={styles.colorPiece}>♚</div>
                        <div className={styles.colorLabel}>Black</div>
                        <div className={styles.colorRate}>{pd.blackWinRate}%</div>
                        <div className={styles.colorSub}>{pd.blackGames} games</div>
                    </div>
                </div>
            </section>

            <section>
                <h2 className={utilStyles.headingLg}>Top Openings</h2>
                <OpeningList openings={pd.topOpenings} />
            </section>

            <section>
                <h2 className={utilStyles.headingLg}>Peak Playing Hours</h2>
                <div className={styles.hourChart}>
                    {pd.hourCounts.map((count, i) => (
                        <div
                            key={i}
                            className={styles.hourBar}
                            style={{ height: `${(count / maxHour) * 100}%` }}
                            title={`${i}:00 — ${count.toLocaleString()} games`}
                        />
                    ))}
                </div>
                <div className={styles.hourLabels}>
                    {pd.hourCounts.map((_, i) => (
                        <div key={i} className={styles.hourLabel}>{i % 6 === 0 ? `${i}h` : ''}</div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className={utilStyles.headingLg}>Peak Playing Days</h2>
                {(() => {
                    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const maxDay = Math.max(...pd.dayCounts, 1);
                    return (
                        <>
                            <div className={styles.monthChart}>
                                {pd.dayCounts.map((count, i) => (
                                    <div
                                        key={i}
                                        className={styles.monthBar}
                                        style={{ height: `${(count / maxDay) * 100}%` }}
                                        title={`${DAY_LABELS[i]}: ${count.toLocaleString()} games`}
                                    />
                                ))}
                            </div>
                            <div className={styles.monthLabels}>
                                {DAY_LABELS.map((label, i) => (
                                    <div key={i} className={styles.monthLabel}>{label}</div>
                                ))}
                            </div>
                        </>
                    );
                })()}
            </section>

            <section>
                <h2 className={utilStyles.headingLg}>Games per Month</h2>
                <div className={styles.monthChart}>
                    {stats.monthData.map((m, i) => (
                        <div
                            key={i}
                            className={styles.monthBar}
                            style={{ height: `${(m.count / maxMonth) * 100}%` }}
                            title={`${m.label}: ${m.count.toLocaleString()} games`}
                        />
                    ))}
                </div>
                <div className={styles.monthLabels}>
                    {stats.monthData.map((m, i) => (
                        <div key={i} className={styles.monthLabel}>{m.label}</div>
                    ))}
                </div>
            </section>

            {period === 'all' && (() => {
                const maxYear = Math.max(...stats.yearData.map(y => y.count), 1);
                return (
                    <section>
                        <h2 className={utilStyles.headingLg}>Games per Year</h2>
                        <div className={styles.monthChart}>
                            {stats.yearData.map((y, i) => (
                                <div
                                    key={i}
                                    className={styles.monthBar}
                                    style={{ height: `${(y.count / maxYear) * 100}%` }}
                                    title={`${y.label}: ${y.count.toLocaleString()} games`}
                                />
                            ))}
                        </div>
                        <div className={styles.monthLabels}>
                            {stats.yearData.map((y, i) => (
                                <div key={i} className={styles.monthLabel}>{y.label}</div>
                            ))}
                        </div>
                    </section>
                );
            })()}

            {pd.deltaData.length > 0 && (() => {
                const maxAbs = Math.max(...pd.deltaData.map(d => Math.abs(d.delta)), 1);
                const fmtDeltaLabel = label => {
                    if (/^\d{4}-\d{2}$/.test(label)) {
                        const [year, month] = label.split('-');
                        const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                        return `${names[parseInt(month, 10) - 1]} ${year}`;
                    }
                    return label;
                };
                const rangeLabel = `${fmtDeltaLabel(pd.deltaData[0].label)} – ${fmtDeltaLabel(pd.deltaData[pd.deltaData.length - 1].label)}`;
                return (
                    <section>
                        <h2 className={utilStyles.headingLg}>{DELTA_LABEL[period]} Rating Delta</h2>
                        <div className={styles.deltaChartWrap}>
                            <div className={styles.deltaChart}>
                                {pd.deltaData.map((d, i) => (
                                    <div
                                        key={i}
                                        className={styles.deltaCol}
                                        title={`${d.label}: ${d.delta > 0 ? '+' : ''}${d.delta}`}
                                    >
                                        <div className={styles.deltaTop}>
                                            {d.delta > 0 && (
                                                <div className={styles.deltaPos} style={{ height: `${(d.delta / maxAbs) * 100}%` }} />
                                            )}
                                        </div>
                                        <div className={styles.deltaBot}>
                                            {d.delta < 0 && (
                                                <div className={styles.deltaNeg} style={{ height: `${(Math.abs(d.delta) / maxAbs) * 100}%` }} />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <p className={styles.deltaRange}>{rangeLabel}</p>
                    </section>
                );
            })()}

            <section>
                <h2 className={utilStyles.headingLg}>Fun Facts</h2>
                <div className={styles.funFactsWide}>
                    <div className={styles.factCard}>
                        <div className={styles.factLabel}>First game</div>
                        <div className={styles.factValue}>{stats.firstGameDate}</div>
                        <div className={styles.factSub}>rapid debut</div>
                    </div>
                    <div className={styles.factCard}>
                        <div className={styles.factLabel}>Total rapid games</div>
                        <div className={styles.factValue}>{stats.totalGamesAllTime.toLocaleString()}</div>
                        <div className={styles.factSub}>all time</div>
                    </div>
                    <div className={styles.factCard}>
                        <div className={styles.factLabel}>Best rating</div>
                        <div className={styles.factValue}>{stats.bestRating.toLocaleString()}</div>
                        <div className={styles.factSub}>rapid all time peak</div>
                    </div>
                    {stats.puzzleRating && (
                        <div className={styles.factCard}>
                            <div className={styles.factLabel}>Puzzle rating</div>
                            <div className={styles.factValue}>{stats.puzzleRating.toLocaleString()}</div>
                            <div className={styles.factSub}>highest ever</div>
                        </div>
                    )}
                    {stats.puzzleRushBest !== null && stats.puzzleRushBest !== undefined && (
                        <div className={styles.factCard}>
                            <div className={styles.factLabel}>Puzzle Rush best</div>
                            <div className={styles.factValue}>{stats.puzzleRushBest}</div>
                            <div className={styles.factSub}>puzzles in 5 min</div>
                        </div>
                    )}
                    <div className={styles.factCard}>
                        <div className={styles.factLabel}>Longest win streak</div>
                        <div className={styles.factValue}>{stats.maxWinStreak}</div>
                        <div className={styles.factSub}>consecutive wins</div>
                    </div>
                    <div className={styles.factCard}>
                        <div className={styles.factLabel}>Longest loss streak</div>
                        <div className={styles.factValue}>{stats.maxLossStreak}</div>
                        <div className={styles.factSub}>consecutive losses</div>
                    </div>
                    {stats.bestWin && (
                        <div className={styles.factCard}>
                            <div className={styles.factLabel}>Best win</div>
                            <div className={styles.factValue}>vs {stats.bestWin.oppRating}</div>
                            <div className={styles.factSub}>{stats.bestWin.oppName} &middot; {stats.bestWin.date}</div>
                        </div>
                    )}
                    {stats.avgAccuracy && (
                        <div className={styles.factCard}>
                            <div className={styles.factLabel}>Avg accuracy</div>
                            <div className={styles.factValue}>{stats.avgAccuracy}%</div>
                            <div className={styles.factSub}>where data is available</div>
                        </div>
                    )}
                    {stats.mostActiveMonth && (
                        <div className={styles.factCard}>
                            <div className={styles.factLabel}>Most active month</div>
                            <div className={styles.factValue}>{stats.mostActiveMonth.label}</div>
                            <div className={styles.factSub}>{stats.mostActiveMonth.count} games</div>
                        </div>
                    )}
                </div>
            </section>
        </Layout>
    );
}
