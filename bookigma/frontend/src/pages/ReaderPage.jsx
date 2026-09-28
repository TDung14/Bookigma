import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Bookmark, ChevronLeft, ChevronRight, Languages, List, Minus, Music, Pause,
  Play, Plus, RotateCcw, Sparkles, Timer, Type, Volume2,
} from 'lucide-react';
import { useApp, useAuth, useToast } from '../hooks/useStore';
import { duration } from '../lib/format';
import { POINT_RULES } from '../lib/gamification';
import { ProgressBar } from '../components/common/ui';

/**
 * Trình đọc sách có lưu tiến trình.
 *
 * Vị trí đọc được xác định bằng cặp (chương, đoạn văn đang hiển thị trên màn hình).
 * Một observer theo dõi đoạn nào đang nằm trong khung nhìn, từ đó tính phần trăm
 * hoàn thành trên toàn bộ cuốn sách và ghi xuống kho dữ liệu sau mỗi 1,5 giây
 * để không ghi quá dày.
 */
export default function ReaderPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { bookById, getProgress, saveProgress, earnPoints, trackDaily, growPet, touchStreak } = useApp();

  const book = bookById(bookId);
  const saved = getProgress(user.id)[bookId];

  const [chapterIndex, setChapterIndex] = useState(saved?.chapterIndex ?? 0);
  const [fontSize, setFontSize] = useState(18);
  const [language, setLanguage] = useState('vi');
  const [showToc, setShowToc] = useState(false);
  const [showAi, setShowAi] = useState(true);
  const [bookmarks, setBookmarks] = useState([]);
  const [speaking, setSpeaking] = useState(false);

  // Nhạc nền + Pomodoro
  const [music, setMusic] = useState(false);
  const [seconds, setSeconds] = useState(1500);
  const [timerOn, setTimerOn] = useState(false);

  // Tiến trình
  const [percent, setPercent] = useState(saved?.percent ?? 0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const paraRefs = useRef([]);
  const currentPara = useRef(saved?.paragraphIndex ?? 0);
  const contentRef = useRef(null);

  const chapters = useMemo(() => book?.chapters || [], [book]);
  const chapter = chapters[chapterIndex];

  const totalParagraphs = useMemo(
    () => chapters.reduce((s, c) => s + c.paragraphs.length, 0),
    [chapters]
  );

  const paragraphsBefore = useMemo(
    () => chapters.slice(0, chapterIndex).reduce((s, c) => s + c.paragraphs.length, 0),
    [chapters, chapterIndex]
  );

  /** Tính % dựa trên đoạn văn xa nhất người đọc đã tới. */
  const computePercent = useCallback(
    (paraIdx) => {
      if (!totalParagraphs) return 0;
      const global = paragraphsBefore + paraIdx + 1;
      return Math.min(100, Math.round((global / totalParagraphs) * 100));
    },
    [paragraphsBefore, totalParagraphs]
  );

  // Theo dõi đoạn văn đang hiển thị để biết người dùng đọc tới đâu.
  useEffect(() => {
    if (!chapter) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idx = Number(entry.target.dataset.index);
          if (idx > currentPara.current || idx === 0) currentPara.current = idx;
          setPercent((prev) => Math.max(prev, computePercent(currentPara.current)));
        });
      },
      { rootMargin: '-45% 0px -45% 0px' }
    );
    paraRefs.current.filter(Boolean).forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [chapter, chapterIndex, computePercent]);

  // Ghi tiến trình định kỳ (gom lại để tránh ghi liên tục vào localStorage).
  useEffect(() => {
    if (!book) return undefined;
    const id = setInterval(() => {
      saveProgress(user.id, book.id, {
        chapterIndex,
        paragraphIndex: currentPara.current,
        percent,
        secondsRead: (saved?.secondsRead || 0) + sessionSeconds,
      });
    }, 1500);
    return () => clearInterval(id);
  }, [book, user.id, chapterIndex, percent, sessionSeconds, saved?.secondsRead, saveProgress]);

  // Đếm thời gian đọc thực tế của phiên này.
  useEffect(() => {
    const id = setInterval(() => setSessionSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Cứ mỗi phút đọc trọn vẹn thì cộng điểm Gigma, nuôi thú ảo và ghi nhận
  // tiến độ nhiệm vụ "đọc 10 phút". Đây là lý do thú ảo lớn lên theo thói quen thật.
  useEffect(() => {
    if (sessionSeconds === 0 || sessionSeconds % 60 !== 0) return;
    earnPoints(user.id, POINT_RULES.readMinute);
    growPet(user.id, 1);
    trackDaily(user.id, 'readMinutes', 1);
    touchStreak(user.id);
  }, [sessionSeconds, user.id, earnPoints, growPet, trackDaily, touchStreak]);

  // Pomodoro
  useEffect(() => {
    if (!timerOn) return undefined;
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) { setTimerOn(false); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerOn]);

  // Khôi phục đúng đoạn đang đọc dở khi mở lại sách.
  useEffect(() => {
    if (!saved || !chapter) return;
    const el = paraRefs.current[saved.paragraphIndex];
    if (el && saved.chapterIndex === chapterIndex) {
      el.scrollIntoView({ block: 'center' });
    }
    // Chỉ chạy một lần khi vào trang.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dừng đọc thành tiếng khi rời trang.
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  if (!book) {
    return (
      <div className="main-layout">
        <div className="card empty">
          <h3>Không tìm thấy sách</h3>
          <Link to="/library" className="btn btn-primary btn-sm">Về tủ sách</Link>
        </div>
      </div>
    );
  }

  if (!chapters.length) {
    return (
      <div className="main-layout">
        <div className="card empty">
          <h3>Cuốn sách này chưa có bản đọc trực tuyến</h3>
          <p className="small">Bạn có thể đặt mua bản in tại cửa hàng.</p>
          <Link to={`/book/${book.id}`} className="btn btn-primary btn-sm">Xem sản phẩm</Link>
        </div>
      </div>
    );
  }

  const goChapter = (idx) => {
    if (idx < 0 || idx >= chapters.length) return;
    setChapterIndex(idx);
    currentPara.current = 0;
    setShowToc(false);
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Sang chương mới thì % tối thiểu là toàn bộ các chương trước đó.
    const before = chapters.slice(0, idx).reduce((s, c) => s + c.paragraphs.length, 0);
    setPercent((p) => Math.max(p, Math.round((before / totalParagraphs) * 100)));
  };

  const toggleSpeak = () => {
    if (!window.speechSynthesis) return toast('Trình duyệt không hỗ trợ đọc thành tiếng.', 'error');
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(chapter.paragraphs.join(' '));
    utter.lang = language === 'vi' ? 'vi-VN' : 'en-US';
    utter.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
    toast('Đang đọc thành tiếng chương hiện tại.');
  };

  const addBookmark = () => {
    const mark = { chapterIndex, paragraphIndex: currentPara.current, at: Date.now() };
    setBookmarks((b) => [...b, mark]);
    toast(`Đã đánh dấu tại ${chapter.title}.`);
  };

  const formatClock = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const aiInsight = buildInsight(book, chapter, language);

  return (
    <div className="main-layout" style={{ maxWidth: 1180 }}>
      {/* Thanh tiến trình cố định */}
      <div style={{ position: 'sticky', top: 'var(--nav-h)', zIndex: 800, background: 'var(--bg-primary)', paddingBottom: 10 }}>
        <div className="card row-between" style={{ padding: '10px 14px', flexWrap: 'wrap', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/book/${book.id}`)}>
            <ChevronLeft size={15} /> {book.title}
          </button>
          <div className="row" style={{ flex: '1 1 220px', gap: 10, minWidth: 180 }}>
            <ProgressBar percent={percent} />
            <span className="tiny strong" style={{ color: 'var(--accent-green)', whiteSpace: 'nowrap' }}>{percent}%</span>
          </div>
          <div className="row tiny muted" style={{ gap: 12 }}>
            <span>Phiên này: {duration(sessionSeconds)}</span>
            <button className="btn btn-soft btn-sm" onClick={() => setShowToc((v) => !v)}>
              <List size={14} /> Mục lục
            </button>
          </div>
        </div>

        {showToc && (
          <div className="card" style={{ marginTop: 8, padding: 8 }}>
            {chapters.map((c, i) => (
              <button
                key={i}
                className={`list-item small ${i === chapterIndex ? 'active' : ''}`}
                onClick={() => goChapter(i)}
                style={{ color: i === chapterIndex ? 'var(--accent-green)' : undefined, fontWeight: i === chapterIndex ? 700 : 400 }}
              >
                {c.title}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,300px)', gap: 20, alignItems: 'start' }}>
        {/* Nội dung */}
        <div className="card" ref={contentRef}>
          <div className="row-between" style={{ paddingBottom: 14, borderBottom: '1px solid var(--border-color)', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 19 }}>{chapter.title}</h2>
            <div className="row" style={{ gap: 6 }}>
              <div className="row" style={{ gap: 0, border: '1px solid var(--border-color)', borderRadius: 8 }}>
                <button className="btn-icon" style={{ padding: 6 }} onClick={() => setFontSize((f) => Math.max(14, f - 2))} aria-label="Giảm cỡ chữ"><Minus size={14} /></button>
                <span className="tiny row" style={{ gap: 3, padding: '0 6px' }}><Type size={13} /> {fontSize}</span>
                <button className="btn-icon" style={{ padding: 6 }} onClick={() => setFontSize((f) => Math.min(26, f + 2))} aria-label="Tăng cỡ chữ"><Plus size={14} /></button>
              </div>
              <button className={`btn btn-sm ${speaking ? 'btn-primary' : 'btn-soft'}`} onClick={toggleSpeak}>
                <Volume2 size={14} /> {speaking ? 'Dừng đọc' : 'Đọc to'}
              </button>
              <button className="btn btn-soft btn-sm" onClick={addBookmark}>
                <Bookmark size={14} /> Đánh dấu
              </button>
            </div>
          </div>

          <div style={{ fontSize, lineHeight: 1.85, textAlign: 'justify' }}>
            {chapter.paragraphs.map((p, i) => (
              <p
                key={i}
                data-index={i}
                ref={(el) => { paraRefs.current[i] = el; }}
                style={{ marginBottom: 18 }}
              >
                {p}
              </p>
            ))}
          </div>

          <div className="row-between" style={{ marginTop: 26, paddingTop: 18, borderTop: '1px solid var(--border-color)' }}>
            <button className="btn btn-ghost" onClick={() => goChapter(chapterIndex - 1)} disabled={chapterIndex === 0}>
              <ChevronLeft size={16} /> Chương trước
            </button>
            <span className="tiny muted">{chapterIndex + 1} / {chapters.length}</span>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (chapterIndex === chapters.length - 1) {
                  setPercent(100);
                  saveProgress(user.id, book.id, { chapterIndex, paragraphIndex: currentPara.current, percent: 100, secondsRead: (saved?.secondsRead || 0) + sessionSeconds });
                  // Đọc hết chương cuối cũng là đọc xong một chương, nên vẫn tính
                  // vào nhiệm vụ hằng ngày chứ không chỉ tính khi bấm "Chương sau".
                  trackDaily(user.id, 'chapters', 1);
                  if (!saved?.finished) {
                    earnPoints(user.id, POINT_RULES.finishBook);
                    toast(`Chúc mừng! Đọc xong cuốn này — nhận ${POINT_RULES.finishBook} điểm Gigma 🎉`);
                  } else {
                    toast('Bạn đã đọc lại xong cuốn sách này 🎉');
                  }
                  return;
                }
                earnPoints(user.id, POINT_RULES.finishChapter);
                trackDaily(user.id, 'chapters', 1);
                toast(`Xong một chương — nhận ${POINT_RULES.finishChapter} điểm Gigma`);
                goChapter(chapterIndex + 1);
              }}
            >
              {chapterIndex === chapters.length - 1 ? 'Hoàn thành sách' : 'Chương sau'} <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Công cụ hỗ trợ */}
        <aside className="stack" style={{ position: 'sticky', top: 130 }}>
          <div className="card stack">
            <h4 style={{ margin: 0, fontSize: 15, paddingBottom: 8, borderBottom: '1px solid var(--border-color)' }}>Góc tập trung</h4>

            <div className="row-between">
              <span className="row small strong"><Music size={17} color="var(--accent-green)" /> Nhạc nền</span>
              <button className={`btn btn-sm ${music ? 'btn-primary' : 'btn-soft'}`} onClick={() => setMusic((v) => !v)}>
                {music ? <Pause size={13} /> : <Play size={13} />} {music ? 'Đang bật' : 'Bật'}
              </button>
            </div>

            <div className="row-between" style={{ background: 'var(--bg-soft)', padding: 10, borderRadius: 9 }}>
              <span className="row" style={{ gap: 8 }}>
                <Timer size={17} color="var(--accent-green)" />
                <b style={{ fontFamily: 'monospace', fontSize: 17 }}>{formatClock(seconds)}</b>
              </span>
              <div className="row" style={{ gap: 4 }}>
                <button className="btn-icon" style={{ padding: 5 }} onClick={() => setTimerOn((v) => !v)} aria-label="Bắt đầu/tạm dừng">
                  {timerOn ? <Pause size={15} /> : <Play size={15} />}
                </button>
                <button className="btn-icon" style={{ padding: 5 }} onClick={() => { setTimerOn(false); setSeconds(1500); }} aria-label="Đặt lại">
                  <RotateCcw size={15} />
                </button>
              </div>
            </div>

            <div className="row-between">
              <span className="row small strong"><Languages size={17} color="var(--accent-green)" /> Ngôn ngữ</span>
              <select className="select" style={{ width: 'auto', padding: '5px 8px', fontSize: 13 }} value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div className="card" style={{ borderLeft: '4px solid var(--accent-green)' }}>
            <div className="row-between" style={{ marginBottom: 8 }}>
              <span className="row" style={{ gap: 6 }}>
                <Sparkles size={17} color="var(--accent-green)" />
                <h4 style={{ margin: 0, fontSize: 15, color: 'var(--accent-green)' }}>AI giải thích</h4>
              </span>
              <button className="btn-icon" style={{ padding: 4 }} onClick={() => setShowAi((v) => !v)}>
                {showAi ? <Minus size={15} /> : <Plus size={15} />}
              </button>
            </div>
            {showAi && <p className="small" style={{ margin: 0, lineHeight: 1.65 }}>{aiInsight}</p>}
          </div>

          {bookmarks.length > 0 && (
            <div className="card">
              <h4 style={{ margin: '0 0 10px', fontSize: 15 }}>Đánh dấu của bạn ({bookmarks.length})</h4>
              <div className="stack" style={{ gap: 6 }}>
                {bookmarks.map((b, i) => (
                  <button key={i} className="list-item small" onClick={() => goChapter(b.chapterIndex)}>
                    <Bookmark size={14} color="var(--accent-green)" />
                    <span className="truncate">{chapters[b.chapterIndex]?.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h4 style={{ margin: '0 0 10px', fontSize: 15 }}>Thống kê cuốn này</h4>
            <div className="stack small" style={{ gap: 8 }}>
              <div className="row-between"><span className="muted">Đã hoàn thành</span><b style={{ color: 'var(--accent-green)' }}>{percent}%</b></div>
              <div className="row-between"><span className="muted">Tổng thời gian đọc</span><b>{duration((saved?.secondsRead || 0) + sessionSeconds)}</b></div>
              <div className="row-between"><span className="muted">Chương</span><b>{chapterIndex + 1}/{chapters.length}</b></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Sinh phần "AI giải thích" bám theo nội dung chương đang mở. */
function buildInsight(book, chapter, language) {
  if (language === 'en') {
    return `This chapter of "${book.title}" centers on ${(book.tags || []).slice(0, 2).join(' and ')}. `
      + `Pay attention to how the author uses concrete scenes to carry an abstract idea — a hallmark of ${book.author}'s style.`;
  }
  const tags = (book.tags || []).slice(0, 3).join(', ');
  const title = chapter.title.split(':').slice(1).join(':').trim() || chapter.title;
  return `Chương "${title}" xoay quanh các chủ đề ${tags}. `
    + `${book.author} dùng những hình ảnh rất cụ thể để chuyển tải một ý niệm trừu tượng — hãy để ý cách tác giả đặt nhân vật vào tình huống buộc phải lựa chọn, `
    + `vì đó thường là nơi thông điệp chính của cuốn "${book.title}" lộ ra rõ nhất.`;
}
