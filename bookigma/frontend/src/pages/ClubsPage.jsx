import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, Check, Clock, Crown, Globe2, Image as ImageIcon, Lock,
  Plus, Search, ShieldCheck, Sparkles, UserPlus, Users, X,
} from 'lucide-react';
import { useAuth, useToast } from '../hooks/useStore';
import Modal from '../components/common/Modal';
import { avatarSrc, mediaSrc } from '../lib/avatar';
import { uploadPostImage } from '../services/api';
import * as clubApi from '../services/clubApi';
import './clubs.css';

const SCOPES = [
  { id: 'all', label: 'Khám phá' },
  { id: 'joined', label: 'Đã tham gia' },
  { id: 'mine', label: 'Của tôi' },
  { id: 'public', label: 'Công khai' },
  { id: 'private', label: 'Riêng tư' },
];

const EMPTY_FORM = { name: '', description: '', coverUrl: '', privateClub: false };

function coverUrl(club) {
  const raw = mediaSrc(club.coverUrl);
  if (!raw) return '';
  return /^(https?:\/\/|\/)/i.test(raw) ? raw : '';
}

function coverStyle(club) {
  const url = coverUrl(club);
  return url ? { backgroundImage: `url("${url.replace(/"/g, '%22')}")` } : undefined;
}

