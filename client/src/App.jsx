import { useState, useEffect, useCallback } from 'react';

const api = async (path, method = 'GET', body) => {
  const r = await fetch('/api' + path, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (localStorage.token || '') }, body: body && JSON.stringify(body) });
  const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Something went wrong'); return d;
};
const ago = (d) => { const m = Math.floor((Date.now() - new Date(d)) / 60000); return m < 1 ? 'now' : m < 60 ? m + 'm' : m < 1440 ? Math.floor(m / 60) + 'h' : Math.floor(m / 1440) + 'd'; };

const Ic = ({ d, fill = 'none', size = 22, children }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d ? <path d={d} /> : children}</svg>
);
const P = {
  home: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  heart: 'M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z',
};

const Avatar = ({ size = 44 }) => (
  <span className="avatar" style={{ width: size, height: size }}>
    <Ic size={size * 0.52} fill="currentColor"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0z" /></Ic>
  </span>
);

function Logo() {
  return (
    <span className="brand">
      <svg viewBox="0 0 270 305" width="26" height="30" aria-hidden="true">
        <defs><linearGradient id="ucg" gradientUnits="userSpaceOnUse" x1="40" y1="0" x2="230" y2="0"><stop offset="0" stopColor="#1a7cff" /><stop offset="1" stopColor="#7b3dff" /></linearGradient></defs>
        <circle cx="45" cy="42" r="39" fill="#1a7cff" /><circle cx="225" cy="42" r="39" fill="#7b3dff" />
        <path d="M45 128V165A90 90 0 0 0 225 165V128" fill="none" stroke="url(#ucg)" strokeWidth="86" strokeLinecap="round" />
      </svg>
      <span><span style={{ color: '#1a7cff' }}>Uni</span>Connect</span>
    </span>
  );
}

function Auth({ onAuth }) {
  const [reg, setReg] = useState(false), [f, setF] = useState({}), [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const go = async (e) => { e.preventDefault(); setErr(''); try { const d = await api(reg ? '/auth/register' : '/auth/login', 'POST', f); localStorage.token = d.token; onAuth(d.user); } catch (x) { setErr(x.message); } };
  return (
    <form className="auth card" onSubmit={go}>
      <h1><Logo /></h1><p className="mute">Your campus, in one place.</p>
      {reg && <><input placeholder="Full name" onChange={set('name')} /><input placeholder="Username" onChange={set('username')} /><input type="email" placeholder="University email" onChange={set('email')} /></>}
      {!reg && <input placeholder="Email or username" onChange={set('login')} />}
      <input type="password" placeholder="Password (6+ characters)" onChange={set('password')} />
      {err && <p className="err">{err}</p>}
      <button className="primary" style={{ width: '100%' }}>{reg ? 'Create account' : 'Log in'}</button>
      <p className="mute"><button type="button" className="link" onClick={() => setReg(!reg)}>{reg ? 'Have an account? Log in' : 'New here? Create an account'}</button></p>
    </form>
  );
}

function SearchBar({ open }) {
  const [q, setQ] = useState(''), [res, setRes] = useState([]);
  useEffect(() => {
    if (!q.trim()) { setRes([]); return; }
    const t = setTimeout(() => api('/search/users?q=' + encodeURIComponent(q)).then(setRes).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="search">
      <div className="searchbox">
        <span className="chip"><Ic size={18}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Ic></span>
        <input placeholder="Search UniConnect..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {q.trim() && <div className="results card">
        {res.length === 0 && <span className="mute">No students found</span>}
        {res.map((u) => <button key={u._id} className="link" onClick={() => { open(u.username); setQ(''); }}>{u.name} <span className="mute">@{u.username}</span></button>)}
      </div>}
    </div>
  );
}

function Post({ p, me, open, onDelete }) {
  const [likes, setLikes] = useState(p.likes.length), [liked, setLiked] = useState(p.likes.includes(me._id));
  const [show, setShow] = useState(false), [cs, setCs] = useState([]), [txt, setTxt] = useState(''), [reported, setReported] = useState(false);
  const react = async () => { const d = await api(`/posts/${p._id}/react`, 'POST'); setLikes(d.likes); setLiked(d.liked); };
  const toggle = async () => { if (!show) setCs(await api(`/posts/${p._id}/comments`)); setShow(!show); };
  const send = async (e) => { e.preventDefault(); if (!txt.trim()) return; const c = await api(`/posts/${p._id}/comments`, 'POST', { text: txt }); setCs([...cs, c]); setTxt(''); };
  const mine = p.author._id === me._id || me.role !== 'student';
  return (
    <article className="card post">
      <div className="head">
        <Avatar />
        <div><button className="who" onClick={() => open(p.author.username)}>{p.author.name}</button><div className="mute">@{p.author.username} · {ago(p.createdAt)}</div></div>
      </div>
      <p>{p.text}</p>
      <div className="actions">
        <button className={'act' + (liked ? ' liked' : '')} onClick={react} aria-label="Like"><Ic d={P.heart} fill={liked ? 'currentColor' : 'none'} /> {likes}</button>
        <button className="act" onClick={toggle} aria-label="Comments"><Ic d={P.chat} /> Comments</button>
        <span className="grow" />
        {!reported && p.author._id !== me._id && <button className="link" onClick={async () => { await api(`/posts/${p._id}/report`, 'POST', {}); setReported(true); }}>Report</button>}
        {reported && <span className="mute">Reported</span>}
        {mine && <button className="link danger" onClick={async () => { await api('/posts/' + p._id, 'DELETE'); onDelete(p._id); }}>Delete</button>}
      </div>
      {show && <div className="comments">
        {cs.map((c) => <p key={c._id} className="mute" style={{ margin: '4px 0' }}><b style={{ color: 'var(--ink)' }}>{c.author.name}</b> {c.text}</p>)}
        <form className="row" onSubmit={send} style={{ marginTop: 8 }}><input placeholder="Write a comment" value={txt} onChange={(e) => setTxt(e.target.value)} /><button>Comment</button></form>
      </div>}
    </article>
  );
}

function Feed({ me, open }) {
  const [posts, setPosts] = useState([]), [txt, setTxt] = useState('');
  useEffect(() => { api('/posts/feed').then(setPosts); }, []);
  const share = async () => { if (!txt.trim()) return; const p = await api('/posts', 'POST', { text: txt }); setPosts([p, ...posts]); setTxt(''); };
  return <>
    <div className="card composer">
      <Avatar />
      <input maxLength={1000} placeholder="What's on your mind?" value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && share()} />
      {txt.trim() && <button className="primary" onClick={share}>Post</button>}
    </div>
    {posts.length === 0 && <p className="mute">Nothing here yet. Share the first post or follow someone.</p>}
    {posts.map((p) => <Post key={p._id} p={p} me={me} open={open} onDelete={(id) => setPosts(posts.filter((x) => x._id !== id))} />)}
  </>;
}

const P2 = {
  book: 'M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3zM4 17a3 3 0 0 1 3-3h12',
  pin: 'M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
};
const list = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean);

