import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Bookmark, CheckCircle, ChevronLeft, ChevronRight, Crown, Headphones, HelpCircle,
  List, Lock, Minus, Music, Pause, Play, Plus, RotateCcw,
  Sparkles, Type, Volume2, XCircle,
} from 'lucide-react';
import { useApp, useAuth, useToast } from '../hooks/useStore';
import { useVip } from '../hooks/useVip';
import { duration } from '../lib/format';
import { load, save } from '../lib/storage';
import { POINT_RULES } from '../lib/gamification';
import { ProgressBar } from '../components/common/ui';
import {
  AMBIENT_SOUNDS, getCurrentAmbient, playAmbient, playSuccessChime,
  playWrongChime, setAmbientVolume, stopAmbient,
} from '../lib/ambientSound';
import { generatePageQuiz } from '../lib/quizGenerator';
import './reader.css';

// Các màu gáy sách vintage trên kệ tủ sách
const SPINE_COLORS = [
  { bg: 'linear-gradient(180deg, #78350f, #451a03)', border: '#92400e' }, // Nâu da bò
  { bg: 'linear-gradient(180deg, #14532d, #052e16)', border: '#166534' }, // Xanh lục bảo
  { bg: 'linear-gradient(180deg, #1e3a8a, #172554)', border: '#1d4ed8' }, // Xanh biển sâu
  { bg: 'linear-gradient(180deg, #831843, #500724)', border: '#9d174d' }, // Đỏ rượu vang
  { bg: 'linear-gradient(180deg, #581c87, #3b0764)', border: '#6b21a8' }, // Tím hoàng gia
  { bg: 'linear-gradient(180deg, #7c2d12, #431407)', border: '#9a3412' }, // Cam đất nung
  { bg: 'linear-gradient(180deg, #1e293b, #0f172a)', border: '#334155' }, // Xám mun cổ điển
];

const PARAGRAPHS_PER_PAGE = 3; // Mỗi trang sách hiển thị 3 đoạn văn vừa mắt

const READER_THEMES = ['bookshelf', 'sepia', 'midnight', 'clean'];
const FONT_MIN = 14;
const FONT_MAX = 26;
const FONT_STEP = 2;

const initialFontSize = () => {
  const value = Number(load('readerFontSize', 18));
  return Number.isFinite(value) ? Math.min(FONT_MAX, Math.max(FONT_MIN, value)) : 18;
};

const initialReaderTheme = () => {
  const value = load('readerTheme', 'bookshelf');
  return READER_THEMES.includes(value) ? value : 'bookshelf';
};

/**
 * Trình đọc sách Góc Đọc Bookigma.
 */
export default function ReaderPage() {
  const { bookId } = useParams();
  const { bookById, loadBook, catalogStatus } = useApp();
  const [failedId, setFailedId] = useState(null);

  const book = bookById(bookId);
  const needsChapters = !!book && !book.chapters && book.chapterCount > 0 && failedId !== bookId;

  useEffect(() => {
    if (!needsChapters) return;
    loadBook(bookId).catch(() => setFailedId(bookId));
  }, [needsChapters, bookId, loadBook]);

  if (catalogStatus === 'loading' || needsChapters) {
    return (
      <div className="main-layout">
        <div className="card empty"><h3>Đang mở cuốn sách từ tủ sách...</h3></div>
      </div>
    );
  }
  return <ReaderContent key={bookId} />;
}

