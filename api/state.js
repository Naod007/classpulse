// ONLY for Vercel hosting (not needed for server.js). Needs Upstash Redis + env var ADMIN_PASSWORD.
const crypto = require('crypto');
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
async function redis(cmds) {
  const r = await fetch(`${URL_}/pipeline`, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify(cmds) });
  if (!r.ok) throw new Error('redis');
  return (await r.json()).map(x => x.result);
}
function passwordOk(pw) {
  const a = Buffer.from(String(pw || '')), b = Buffer.from(process.env.ADMIN_PASSWORD || '');
  return b.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (!URL_ || !TOKEN) return res.status(503).json({ error: 'Database not configured' });
    if (req.method === 'GET') {
      const days = String(req.query.days || '').split(',').filter(d => DAY.test(d)).slice(0, 31);
      const out = await redis([['GET', 'cp:data'], ['GET', 'cp:total'], ...days.map(d => ['GET', 'cp:v:' + d])]);
      const daily = {}; days.forEach((d, i) => (daily[d] = Number(out[2 + i]) || 0));
      return res.status(200).json({ data: out[0] ? JSON.parse(out[0]) : null, total: Number(out[1]) || 0, daily });
    }
    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      if (b.action === 'view' && DAY.test(b.day)) { await redis([['INCR', 'cp:total'], ['INCR', 'cp:v:' + b.day]]); return res.status(200).json({ ok: true }); }
      if (!passwordOk(b.password)) return res.status(401).json({ error: 'Invalid password' });
      if (b.action === 'login') return res.status(200).json({ ok: true });
      if (b.action === 'save' && b.data && Array.isArray(b.data.teachers) && Array.isArray(b.data.statuses)) {
        const json = JSON.stringify(b.data);
        if (json.length > 500000) return res.status(413).json({ error: 'Too large' });
        await redis([['SET', 'cp:data', json]]);
        return res.status(200).json({ ok: true });
      }
    }
    return res.status(400).json({ error: 'Bad request' });
  } catch (e) { return res.status(500).json({ error: 'Server error' }); }
};