export default function ClubsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await clubApi.fetchClubs({ q: query, scope });
      setClubs(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách nhóm.');
    } finally {
      setLoading(false);
    }
  }, [query, scope]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const stats = useMemo(() => ({
    total: clubs.length,
    joined: clubs.filter((club) => club.joined).length,
    privateCount: clubs.filter((club) => club.privateClub).length,
    pending: clubs.filter((club) => club.pendingRequest).length,
    managedPending: clubs.reduce((sum, club) => sum + Number(club.pendingRequestCount || 0), 0),
  }), [clubs]);

  const requireLogin = () => {
    if (user) return false;
    navigate('/login', { state: { from: '/clubs' } });
    return true;
  };

  const requestJoin = (club) => {
    if (requireLogin()) return;
    navigate(`/clubs/${club.id}`, { state: { join: true } });
  };

  const openCreate = () => {
    if (requireLogin()) return;
    setForm(EMPTY_FORM);
    setCreateOpen(true);
  };

  const uploadCover = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Hãy chọn một file ảnh.', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast('Ảnh bìa không được vượt quá 10 MB.', 'error');
      return;
    }
    try {
      setUploadingCover(true);
      const uploaded = await uploadPostImage(file);
      setForm((prev) => ({ ...prev, coverUrl: uploaded.imageUrl || '' }));
      toast('Đã tải ảnh bìa lên.');
    } catch (err) {
      toast(err.message || 'Không thể tải ảnh bìa.', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  const submitCreate = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast('Hãy đặt tên cho nhóm.', 'error');
      return;
    }
    try {
      setSaving(true);
      const created = await clubApi.createClub({
        name: form.name.trim(),
        description: form.description.trim() || null,
        coverUrl: form.coverUrl.trim() || null,
        privateClub: form.privateClub,
      });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      toast(`Đã tạo nhóm "${created.name}".`);
      navigate(`/clubs/${created.id}`);
    } catch (err) {
      toast(err.message || 'Không thể tạo nhóm.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="main-layout">
      <div className="clubs-hero">
        <BookOpen className="clubs-hero-art" size={220} strokeWidth={1} aria-hidden="true" />
        <div className="row-between" style={{ flexWrap: 'wrap', gap: 18 }}>
          <div style={{ maxWidth: 680 }}>
            <span className="clubs-hero-kicker">
              <Sparkles size={12} /> Cộng đồng đọc sách
            </span>
            <div className="row" style={{ gap: 12, marginTop: 8 }}>
              <span className="clubs-hero-icon"><Users size={24} /></span>
              <div>
                <h1>Nhóm đọc sách</h1>
                <p className="small" style={{ margin: 0, opacity: 0.82 }}>
                  Cùng sở thích, cùng mục tiêu, cùng nhau đọc và lớn lên
                </p>
              </div>
            </div>
            <p style={{ margin: '10px 0 14px', opacity: 0.92, lineHeight: 1.6 }}>
              Mọi yêu cầu tham gia đều được gửi tới chủ nhóm duyệt, kể cả nhóm công khai.
              Nhóm công khai cho phép đọc nội dung trước; nhóm riêng tư chỉ mở nội dung sau khi được duyệt.
            </p>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <span className="badge clubs-stat">
                <Users size={13} /> {stats.total} nhóm
              </span>
              {user && (
                <span className="badge clubs-stat">
                  <Check size={13} /> {stats.joined} nhóm đã tham gia
                </span>
              )}
              {user && stats.pending > 0 && (
                <span className="badge clubs-stat">
                  <Clock size={13} /> {stats.pending} yêu cầu đang chờ
                </span>
              )}
              {user && stats.managedPending > 0 && (
                <span className="badge clubs-stat">
                  <ShieldCheck size={13} /> {stats.managedPending} yêu cầu cần duyệt
                </span>
              )}
              <span className="badge clubs-stat">
                <Lock size={13} /> {stats.privateCount} nhóm riêng tư
              </span>
            </div>
          </div>
          <button type="button" className="btn btn-lg clubs-cta" onClick={openCreate}>
            <Plus size={18} /> Tạo nhóm mới
          </button>
        </div>
      </div>

      <div className="clubs-toolbar">
        <div className="clubs-search">
          <Search size={16} />
          <input
            className="input"
            placeholder="Tìm nhóm theo tên hoặc mô tả..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Tìm nhóm đọc sách"
          />
        </div>
        <div className="clubs-scopes">
          {SCOPES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`clubs-scope ${scope === item.id ? 'is-active' : ''}`.trim()}
              onClick={() => setScope(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="card empty">
          <Sparkles size={26} />
          <p className="small">Đang tải danh sách nhóm...</p>
        </div>
      )}

      {!loading && error && (
        <div className="card empty">
          <h3>Không thể tải nhóm</h3>
          <p className="small">{error}</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={load}>Thử lại</button>
        </div>
      )}

      {!loading && !error && clubs.length === 0 && (
        <div className="card empty">
          <Users size={30} />
          <h3 style={{ margin: '0 0 6px' }}>
            {scope === 'all' && !query ? 'Chưa có nhóm đọc sách nào' : 'Không tìm thấy nhóm phù hợp'}
          </h3>
          <p className="small" style={{ marginBottom: 14 }}>
            {scope === 'all' && !query
              ? 'Hãy là người đầu tiên tạo một nhóm và mời mọi người cùng thảo luận.'
              : 'Thử từ khóa khác hoặc đổi bộ lọc để xem thêm nhóm.'}
          </p>
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Tạo nhóm mới
          </button>
        </div>
      )}

      {!loading && !error && clubs.length > 0 && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))' }}>
          {clubs.map((club) => (
            <article key={club.id} className="clubs-card">
              <Link
                to={`/clubs/${club.id}`}
                className={`clubs-cover ${club.coverUrl ? 'has-cover' : 'clubs-cover-fallback'}`.trim()}
                style={coverStyle(club)}
                aria-label={`Mở nhóm ${club.name}`}
              >
                <BookOpen className="clubs-cover-book" size={68} strokeWidth={1.1} aria-hidden="true" />
                <div className="clubs-cover-top">
                  <span className={`clubs-chip ${club.privateClub ? 'clubs-chip-private' : 'clubs-chip-public'}`}>
                    {club.privateClub ? <Lock size={12} /> : <Globe2 size={12} />}
                    {club.privateClub ? 'Riêng tư' : 'Công khai'}
                  </span>
                  <span className="row" style={{ gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {club.pendingRequestCount > 0 && (
                      <span className="clubs-chip" style={{ background: 'rgba(219,234,254,.95)', color: '#1d4ed8' }}>
                        <ShieldCheck size={12} /> {club.pendingRequestCount} chờ duyệt
                      </span>
                    )}
                    {club.owner && (
                      <span className="clubs-chip clubs-owner-chip">
                        <Crown size={12} /> Chủ nhóm
                      </span>
                    )}
                  </span>
                </div>
              </Link>

              <div className="clubs-card-body">
                <div>
                  <Link to={`/clubs/${club.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    <h3 className="clubs-card-title">{club.name}</h3>
                  </Link>
                  <p className="small muted clamp-2 clubs-card-desc">
                    {club.description || 'Chưa có mô tả cho nhóm này.'}
                  </p>
                </div>

                <div className="clubs-meta">
                  <span className="row" style={{ gap: 4 }}><Users size={13} /> {club.memberCount} thành viên</span>
                  <span className="row" style={{ gap: 4 }}><BookOpen size={13} /> {club.postCount} bài</span>
                  <span className="row" style={{ gap: 4 }}><ShieldCheck size={13} /> Cần chủ nhóm duyệt</span>
                </div>

                <div className="clubs-card-foot">
                  <div className="row" style={{ gap: 6, minWidth: 0 }}>
                    <img
                      src={avatarSrc(club.ownerAvatarUrl)}
                      alt=""
                      className="avatar"
                      style={{ width: 24, height: 24 }}
                    />
                    <span className="tiny muted truncate" style={{ maxWidth: 105 }}>{club.ownerName}</span>
                  </div>

                  {club.joined ? (
                    <Link to={`/clubs/${club.id}`} className="btn btn-soft btn-sm">
                      <Check size={14} /> Vào nhóm
                    </Link>
                  ) : club.pendingRequest ? (
                    <Link
                      to={`/clubs/${club.id}`}
                      className="clubs-status-pending"
                      title="Xem trạng thái yêu cầu tham gia"
                    >
                      <Clock size={13} /> Chờ duyệt
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => requestJoin(club)}
                      title="Yêu cầu sẽ được gửi tới chủ nhóm duyệt"
                    >
                      <UserPlus size={14} /> Xin tham gia
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        title="Tạo nhóm đọc sách"
        onClose={() => setCreateOpen(false)}
        width={560}
        footer={(
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setCreateOpen(false)}>Hủy</button>
            <button type="submit" form="club-create-form" className="btn btn-primary" disabled={saving || uploadingCover}>
              {saving ? 'Đang tạo...' : 'Tạo nhóm'}
            </button>
          </>
        )}
      >
        <form id="club-create-form" className="stack" onSubmit={submitCreate}>
          <div>
            <label className="small strong" htmlFor="club-name">Tên nhóm *</label>
            <input
              id="club-name"
              className="input"
              style={{ marginTop: 6 }}
              maxLength={150}
              placeholder="Ví dụ: Cùng đọc văn học Việt"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              autoFocus
            />
          </div>
          <div>
            <label className="small strong" htmlFor="club-description">Mô tả</label>
            <textarea
              id="club-description"
              className="textarea"
              style={{ marginTop: 6 }}
              rows={4}
              maxLength={2000}
              placeholder="Giới thiệu mục tiêu, sở thích hoặc cách nhóm sinh hoạt..."
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>
          <div>
            <label className="small strong">Ảnh bìa</label>
            <div className="clubs-cover-picker" style={{ marginTop: 6 }}>
              {form.coverUrl && (
                <div
                  className="clubs-cover-preview"
                  style={{ backgroundImage: `url("${mediaSrc(form.coverUrl).replace(/"/g, '%22')}")` }}
                />
              )}
              <div className="clubs-cover-actions">
                <label className="btn btn-soft btn-sm" style={{ cursor: 'pointer' }}>
                  <ImageIcon size={15} /> {uploadingCover ? 'Đang tải...' : form.coverUrl ? 'Đổi ảnh' : 'Tải ảnh lên'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    hidden
                    disabled={uploadingCover}
                    onChange={uploadCover}
                  />
                </label>
                {form.coverUrl && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setForm((prev) => ({ ...prev, coverUrl: '' }))}
                  >
                    <X size={14} /> Bỏ ảnh
                  </button>
                )}
                <span className="tiny muted">PNG, JPG, WebP hoặc GIF · tối đa 10 MB</span>
              </div>
              <input
                className="input"
                style={{ marginTop: 10 }}
                maxLength={255}
                placeholder="Hoặc dán URL ảnh bìa..."
                value={form.coverUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, coverUrl: event.target.value }))}
              />
            </div>
          </div>
          <label
            className="row"
            style={{
              gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--bg-soft)',
              border: '1px solid var(--border-color)', cursor: 'pointer', alignItems: 'flex-start',
            }}
          >
            <input
              type="checkbox"
              checked={form.privateClub}
              onChange={(event) => setForm((prev) => ({ ...prev, privateClub: event.target.checked }))}
              style={{ marginTop: 2 }}
            />
            <span>
              <span className="small strong">Nhóm riêng tư</span>
              <span className="tiny muted" style={{ display: 'block', marginTop: 2 }}>
                Chỉ thành viên được duyệt mới xem được nội dung. Nhóm công khai vẫn cho đọc trước.
              </span>
            </span>
          </label>
          <div className="clubs-join-note">
            <ShieldCheck size={16} />
            <span>Mọi yêu cầu tham gia đều được gửi tới chủ nhóm để duyệt — kể cả nhóm công khai.</span>
          </div>
        </form>
      </Modal>
    </div>
  );
}
