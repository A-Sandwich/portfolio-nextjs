import { useState } from 'react';
import Head from 'next/head';
import Layout from '../components/layout';
import utilStyles from '../styles/utils.module.css';
import styles from '../styles/music-stats.module.css';
import { get_all_tracks } from '../lib/music-tracking';

function computePeriodStats(tracks) {
    const totalPlays = tracks.length;
    const uniqueArtists = new Set(tracks.map(t => t.artist)).size;
    const uniqueAlbums = new Set(tracks.filter(t => t.album).map(t => t.album)).size;

    const artistCounts = {};
    tracks.forEach(t => { artistCounts[t.artist] = (artistCounts[t.artist] || 0) + 1; });
    const topArtists = Object.entries(artistCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

    const songCounts = {};
    tracks.forEach(t => {
        const key = `${t.name}|||${t.artist}`;
        songCounts[key] = (songCounts[key] || 0) + 1;
    });
    const topSongs = Object.entries(songCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([key, count]) => {
            const [name, artist] = key.split('|||');
            return { name, artist, count };
        });

    const albumCounts = {};
    tracks.forEach(t => {
        if (!t.album) return;
        albumCounts[t.album] = (albumCounts[t.album] || 0) + 1;
    });
    const topAlbums = Object.entries(albumCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

    const hourCounts = new Array(24).fill(0);
    const hourFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/New_York' });
    tracks.forEach(t => {
        hourCounts[parseInt(hourFmt.format(new Date(t.date * 1000)), 10) % 24]++;
    });

    const DAY_MAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayCounts = new Array(7).fill(0);
    const dayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/New_York' });
    tracks.forEach(t => {
        dayCounts[DAY_MAP[dayFmt.format(new Date(t.date * 1000))]]++;
    });

    return { totalPlays, uniqueArtists, uniqueAlbums, topArtists, topSongs, topAlbums, hourCounts, dayCounts };
}

export async function getStaticProps() {
    const tracks = await get_all_tracks();

    if (!tracks || tracks.length === 0) {
        return { props: { stats: null }, revalidate: 3600 };
    }

    const epochNow = Math.floor(Date.now() / 1000);
    const periodData = {
        all: computePeriodStats(tracks),
        year: computePeriodStats(tracks.filter(t => t.date >= epochNow - 365 * 24 * 3600)),
        thirtyDays: computePeriodStats(tracks.filter(t => t.date >= epochNow - 30 * 24 * 3600)),
        sevenDays: computePeriodStats(tracks.filter(t => t.date >= epochNow - 7 * 24 * 3600)),
    };

    // Plays per year — all-time
    const yearCounts = {};
    tracks.forEach(t => {
        const year = String(new Date(t.date * 1000).getFullYear());
        yearCounts[year] = (yearCounts[year] || 0) + 1;
    });
    const firstYear = new Date(tracks[0].date * 1000).getFullYear();
    const lastYear = new Date().getFullYear();
    const yearData = [];
    for (let y = firstYear; y <= lastYear; y++) {
        yearData.push({ label: String(y), count: yearCounts[y] || 0 });
    }

    // Last 12 months — always all-time
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const monthCounts = {};
    tracks.forEach(t => {
        const d = new Date(t.date * 1000);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthCounts[key] = (monthCounts[key] || 0) + 1;
    });
    const monthData = months.map(m => ({ label: m.slice(5), count: monthCounts[m] || 0 }));

    // Fun facts — always all-time
    const firstTrack = tracks[0];
    const firstDate = new Date(firstTrack.date * 1000);
    const daysSince = Math.floor((Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

    const avgPlaysPerDay = daysSince > 0 ? (tracks.length / daysSince).toFixed(1) : '0';

    // Single pass for song + artist counts (used for obsessions, one-hit wonders, unique songs, repeat rate)
    const songCountsAll = {};
    const artistCountsAll = {};
    const seenSongsOrdered = new Set();
    let repeatPlays = 0;
    tracks.forEach(t => {
        const key = `${t.name}|||${t.artist}`;
        songCountsAll[key] = (songCountsAll[key] || 0) + 1;
        artistCountsAll[t.artist] = (artistCountsAll[t.artist] || 0) + 1;
        if (seenSongsOrdered.has(key)) {
            repeatPlays++;
        } else {
            seenSongsOrdered.add(key);
        }
    });

    const uniqueSongs = Object.keys(songCountsAll).length;
    const obsessions = Object.values(songCountsAll).filter(c => c >= 10).length;
    const oneHitWonders = Object.values(artistCountsAll).filter(c => c === 1).length;
    const repeatRate = tracks.length > 0 ? Math.round((repeatPlays / tracks.length) * 100) : 0;

    const DOW_LABELS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
    const peakDowIndex = periodData.all.dayCounts.indexOf(Math.max(...periodData.all.dayCounts));
    const peakDow = DOW_LABELS[peakDowIndex];

    // Streak calculation using Eastern time date keys
    const etDateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' });
    const playedDays = new Set(tracks.map(t => etDateFmt.format(new Date(t.date * 1000))));
    const todayET = etDateFmt.format(new Date());

    let currentStreak = 0;
    const streakStart = new Date();
    if (!playedDays.has(todayET)) streakStart.setDate(streakStart.getDate() - 1);
    if (playedDays.has(etDateFmt.format(streakStart))) {
        const d = new Date(streakStart);
        while (playedDays.has(etDateFmt.format(d))) {
            currentStreak++;
            d.setDate(d.getDate() - 1);
        }
    }

    let longestStreak = 0;
    let runningStreak = 0;
    for (const d = new Date(firstDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
        if (playedDays.has(etDateFmt.format(d))) {
            runningStreak++;
            if (runningStreak > longestStreak) longestStreak = runningStreak;
        } else {
            runningStreak = 0;
        }
    }

    // Discovery trend — first appearance of each artist per month
    const seenArtists = new Set();
    const discoveryByMonth = {};
    tracks.forEach(t => {
        if (!seenArtists.has(t.artist)) {
            seenArtists.add(t.artist);
            const d = new Date(t.date * 1000);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            discoveryByMonth[key] = (discoveryByMonth[key] || 0) + 1;
        }
    });
    const discoveryTrendData = [];
    let dy = firstDate.getFullYear(), dm = firstDate.getMonth();
    const dEnd = new Date();
    while (dy < dEnd.getFullYear() || (dy === dEnd.getFullYear() && dm <= dEnd.getMonth())) {
        const key = `${dy}-${String(dm + 1).padStart(2, '0')}`;
        discoveryTrendData.push({ label: key.slice(5), count: discoveryByMonth[key] || 0 });
        dm++;
        if (dm > 11) { dm = 0; dy++; }
    }

    return {
        props: {
            stats: {
                periodData,
                yearData,
                monthData,
                firstTrack: {
                    name: firstTrack.name,
                    artist: firstTrack.artist,
                    date: firstDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                },
                daysSince,
                avgPlaysPerDay,
                uniqueSongs,
                peakDow,
                obsessions,
                oneHitWonders,
                currentStreak,
                longestStreak,
                repeatRate,
                discoveryTrendData,
            },
        },
        revalidate: 3600,
    };
}

function RankList({ items, labelKey, subKey }) {
    const max = items[0]?.count || 1;
    return (
        <ul className={styles.rankList}>
            {items.map((item, i) => (
                <li key={i} className={styles.rankItem}>
                    <div className={styles.rankMeta}>
                        <span className={styles.rankName}>
                            {i + 1}. {item[labelKey]}{subKey ? ` — ${item[subKey]}` : ''}
                        </span>
                        <span className={styles.rankCount}>{item.count.toLocaleString()}</span>
                    </div>
                    <div className={styles.barTrack}>
                        <div className={styles.bar} style={{ width: `${(item.count / max) * 100}%` }} />
                    </div>
                </li>
            ))}
        </ul>
    );
}

const PERIODS = [
    { key: 'all', label: 'All time' },
    { key: 'year', label: 'Past year' },
    { key: 'thirtyDays', label: 'Past 30 days' },
    { key: 'sevenDays', label: 'Past 7 days' },
];

export default function MusicStats({ stats }) {
    const [period, setPeriod] = useState('thirtyDays');

    if (!stats) {
        return (
            <Layout wide>
                <Head><title>Listening Stats</title></Head>
                <p>No listening data available.</p>
            </Layout>
        );
    }

    const pd = stats.periodData[period];
    const maxMonth = Math.max(...stats.monthData.map(m => m.count), 1);
    const maxHour = Math.max(...pd.hourCounts, 1);

    return (
        <Layout wide>
            <Head><title>Listening Stats — Kyle Burkholder</title></Head>

            <section className={utilStyles.headingMd}>
                <h1 className={utilStyles.headingXl}>Listening Stats</h1>
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
                    <div className={styles.statNumber}>{pd.totalPlays.toLocaleString()}</div>
                    <div className={styles.statLabel}>Total Plays</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statNumber}>{pd.uniqueArtists.toLocaleString()}</div>
                    <div className={styles.statLabel}>Unique Artists</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statNumber}>{pd.uniqueAlbums.toLocaleString()}</div>
                    <div className={styles.statLabel}>Unique Albums</div>
                </div>
            </div>

            <div className={styles.listsGrid}>
                <section>
                    <h2 className={utilStyles.headingLg}>Top Artists</h2>
                    <RankList items={pd.topArtists} labelKey="name" />
                </section>
                <section>
                    <h2 className={utilStyles.headingLg}>Top Songs</h2>
                    <RankList items={pd.topSongs} labelKey="name" subKey="artist" />
                </section>
            </div>

            <section>
                <h2 className={utilStyles.headingLg}>Top Albums</h2>
                <RankList items={pd.topAlbums} labelKey="name" />
            </section>

            <section>
                <h2 className={utilStyles.headingLg}>Peak Listening Hours</h2>
                <div className={styles.hourChart}>
                    {pd.hourCounts.map((count, i) => (
                        <div
                            key={i}
                            className={styles.hourBar}
                            style={{ height: `${(count / maxHour) * 100}%` }}
                            title={`${i}:00 — ${count.toLocaleString()} plays`}
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
                <h2 className={utilStyles.headingLg}>Peak Listening Days</h2>
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
                                        title={`${DAY_LABELS[i]}: ${count.toLocaleString()} plays`}
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

            {period === 'all' && (() => {
                const maxYear = Math.max(...stats.yearData.map(y => y.count), 1);
                return (
                    <section>
                        <h2 className={utilStyles.headingLg}>Plays per Year</h2>
                        <div className={styles.monthChart}>
                            {stats.yearData.map((y, i) => (
                                <div
                                    key={i}
                                    className={styles.monthBar}
                                    style={{ height: `${(y.count / maxYear) * 100}%` }}
                                    title={`${y.label}: ${y.count.toLocaleString()} plays`}
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

            <section>
                <h2 className={utilStyles.headingLg}>Plays per Month</h2>
                <div className={styles.monthChart}>
                    {stats.monthData.map((m, i) => (
                        <div
                            key={i}
                            className={styles.monthBar}
                            style={{ height: `${(m.count / maxMonth) * 100}%` }}
                            title={`${m.label}: ${m.count.toLocaleString()} plays`}
                        />
                    ))}
                </div>
                <div className={styles.monthLabels}>
                    {stats.monthData.map((m, i) => (
                        <div key={i} className={styles.monthLabel}>{m.label}</div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className={utilStyles.headingLg}>New Artists Discovered per Month</h2>
                {(() => {
                    const maxDisc = Math.max(...stats.discoveryTrendData.map(d => d.count), 1);
                    return (
                        <>
                            <div className={styles.monthChart}>
                                {stats.discoveryTrendData.map((d, i) => (
                                    <div
                                        key={i}
                                        className={styles.monthBar}
                                        style={{ height: `${(d.count / maxDisc) * 100}%` }}
                                        title={`${d.label}: ${d.count} new artist${d.count !== 1 ? 's' : ''}`}
                                    />
                                ))}
                            </div>
                            <div className={styles.monthLabels}>
                                {stats.discoveryTrendData.map((d, i) => (
                                    <div key={i} className={styles.monthLabel}>{d.label}</div>
                                ))}
                            </div>
                        </>
                    );
                })()}
            </section>

            <section>
                <h2 className={utilStyles.headingLg}>Fun Facts</h2>
                <div className={styles.funFactsWide}>
                    <div className={styles.factCard}>
                        <div className={styles.factLabel}>First tracked song</div>
                        <div className={styles.factValue}>{stats.firstTrack.name}</div>
                        <div className={styles.factSub}>{stats.firstTrack.artist} &middot; {stats.firstTrack.date}</div>
                    </div>
                    <div className={styles.factCard}>
                        <div className={styles.factLabel}>Listening since</div>
                        <div className={styles.factValue}>{stats.daysSince.toLocaleString()} days</div>
                        <div className={styles.factSub}>since {stats.firstTrack.date}</div>
                    </div>
                    <div className={styles.factCard}>
                        <div className={styles.factLabel}>Avg plays per day</div>
                        <div className={styles.factValue}>{stats.avgPlaysPerDay}</div>
                        <div className={styles.factSub}>all time</div>
                    </div>
                    <div className={styles.factCard}>
                        <div className={styles.factLabel}>Unique songs</div>
                        <div className={styles.factValue}>{stats.uniqueSongs.toLocaleString()}</div>
                        <div className={styles.factSub}>distinct tracks heard</div>
                    </div>
                    <div className={styles.factCard}>
                        <div className={styles.factLabel}>Peak day</div>
                        <div className={styles.factValue}>{stats.peakDow}</div>
                        <div className={styles.factSub}>most plays all time</div>
                    </div>
                    <div className={styles.factCard}>
                        <div className={styles.factLabel}>Obsessions</div>
                        <div className={styles.factValue}>{stats.obsessions.toLocaleString()}</div>
                        <div className={styles.factSub}>songs heard 10+ times</div>
                    </div>
                    <div className={styles.factCard}>
                        <div className={styles.factLabel}>One-hit wonders</div>
                        <div className={styles.factValue}>{stats.oneHitWonders.toLocaleString()}</div>
                        <div className={styles.factSub}>artists heard exactly once</div>
                    </div>
                    <div className={styles.factCard}>
                        <div className={styles.factLabel}>Current streak</div>
                        <div className={styles.factValue}>{stats.currentStreak} {stats.currentStreak === 1 ? 'day' : 'days'}</div>
                        <div className={styles.factSub}>consecutive days listening</div>
                    </div>
                    <div className={styles.factCard}>
                        <div className={styles.factLabel}>Longest streak</div>
                        <div className={styles.factValue}>{stats.longestStreak} {stats.longestStreak === 1 ? 'day' : 'days'}</div>
                        <div className={styles.factSub}>all time record</div>
                    </div>
                    <div className={styles.factCard}>
                        <div className={styles.factLabel}>Repeat rate</div>
                        <div className={styles.factValue}>{stats.repeatRate}%</div>
                        <div className={styles.factSub}>of plays are re-listens</div>
                    </div>
                </div>
            </section>
        </Layout>
    );
}
