const m = require('mongoose');
const { Schema, model } = m;
const id = (ref) => ({ type: Schema.Types.ObjectId, ref });
module.exports = {
  User: model('User', new Schema({
    name: { type: String, required: true }, username: { type: String, required: true, unique: true, lowercase: true },
    email: { type: String, required: true, unique: true, lowercase: true }, password: { type: String, required: true },
    role: { type: String, enum: ['student', 'moderator', 'admin'], default: 'student' },
    bio: { type: String, default: '' }, department: { type: String, default: '' },
    location: { type: String, default: '' }, education: { type: String, default: '' },
    skills: { type: [String], default: [] }, interests: { type: [String], default: [] }, openToCollab: { type: Boolean, default: false },
    following: [id('User')], followers: [id('User')],
  }, { timestamps: true })),
  Post: model('Post', new Schema({
    author: id('User'), text: { type: String, required: true, maxlength: 1000 },
    likes: [id('User')], reports: [{ by: id('User'), reason: String }], flagged: { type: Boolean, default: false },
  }, { timestamps: true })),
  Comment: model('Comment', new Schema({ post: id('Post'), author: id('User'), text: { type: String, required: true, maxlength: 500 } }, { timestamps: true })),
  Notification: model('Notification', new Schema({
    user: id('User'), from: id('User'), type: { type: String, enum: ['follow', 'like', 'comment'] }, post: id('Post'), read: { type: Boolean, default: false },
  }, { timestamps: true })),
};
