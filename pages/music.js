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
    tracks.forEach(t => {
        hourCounts[new Date(t.date * 1000).getHours()]++;
    });

    return { totalPlays, uniqueArtists, uniqueAlbums, topArtists, topSongs, topAlbums, hourCounts };
}

export async function getServerSideProps() {
    const tracks = await get_all_tracks();

    if (!tracks || tracks.length === 0) {
        return { props: { stats: null } };
    }

    const epochNow = Math.floor(Date.now() / 1000);
    const periodData = {
        all: computePeriodStats(tracks),
        year: computePeriodStats(tracks.filter(t => t.date >= epochNow - 365 * 24 * 3600)),
        thirtyDays: computePeriodStats(tracks.filter(t => t.date >= epochNow - 30 * 24 * 3600)),
        sevenDays: computePeriodStats(tracks.filter(t => t.date >= epochNow - 7 * 24 * 3600)),
    };

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

    return {
        props: {
            stats: {
                periodData,
                monthData,
                firstTrack: {
                    name: firstTrack.name,
                    artist: firstTrack.artist,
                    date: firstDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                },
                daysSince,
            },
        },
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
                <h2 className={utilStyles.headingLg}>Fun Facts</h2>
                <div className={styles.funFacts}>
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
                </div>
            </section>
        </Layout>
    );
}
