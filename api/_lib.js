const crypto = require('crypto');

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN_ = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'classpulse:data';

async function redis(cmd) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN_}` },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

function seed() {
  return {
    teachers: [
      { id: 't1', name: 'Dr. Eleanor Vance', department: 'Computer Science', email: 'vance@university.edu' },
      { id: 't2', name: 'Prof. Marcus Brody', department: 'Mathematics', email: 'brody@university.edu' },
      { id: 't3', name: 'Dr. Sarah Al-Fassi', department: 'Physics', email: 'alfassi@university.edu' },
      { id: 't4', name: 'Prof. James Wilson', department: 'English Literature', email: 'wilson@university.edu' },
      { id: 't5', name: 'Dr. Robert Chen', department: 'Data Structures', email: 'chen@university.edu' },
    ],
    subjects: [
      { id: 's1', name: 'Advanced Algorithms', code: 'CS-401' },
      { id: 's2', name: 'Linear Algebra & Calculus', code: 'MATH-302' },
      { id: 's3', name: 'Quantum Mechanics II', code: 'PHYS-410' },
      { id: 's4', name: 'Modern World Literature', code: 'ENG-205' },
      { id: 's5', name: 'Database Systems', code: 'CS-350' },
    ],
    classes: [
      { id: 'c1', subject_id: 's1', teacher_id: 't1', room: 'Hall A1', start_time: '08:30', end_time: '10:00', day_of_week: 'Monday' },
      { id: 'c2', subject_id: 's2', teacher_id: 't2', room: 'Room 204', start_time: '10:15', end_time: '11:45', day_of_week: 'Monday' },
      { id: 'c3', subject_id: 's3', teacher_id: 't3', room: 'Lab 3B', start_time: '13:00', end_time: '14:30', day_of_week: 'Monday' },
      { id: 'c4', subject_id: 's4', teacher_id: 't4', room: 'Room 102', start_time: '14:45', end_time: '16:15', day_of_week: 'Monday' },
      { id: 'c5', subject_id: 's5', teacher_id: 't5', room: 'Lab 1A', start_time: '16:30', end_time: '18:00', day_of_week: 'Monday' },
    ],
    sessions: {},   // { "2026-10-12": [ {class_id, status, note, ...} ] }
    auditLogs: [],
  };
}

async function loadData() {
  const raw = await redis(['GET', KEY]);
  if (!raw) {
    const d = seed();
    await redis(['SET', KEY, JSON.stringify(d)]);
    return d;
  }
  return JSON.parse(raw);
}

async function saveData(d) {
  await redis(['SET', KEY, JSON.stringify(d)]);
}

const hmac = (p) =>
  crypto.createHmac('sha256', process.env.AUTH_SECRET || '').update(p).digest('hex');

function signToken() {
  const p = String(Date.now() + 7 * 24 * 3600 * 1000);
  return p + '.' + hmac(p);
}

function verifyToken(t) {
  if (!t || !process.env.AUTH_SECRET) return false;
  const [p, s] = t.split('.');
  if (!p || !s) return false;
  const e = hmac(p);
  if (s.length !== e.length) return false;
  return crypto.timingSafeEqual(Buffer.from(s), Buffer.from(e)) && Date.now() < Number(p);
}

const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 10);

module.exports = { loadData, saveData, signToken, verifyToken, uid };
