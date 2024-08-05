import useSWR from 'swr'
import utilStyles from '../../styles/utils.module.css';
 
const fetcher = (...args) => fetch(...args).then((res) => res.json())
 
export default function RecentTrack() {
  const { data, error } = useSWR('/api/recent-tracks', fetcher)
 
  if (error) return <div>Failed to load</div>
  if (!data) return <div>Loading...</div>
 
  return (
    <section className={`${utilStyles.headingMd} ${utilStyles.padding1px}`}>
        <h2 className={utilStyles.headingLg}>Most recently listend track</h2>
        <div className='recent-track'>
            <img src={data.album_art_url} alt={`Album art for '${data.album}'`}/>
            <div className='track-information-container'>
                <p className='track-information'>{`${data.name} - ${data.artist}`}</p>
            </div>
        </div>
    </section>
  )
}