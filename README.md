# UniConnect (MVP)
MERN university social platform: auth (JWT), profiles, posts, follow, comments, likes, notifications, roles (student/moderator/admin), report + moderation.

## Run
1. `cd server && cp .env.example .env` (add your MongoDB Atlas URI + a JWT secret) `&& npm install && npm run dev`
2. `cd client && npm install && npm run dev` then open http://localhost:5173
3. Make an admin: in Atlas, set a user's `role` to `admin` (or `moderator`).

## API (test in Postman)
POST /api/auth/register, /api/auth/login · GET/PATCH /api/me · GET /api/users/:username · POST /api/users/:id/follow
GET /api/posts/feed · POST /api/posts · DELETE /api/posts/:id · POST /api/posts/:id/react|report · GET/POST /api/posts/:id/comments
GET /api/notifications · POST /api/notifications/read · GET /api/mod/reports · POST /api/mod/posts/:id/flag · GET /api/admin/stats · PATCH /api/admin/users/:id/role

## Next phases
Gemini spam flagging + feed ranking (server-side only), Google OAuth, Lost & Found, Academic Help, Events, Skill matching.
