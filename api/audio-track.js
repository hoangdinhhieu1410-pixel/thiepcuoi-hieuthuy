import Redis from 'ioredis';

const DEFAULT_REDIS_URL = 'redis://default:1CoqVoDZ9zok85R9QyvXyok7L856XXIh@palatial-clover-caring-84399.db.redis.io:17074';

const BUNDLED_TRACK_IDS = new Set([
  'track-1793025564857',
  'track-1793025562301',
  'track-1793025559560',
  'track-1793025556997',
  'track-1793025553990',
  'track-1793025550442',
  'track-1793025546087',
  'track-1793025543609',
  'track-1793025541372',
  'track-1793025538163',
  'track-1793025527552'
]);

let redisInstance = null;
function getRedis() {
  if (!redisInstance) {
    const url = process.env.REDIS_URL || process.env.KV_REST_API_URL || process.env.STORAGE_REDIS_URL || DEFAULT_REDIS_URL;
    redisInstance = new Redis(url, {
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
      lazyConnect: true
    });
  }
  return redisInstance;
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb'
    }
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const redis = getRedis();

  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (!body && req.readable) {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        try {
          body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch {
          body = {};
        }
      } else if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
      }

      const { id, title, mimeType = 'audio/mpeg', data } = body || {};
      if (!id || !data) {
        return res.status(400).json({ success: false, error: 'Thiếu dữ liệu âm thanh' });
      }

      // Store in dedicated audio track key in Redis
      await redis.set(`audio_track:${id}`, JSON.stringify({
        id,
        title: title || 'Nhạc cưới tùy chỉnh',
        mimeType,
        data,
        updatedAt: Date.now()
      }));

      return res.status(200).json({
        success: true,
        url: `/api/audio-track?id=${id}`,
        id
      });
    } catch (err) {
      console.error('Save audio track error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const { id } = req.query || {};
      if (!id) {
        return res.redirect('/templates/007/music.m4a');
      }

      // If it's one of the 11 bundled template tracks, redirect to static file
      if (BUNDLED_TRACK_IDS.has(id)) {
        return res.redirect(`/templates/007/tracks/${id}.m4a`);
      }

      // Fetch from Redis
      const raw = await redis.get(`audio_track:${id}`);
      if (!raw) {
        // Fallback to default music if not found
        return res.redirect('/templates/007/music.m4a');
      }

      const track = JSON.parse(raw);
      const mimeType = track.mimeType || 'audio/mpeg';
      const cleanBase64 = (track.data || '').replace(/^data:[^;]+;base64,/, '');
      const buf = Buffer.from(cleanBase64, 'base64');
      const totalSize = buf.length;

      // Handle Range request for audio streaming (iOS & Android Chrome requirement)
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
        const chunksize = (end - start) + 1;
        const slice = buf.subarray(start, end + 1);

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=31536000, immutable'
        });
        return res.end(slice);
      }

      res.writeHead(200, {
        'Content-Length': totalSize,
        'Accept-Ranges': 'bytes',
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      });
      return res.end(buf);
    } catch (err) {
      console.error('Stream audio track error:', err);
      return res.redirect('/templates/007/music.m4a');
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
