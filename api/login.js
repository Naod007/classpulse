const { signToken } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, password } = req.body || {};
  if (
    email && password &&
    email === process.env.REP_EMAIL &&
    password === process.env.REP_PASSWORD
  ) {
    return res.status(200).json({
      token: signToken(),
      user: { email, name: process.env.REP_NAME || 'Class Rep' },
    });
  }
  return res.status(401).json({ error: 'Invalid representative email or password.' });
};
