const { loadData, saveData, verifyToken, uid } = require('./_lib');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const data = await loadData();

    if (req.method === 'GET') {
      const date = req.query.date || new Date().toISOString().split('T')[0];
      return res.status(200).json({
        teachers: data.teachers,
        subjects: data.subjects,
        classes: data.classes,
        sessions: (data.sessions[date] || []),
        auditLogs: data.auditLogs.slice(-200),
      });
    }

    if (req.method === 'POST') {
      const token = (req.headers.authorization || '').replace('Bearer ', '');
      if (!verifyToken(token)) return res.status(401).json({ error: 'Not authorized. Please sign in again.' });

      const b = req.body || {};
      const who = process.env.REP_NAME || 'Class Rep';

      if (b.action === 'setSession') {
        const list = (data.sessions[b.date] = data.sessions[b.date] || []);
        let s = list.find((x) => x.class_id === b.class_id);
        if (!s) {
          s = { id: uid('sess'), class_id: b.class_id, date: b.date, status: 'scheduled', note: '' };
          list.push(s);
        }
        if (b.status !== undefined) s.status = b.status;
        if (b.note !== undefined) s.note = b.note;
        s.updated_by = who;
        s.updated_at = new Date().toISOString();
        data.auditLogs.push({
          id: uid('log'), class_id: b.class_id, status: s.status, note: s.note,
          updated_by: who, timestamp: s.updated_at,
        });
      } else if (b.action === 'addClass') {
        data.classes.push({
          id: uid('c'), subject_id: b.subject_id, teacher_id: b.teacher_id,
          room: b.room, start_time: b.start_time, end_time: b.end_time, day_of_week: 'Monday',
        });
      } else if (b.action === 'addTeacher') {
        data.teachers.push({ id: uid('t'), name: b.name, department: b.department, email: b.email });
      } else if (b.action === 'deleteTeacher') {
        data.teachers = data.teachers.filter((t) => t.id !== b.id);
        data.classes = data.classes.filter((c) => c.teacher_id !== b.id);
      } else {
        return res.status(400).json({ error: 'Unknown action' });
      }

      await saveData(data);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
};
