import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award, Check, Clock, Flame, Gift, Heart, Pencil, Sparkles, Target, Trophy, Zap, CalendarCheck
} from 'lucide-react';
import { useApp, useAuth, useToast } from '../hooks/useStore';
import {
  BADGES, FEED_COST, REWARDS, collectStats, evaluateBadges, levelFromPoints,
  petMood, petStage, taskState, titleForLevel,
} from '../lib/gamification';
import { currency, duration, timeAgo } from '../lib/format';
import { ProgressBar, StatCard } from '../components/common/ui';
import { dailyCheckIn, getPointsSummary, addPointsApi, deductPointsApi } from '../services/pointsApi';

const TABS = [
  { id: 'tasks', label: 'Nhiệm vụ hôm nay' },
  { id: 'history', label: 'Lịch sử tích điểm' },
  { id: 'pet', label: 'Thú ảo' },
  { id: 'badges', label: 'Huy hiệu' },
  { id: 'shop', label: 'Đổi thưởng' },
];

export default function RewardsPage() {
  const { user } = useAuth();
  const {
    getDaily, claimTask, earnPoints, feedPet, renamePet, redeemReward, redemptions,
    getProgress, orders, posts, exchanges,
  } = useApp();
  const toast = useToast();

  const [tab, setTab] = useState('tasks');
  const [renaming, setRenaming] = useState(false);
  const [petNameDraft, setPetNameDraft] = useState(user.petName || 'Bạn đọc nhỏ');
  const [pointsData, setPointsData] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const fetchPoints = () => {
    getPointsSummary(user.id)
      .then((data) => setPointsData(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchPoints();
  }, [user.id]);

  const currentPoints = pointsData?.balance ?? user.points ?? 0;

  const handleDailyCheckIn = async () => {
    setCheckingIn(true);
    try {
      const res = await dailyCheckIn(user.id);
      const added = res.amount || 50;
      toast(`Điểm danh thành công! +${added} Điểm Bookigma`, 'success');
      earnPoints(user.id, added);
      fetchPoints();
    } catch (err) {
      toast(err.message || 'Không thể điểm danh', 'error');
    } finally {
      setCheckingIn(false);
    }
  };

  const daily = getDaily(user.id);
  const tasks = useMemo(() => taskState(daily), [daily]);
  const lv = levelFromPoints(currentPoints);

  const stats = useMemo(
    () => collectStats({ user, progress: getProgress(user.id), orders, posts, exchanges }),
    [user, getProgress, orders, posts, exchanges]
  );
  const badges = useMemo(() => evaluateBadges(stats), [stats]);
  const earnedCount = badges.filter((b) => b.earned).length;

  const pet = petStage(user.petXp || 0);
  const mood = petMood(user.petLastFed);
  const myRedemptions = redemptions.filter((r) => r.userId === user.id);

  const handleClaim = async (task) => {
    const granted = claimTask(user.id, task.id);
    if (!granted) return toast('Nhiệm vụ chưa hoàn thành.', 'error');
    earnPoints(user.id, granted);
    try {
      await addPointsApi(user.id, granted, 'TASK_REWARD', `Hoàn thành nhiệm vụ: ${task.label}`);
      fetchPoints();
    } catch (err) {
      // Local fallback granted points via earnPoints
    }
    toast(`Hoàn thành "${task.label}" — nhận ${granted} điểm!`);
  };

  const handleFeed = async () => {
    if (currentPoints < FEED_COST) return toast(`Cần ${FEED_COST} điểm để cho ăn.`, 'error');
    feedPet(user.id, FEED_COST);
    try {
      await deductPointsApi(user.id, FEED_COST, 'FEED_PET', 'Cho thú ảo ăn bánh');
      fetchPoints();
    } catch (err) {
      // Local fallback
    }
    toast(`${user.petName || 'Thú ảo'} ăn ngon lành! +55 EXP`);
  };

  const handleRedeem = async (reward) => {
    if (currentPoints < reward.cost) return toast('Bạn chưa đủ điểm.', 'error');
    if (!window.confirm(`Đổi "${reward.name}" với ${reward.cost} điểm?`)) return;
    const ok = redeemReward(user.id, reward, currentPoints);
    if (ok) {
      try {
        await deductPointsApi(user.id, reward.cost, 'REDEEM_REWARD', `Đổi quà: ${reward.name}`);
        fetchPoints();
      } catch (err) {
        // Local fallback
      }
      toast(`Đã đổi "${reward.name}". Quà sẽ đi kèm đơn hàng kế tiếp của bạn.`, 'success');
    } else {
      toast('Bạn chưa đủ điểm.', 'error');
    }
  };

  return (
    <div className="main-layout">
      <div className="page-head">
        <h1>Nhiệm vụ & Phần thưởng</h1>
        <p>Đọc sách mỗi ngày để tích điểm Bookigma, nuôi thú ảo và đổi quà thật</p>
      </div>

      {/* Thẻ cấp độ */}
      <div
        className="card"
        style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 55%, #065f46 100%)', color: '#fff', border: 'none', marginBottom: 20 }}
      >
        <div className="row-between" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div className="row" style={{ gap: 14 }}>
            <img src={user.avatar} alt="" className="avatar" style={{ width: 58, height: 58, border: '3px solid rgba(255,255,255,.4)' }} />
            <div>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, color: '#fff', fontSize: 20 }}>{user.name}</h2>
                <span className="badge" style={{ background: 'rgba(255,255,255,.22)', color: '#fff' }}>
                  Hạng {pointsData?.currentTier || titleForLevel(lv.level)}
                </span>
              </div>
              <div className="row" style={{ gap: 14, marginTop: 6, opacity: .95, fontSize: 13 }}>
                <span className="row" style={{ gap: 5 }}><Zap size={14} /> {(pointsData?.balance ?? user.points ?? 0).toLocaleString('vi-VN')} Điểm Bookigma</span>
                <span className="row" style={{ gap: 5 }}><Flame size={14} /> Chuỗi {user.streak || 0} ngày</span>
              </div>
            </div>
          </div>

          <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
            <button
              className="btn"
              onClick={handleDailyCheckIn}
              disabled={checkingIn || pointsData?.checkedInToday}
              style={{
                background: pointsData?.checkedInToday ? 'rgba(255,255,255,.3)' : '#f59e0b',
                color: '#fff',
                fontWeight: 600,
                border: 'none',
                padding: '10px 18px',
                borderRadius: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <CalendarCheck size={18} />
              {pointsData?.checkedInToday ? 'Đã điểm danh hôm nay' : 'Điểm danh nhận +50 Điểm'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 20 }}>
        <StatCard icon={Zap} label="Ví Điểm Bookigma" value={(pointsData?.balance ?? user.points ?? 0).toLocaleString('vi-VN')} sub="Dùng giảm tiền đơn hàng" />
        <StatCard icon={Flame} label="Tích lũy cả đời" value={`${(pointsData?.lifetimePoints ?? 0).toLocaleString('vi-VN')} Điểm`} sub={`Còn ${pointsData?.pointsToNextTier || 0} điểm lên hạng tiếp`} color="var(--warning)" bg="var(--warning-soft)" />
        <StatCard icon={Award} label="Hạng hội viên" value={pointsData?.currentTier || 'Tập Sự'} sub={`Tiếp theo: ${pointsData?.nextTier || 'Max'}`} color="var(--info)" bg="var(--info-soft)" />
        <StatCard icon={Clock} label="Thời gian đọc" value={duration(stats.secondsRead)} sub={`${stats.booksFinished} cuốn đã xong`} color="var(--purple)" bg="var(--purple-soft)" />
      </div>

      <div className="tabs" style={{ marginBottom: 18 }}>
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === 'tasks' && tasks.some((x) => x.done && !x.claimed) && (
              <span className="badge badge-red" style={{ marginLeft: 6 }}>
                {tasks.filter((x) => x.done && !x.claimed).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ---------- Lịch sử giao dịch điểm ---------- */}
      {tab === 'history' && (
        <div className="card">
          <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Lịch sử biến động Điểm Bookigma</h3>
          {(!pointsData?.recentTransactions || pointsData.recentTransactions.length === 0) ? (
            <p className="muted small" style={{ margin: 0 }}>Chưa có giao dịch tích điểm nào.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Thời gian</th>
                    <th style={{ padding: '8px 12px' }}>Loại giao dịch</th>
                    <th style={{ padding: '8px 12px' }}>Mô tả</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Số điểm</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Số dư sau</th>
                  </tr>
                </thead>
                <tbody>
                  {pointsData.recentTransactions.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td className="tiny muted" style={{ padding: '10px 12px' }}>
                        {new Date(tx.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className={`badge ${tx.amount > 0 ? 'badge-green' : 'badge-red'}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>{tx.description}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: tx.amount > 0 ? 'var(--accent-green)' : 'var(--danger)' }}>
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount} Điểm
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 500 }}>
                        {tx.balanceAfter.toLocaleString('vi-VN')} Điểm
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------- Nhiệm vụ ---------- */}
      {tab === 'tasks' && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))' }}>
          {tasks.map((t) => (
            <div key={t.id} className="card" style={{ borderLeft: `4px solid ${t.claimed ? 'var(--accent-green)' : t.done ? 'var(--warning)' : 'var(--border-color)'}` }}>
              <div className="row-between" style={{ marginBottom: 8, gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <h4 style={{ margin: '0 0 3px', fontSize: 15 }}>{t.label}</h4>
                  <p className="tiny muted" style={{ margin: 0 }}>{t.hint}</p>
                </div>
                <span className="badge badge-green" style={{ flexShrink: 0 }}>+{t.reward} điểm</span>
              </div>

              <div className="row-between tiny" style={{ marginBottom: 5 }}>
                <span className="muted">Tiến độ</span>
                <span className="strong">{t.progress}/{t.goal}</span>
              </div>
              <ProgressBar percent={t.percent} />

              <div style={{ marginTop: 12 }}>
                {t.claimed ? (
                  <button className="btn btn-soft btn-sm btn-block" disabled><Check size={15} /> Đã nhận thưởng</button>
                ) : t.done ? (
                  <button className="btn btn-primary btn-sm btn-block" onClick={() => handleClaim(t)}>
                    <Gift size={15} /> Nhận {t.reward} điểm
                  </button>
                ) : (
                  <Link to={t.metric === 'social' ? '/' : t.metric === 'explore' ? '/shop' : '/library'} className="btn btn-ghost btn-sm btn-block">
                    <Target size={15} /> Làm nhiệm vụ này
                  </Link>
                )}
              </div>
            </div>
          ))}

          <div className="card" style={{ background: 'var(--bg-soft)' }}>
            <h4 className="row" style={{ margin: '0 0 8px', fontSize: 15, gap: 7 }}>
              <Sparkles size={17} color="var(--accent-green)" /> Cách tích điểm nhanh
            </h4>
            <ul className="small muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
              <li>Mỗi phút đọc sách: <b>+2 điểm</b></li>
              <li>Đọc xong một chương: <b>+30 điểm</b></li>
              <li>Đọc xong cả cuốn: <b>+200 điểm</b></li>
              <li>Đăng bài / bình luận: <b>+15 / +5 điểm</b></li>
              <li>Đặt hàng thành công: <b>+50 điểm</b></li>
              <li>Giữ chuỗi mỗi ngày: <b>+25 điểm</b></li>
            </ul>
          </div>
        </div>
      )}

      {/* ---------- Thú ảo ---------- */}
      {tab === 'pet' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,340px)', gap: 20, alignItems: 'start' }}>
          <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ fontSize: 96, lineHeight: 1, marginBottom: 10 }}>{pet.emoji}</div>

            <div className="row" style={{ justifyContent: 'center', gap: 8, marginBottom: 6 }}>
              {renaming ? (
                <>
                  <input
                    className="input"
                    style={{ width: 180, textAlign: 'center' }}
                    value={petNameDraft}
                    onChange={(e) => setPetNameDraft(e.target.value)}
                    maxLength={20}
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => { renamePet(user.id, petNameDraft.trim() || 'Bạn đọc nhỏ'); setRenaming(false); toast('Đã đổi tên thú ảo.'); }}
                  >
                    Lưu
                  </button>
                </>
              ) : (
                <>
                  <h2 style={{ margin: 0, fontSize: 22 }}>{user.petName || 'Bạn đọc nhỏ'}</h2>
                  <button className="btn-icon" onClick={() => setRenaming(true)} aria-label="Đổi tên thú ảo"><Pencil size={15} /></button>
                </>
              )}
            </div>

            <div className="row" style={{ justifyContent: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <span className="badge badge-green">{pet.name}</span>
              <span className={`badge ${mood.badge}`}>{mood.emoji} {mood.label}</span>
            </div>

            <p className="small muted" style={{ maxWidth: 380, margin: '0 auto 20px', lineHeight: 1.6 }}>{pet.desc}</p>

            <div style={{ maxWidth: 400, margin: '0 auto' }}>
              <div className="row-between tiny" style={{ marginBottom: 5 }}>
                <span className="muted">{pet.next ? `Tiến hoá thành ${pet.next.name}` : 'Đã đạt dạng tiến hoá cuối'}</span>
                <span className="strong">{user.petXp || 0} EXP</span>
              </div>
              <ProgressBar percent={pet.percent} height={9} />
            </div>

            <button className="btn btn-primary btn-lg" style={{ marginTop: 22 }} onClick={handleFeed} disabled={currentPoints < FEED_COST}>
              <Heart size={17} /> Cho ăn ({FEED_COST} điểm)
            </button>
            {currentPoints < FEED_COST && (
              <p className="tiny muted" style={{ marginTop: 8 }}>Bạn chưa đủ điểm — đọc sách thêm chút nữa nhé.</p>
            )}
          </div>

          <div className="stack">
            <div className="card">
              <h4 style={{ margin: '0 0 12px', fontSize: 15 }}>Thú ảo lớn lên bằng gì?</h4>
              <p className="small muted" style={{ margin: '0 0 12px', lineHeight: 1.65 }}>
                Mỗi phút bạn đọc sách, thú ảo nhận 1 EXP. Cho ăn bằng điểm sẽ cộng thêm 55 EXP.
                Nói cách khác, con vật này lớn lên bằng chính thói quen đọc của bạn.
              </p>
              <Link to="/library" className="btn btn-ghost btn-sm btn-block">Mở tủ sách và đọc tiếp</Link>
            </div>

            <div className="card">
              <h4 style={{ margin: '0 0 12px', fontSize: 15 }}>Các giai đoạn tiến hoá</h4>
              <div className="stack" style={{ gap: 10 }}>
                {[
                  { min: 0, emoji: '🥚', name: 'Trứng sách' },
                  { min: 120, emoji: '🐛', name: 'Mọt con' },
                  { min: 400, emoji: '🐌', name: 'Mọt sách' },
                  { min: 900, emoji: '🦉', name: 'Cú đọc đêm' },
                  { min: 1800, emoji: '🦊', name: 'Cáo hiền triết' },
                  { min: 3200, emoji: '🐉', name: 'Rồng tri thức' },
                ].map((st, i) => {
                  const unlocked = (user.petXp || 0) >= st.min;
                  return (
                    <div key={st.name} className="row" style={{ gap: 10, opacity: unlocked ? 1 : .42 }}>
                      <span style={{ fontSize: 24, width: 32, textAlign: 'center', filter: unlocked ? 'none' : 'grayscale(1)' }}>{st.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="small strong">{st.name}</div>
                        <div className="tiny muted">{st.min} EXP</div>
                      </div>
                      {i === pet.index && <span className="badge badge-green">Hiện tại</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Huy hiệu ---------- */}
      {tab === 'badges' && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
          {badges.map((b) => (
            <div
              key={b.id}
              className="card"
              style={{ textAlign: 'center', opacity: b.earned ? 1 : .55, borderStyle: b.earned ? 'solid' : 'dashed' }}
            >
              <div style={{ fontSize: 44, marginBottom: 8, filter: b.earned ? 'none' : 'grayscale(1)' }}>{b.emoji}</div>
              <h4 style={{ margin: '0 0 4px', fontSize: 15 }}>{b.name}</h4>
              <p className="tiny muted" style={{ margin: '0 0 10px', minHeight: 32 }}>{b.desc}</p>
              <span className={`badge ${b.earned ? 'badge-green' : ''}`}>
                {b.earned ? <><Trophy size={12} /> Đã đạt</> : 'Chưa mở khoá'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ---------- Đổi thưởng ---------- */}
      {tab === 'shop' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,320px)', gap: 20, alignItems: 'start' }}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {REWARDS.map((r) => {
              const affordable = currentPoints >= r.cost;
              return (
                <div key={r.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 38, textAlign: 'center', marginBottom: 8 }}>{r.emoji}</div>
                  <h4 style={{ margin: '0 0 4px', fontSize: 15 }}>{r.name}</h4>
                  <p className="tiny muted" style={{ margin: '0 0 12px', flex: 1 }}>{r.desc}</p>
                  <div className="row-between" style={{ marginBottom: 10 }}>
                    <span className="row strong" style={{ gap: 5, color: 'var(--accent-green)' }}>
                      <Zap size={15} /> {r.cost.toLocaleString('vi-VN')}
                    </span>
                    {r.type === 'voucher' && <span className="badge badge-blue">{currency(r.value)}</span>}
                    {r.type === 'physical' && <span className="badge badge-purple">Quà thật</span>}
                  </div>
                  <button className="btn btn-primary btn-sm btn-block" onClick={() => handleRedeem(r)} disabled={!affordable}>
                    {affordable ? 'Đổi ngay' : `Còn thiếu ${(r.cost - currentPoints).toLocaleString('vi-VN')} điểm`}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="card" style={{ position: 'sticky', top: 76 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 15 }}>Lịch sử đổi thưởng</h4>
            {myRedemptions.length === 0 ? (
              <p className="small muted" style={{ margin: 0 }}>Bạn chưa đổi phần thưởng nào.</p>
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                {myRedemptions.slice(0, 10).map((r) => (
                  <div key={r.id} className="row-between" style={{ paddingBottom: 9, borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="small strong truncate">{r.name}</div>
                      <div className="tiny muted">{timeAgo(r.at)}</div>
                    </div>
                    <span className="tiny strong" style={{ color: 'var(--danger)' }}>-{r.cost}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
