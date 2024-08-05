import { get_most_recent_track } from '../../lib/music-tracking';

export default async function handler(req, res) {
    const data = await get_most_recent_track();    
    res.status(200).json(data);
}