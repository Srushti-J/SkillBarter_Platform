/**
 * Profile Page
 * ✅ Profile image upload (local via Multer)
 * ✅ Real-time completeness indicator
 * ✅ Add / remove individual skills
 * ✅ Reviews display
 */
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileService, reviewService } from '../services/api';

const API_BASE = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: '', bio: '', skillsOffered: [], skillsWanted: [],
  });
  const [newOffered, setNewOffered] = useState('');
  const [newWanted,  setNewWanted]  = useState('');
  const [reviews,    setReviews]    = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [previewImg,   setPreviewImg]   = useState(null);

  /* Populate form from user context */
  useEffect(() => {
    if (user) {
      setForm({
        name:          user.name           || '',
        bio:           user.bio            || '',
        skillsOffered: [...(user.skillsOffered || [])],
        skillsWanted:  [...(user.skillsWanted  || [])],
      });
      reviewService.getForUser(user._id)
        .then((res) => setReviews(res.data || []))
        .catch(() => {});
    }
  }, [user]);

  /* Profile image URL */
  const getImgSrc = () => {
    if (previewImg) return previewImg;
    if (user?.profileImage) {
      return user.profileImage.startsWith('/uploads')
        ? `${API_BASE}${user.profileImage}`
        : user.profileImage;
    }
    return null;
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  /* Save text fields */
  const save = async () => {
    setSaving(true);
    try {
      const res = await profileService.updateProfile({
        name:          form.name,
        bio:           form.bio,
        skillsOffered: form.skillsOffered,
        skillsWanted:  form.skillsWanted,
      });
      updateUser(res.data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  /* Upload profile image */
  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewImg(ev.target.result);
    reader.readAsDataURL(file);

    const fd = new FormData();
    fd.append('profileImage', file);

    setUploadingImg(true);
    try {
      const res = await profileService.uploadImage(fd);
      updateUser({ profileImage: res.data.imageUrl });
      setPreviewImg(null); // use real URL now
    } catch (err) {
      alert(err.response?.data?.message || 'Image upload failed');
      setPreviewImg(null);
    } finally {
      setUploadingImg(false);
    }
  };

  /* Skill helpers */
  const addOffered = () => {
    const s = newOffered.trim();
    if (!s || form.skillsOffered.includes(s)) return;
    setForm((f) => ({ ...f, skillsOffered: [...f.skillsOffered, s] }));
    setNewOffered('');
  };
  const removeOffered = (s) =>
    setForm((f) => ({ ...f, skillsOffered: f.skillsOffered.filter((x) => x !== s) }));

  const addWanted = () => {
    const s = newWanted.trim();
    if (!s || form.skillsWanted.includes(s)) return;
    setForm((f) => ({ ...f, skillsWanted: [...f.skillsWanted, s] }));
    setNewWanted('');
  };
  const removeWanted = (s) =>
    setForm((f) => ({ ...f, skillsWanted: f.skillsWanted.filter((x) => x !== s) }));

  /* Profile completeness */
  const isComplete = form.name && form.skillsOffered.length > 0 && form.skillsWanted.length > 0;
  const avgRating  = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>👤 My Profile</h1>
        <p>Complete your profile to appear in AI skill matching.</p>
      </div>

      {/* Completeness status */}
      {!isComplete && (
        <div className="incomplete-banner" style={{ marginBottom: 24 }}>
          <span className="incomplete-banner-icon">⚠</span>
          <div className="incomplete-banner-text">
            <h4>Profile incomplete — you won't appear in matches</h4>
            <p>
              {!form.name && '• Add your name  '}
              {form.skillsOffered.length === 0 && '• Add at least one skill you can teach  '}
              {form.skillsWanted.length  === 0 && '• Add at least one skill you want to learn'}
            </p>
          </div>
        </div>
      )}
      {isComplete && (
        <div style={{ background: 'var(--green-bg)', border: '1px solid rgba(46,204,143,0.2)', borderRadius: 10, padding: '12px 18px', marginBottom: 22, color: 'var(--green)', fontSize: 13, fontWeight: 600 }}>
          ✅ Profile is complete — you appear in AI skill matches
        </div>
      )}

      <div className="profile-layout">
        {/* ── Left: Edit form ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Profile image */}
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 18, color: '#fff' }}>Profile Photo</h3>
            <div className="profile-image-section">
              {getImgSrc() ? (
                <img src={getImgSrc()} alt="Profile" className="profile-img" />
              ) : (
                <div className="profile-img-placeholder">{initials}</div>
              )}
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--text2)' }}>
                  Upload a profile photo (max 5MB, jpg/png)
                </label>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImg}
                >
                  {uploadingImg ? 'Uploading…' : '📷 Choose Photo'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImageChange}
                />
                {uploadingImg && (
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>Uploading…</div>
                )}
              </div>
            </div>
          </div>

          {/* Basic info */}
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 18, color: '#fff' }}>Basic Info</h3>
            <div className="form-group">
              <label>Full Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your full name"
              />
            </div>
            <div className="form-group">
              <label>Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Tell others what you're passionate about, your background, etc."
                rows={3}
              />
            </div>
          </div>

          {/* Skills offered */}
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 6, color: '#fff' }}>🎓 Skills I Can Teach *</h3>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>
              These are the skills you will offer in a barter exchange.
            </p>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <div className="skill-input-row">
                <input
                  value={newOffered}
                  onChange={(e) => setNewOffered(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addOffered()}
                  placeholder="e.g. Python, Guitar, Yoga, Spanish…"
                />
                <button className="btn btn-sm btn-primary" onClick={addOffered}>Add</button>
              </div>
            </div>
            <div className="skill-tags">
              {form.skillsOffered.length === 0 && (
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>No skills added yet</span>
              )}
              {form.skillsOffered.map((s) => (
                <span key={s} className="skill-tag skill-tag-offered">
                  {s}
                  <button className="tag-remove" onClick={() => removeOffered(s)}>×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Skills wanted */}
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 6, color: '#fff' }}>📚 Skills I Want to Learn *</h3>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>
              These are the skills you want others to teach you.
            </p>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <div className="skill-input-row">
                <input
                  value={newWanted}
                  onChange={(e) => setNewWanted(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addWanted()}
                  placeholder="e.g. Spanish, Cooking, Design, SQL…"
                />
                <button className="btn btn-sm btn-primary" onClick={addWanted}>Add</button>
              </div>
            </div>
            <div className="skill-tags">
              {form.skillsWanted.length === 0 && (
                <span style={{ fontSize: 13, color: 'var(--text3)' }}>No skills added yet</span>
              )}
              {form.skillsWanted.map((s) => (
                <span key={s} className="skill-tag skill-tag-wanted">
                  {s}
                  <button className="tag-remove" onClick={() => removeWanted(s)}>×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Save button */}
          <button className="btn btn-primary" onClick={save} disabled={saving} style={{ alignSelf: 'flex-start', minWidth: 160 }}>
            {saving ? 'Saving…' : saved ? '✅ Saved!' : '💾 Save Profile'}
          </button>
        </div>

        {/* ── Right: Reputation + Reviews ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 18, color: '#fff' }}>⭐ Reputation</h3>
            {avgRating ? (
              <>
                <div className="reputation-score">{avgRating}</div>
                <div style={{ color: 'var(--orange)', fontSize: 20, marginTop: 4 }}>
                  {'★'.repeat(Math.round(Number(avgRating)))}{'☆'.repeat(5 - Math.round(Number(avgRating)))}
                </div>
                <div className="reputation-sub">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
              </>
            ) : (
              <div style={{ color: 'var(--text3)', fontSize: 13 }}>No reviews yet. Complete sessions to earn your reputation.</div>
            )}
          </div>

          <div className="card" style={{ flex: 1 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 16, color: '#fff' }}>Reviews</h3>
            <div className="reviews-list">
              {reviews.length === 0 ? (
                <div className="empty-state">No reviews yet.</div>
              ) : reviews.slice(0, 10).map((r) => (
                <div key={r._id} className="review-item">
                  <div className="review-header">
                    <span className="review-name">{r.reviewerId?.name || 'Anonymous'}</span>
                    <span className="review-stars">
                      {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="review-comment">"{r.comment}"</p>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
