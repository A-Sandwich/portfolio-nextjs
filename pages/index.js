import Head from 'next/head';
import Layout, { siteTitle } from '../components/layout';
import utilStyles from '../styles/utils.module.css';
import Link from 'next/link';
import { getSortedPostsData } from '../lib/posts';
import { getSortedGameData } from '../lib/godot-games';
import Date from '../components/date';
import Image from 'next/image';

export async function getStaticProps() {
  const allPostsData = getSortedPostsData();
  const allGamesData = getSortedGameData();
  return {
    props: {
      allPostsData,
      allGamesData
    },
  };
}

export default function Home({ allPostsData, allGamesData }) {
  let blogSection = <section className={`${utilStyles.headingMd} ${utilStyles.padding1px}`}>
  <h2 className={utilStyles.headingLg}>Blog</h2>
  <ul className={utilStyles.list}>
    {allPostsData.map(({ id, date, title }) => (
      <li className={utilStyles.listItem} key={id}>
        <Link href={`/posts/${id}`}>{title}</Link>
        <br />
        <small className={utilStyles.lightText}>
          <Date dateString={date} />
        </small>
      </li>
    ))}
  </ul>
</section>
  return (
    <Layout home>
      <Head>
        <title>{siteTitle}</title>
      </Head>
      <section className={utilStyles.headingMd}>
        <div className='links'>
          <Link href="https://mastodon.gamedev.place/@A_Sandwich" target="_blank"><Image
              priority
              src="/images/mastodon.svg"
              height={18}
              width={18}
              alt="Mastodon logo"
            />Mastodon</Link>
          <Link href="https://github.com/A-Sandwich" target="_blank"><Image
              priority
              src="/images/github-mark.svg"
              height={18}
              width={18}
              alt="GitHub logo"
            />GitHub</Link>
          <Link href="https://a-sandwich.itch.io/" target="_blank"><Image
              priority
              src="/images/itchio-textless-black.svg"
              height={18}
              width={18}
              alt="itch.io logo"
            />itch.io</Link>
        </div>
        <p>Hi, I'm Kyle. I'm a Senior Software Engineer with a focus in Web development. When I'm not being paid, I'm a game developer. I also really enjoy running, cooking, trying to DIY, and playing video games!
          You can contact me on <Link target="_blank" href="https://mastodon.gamedev.place/@A_Sandwich">Mastodon</Link>
        </p>
      </section>
      <section className={`${utilStyles.headingMd} ${utilStyles.padding1px}`}>
        <h2 className={utilStyles.headingLg}>Games</h2>
        <div className={"tiles"}>
          {allGamesData.map(({ id }) => (
            <div className="tile" key={id}>
              <a href={`/games/${id}/index.html`}>
                <label htmlFor={id} className='game-label'>{id}</label>
                <Image
                  priority
                  src={`/games/${id}/profile.png`}
                  height={200}
                  width={200}
                  alt={`Screenshot of the game "${id}"`}
                  name={id}
                />
              </a>
              <br />
              <small className={utilStyles.lightText}>
                
              </small>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}