function ReaderContent() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { isVip } = useVip(user.id);
  const { bookById, getProgress, saveProgress, earnPoints, trackDaily, growPet, touchStreak } = useApp();

  const book = bookById(bookId);
  const saved = getProgress(user.id)[bookId];

  // Trạng thái chương và trang
  const [chapterIndex, setChapterIndex] = useState(saved?.chapterIndex ?? 0);
  const [pageIndex, setPageIndex] = useState(0);
  const [fontSize, setFontSize] = useState(initialFontSize);
  const [language, setLanguage] = useState('vi');
  const [showToc, setShowToc] = useState(false);
  const [showAi, setShowAi] = useState(true);
  const [bookmarks, setBookmarks] = useState([]);
  const [speaking, setSpeaking] = useState(false);

  // Theme giao diện tủ sách
  const [readerTheme, setReaderTheme] = useState(initialReaderTheme);
  const [showShelf, setShowShelf] = useState(true);

  // Âm thanh chill chill
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const [ambientType, setAmbientType] = useState('rain');
  const [ambientVol, setAmbientVol] = useState(50);

  // Pomodoro & Đồng hồ đọc sách
  const [seconds, setSeconds] = useState(1500);
  const [timerOn, setTimerOn] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);

  // Chế độ thử thách đọc hiểu sau mỗi trang
  const [quizMode, setQuizMode] = useState(true);
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizIsCorrect, setQuizIsCorrect] = useState(false);
  const [passedPages, setPassedPages] = useState({}); // { "c0-p1": true }

  // Tiến trình
  const [percent, setPercent] = useState(saved?.percent ?? 0);
  const contentRef = useRef(null);

  const chapters = useMemo(() => book?.chapters || [], [book]);
  const chapter = chapters[chapterIndex];

  // Chia đoạn văn của chương hiện tại thành các trang
  const pages = useMemo(() => {
    if (!chapter?.paragraphs?.length) return [[]];
    const chunks = [];
    for (let i = 0; i < chapter.paragraphs.length; i += PARAGRAPHS_PER_PAGE) {
      chunks.push(chapter.paragraphs.slice(i, i + PARAGRAPHS_PER_PAGE));
    }
    return chunks;
  }, [chapter]);

  const currentPageParagraphs = pages[pageIndex] || [];
  const totalPagesInChapter = pages.length;

  const totalParagraphs = useMemo(
    () => chapters.reduce((s, c) => s + (c.paragraphs?.length || 0), 0),
    [chapters]
  );

  // Tính phần trăm đọc sách
  const computePercent = useCallback(
    (chapIdx, pageIdx) => {
      if (!totalParagraphs) return 0;
      const beforeChap = chapters.slice(0, chapIdx).reduce((s, c) => s + (c.paragraphs?.length || 0), 0);
      const inChap = (pageIdx + 1) * PARAGRAPHS_PER_PAGE;
      const totalPassed = Math.min(beforeChap + inChap, totalParagraphs);
      return Math.min(100, Math.round((totalPassed / totalParagraphs) * 100));
    },
    [chapters, totalParagraphs]
  );

  // Đếm thời gian đọc thực tế của phiên này
  useEffect(() => {
    const id = setInterval(() => setSessionSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Cứ mỗi phút đọc trọn vẹn thì cộng điểm Bookigma, nuôi thú ảo và ghi nhận streak
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
        if (s <= 1) {
          setTimerOn(false);
          toast('⏰ Hoàn thành mục tiêu đọc sách Pomodoro! Thưởng +20 điểm Bookigma 🎉');
          earnPoints(user.id, 20);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerOn, toast, earnPoints, user.id]);

  // Tắt âm thanh và speech khi thoát trang
  useEffect(() => {
    return () => {
      stopAmbient();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const changeFontSize = (delta) => {
    const next = Math.min(FONT_MAX, Math.max(FONT_MIN, fontSize + delta));
    if (next === fontSize) return;
    setFontSize(next);
    save('readerFontSize', next);
  };

  const changeReaderTheme = (themeId) => {
    setReaderTheme(themeId);
    save('readerTheme', themeId);
  };

  const isSoundLocked = (sound) => Boolean(sound?.premium && !isVip);

  // Bật/tắt âm thanh chill
  const toggleAmbientSound = () => {
    const found = AMBIENT_SOUNDS.find((s) => s.id === ambientType);
    if (isSoundLocked(found)) {
      toast('Âm thanh này dành cho thành viên VIP. Nâng cấp để mở khoá toàn bộ nhạc trong Góc đọc.', 'error');
      return;
    }
    if (ambientPlaying) {
      stopAmbient();
      setAmbientPlaying(false);
      toast('Đã tắt âm thanh chill chill');
    } else {
      playAmbient(ambientType, ambientVol / 100);
      setAmbientPlaying(true);
      toast(`Đang phát: ${found?.name || 'Âm thanh chill'}`);
    }
  };

  const changeAmbientSound = (soundId) => {
    const found = AMBIENT_SOUNDS.find((s) => s.id === soundId);
    if (isSoundLocked(found)) {
      toast('Âm thanh này dành cho thành viên VIP. Nâng cấp để mở khoá toàn bộ nhạc trong Góc đọc.', 'error');
      return;
    }
    setAmbientType(soundId);
    if (ambientPlaying) {
      playAmbient(soundId, ambientVol / 100);
    }
  };

  const handleVolumeChange = (e) => {
    const val = Number(e.target.value);
    setAmbientVol(val);
    setAmbientVolume(val / 100);
  };

  // Điều hướng chương
  const goChapter = (idx) => {
    if (idx < 0 || idx >= chapters.length) return;
    setChapterIndex(idx);
    setPageIndex(0);
    setShowToc(false);
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const newPercent = computePercent(idx, 0);
    setPercent((p) => Math.max(p, newPercent));
  };

  // Lật trang trước
  const handlePrevPage = () => {
    if (pageIndex > 0) {
      setPageIndex((p) => p - 1);
      contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (chapterIndex > 0) {
      // Về cuối chương trước
      const prevChapIndex = chapterIndex - 1;
      const prevChapParas = chapters[prevChapIndex]?.paragraphs?.length || 0;
      const prevTotalPages = Math.ceil(prevChapParas / PARAGRAPHS_PER_PAGE) || 1;
      setChapterIndex(prevChapIndex);
      setPageIndex(prevTotalPages - 1);
      contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Xử lý khi bấm "Lật trang tiếp theo"
  const handleNextPageClick = () => {
    const pageKey = `c${chapterIndex}-p${pageIndex}`;

    // Nếu đã trả lời đúng trang này trước đó hoặc tắt chế độ câu hỏi -> cho qua luôn
    if (!quizMode || passedPages[pageKey]) {
      proceedToNextPage();
      return;
    }

    // Tạo câu hỏi trắc nghiệm kiểm tra độ hiểu bài của trang vừa đọc
    const generated = generatePageQuiz(currentPageParagraphs, chapter.title, pageIndex + 1);
    setCurrentQuiz(generated);
    setSelectedOption(null);
    setQuizSubmitted(false);
    setQuizIsCorrect(false);
    setQuizModalOpen(true);
  };

  // Chuyển trang tiếp theo thực sự
  const proceedToNextPage = () => {
    if (pageIndex < totalPagesInChapter - 1) {
      setPageIndex((p) => p + 1);
      contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const newPercent = computePercent(chapterIndex, pageIndex + 1);
      setPercent((p) => Math.max(p, newPercent));
    } else if (chapterIndex < chapters.length - 1) {
      // Hết chương -> sang chương sau
      earnPoints(user.id, POINT_RULES.finishChapter);
      trackDaily(user.id, 'chapters', 1);
      toast(`Xong một chương — nhận ${POINT_RULES.finishChapter} điểm Bookigma`);
      goChapter(chapterIndex + 1);
    } else {
      // Đọc xong toàn bộ cuốn sách
      setPercent(100);
      saveProgress(user.id, book.id, {
        chapterIndex,
        paragraphIndex: chapter.paragraphs.length,
        percent: 100,
        secondsRead: (saved?.secondsRead || 0) + sessionSeconds,
      });
      trackDaily(user.id, 'chapters', 1);
      if (!saved?.finished) {
        earnPoints(user.id, POINT_RULES.finishBook);
        toast(`Chúc mừng! Đọc xong toàn bộ cuốn sách — nhận ${POINT_RULES.finishBook} điểm Bookigma 🎉`);
      } else {
        toast('Bạn đã đọc lại xong cuốn sách này 🎉');
      }
    }
  };

  // Xác nhận trả lời câu hỏi
  const handleAnswerSubmit = () => {
    if (selectedOption === null || !currentQuiz) return;
    const isCorrect = selectedOption === currentQuiz.correctIndex;
    setQuizSubmitted(true);
    setQuizIsCorrect(isCorrect);

    if (isCorrect) {
      playSuccessChime();
      const pageKey = `c${chapterIndex}-p${pageIndex}`;
      setPassedPages((prev) => ({ ...prev, [pageKey]: true }));

      // Thưởng điểm đọc hiểu
      earnPoints(user.id, 10);
      toast('🎉 Chính xác 100%! Bạn đã nắm vững nội dung trang này. +10 Điểm Bookigma');

      // Tự động ghi nhận tiến độ đọc
      const newPercent = computePercent(chapterIndex, pageIndex);
      setPercent((p) => Math.max(p, newPercent));
      saveProgress(user.id, book.id, {
        chapterIndex,
        paragraphIndex: (pageIndex + 1) * PARAGRAPHS_PER_PAGE,
        percent: Math.max(percent, newPercent),
        secondsRead: (saved?.secondsRead || 0) + sessionSeconds,
      });

      // Đóng modal và chuyển trang sau 1.2s
      setTimeout(() => {
        setQuizModalOpen(false);
        proceedToNextPage();
      }, 1200);
    } else {
      playWrongChime();
      toast('Chưa chính xác! Hãy đọc lại gợi ý và thử chọn lại nhé.', 'error');
    }
  };

  const toggleSpeak = () => {
    if (!window.speechSynthesis) return toast('Trình duyệt không hỗ trợ đọc thành tiếng.', 'error');
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const textToRead = currentPageParagraphs.join(' ');
    const utter = new SpeechSynthesisUtterance(textToRead);
    utter.lang = language === 'vi' ? 'vi-VN' : 'en-US';
    utter.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
    toast('Đang đọc thành tiếng trang hiện tại.');
  };

  const addBookmark = () => {
    const mark = { chapterIndex, pageIndex, at: Date.now() };
    setBookmarks((b) => [...b, mark]);
    toast(`Đã đánh dấu ruy băng tại ${chapter.title} (Trang ${pageIndex + 1}).`);
  };

  const formatClock = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const aiInsight = buildInsight(book, chapter, language);

  if (!book) {
    return (
      <div className="main-layout">
        <div className="card empty">
          <h3>Không tìm thấy sách trong tủ</h3>
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

  return (
    <div className="reading-room-container main-layout">
      {/* THANH ĐIỀU HƯỚNG CỐ ĐỊNH TRÊN CÙNG */}
      <div style={{ position: 'sticky', top: 'var(--nav-h)', zIndex: 800, background: 'var(--bg-primary)', paddingBottom: 10 }}>
        <div className="card row-between" style={{ padding: '10px 14px', flexWrap: 'wrap', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(book.forSale === false ? '/library' : `/book/${book.id}`)}>
            <ChevronLeft size={16} /> <b>{book.title}</b>
          </button>

          <div className="row" style={{ flex: '1 1 200px', gap: 10, minWidth: 160 }}>
            <ProgressBar percent={percent} />
            <span className="tiny strong" style={{ color: 'var(--accent-green)', whiteSpace: 'nowrap' }}>{percent}%</span>
          </div>

          <div className="row tiny" style={{ gap: 8 }}>
            <button
              className={`btn btn-sm ${showShelf ? 'btn-primary' : 'btn-soft'}`}
              onClick={() => setShowShelf((v) => !v)}
              title="Mở hoặc thu gọn kệ sách"
            >
              📚 Kệ sách
            </button>
            <button
              className={`btn btn-sm ${ambientPlaying ? 'btn-primary' : 'btn-soft'}`}
              onClick={toggleAmbientSound}
              title="Bật/Tắt âm thanh chill chill"
            >
              <Music size={14} /> {ambientPlaying ? 'Tắt nhạc' : 'Nhạc chill'}
            </button>
            <button className="btn btn-soft btn-sm" onClick={() => setShowToc((v) => !v)}>
              <List size={14} /> Mục lục
            </button>
          </div>
        </div>

        {/* Mục lục dạng danh sách nếu bật */}
        {showToc && (
          <div className="card" style={{ marginTop: 8, padding: 8, maxHeight: 280, overflowY: 'auto' }}>
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

      {/* KỆ SÁCH GỖ TỦ SÁCH (BOOKSHELF DISPLAY) */}
      {showShelf && (
        <div className="bookshelf-shelf">
          <div className="bookshelf-shelf-label">
            <span>🪵 Tủ sách Bookigma • Các chương sách trên kệ gỗ</span>
            <span style={{ fontSize: 11, opacity: 0.85 }}>Rê chuột hoặc bấm vào gáy sách để chuyển chương</span>
          </div>
          <div className="bookshelf-plank">
            {chapters.map((c, i) => {
              const colorTheme = SPINE_COLORS[i % SPINE_COLORS.length];
              const isCurrent = i === chapterIndex;
              return (
                <div
                  key={i}
                  className={`book-spine ${isCurrent ? 'active' : ''}`}
                  style={{
                    background: colorTheme.bg,
                    borderColor: isCurrent ? '#facc15' : colorTheme.border,
                  }}
                  onClick={() => goChapter(i)}
                  title={`${c.title} (Bấm để đọc)`}
                >
                  <div className="book-spine-gold-line" />
                  <div className="book-spine-text">{c.title}</div>
                  <div className="tiny" style={{ fontSize: 9.5, opacity: 0.9 }}>
                    {isCurrent ? 'Đang đọc' : `C.${i + 1}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KHÔNG GIAN ĐỌC CHÍNH (MAIN READING VIEW) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,310px)', gap: 20, alignItems: 'start' }}>
        {/* CUỐN SÁCH MỞ RA (OPEN BOOK SHEET) */}
        <div className={`open-book-sheet theme-${readerTheme}`} ref={contentRef}>
          {/* Dải ruy băng bookmark */}
          <div className="ribbon-bookmark" onClick={addBookmark} title="Đánh dấu trang này" />

          {/* Thanh công cụ đỉnh trang sách */}
          <div>
            <div className="row-between" style={{ paddingBottom: 12, borderBottom: '1px solid rgba(0,0,0,0.08)', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <span className="tiny muted uppercase" style={{ letterSpacing: 0.8 }}>
                  {book.title} • {book.author}
                </span>
                <h2 style={{ margin: '4px 0 0', fontSize: 19 }}>{chapter.title}</h2>
              </div>

              <div className="row" style={{ gap: 6 }}>
                {/* Đổi cỡ chữ */}
                <div className="row" style={{ gap: 0, border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, background: 'rgba(255,255,255,0.4)' }}>
                  <button className="btn-icon" style={{ padding: 5 }} onClick={() => changeFontSize(-FONT_STEP)} title="Giảm cỡ chữ"><Minus size={13} /></button>
                  <span className="tiny row" style={{ gap: 2, padding: '0 6px' }}><Type size={12} /> {fontSize}</span>
                  <button className="btn-icon" style={{ padding: 5 }} onClick={() => changeFontSize(FONT_STEP)} title="Tăng cỡ chữ"><Plus size={13} /></button>
                </div>

                {/* Chọn Theme đọc sách */}
                <select
                  className="select"
                  style={{ width: 'auto', padding: '4px 8px', fontSize: 12, background: 'rgba(255,255,255,0.5)' }}
                  value={readerTheme}
                  onChange={(e) => changeReaderTheme(e.target.value)}
                  title="Chọn phong cách tủ sách"
                >
                  <option value="bookshelf">🪵 Tủ sách gỗ</option>
                  <option value="sepia">📜 Giấy ngả vàng</option>
                  <option value="midnight">🌙 Thư viện đêm</option>
                  <option value="clean">⚪ Hiện đại sáng</option>
                </select>

                <button className={`btn btn-sm ${speaking ? 'btn-primary' : 'btn-soft'}`} onClick={toggleSpeak} title="Đọc to trang này">
                  <Volume2 size={13} /> {speaking ? 'Dừng' : 'Đọc'}
                </button>
              </div>
            </div>

            {/* Nội dung trang sách */}
            <div style={{ fontSize, lineHeight: 1.9, textAlign: 'justify', minHeight: 320 }}>
              {currentPageParagraphs.map((p, i) => (
                <p key={i} style={{ marginBottom: 20, textIndent: '1.8em' }}>
                  {p}
                </p>
              ))}
            </div>
          </div>

          {/* Chân trang sách: Số trang & Nút lật trang */}
          <div style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
            <div className="row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
              <button
                className="btn btn-ghost flip-page-btn"
                onClick={handlePrevPage}
                disabled={chapterIndex === 0 && pageIndex === 0}
              >
                <ChevronLeft size={16} /> Trang trước
              </button>

              <div className="tiny muted text-center">
                <span>Trang <b>{pageIndex + 1}</b> / {totalPagesInChapter}</span>
                <span style={{ margin: '0 6px' }}>•</span>
                <span>Chương {chapterIndex + 1} / {chapters.length}</span>
              </div>

              <button
                className="btn btn-primary flip-page-btn"
                onClick={handleNextPageClick}
              >
                {chapterIndex === chapters.length - 1 && pageIndex === totalPagesInChapter - 1 ? (
                  <>Hoàn thành sách 🎉</>
                ) : (
                  <>
                    {quizMode ? 'Trang tiếp theo & Kiểm tra' : 'Trang tiếp theo'} <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* SIDEBAR BÊN PHẢI: ÂM THANH CHILL, BỘ ĐẾM GIỜ & TIỆN ÍCH */}
        <aside className="stack" style={{ position: 'sticky', top: 120 }}>
          {/* 1. WIDGET ÂM THANH CHILL CHILL */}
          <div className="ambient-player-card stack" style={{ gap: 12 }}>
            <div className="row-between">
              <span className="row strong small" style={{ gap: 6 }}>
                <Headphones size={16} color="var(--accent-green)" /> Âm thanh chill chill
              </span>
              {ambientPlaying && (
                <div className="wave-bars">
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                </div>
              )}
            </div>

            <div className="row-between" style={{ background: 'var(--bg-soft)', padding: '8px 12px', borderRadius: 9 }}>
              <div className="row" style={{ gap: 8 }}>
                <button
                  className="btn-icon"
                  style={{ background: ambientPlaying ? 'var(--accent-green)' : 'var(--bg-card)', color: ambientPlaying ? '#fff' : 'inherit', padding: 6, borderRadius: '50%' }}
                  onClick={toggleAmbientSound}
                  title={ambientPlaying ? 'Tạm dừng' : 'Bật nhạc'}
                >
                  {ambientPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <select
                  className="select"
                  style={{ width: 'auto', padding: '4px 6px', fontSize: 13, border: 'none', background: 'transparent', fontWeight: 600 }}
                  value={ambientType}
                  onChange={(e) => changeAmbientSound(e.target.value)}
                >
                  {AMBIENT_SOUNDS.map((s) => (
                    <option key={s.id} value={s.id} disabled={isSoundLocked(s)}>
                      {s.icon} {s.name}{isSoundLocked(s) ? ' · VIP' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Thanh trượt volume */}
              <input
                type="range"
                min="0"
                max="100"
                value={ambientVol}
                onChange={handleVolumeChange}
                style={{ width: 68, accentColor: 'var(--accent-green)', cursor: 'pointer' }}
                title={`Âm lượng: ${ambientVol}%`}
              />
            </div>

            {isVip ? (
              <div className="ambient-vip-note is-unlocked">
                <Crown size={13} /> VIP đã mở khoá toàn bộ âm thanh trong Góc đọc.
              </div>
            ) : (
              <div className="ambient-vip-note">
                <Lock size={13} />
                <span><b>Lofi Piano</b> và <b>Lò sưởi</b> dành cho VIP.</span>
                <Link to="/upgrade" className="link">Nâng cấp</Link>
              </div>
            )}
          </div>

          {/* 2. BỘ ĐẾM THỜI GIAN ĐỌC SÁCH */}
          <div className="card stack">
            <h4 style={{ margin: 0, fontSize: 15, paddingBottom: 8, borderBottom: '1px solid var(--border-color)' }}>
              ⏱️ Thời gian đọc sách
            </h4>

            {/* Đồng hồ phiên hiện tại */}
            <div className="row-between" style={{ background: 'var(--bg-soft)', padding: 10, borderRadius: 9 }}>
              <div>
                <div className="tiny muted">Phiên đọc này</div>
                <b style={{ fontFamily: 'monospace', fontSize: 16 }}>{duration(sessionSeconds)}</b>
              </div>
              <div>
                <div className="tiny muted">Pomodoro 25p</div>
                <b style={{ fontFamily: 'monospace', fontSize: 16, color: 'var(--accent-green)' }}>{formatClock(seconds)}</b>
              </div>
              <div className="row" style={{ gap: 4 }}>
                <button className="btn-icon" style={{ padding: 5 }} onClick={() => setTimerOn((v) => !v)} title={timerOn ? 'Tạm dừng' : 'Bắt đầu'}>
                  {timerOn ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button className="btn-icon" style={{ padding: 5 }} onClick={() => { setTimerOn(false); setSeconds(1500); }} title="Đặt lại 25 phút">
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>

            {/* Công tắc Thử thách đọc hiểu sau mỗi trang */}
            <div className="row-between" style={{ paddingTop: 4 }}>
              <span className="row tiny strong" style={{ gap: 5 }}>
                <HelpCircle size={15} color="var(--accent-green)" /> Thử thách sau mỗi trang
              </span>
              <label className="row" style={{ gap: 6, cursor: 'pointer', fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={quizMode}
                  onChange={(e) => setQuizMode(e.target.checked)}
                  style={{ accentColor: 'var(--accent-green)' }}
                />
                <span className={quizMode ? 'strong' : 'muted'}>{quizMode ? 'Bật' : 'Tắt'}</span>
              </label>
            </div>
          </div>

          {/* 3. AI GIẢI THÍCH CHƯƠNG */}
          <div className="card" style={{ borderLeft: '4px solid var(--accent-green)' }}>
            <div className="row-between" style={{ marginBottom: 8 }}>
              <span className="row" style={{ gap: 6 }}>
                <Sparkles size={16} color="var(--accent-green)" />
                <h4 style={{ margin: 0, fontSize: 14, color: 'var(--accent-green)' }}>AI hiểu sách</h4>
              </span>
              <button className="btn-icon" style={{ padding: 3 }} onClick={() => setShowAi((v) => !v)}>
                {showAi ? <Minus size={14} /> : <Plus size={14} />}
              </button>
            </div>
            {showAi && <p className="small" style={{ margin: 0, lineHeight: 1.6 }}>{aiInsight}</p>}
          </div>

          {/* 4. ĐÁNH DẤU TRANG */}
          {bookmarks.length > 0 && (
            <div className="card">
              <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>Dấu ruy băng ({bookmarks.length})</h4>
              <div className="stack" style={{ gap: 6 }}>
                {bookmarks.map((b, i) => (
                  <button
                    key={i}
                    className="list-item small"
                    onClick={() => {
                      setChapterIndex(b.chapterIndex);
                      setPageIndex(b.pageIndex);
                    }}
                  >
                    <Bookmark size={13} color="var(--danger)" />
                    <span className="truncate">{chapters[b.chapterIndex]?.title} (Trang {b.pageIndex + 1})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5. THỐNG KÊ TIẾN ĐỘ */}
          <div className="card">
            <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>Tiến trình đọc</h4>
            <div className="stack small" style={{ gap: 6 }}>
              <div className="row-between"><span className="muted">Toàn bộ sách</span><b style={{ color: 'var(--accent-green)' }}>{percent}%</b></div>
              <div className="row-between"><span className="muted">Chương hiện tại</span><b>{chapterIndex + 1}/{chapters.length}</b></div>
              <div className="row-between"><span className="muted">Trang trong chương</span><b>{pageIndex + 1}/{totalPagesInChapter}</b></div>
            </div>
          </div>
        </aside>
      </div>

      {/* MODAL THỬ THÁCH ĐỌC HIỂU SAU MỖI TRANG */}
      {quizModalOpen && currentQuiz && (
        <div className="quiz-backdrop" onClick={() => !quizSubmitted && setQuizModalOpen(false)}>
          <div className="quiz-card" onClick={(e) => e.stopPropagation()}>
            {/* Header modal */}
            <div style={{ background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)', color: '#fff', padding: '18px 22px' }}>
              <div className="row-between">
                <span className="row" style={{ gap: 8, fontSize: 16, fontWeight: 700 }}>
                  🎯 Thử thách ghi nhớ trang {pageIndex + 1}
                </span>
                <span className="badge badge-warning" style={{ color: '#fff', background: 'rgba(255,255,255,0.2)' }}>
                  +10 Điểm
                </span>
              </div>
              <p className="tiny" style={{ margin: '6px 0 0', opacity: 0.9 }}>
                Trả lời đúng để hệ thống ghi nhận tiến độ và lật sang trang tiếp theo!
              </p>
            </div>

            {/* Nội dung câu hỏi */}
            <div style={{ padding: '22px' }}>
              <p className="strong" style={{ fontSize: 15.5, lineHeight: 1.5, marginBottom: 16, whiteSpace: 'pre-line' }}>
                {currentQuiz.question}
              </p>

              {/* Các phương án lựa chọn */}
              <div className="stack" style={{ gap: 10, marginBottom: 18 }}>
                {currentQuiz.options.map((opt, idx) => {
                  let statusClass = '';
                  if (quizSubmitted) {
                    if (idx === currentQuiz.correctIndex) statusClass = 'correct';
                    else if (idx === selectedOption) statusClass = 'wrong';
                  } else if (idx === selectedOption) {
                    statusClass = 'selected';
                  }

                  return (
                    <button
                      key={idx}
                      className={`quiz-option-btn ${statusClass}`}
                      onClick={() => !quizSubmitted && setSelectedOption(idx)}
                      disabled={quizSubmitted && quizIsCorrect}
                    >
                      <span
                        style={{
                          width: 24, height: 24, borderRadius: '50%',
                          border: '1.5px solid currentColor', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, flexShrink: 0,
                        }}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span style={{ flex: 1 }}>{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Thông báo kết quả */}
              {quizSubmitted && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    marginBottom: 16,
                    background: quizIsCorrect ? '#dcfce7' : '#fee2e2',
                    color: quizIsCorrect ? '#14532d' : '#991b1b',
                    fontSize: 14,
                  }}
                >
                  <div className="row" style={{ gap: 8, fontWeight: 700, marginBottom: 4 }}>
                    {quizIsCorrect ? <CheckCircle size={18} /> : <XCircle size={18} />}
                    {quizIsCorrect ? 'Xuất sắc! Bạn đã trả lời hoàn toàn chính xác 🎉' : 'Chưa đúng rồi! Hãy thử chọn lại nhé'}
                  </div>
                  {!quizIsCorrect && (
                    <div className="tiny" style={{ marginTop: 6, lineHeight: 1.5 }}>
                      💡 <b>{currentQuiz.hint}</b>
                    </div>
                  )}
                </div>
              )}

              {/* Nút hành động */}
              <div className="row-between" style={{ marginTop: 8 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setQuizModalOpen(false)}
                >
                  Đọc lại trang sách
                </button>

                {!quizSubmitted || !quizIsCorrect ? (
                  <button
                    className="btn btn-primary"
                    disabled={selectedOption === null}
                    onClick={handleAnswerSubmit}
                  >
                    Xác nhận câu trả lời
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setQuizModalOpen(false);
                      proceedToNextPage();
                    }}
                  >
                    Tiếp tục sang trang tiếp theo →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Sinh phần "AI giải thích" bám theo nội dung chương đang mở */
function buildInsight(book, chapter, language) {
  if (language === 'en') {
    return `This chapter of "${book.title}" centers on ${(book.tags || []).slice(0, 2).join(' and ')}. `
      + `Pay attention to how the author uses concrete scenes to carry an abstract idea.`;
  }
  const tags = (book.tags || []).slice(0, 3).join(', ');
  const title = chapter.title.split(':').slice(1).join(':').trim() || chapter.title;
  return `Chương "${title}" xoay quanh các chủ đề ${tags}. `
    + `${book.author} dùng những hình ảnh rất cụ thể để chuyển tải thông điệp sâu sắc — hãy để ý cách tác giả dẫn dắt cảm xúc và tình huống của nhân vật.`;
}
