import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Crown,
  Flame,
  Library,
  MousePointer2,
  Move,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react';
import Modal from '../components/common/Modal';
import { useApp, useAuth, useToast } from '../hooks/useStore';
import { useVip } from '../hooks/useVip';
import { duration, timeAgo } from '../lib/format';
import { load, save } from '../lib/storage';
import { EmptyState, ProgressBar, StatCard } from '../components/common/ui';
import './library.css';

const TABS = [
  { id: 'reading', label: 'Đang đọc' },
  { id: 'finished', label: 'Đã đọc xong' },
  { id: 'explore', label: 'Khám phá Ebook' },
  { id: 'all', label: 'Tất cả' },
];

const SHELF_CAPACITY = 10;
const SHELF_COLUMNS = 5;
const HOLD_TO_DRAG_MS = 240;
const DRAG_MOVE_THRESHOLD = 10;
const MENU_WIDTH = 214;
const MENU_HEIGHT = 196;

const bookKey = (id) => String(id);
const displayNameOf = (entry) => entry.label?.trim() || entry.book.title;

function findFreeSlot(placements) {
  const used = new Set(Object.values(placements).map((p) => `${p.cabinet}:${p.slot}`));
  const maxCabinet = Object.values(placements).reduce((max, p) => Math.max(max, p.cabinet), -1);
  const lastCabinet = Math.max(0, maxCabinet);

  for (let cabinet = 0; cabinet <= lastCabinet; cabinet += 1) {
    for (let slot = 0; slot < SHELF_CAPACITY; slot += 1) {
      if (!used.has(`${cabinet}:${slot}`)) return { cabinet, slot };
    }
  }
  return { cabinet: lastCabinet + 1, slot: 0 };
}

function shelfSlotFromPoint(x, y) {
  const element = document.elementFromPoint(x, y);
  const slotElement = element?.closest?.('[data-shelf-slot]');
  if (!slotElement) return null;
  const cabinet = Number(slotElement.getAttribute('data-cabinet'));
  const slot = Number(slotElement.getAttribute('data-slot'));
  return Number.isInteger(cabinet) && Number.isInteger(slot) ? { cabinet, slot } : null;
}

