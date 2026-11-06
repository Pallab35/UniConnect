require('dotenv').config();
const express = require('express'), cors = require('cors'), mongoose = require('mongoose');
const bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken');
const { User, Post, Comment, Notification } = require('./models');
const app = express(); app.use(cors()); app.use(express.json());
const wrap = (f) => (req, res) => f(req, res).catch((e) => res.status(e.code === 11000 ? 409 : 500).json({ error: e.code === 11000 ? 'Username or email already taken' : e.message }));
const token = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const clean = (u) => { const o = u.toObject(); delete o.password; return o; };

const auth = async (req, res, next) => {
  try {
    const { id } = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET);
    req.user = await User.findById(id); if (!req.user) throw 0; next();
  } catch { res.status(401).json({ error: 'Please log in' }); }
};
const role = (...r) => (req, res, next) => (r.includes(req.user.role) ? next() : res.status(403).json({ error: 'Not allowed' }));
const notify = (user, from, type, post) => String(user) !== String(from) && Notification.create({ user, from, type, post });

// Auth
app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, username, email, password } = req.body;
  if (!name || !username || !email || !password || password.length < 6) return res.status(400).json({ error: 'All fields required; password min 6 chars' });
  const u = await User.create({ name, username, email, password: await bcrypt.hash(password, 10) });
  res.json({ token: token(u), user: clean(u) });
}));
app.post('/api/auth/login', wrap(async (req, res) => {
  const { login, password } = req.body; const l = (login || '').toLowerCase();
  const u = await User.findOne({ $or: [{ email: l }, { username: l }] });
  if (!u || !(await bcrypt.compare(password || '', u.password))) return res.status(401).json({ error: 'Wrong email/username or password' });
  res.json({ token: token(u), user: clean(u) });
}));
app.get('/api/me', auth, (req, res) => res.json(clean(req.user)));

// Users
app.get('/api/search/users', auth, wrap(async (req, res) => {
  const q = (req.query.q || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!q) return res.json([]);
  const rx = new RegExp(q, 'i');
  res.json(await User.find({ $or: [{ name: rx }, { username: rx }] }).select('name username department').limit(10));
}));


app.get('/api/users/:username', auth, wrap(async (req, res) => {
  const u = await User.findOne({ username: req.params.username.toLowerCase() }).select('-password -email');
  if (!u) return res.status(404).json({ error: 'User not found' });
  res.json({ user: u, posts: await Post.find({ author: u._id }).sort('-createdAt').populate('author', 'name username') });
}));
app.patch('/api/me', auth, wrap(async (req, res) => {
  const b = req.body, arr = (a) => (Array.isArray(a) ? a.map((s) => String(s).trim()).filter(Boolean).slice(0, 12) : undefined);
  for (const k of ['name', 'bio', 'department', 'location', 'education']) if (typeof b[k] === 'string' && (k !== 'name' || b[k].trim())) req.user[k] = b[k].trim();
  if (arr(b.skills)) req.user.skills = arr(b.skills);
  if (arr(b.interests)) req.user.interests = arr(b.interests);
  if (typeof b.openToCollab === 'boolean') req.user.openToCollab = b.openToCollab;
  await req.user.save(); res.json(clean(req.user));
}));
app.post('/api/users/:id/follow', auth, wrap(async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target || String(target._id) === String(req.user._id)) return res.status(400).json({ error: 'Invalid user' });
  const on = req.user.following.some((i) => String(i) === String(target._id));
  if (on) { req.user.following.pull(target._id); target.followers.pull(req.user._id); }
  else { req.user.following.push(target._id); target.followers.push(req.user._id); await notify(target._id, req.user._id, 'follow'); }
  await Promise.all([req.user.save(), target.save()]); res.json({ following: !on });
}));

// Posts
const pop = (q) => q.populate('author', 'name username');
app.get('/api/posts/feed', auth, wrap(async (req, res) => {
  const ids = [...req.user.following, req.user._id];
  const mine = await pop(Post.find({ author: { $in: ids }, flagged: false }).sort('-createdAt').limit(50));
  res.json(mine.length > 3 ? mine : await pop(Post.find({ flagged: false }).sort('-createdAt').limit(50)));
}));
app.post('/api/posts', auth, wrap(async (req, res) => {
  if (!req.body.text?.trim()) return res.status(400).json({ error: 'Post cannot be empty' });
  res.json(await pop(Post.findById((await Post.create({ author: req.user._id, text: req.body.text.trim() }))._id)));
}));
app.delete('/api/posts/:id', auth, wrap(async (req, res) => {
  const p = await Post.findById(req.params.id); if (!p) return res.sendStatus(404);
  if (String(p.author) !== String(req.user._id) && req.user.role === 'student') return res.status(403).json({ error: 'Not allowed' });
  await Promise.all([p.deleteOne(), Comment.deleteMany({ post: p._id })]); res.json({ ok: true });
}));
app.post('/api/posts/:id/react', auth, wrap(async (req, res) => {
  const p = await Post.findById(req.params.id); if (!p) return res.sendStatus(404);
  const on = p.likes.some((i) => String(i) === String(req.user._id));
  on ? p.likes.pull(req.user._id) : (p.likes.push(req.user._id), await notify(p.author, req.user._id, 'like', p._id));
  await p.save(); res.json({ likes: p.likes.length, liked: !on });
}));
app.get('/api/posts/:id/comments', auth, wrap(async (req, res) => res.json(await Comment.find({ post: req.params.id }).sort('createdAt').populate('author', 'name username'))));
app.post('/api/posts/:id/comments', auth, wrap(async (req, res) => {
  const p = await Post.findById(req.params.id); if (!p || !req.body.text?.trim()) return res.status(400).json({ error: 'Invalid comment' });
  const c = await Comment.create({ post: p._id, author: req.user._id, text: req.body.text.trim() });
  await notify(p.author, req.user._id, 'comment', p._id); res.json(await c.populate('author', 'name username'));
}));
app.post('/api/posts/:id/report', auth, wrap(async (req, res) => {
  await Post.findByIdAndUpdate(req.params.id, { $push: { reports: { by: req.user._id, reason: req.body.reason || '' } } }); res.json({ ok: true });
}));

// Notifications
app.get('/api/notifications', auth, wrap(async (req, res) => res.json(await Notification.find({ user: req.user._id }).sort('-createdAt').limit(50).populate('from', 'name username'))));
app.post('/api/notifications/read', auth, wrap(async (req, res) => { await Notification.updateMany({ user: req.user._id }, { read: true }); res.json({ ok: true }); }));

// Moderation & admin
app.get('/api/mod/reports', auth, role('moderator', 'admin'), wrap(async (req, res) => res.json(await pop(Post.find({ 'reports.0': { $exists: true } }).sort('-updatedAt')))));
app.post('/api/mod/posts/:id/flag', auth, role('moderator', 'admin'), wrap(async (req, res) => { const p = await Post.findByIdAndUpdate(req.params.id, { flagged: !!req.body.flagged, ...(!req.body.flagged && { reports: [] }) }, { new: true }); res.json(p); }));
app.get('/api/admin/stats', auth, role('admin'), wrap(async (req, res) => res.json({ users: await User.countDocuments(), posts: await Post.countDocuments(), comments: await Comment.countDocuments(), flagged: await Post.countDocuments({ flagged: true }) })));
app.patch('/api/admin/users/:id/role', auth, role('admin'), wrap(async (req, res) => res.json(clean(await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true })))));

mongoose.connect(process.env.MONGO_URI).then(() => app.listen(process.env.PORT || 5000, () => console.log('API running'))).catch((e) => { console.error(e.message); process.exit(1); });
