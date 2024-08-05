import { get_most_recent_track } from '../lib/music-tracking';
  export default async function recent() {
    const data = await get_most_recent_track()
   
    return <section className={`${utilStyles.headingMd} ${utilStyles.padding1px}`}>
    <h2 className={utilStyles.headingLg}>Most recently listend track</h2>
    <div className='recent-track'>
      <img src={most_recent_track.album_art_url} alt={`Album art for '${most_recent_track.album}'`}/>
      <div className='track-information-container'>
        <p className='track-information'>{`${most_recent_track.name} - ${most_recent_track.artist}`}</p>
      </div>
    </div>
  </section>
  }