function About({ u }) {
  const joined = u.createdAt && 'Joined ' + new Date(u.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const rows = [[u.education, P2.book], [u.location, P2.pin], [joined, P2.cal]].filter((r) => r[0]);
  return (
    <div className="card about">
      <h3>About</h3>
      {rows.length === 0 && <p className="mute">No details added yet.</p>}
      {rows.map(([t, d]) => <div key={t} className="arow"><Ic d={d} size={20} /> {t}</div>)}
      {u.skills?.length > 0 && <><div className="sub">Skills</div><div className="tags">{u.skills.map((s) => <span key={s} className="tag brandtag">{s}</span>)}</div></>}
      {u.interests?.length > 0 && <><div className="sub">Interests</div><div className="tags">{u.interests.map((s) => <span key={s} className="tag">{s}</span>)}</div></>}
    </div>
  );
}

function Profile({ username, me, setMe, open, onUser }) {
  const [d, setD] = useState(null), [edit, setEdit] = useState(false), [f, setF] = useState({});
  const load = useCallback(() => api('/users/' + username).then((x) => { setD(x); onUser(x.user); }), [username, onUser]);
  useEffect(() => { load(); return () => onUser(null); }, [load, onUser]);
  if (!d) return null;
  const u = d.user, self = u._id === me._id, following = me.following.includes(u._id);
  const follow = async () => { const r = await api(`/users/${u._id}/follow`, 'POST'); setMe({ ...me, following: r.following ? [...me.following, u._id] : me.following.filter((i) => i !== u._id) }); load(); };
  const startEdit = () => { setF({ name: u.name, department: u.department || '', bio: u.bio || '', location: u.location || '', education: u.education || '', skills: (u.skills || []).join(', '), interests: (u.interests || []).join(', '), openToCollab: !!u.openToCollab }); setEdit(true); };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const save = async () => { setMe(await api('/me', 'PATCH', { ...f, skills: list(f.skills), interests: list(f.interests) })); setEdit(false); load(); };
  return <>
    <div className="card pcard">
      <div className="cover" />
      <div className="pbody">
        <span className="ring"><Avatar size={112} /></span>
        <div className="ptop">
          <div><h2>{u.name}</h2><div className="mute">@{u.username}{u.department && ' · ' + u.department}</div></div>
          {self ? <button className="outline" onClick={startEdit}>Edit profile</button> : <button className={following ? 'on' : 'primary'} onClick={follow}>{following ? 'Following' : 'Follow'}</button>}
        </div>
        {u.bio && <p className="bio">{u.bio}</p>}
        <div className="pstats">
          <span><b>{d.posts.length}</b> Posts</span><span><b>{u.followers.length}</b> Followers</span><span><b>{u.following.length}</b> Following</span>
          {u.openToCollab && <span className="collab">Open to collaborate</span>}
        </div>
      </div>
    </div>
    {edit && <div className="card eform">
      <label>Name<input value={f.name} onChange={set('name')} /></label>
      <label>Department<input placeholder="Computer Science & Engineering" value={f.department} onChange={set('department')} /></label>
      <label>Bio<textarea rows={2} value={f.bio} onChange={set('bio')} /></label>
      <label>Education<input placeholder="B.Sc. in CSE, 7th semester" value={f.education} onChange={set('education')} /></label>
      <label>Location<input placeholder="Dhaka, Bangladesh" value={f.location} onChange={set('location')} /></label>
      <label>Skills (separate with commas)<input placeholder="React, Node.js, MongoDB" value={f.skills} onChange={set('skills')} /></label>
      <label>Interests (separate with commas)<input placeholder="Hackathons, Photography" value={f.interests} onChange={set('interests')} /></label>
      <label className="chk"><input type="checkbox" checked={f.openToCollab} onChange={set('openToCollab')} /> Open to collaborate</label>
      <div className="row"><button className="primary" onClick={save}>Save changes</button><button onClick={() => setEdit(false)}>Cancel</button></div>
    </div>}
    {d.posts.map((p) => <Post key={p._id} p={p} me={me} open={open} onDelete={load} />)}
  </>;
}

function Notifications() {
  const [ns, setNs] = useState([]);
  useEffect(() => { api('/notifications').then((n) => { setNs(n); api('/notifications/read', 'POST'); }); }, []);
  const msg = { follow: 'started following you', like: 'liked your post', comment: 'commented on your post' };
  return <>{ns.length === 0 && <p className="mute">No notifications yet.</p>}{ns.map((n) => <div key={n._id} className="card">{!n.read && <span className="dot" />} <b>{n.from?.name}</b> {msg[n.type]} <span className="mute">· {ago(n.createdAt)}</span></div>)}</>;
}

function Moderation() {
  const [ps, setPs] = useState([]), load = () => api('/mod/reports').then(setPs);
  useEffect(() => { load(); }, []);
  const flag = async (id, flagged) => { await api(`/mod/posts/${id}/flag`, 'POST', { flagged }); load(); };
  return <>{ps.length === 0 && <p className="mute">No reported posts.</p>}{ps.map((p) => <div key={p._id} className="card">
    <b>{p.author.name}</b> <span className="mute">{p.reports.length} report(s){p.flagged ? ' · hidden' : ''}</span><p>{p.text}</p>
    <div className="row"><button className="danger" onClick={() => flag(p._id, true)}>Hide post</button><button onClick={() => flag(p._id, false)}>Dismiss reports</button></div></div>)}</>;
}

export default function App() {
  const [me, setMe] = useState(null), [ready, setReady] = useState(false), [view, setView] = useState({ t: 'feed' }), [menu, setMenu] = useState(false), [prof, setProf] = useState(null), [unread, setUnread] = useState(0), [theme, setTheme] = useState(() => localStorage.theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  useEffect(() => { localStorage.token ? api('/me').then(setMe).catch(() => delete localStorage.token).finally(() => setReady(true)) : setReady(true); }, []);
  useEffect(() => {
    if (!me) return;
    if (view.t === 'notes') { setUnread(0); return; }
    api('/notifications').then((n) => setUnread(n.filter((x) => !x.read).length)).catch(() => {});
  }, [me, view.t]);
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.theme = theme; }, [theme]);
  if (!ready) return null; if (!me) return <Auth onAuth={setMe} />;
  const open = (username) => { setView({ t: 'profile', username }); setMenu(false); };
  const tab = (t, label, icon) => <button className={'tab' + (view.t === t ? ' active' : '')} title={label} aria-label={label} onClick={() => setView({ t })}><Ic d={icon} size={26} />{t === 'notes' && unread > 0 && <span className="badge">{unread}</span>}</button>;
  return <>
    <header className="top"><div className="topin">
      <Logo />
      <nav className="tabs">{tab('feed', 'Home', P.home)}{tab('notes', 'Alerts', P.bell)}{me.role !== 'student' && tab('mod', 'Moderate', P.shield)}</nav>
      <div className="menu">
        <button className="tbtn" aria-label="Switch theme" title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><Ic size={22}>{theme === 'dark' ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></> : <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />}</Ic></button><button className="avbtn" aria-label="Account menu" onClick={() => setMenu(!menu)}><Avatar size={40} /></button>
        {menu && <div className="drop card">
          <button className="link" onClick={() => open(me.username)}>View profile</button>
          <button className="link danger" onClick={() => { delete localStorage.token; setMe(null); }}>Log out</button>
        </div>}
      </div>
    </div></header>
    <div className="grid">
      <aside className="left"><SearchBar open={open} />{view.t === 'profile' && prof && <About u={prof} />}</aside>
      <main>
        {view.t === 'feed' && <Feed me={me} open={open} />}
        {view.t === 'profile' && <Profile key={view.username} username={view.username} me={me} setMe={setMe} open={open} onUser={setProf} />}
        {view.t === 'notes' && <Notifications />}
        {view.t === 'mod' && <Moderation />}
      </main>
    </div>
  </>;
}