export default function LibraryPage() {
  const { getProgress, books, orders } = useApp();
  const { user } = useAuth();
  const { extraShelves } = useVip(user.id);
  const toast = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState('reading');
  const [shelfAll, setShelfAll] = useState(() => load('shelf', {}));
  const [addOpen, setAddOpen] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [menu, setMenu] = useState(null);
  const [renameId, setRenameId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [draggingId, setDraggingId] = useState(null);
  const [dragGhost, setDragGhost] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const pressRef = useRef(null);
  const holdTimerRef = useRef(null);
  const dragRef = useRef(null);
  const contextGuardRef = useRef(false);
  const contextGuardTimerRef = useRef(null);

  const progress = getProgress(user.id);
  const placements = useMemo(() => shelfAll[user.id] || {}, [shelfAll, user.id]);

  useEffect(() => {
    save('shelf', shelfAll);
  }, [shelfAll]);

  const bookById = useMemo(() => new Map(books.map((book) => [bookKey(book.id), book])), [books]);

  const shelfEntries = useMemo(
    () =>
      Object.entries(placements)
        .map(([id, place]) => ({ ...place, id, book: bookById.get(id) }))
        .filter((entry) => entry.book)
        .sort((a, b) => a.cabinet - b.cabinet || a.slot - b.slot),
    [placements, bookById]
  );

  const cabinetCount = Math.max(
    1 + extraShelves,
    ...shelfEntries.map((entry) => entry.cabinet + 1)
  );
  const slotMap = useMemo(
    () => new Map(shelfEntries.map((entry) => [`${entry.cabinet}:${entry.slot}`, entry])),
    [shelfEntries]
  );

  const entries = useMemo(
    () =>
      Object.values(progress)
        .map((p) => ({ ...p, book: books.find((b) => b.id === p.bookId) }))
        .filter((p) => p.book)
        .sort((a, b) => b.lastReadAt - a.lastReadAt),
    [progress, books]
  );

  // Sách đã mua nhưng chưa bắt đầu đọc — gợi ý người dùng mở lên đọc.
  const notStarted = useMemo(() => {
    const boughtIds = new Set(
      orders
        .filter((o) => o.userId === user.id && o.status !== 'cancelled')
        .flatMap((o) => o.items.map((i) => bookKey(i.bookId)))
    );
    return [...boughtIds].filter((id) => !progress[id]).map((id) => bookById.get(id)).filter(Boolean);
  }, [orders, user.id, progress, bookById]);

  const ownedIds = useMemo(
    () =>
      new Set(
        orders
          .filter((o) => o.userId === user.id && o.status !== 'cancelled')
          .flatMap((o) => o.items.map((i) => bookKey(i.bookId)))
      ),
    [orders, user.id]
  );

  const shelfCandidates = useMemo(() => {
    const onShelf = new Set(Object.keys(placements));
    return books
      .filter((book) => book.chapterCount > 0 && !onShelf.has(bookKey(book.id)))
      .sort((a, b) => {
        const priority = (book) =>
          progress[bookKey(book.id)] ? 0 : ownedIds.has(bookKey(book.id)) ? 1 : 2;
        return priority(a) - priority(b) || a.title.localeCompare(b.title, 'vi');
      });
  }, [books, placements, progress, ownedIds]);

  const visibleCandidates = useMemo(() => {
    const query = addQuery.trim().toLowerCase();
    if (!query) return shelfCandidates;
    return shelfCandidates.filter((book) =>
      `${book.title} ${book.author}`.toLowerCase().includes(query)
    );
  }, [shelfCandidates, addQuery]);

  const filtered = entries.filter((e) =>
    tab === 'all' ? true : tab === 'finished' ? e.finished : !e.finished
  );

  const totalSeconds = entries.reduce((sum, e) => sum + (e.secondsRead || 0), 0);
  const finishedCount = entries.filter((e) => e.finished).length;
  const avgPercent = entries.length
    ? Math.round(entries.reduce((sum, e) => sum + e.percent, 0) / entries.length)
    : 0;

  const menuEntry = menu ? shelfEntries.find((entry) => entry.id === menu.bookId) : null;
  const renameEntry = renameId ? shelfEntries.find((entry) => entry.id === renameId) : null;
  const dragBook = dragGhost ? bookById.get(dragGhost.bookId) : null;

  const updatePlacements = useCallback(
    (updater) => {
      setShelfAll((prev) => ({ ...prev, [user.id]: updater(prev[user.id] || {}) }));
    },
    [user.id]
  );

  const moveBookTo = useCallback(
    (bookId, cabinet, slot) => {
      updatePlacements((current) => {
        const source = current[bookId];
        if (!source || (source.cabinet === cabinet && source.slot === slot)) return current;

        const occupantId = Object.keys(current).find(
          (id) => current[id].cabinet === cabinet && current[id].slot === slot
        );
        const next = { ...current, [bookId]: { ...source, cabinet, slot } };
        if (occupantId) {
          next[occupantId] = { ...current[occupantId], cabinet: source.cabinet, slot: source.slot };
        }
        return next;
      });
    },
    [updatePlacements]
  );

  const stopDrag = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    pressRef.current = null;
    dragRef.current = null;
    document.body.classList.remove('shelf-dragging');
    setDraggingId(null);
    setDragGhost(null);
    setDropTarget(null);
  }, []);

  const releaseContextGuard = useCallback(() => {
    if (contextGuardTimerRef.current) window.clearTimeout(contextGuardTimerRef.current);
    contextGuardTimerRef.current = window.setTimeout(() => {
      contextGuardTimerRef.current = null;
      contextGuardRef.current = false;
    }, 300);
  }, []);

  const beginDrag = useCallback(
    (press, x, y) => {
      if (dragRef.current || pressRef.current !== press) return;
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      press.hold = true;
      dragRef.current = { bookId: press.bookId };
      setMenu(null);
      setDropTarget(shelfSlotFromPoint(x, y));
      setDraggingId(press.bookId);
      setDragGhost({
        bookId: press.bookId,
        x,
        y,
        width: press.coverRect?.width || 88,
        height: press.coverRect?.height || 132,
      });
      document.body.classList.add('shelf-dragging');
    },
    []
  );

  useEffect(() => {
    const handleMove = (event) => {
      if ((event.buttons & 2) === 0) {
        if (pressRef.current) releaseContextGuard();
        stopDrag();
        return;
      }
      const press = pressRef.current;
      if (!press) return;

      const distance = Math.hypot(event.clientX - press.x, event.clientY - press.y);
      if (distance > DRAG_MOVE_THRESHOLD) {
        press.moved = true;
        if (!dragRef.current && !press.hold) beginDrag(press, event.clientX, event.clientY);
      }

      if (dragRef.current) {
        setDragGhost((prev) =>
          prev ? { ...prev, x: event.clientX, y: event.clientY } : prev
        );
        const target = shelfSlotFromPoint(event.clientX, event.clientY);
        setDropTarget((prev) =>
          prev?.cabinet === target?.cabinet && prev?.slot === target?.slot ? prev : target
        );
      }
    };

    const handleUp = (event) => {
      if (event.button !== 2) return;
      const press = pressRef.current;
      if (!press) return;

      const drag = dragRef.current;
      const target = drag ? shelfSlotFromPoint(event.clientX, event.clientY) : null;
      const moved = press.moved;
      const bookId = press.bookId;

      stopDrag();
      releaseContextGuard();

      if (drag && moved) {
        if (target) moveBookTo(bookId, target.cabinet, target.slot);
        return;
      }

      navigate(`/read/${bookId}`);
    };

    const handleCancel = () => {
      if (pressRef.current) releaseContextGuard();
      stopDrag();
    };

    const handleContextMenu = (event) => {
      if (contextGuardRef.current) event.preventDefault();
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
    window.addEventListener('blur', handleCancel);
    window.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
      window.removeEventListener('blur', handleCancel);
      window.removeEventListener('contextmenu', handleContextMenu, true);
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      if (contextGuardTimerRef.current) {
        window.clearTimeout(contextGuardTimerRef.current);
        contextGuardTimerRef.current = null;
      }
      contextGuardRef.current = false;
      pressRef.current = null;
      dragRef.current = null;
      document.body.classList.remove('shelf-dragging');
    };
  }, [beginDrag, moveBookTo, navigate, releaseContextGuard, stopDrag]);

  useEffect(() => {
    if (!menu) return undefined;
    const closeOnOutside = (event) => {
      if (!event.target.closest?.('.shelf-menu')) setMenu(null);
    };
    const closeOnMove = () => setMenu(null);

    window.addEventListener('pointerdown', closeOnOutside, true);
    window.addEventListener('scroll', closeOnMove, true);
    window.addEventListener('resize', closeOnMove);
    return () => {
      window.removeEventListener('pointerdown', closeOnOutside, true);
      window.removeEventListener('scroll', closeOnMove, true);
      window.removeEventListener('resize', closeOnMove);
    };
  }, [menu]);

  const openAddModal = () => {
    setMenu(null);
    setAddQuery('');
    setAddOpen(true);
  };

  const addBookToShelf = (book) => {
    const id = bookKey(book.id);
    if (placements[id]) return;
    updatePlacements((current) => {
      if (current[id]) return current;
      const { cabinet, slot } = findFreeSlot(current);
      return { ...current, [id]: { cabinet, slot, label: '' } };
    });
    toast(`Đã thêm "${book.title}" lên kệ.`);
  };

  const removeFromShelf = (entry) => {
    setMenu(null);
    updatePlacements((current) => {
      const next = { ...current };
      delete next[entry.id];
      return next;
    });
    toast(`Đã xoá "${displayNameOf(entry)}" khỏi tủ sách.`, 'info');
  };

  const openRenameModal = (entry) => {
    setMenu(null);
    setRenameId(entry.id);
    setRenameValue(displayNameOf(entry));
  };

  const commitRename = () => {
    if (!renameEntry) return;
    const value = renameValue.trim();
    updatePlacements((current) => ({
      ...current,
      [renameEntry.id]: {
        ...current[renameEntry.id],
        label: value === renameEntry.book.title ? '' : value,
      },
    }));
    setRenameId(null);
    toast('Đã đổi tên sách trên kệ.');
  };

  const handleBookPointerDown = (event, entry) => {
    if (event.button !== 2) return;
    event.preventDefault();
    event.stopPropagation();
    stopDrag();
    setMenu(null);

    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // Trình duyệt không hỗ trợ pointer capture — vẫn kéo được trong trang.
    }

    contextGuardRef.current = true;
    if (contextGuardTimerRef.current) window.clearTimeout(contextGuardTimerRef.current);
    contextGuardTimerRef.current = window.setTimeout(() => {
      contextGuardTimerRef.current = null;
      contextGuardRef.current = false;
    }, 30000);

    const coverRect = event.currentTarget
      .querySelector('.shelf-book-cover-wrap')
      ?.getBoundingClientRect();
    const press = {
      bookId: entry.id,
      x: event.clientX,
      y: event.clientY,
      coverRect,
      hold: false,
      moved: false,
    };
    pressRef.current = press;
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      if (pressRef.current === press) beginDrag(press, press.x, press.y);
    }, HOLD_TO_DRAG_MS);
  };

  const openBookMenu = (event, entry) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    const x = Math.max(12, Math.min(event.clientX, window.innerWidth - MENU_WIDTH - 12));
    const y = Math.max(12, Math.min(event.clientY, window.innerHeight - MENU_HEIGHT - 12));
    setMenu({ bookId: entry.id, x, y });
  };

  const handleBookKeyDown = (event, entry) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(12, Math.min(rect.left, window.innerWidth - MENU_WIDTH - 12));
    const y = Math.max(12, Math.min(rect.bottom + 6, window.innerHeight - MENU_HEIGHT - 12));
    setMenu({ bookId: entry.id, x, y });
  };

  return (
    <div className="main-layout">
      <section className="reading-hero">
        <div className="reading-hero-copy">
          <span className="reading-hero-eyebrow">
            <Sparkles size={13} /> Không gian đọc của bạn
          </span>
          <h1>Góc đọc</h1>
          <p>
            Xếp những cuốn ebook yêu thích lên kệ gỗ, đặt tên theo ý mình và mở lại đúng
            chương đang đọc dở.
          </p>
          <div className="reading-hero-meta">
            <span>
              <BookOpen size={14} /> {entries.length} sách đã mở
            </span>
          </div>
        </div>
        <span className="reading-hero-art" aria-hidden="true">
          <BookOpen size={176} strokeWidth={1.1} />
        </span>
      </section>

      <div className="library-dashboard">
        <section className="library-room">
        <div className="library-room-head">
          <div>
            <h2>
              <Library size={19} /> Tủ sách của bạn
            </h2>
            <p>Mỗi tủ 10 cuốn, tủ mới sẽ tự xuất hiện khi tủ hiện tại đã đầy.</p>
          </div>
          <div className="library-room-actions">
            {extraShelves > 0 && (
              <span className="library-vip-pill" title={`VIP mở thêm ${extraShelves} tủ sách`}>
                <Crown size={12} /> VIP +{extraShelves} tủ
              </span>
            )}
            <span className="library-capacity">
              {shelfEntries.length}/{cabinetCount * SHELF_CAPACITY} chỗ
            </span>
            <button type="button" className="btn btn-primary btn-sm" onClick={openAddModal}>
              <Plus size={15} /> Thêm sách
            </button>
          </div>
        </div>

        <div className="library-legend">
          <span>
            <MousePointer2 size={13} /> Chuột trái: mở menu đổi tên / xoá
          </span>
          <span>
            <BookOpen size={13} /> Chuột phải: đọc ngay
          </span>
          <span>
            <Move size={13} /> Giữ chuột phải: kéo sách
          </span>
        </div>

        <div className="shelf-cabinet-stack">
          {Array.from({ length: cabinetCount }, (_, cabinetIndex) => {
            const inCabinet = shelfEntries.filter((entry) => entry.cabinet === cabinetIndex).length;
            return (
              <div
                className="shelf-cabinet"
                key={cabinetIndex}
                onContextMenu={(event) => event.preventDefault()}
              >
                <div className="shelf-cabinet-head">
                  <span className="shelf-plaque">
                    <Library size={13} /> Tủ {String(cabinetIndex + 1).padStart(2, '0')}
                  </span>
                  {inCabinet === SHELF_CAPACITY && (
                    <span className="shelf-cabinet-status">Đã đầy</span>
                  )}
                </div>

                {Array.from({ length: SHELF_CAPACITY / SHELF_COLUMNS }, (_, rowIndex) => (
                  <div className="shelf-row" key={rowIndex}>
                    {Array.from({ length: SHELF_COLUMNS }, (_, columnIndex) => {
                      const slotIndex = rowIndex * SHELF_COLUMNS + columnIndex;
                      const entry = slotMap.get(`${cabinetIndex}:${slotIndex}`);
                      const isDropTarget =
                        dropTarget?.cabinet === cabinetIndex && dropTarget?.slot === slotIndex;

                      return (
                        <div
                          className={`shelf-slot ${
                            isDropTarget ? 'is-drop-target' : ''
                          } ${entry && draggingId === entry.id ? 'is-origin' : ''}`}
                          key={slotIndex}
                          data-shelf-slot=""
                          data-cabinet={cabinetIndex}
                          data-slot={slotIndex}
                        >
                          {entry ? (
                            <button
                              type="button"
                              className={`shelf-book ${
                                draggingId === entry.id ? 'is-dragging' : ''
                              }`}
                              aria-label={`${displayNameOf(entry)}. Chuột phải để đọc, giữ chuột phải để kéo, chuột trái để đổi tên hoặc xoá.`}
                              onPointerDown={(event) => handleBookPointerDown(event, entry)}
                              onClick={(event) => openBookMenu(event, entry)}
                              onKeyDown={(event) => handleBookKeyDown(event, entry)}
                              onContextMenu={(event) => event.preventDefault()}
                              onDragStart={(event) => event.preventDefault()}
                            >
                              <span className="shelf-book-cover-wrap">
                                <img
                                  src={entry.book.cover}
                                  alt=""
                                  className="shelf-book-cover"
                                  draggable={false}
                                />
                              </span>

                              <span className="shelf-book-tip">
                                <span className="shelf-tip-name">{displayNameOf(entry)}</span>
                                <span className="shelf-tip-author">{entry.book.author}</span>
                                {progress[entry.id] ? (
                                  <span className="shelf-tip-progress">
                                    <span>Đã đọc {progress[entry.id].percent}%</span>
                                    <span>{progress[entry.id].finished ? 'Hoàn thành' : 'Đang đọc'}</span>
                                  </span>
                                ) : (
                                  <span className="shelf-tip-progress">
                                    <span>Chưa mở cuốn này</span>
                                  </span>
                                )}
                                <span className="shelf-tip-hint">
                                  Chuột phải: đọc ngay · Giữ chuột phải: kéo sách
                                </span>
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="shelf-empty"
                              onClick={openAddModal}
                              title={`Chỗ trống ${slotIndex + 1} — thêm sách`}
                            >
                              <Plus size={15} />
                              <span>Trống</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </section>

      <section className="library-history">
        <div className="library-history-head">
          <div>
            <h2>Nhật ký đọc</h2>
            <p>Bookigma ghi nhớ vị trí của bạn ở từng cuốn — mở lại là đọc tiếp ngay.</p>
          </div>
        </div>

        <div className="library-stats">
          <StatCard
            icon={CheckCircle2}
            label="Đã đọc xong"
            value={finishedCount}
            sub="Tính cả sách đọc lại"
            color="var(--info)"
            bg="var(--info-soft)"
          />
          <StatCard
            icon={Clock}
            label="Thời gian đọc"
            value={duration(totalSeconds)}
            sub="Tổng cộng"
            color="var(--purple)"
            bg="var(--purple-soft)"
          />
          <StatCard
            icon={Target}
            label="Tiến độ trung bình"
            value={`${avgPercent}%`}
            sub="Trên toàn bộ tủ sách"
            color="var(--warning)"
            bg="var(--warning-soft)"
          />
        </div>

        <div className="library-tabs">
          {TABS.map((item) => (
            <button
              key={item.id}
              className={`tab ${tab === item.id ? 'active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

      {tab === 'explore' ? (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {books
            .filter((b) => b.chapterCount > 0)
            .map((b) => (
              <Link key={b.id} to={`/read/${b.id}`} className="card card-hover" style={{ padding: 12 }}>
                <img src={b.cover} alt="" className="book-cover" style={{ width: '100%', height: 160 }} />
                <div className="small strong clamp-2" style={{ margin: '10px 0 4px' }}>
                  {b.title}
                </div>
                <p className="tiny muted clamp-1" style={{ margin: '0 0 10px' }}>
                  {b.author}
                </p>
                <div className="btn btn-primary btn-sm btn-block">Đọc ngay</div>
              </Link>
            ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={BookOpen}
            title={tab === 'finished' ? 'Bạn chưa đọc xong cuốn nào' : 'Chưa có cuốn nào đang đọc dở'}
            hint="Mở một cuốn sách bất kỳ, Bookigma sẽ tự động lưu vị trí bạn đang đọc."
            action={
              <button className="btn btn-primary" onClick={() => setTab('explore')}>
                Khám phá Ebook
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {filtered.map((e) => (
            <div key={e.bookId} className="card card-hover row" style={{ alignItems: 'flex-start', gap: 14 }}>
              <Link to={e.book.forSale === false ? `/read/${e.bookId}` : `/book/${e.bookId}`}>
                <img src={e.book.cover} alt="" className="book-cover" style={{ width: 76, height: 104 }} />
              </Link>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row-between" style={{ gap: 8, marginBottom: 2 }}>
                  <Link
                    to={e.book.forSale === false ? `/read/${e.bookId}` : `/book/${e.bookId}`}
                    className="strong small clamp-2"
                  >
                    {e.book.title}
                  </Link>
                  {e.finished && <span className="badge badge-green">Xong</span>}
                </div>
                <p className="tiny muted" style={{ margin: '0 0 8px' }}>
                  {e.book.author}
                </p>

                <div className="row-between tiny" style={{ marginBottom: 5 }}>
                  <span className="muted">
                    {e.book.chapters?.[e.chapterIndex]?.title?.split(':')[0] ||
                      `Chương ${e.chapterIndex + 1}`}
                  </span>
                  <span className="strong" style={{ color: 'var(--accent-green)' }}>
                    {e.percent}%
                  </span>
                </div>
                <ProgressBar percent={e.percent} />

                <div className="row-between" style={{ marginTop: 10, gap: 8 }}>
                  <span className="tiny muted row" style={{ gap: 4 }}>
                    <Flame size={13} /> {timeAgo(e.lastReadAt)}
                  </span>
                  <Link to={`/read/${e.bookId}`} className="btn btn-primary btn-sm">
                    {e.finished ? 'Đọc lại' : 'Đọc tiếp'}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {notStarted.length > 0 && (
        <>
          <h3 style={{ fontSize: 17, margin: '28px 0 14px' }}>Sách đã mua nhưng chưa mở</h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            {notStarted.map((b) => (
              <Link key={b.id} to={`/read/${b.id}`} className="card card-hover" style={{ padding: 12 }}>
                <img src={b.cover} alt="" className="book-cover" style={{ width: '100%', height: 160 }} />
                <div className="small strong clamp-2" style={{ margin: '10px 0 4px' }}>
                  {b.title}
                </div>
                <div className="tiny muted">Bắt đầu đọc →</div>
              </Link>
            ))}
          </div>
        </>
      )}
        </section>
      </div>

      {menu && menuEntry && (
        <div
          className="shelf-menu"
          style={{ left: menu.x, top: menu.y }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <div className="shelf-menu-head">
            <span>Sách trên kệ</span>
            <strong>{displayNameOf(menuEntry)}</strong>
          </div>
          <button
            type="button"
            className="shelf-menu-item"
            onClick={() => {
              setMenu(null);
              navigate(`/read/${menuEntry.id}`);
            }}
          >
            <BookOpen size={15} /> Đọc sách
          </button>
          <button
            type="button"
            className="shelf-menu-item"
            onClick={() => openRenameModal(menuEntry)}
          >
            <Pencil size={15} /> Đổi tên sách
          </button>
          <button
            type="button"
            className="shelf-menu-item danger"
            onClick={() => removeFromShelf(menuEntry)}
          >
            <Trash2 size={15} /> Xoá khỏi tủ sách
          </button>
        </div>
      )}

      {dragGhost && dragBook && (
        <div
          className="shelf-drag-ghost"
          style={{
            left: dragGhost.x + 14,
            top: dragGhost.y - dragGhost.height / 2,
            width: dragGhost.width,
            height: dragGhost.height,
          }}
        >
          <img src={dragBook.cover} alt="" />
        </div>
      )}

      <Modal
        open={addOpen}
        title="Thêm sách vào tủ"
        width={640}
        onClose={() => setAddOpen(false)}
        footer={
          <button type="button" className="btn btn-soft" onClick={() => setAddOpen(false)}>
            Đóng
          </button>
        }
      >
        <p className="tiny muted" style={{ margin: '0 0 14px', lineHeight: 1.6 }}>
          Các tủ còn {Math.max(0, cabinetCount * SHELF_CAPACITY - shelfEntries.length)} chỗ
          trống. Khi đủ 10 cuốn, Bookigma sẽ tự mở thêm tủ mới.
        </p>

        <div className="shelf-add-toolbar">
          <Search size={16} />
          <input
            value={addQuery}
            onChange={(event) => setAddQuery(event.target.value)}
            placeholder="Tìm theo tên sách hoặc tác giả..."
            aria-label="Tìm sách để thêm vào tủ"
            autoFocus
          />
        </div>

        {visibleCandidates.length === 0 ? (
          <p className="tiny muted" style={{ margin: 0, padding: '18px 0', textAlign: 'center' }}>
            {shelfCandidates.length === 0
              ? 'Mọi ebook hiện có đều đã nằm trên kệ của bạn.'
              : 'Không tìm thấy sách phù hợp.'}
          </p>
        ) : (
          <div className="shelf-add-grid">
            {visibleCandidates.map((book) => (
              <div className="shelf-add-item" key={book.id}>
                <img src={book.cover} alt="" className="shelf-add-cover" />
                <div className="shelf-add-info">
                  <strong>{book.title}</strong>
                  <span>{book.author}</span>
                  <span>
                    {progress[bookKey(book.id)]
                      ? 'Đang đọc'
                      : ownedIds.has(bookKey(book.id))
                        ? 'Đã mua'
                        : 'Ebook'}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm shelf-add-btn"
                  onClick={() => addBookToShelf(book)}
                >
                  <Plus size={13} /> Thêm
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(renameEntry)}
        title="Đổi tên sách trên kệ"
        width={430}
        onClose={() => setRenameId(null)}
        footer={
          <>
            <button type="button" className="btn btn-soft" onClick={() => setRenameId(null)}>
              Huỷ
            </button>
            <button type="button" className="btn btn-primary" onClick={commitRename}>
              Lưu tên mới
            </button>
          </>
        }
      >
        {renameEntry && (
          <>
            <label className="label" htmlFor="shelf-rename-input">
              Tên hiển thị trong tủ sách
            </label>
            <input
              id="shelf-rename-input"
              className="input"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitRename();
              }}
              maxLength={80}
              autoFocus
            />
            <p className="tiny muted" style={{ margin: '8px 0 0' }}>
              Để trống để dùng lại tên gốc: {renameEntry.book.title}
            </p>
          </>
        )}
      </Modal>
    </div>
  );
}
