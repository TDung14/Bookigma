import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Eye,
  EyeOff,
  Flag,
  Lock,
  MessageCircle,
  Package,
  ShieldCheck,
  Trash2,
  Unlock,
  Users,
  XCircle,
} from 'lucide-react';

import { useApp, useAuth, useToast } from '../../hooks/useStore';

import {
  compactNumber,
  currency,
  dateTime,
  ORDER_STATUS,
  REPORT_STATUS,
  REPORT_TYPE,
  timeAgo,
} from '../../lib/format';

import {
  EmptyState,
  Field,
  StatCard,
} from '../../components/common/ui';

import Modal from '../../components/common/Modal';

import * as adminApi from '../../services/adminApi';

const TABS = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'reports', label: 'Báo cáo vi phạm' },
  { id: 'users', label: 'Người dùng' },
  { id: 'books', label: 'Sản phẩm' },
  { id: 'posts', label: 'Bài đăng' },
  { id: 'orders', label: 'Đơn hàng' },
];

const CHART_COLORS = [
  '#16a34a',
  '#2563eb',
  '#7c3aed',
  '#d97706',
  '#dc2626',
  '#0891b2',
  '#db2777',
];

const P2P_COMMISSION_RATE = 0.05;

const CHART_ANCHOR = Date.now();

function buildDailyBuckets() {
  const map = {};

  for (let i = 13; i >= 0; i--) {
    const d = new Date(
      CHART_ANCHOR - i * 86400000
    );

    map[
      d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      })
    ] = 0;
  }

  return map;
}

export default function AdminDashboard() {
  const { user } = useAuth();

  const {
    users,
    books,
    posts,
    adminOrders: orders,
    reports,
    shops,
    userById,
    bookById,
    setUserStatus,
    updateUserRole,
    deleteUser,
    setBookStatus,
    deleteBook,
    setPostHidden,
    deletePost,
    resolveReport,
    pushNotification,
    refreshAdminData,
    refreshPosts,
  } = useApp();

  const toast = useToast();

  const [tab, setTab] = useState('overview');

  const [handling, setHandling] = useState(null);

  const [handleNote, setHandleNote] = useState('');

  const [reportFilter, setReportFilter] =
    useState('pending');

  /*
   * Lưu trạng thái mở/đóng comment của từng bài đăng.
   *
   * Ví dụ:
   * {
   *   1: true,
   *   2: false
   * }
   *
   * true  = đang mở
   * false = đang thu gọn
   */
  const [expandedComments, setExpandedComments] =
    useState({});

  /*
   * Lưu trạng thái đang tải comment.
   * Vì dữ liệu comment đã nằm trong p.comments sau khi
   * AppProvider lấy từ backend nên state này chủ yếu
   * dùng để tránh thao tác liên tục khi cần refresh.
   */
  const [loadingComments, setLoadingComments] =
    useState({});

  useEffect(() => {
    refreshAdminData();
  }, [refreshAdminData]);

  /**
   * Mở / đóng phần bình luận của một bài đăng.
   */
  const toggleComments = (postId) => {
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  /**
   * Chuẩn hóa comment trước khi hiển thị.
   *
   * AppProvider hiện tại normalize comment thành:
   *
   * {
   *   id,
   *   authorId,
   *   authorName,
   *   username,
   *   avatarUrl,
   *   text,
   *   time,
   *   parentCommentId
   * }
   *
   * Vì vậy KHÔNG dùng comment.content ở đây.
   */
  const normalizeCommentForDisplay = (comment) => {
    if (!comment) {
      return {
        id: null,
        authorId: null,
        authorName: 'Người dùng',
        username: '',
        avatarUrl:
          'https://i.pravatar.cc/150?img=12',
        text: '',
        time: null,
      };
    }

    const fallbackUser = comment.authorId
      ? userById(comment.authorId)
      : null;

    return {
      id: comment.id,

      authorId:
        comment.authorId ??
        comment.userId ??
        comment.author?.id ??
        null,

      authorName:
        comment.authorName ||
        comment.author?.name ||
        fallbackUser?.name ||
        comment.username ||
        'Người dùng',

      username:
        comment.username ||
        comment.author?.username ||
        fallbackUser?.username ||
        '',

      avatarUrl:
        comment.avatarUrl ||
        comment.author?.avatar ||
        fallbackUser?.avatar ||
        'https://i.pravatar.cc/150?img=12',

      /*
       * Quan trọng:
       * AppProvider dùng c.text = p.content từ backend.
       */
      text:
        comment.text ??
        comment.content ??
        '',

      time:
        comment.time ??
        (
          comment.createdAt
            ? new Date(
                comment.createdAt
              ).getTime()
            : null
        ),
    };
  };

  /**
   * Duyệt / gỡ / xóa sản phẩm.
   */
  const changeBookStatus = async (
    book,
    status,
    message
  ) => {
    try {
      await setBookStatus(book.id, status);
      toast(message);
    } catch (error) {
      toast(
        error.message ||
          'Không thể cập nhật sản phẩm.',
        'error'
      );
    }
  };

  const removeBook = async (book) => {
    if (
      !window.confirm(
        `Xóa vĩnh viễn "${book.title}"?`
      )
    ) {
      return;
    }

    try {
      const result = await deleteBook(book.id);

      toast(
        result.message,
        'info'
      );
    } catch (error) {
      toast(
        error.message ||
          'Không thể xóa sản phẩm.',
        'error'
      );
    }
  };

  // ============================================================
  // SỐ LIỆU TỔNG QUAN
  // ============================================================

  const paidOrders = useMemo(
    () =>
      orders.filter(
        (o) => o.status !== 'cancelled'
      ),
    [orders]
  );

  const gmv = paidOrders.reduce(
    (s, o) => s + o.total,
    0
  );

  const p2pCommission = Math.round(
    paidOrders.reduce(
      (sum, o) =>
        sum +
        (o.p2p
          ? o.total * P2P_COMMISSION_RATE
          : 0),
      0
    )
  );

  const blindBoxRevenue =
    paidOrders.reduce(
      (sum, o) =>
        sum +
        o.items
          .filter((i) => i.blind)
          .reduce(
            (x, i) =>
              x + i.price * i.qty,
            0
          ),
      0
    );

  const pendingReports =
    reports.filter(
      (r) => r.status === 'pending'
    );

  const pendingBooks =
    books.filter(
      (b) => b.status === 'pending'
    );

  const revenueByDay = useMemo(() => {
    const map = buildDailyBuckets();

    paidOrders.forEach((o) => {
      const key =
        new Date(
          o.createdAt
        ).toLocaleDateString(
          'vi-VN',
          {
            day: '2-digit',
            month: '2-digit',
          }
        );

      if (key in map) {
        map[key] += o.total;
      }
    });

    return Object.entries(map).map(
      ([date, value]) => ({
        date,
        value,
      })
    );
  }, [paidOrders]);

  const ordersByStatus = useMemo(() => {
    const map = {};

    orders.forEach((o) => {
      const status =
        ORDER_STATUS[o.status];

      if (!status) return;

      map[status.label] =
        (map[status.label] || 0) + 1;
    });

    return Object.entries(map).map(
      ([name, value]) => ({
        name,
        value,
      })
    );
  }, [orders]);

  const revenueByShop = useMemo(
    () =>
      shops.map((s) => ({
        name: s.name,
        value: paidOrders.reduce(
          (sum, o) =>
            sum +
            o.items
              .filter(
                (i) =>
                  i.shopId === s.id
              )
              .reduce(
                (x, i) =>
                  x +
                  i.price * i.qty,
                0
              ),
          0
        ),
      })),
    [shops, paidOrders]
  );

  // ============================================================
  // XỬ LÝ BÁO CÁO
  // ============================================================

  const filteredReports =
    reports.filter(
      (r) =>
        reportFilter === 'all' ||
        r.status === reportFilter
    );

  const openHandler = (report) => {
    setHandling(report);
    setHandleNote('');
  };

  const finishReport = async (status) => {
    try {
      await resolveReport(
        handling.id,
        status,
        user.id,
        handleNote.trim() ||
          (status === 'resolved'
            ? 'Đã xử lý theo quy định cộng đồng'
            : 'Báo cáo không đủ căn cứ'),
        'NONE'
      );

      pushNotification(
        handling.reporterId,
        `Báo cáo của bạn về "${handling.targetLabel}" đã được ${
          status === 'resolved'
            ? 'xử lý'
            : 'xem xét và từ chối'
        }.`,
        '/'
      );

      toast(
        status === 'resolved'
          ? 'Đã đánh dấu báo cáo là đã xử lý.'
          : 'Đã từ chối báo cáo.',
        status === 'resolved'
          ? 'success'
          : 'info'
      );

      setHandling(null);
    } catch (error) {
      toast(
        error.message ||
          'Không thể xử lý báo cáo.',
        'error'
      );
    }
  };

  const applyAction = async (report) => {
    let action = 'NONE';

    if (report.type === 'post') {
      action = 'DELETE_POST';
    } else if (
      report.type === 'comment'
    ) {
      action = 'DELETE_COMMENT';
    } else if (
      report.type === 'user'
    ) {
      action = 'BLOCK_USER';
    }

    try {
      await resolveReport(
        report.id,
        'resolved',
        user.id,
        action === 'NONE'
          ? 'Đã ghi nhận báo cáo.'
          : 'Đã áp dụng biện pháp xử lý.',
        action
      );

      toast(
        action === 'DELETE_POST'
          ? 'Đã xóa bài đăng vi phạm.'
          : action === 'DELETE_COMMENT'
          ? 'Đã xóa bình luận vi phạm.'
          : action === 'BLOCK_USER'
          ? 'Đã khóa tài khoản vi phạm.'
          : 'Đã ghi nhận báo cáo.',
        'info'
      );
    } catch (error) {
      toast(
        error.message ||
          'Không thể thực hiện thao tác quản trị.',
        'error'
      );
    }
  };

  // ============================================================
  // XÓA COMMENT
  // ============================================================

  const handleDeleteComment = async (
    comment,
    postId
  ) => {
    if (
      !window.confirm(
        'Xóa bình luận này?'
      )
    ) {
      return;
    }

    if (!comment?.id) {
      toast(
        'Không xác định được ID bình luận.',
        'error'
      );
      return;
    }

    try {
      setLoadingComments((prev) => ({
        ...prev,
        [postId]: true,
      }));

      await adminApi.deleteComment(
        user.id,
        comment.id
      );

      /*
       * Quan trọng:
       * Sau khi xóa phải lấy lại dữ liệu từ backend.
       * Không chỉ xóa local để tránh frontend khác
       * với database.
       */
      await refreshPosts();

      toast(
        'Đã xóa bình luận.',
        'info'
      );
    } catch (error) {
      toast(
        error.message ||
          'Không thể xóa bình luận.',
        'error'
      );
    } finally {
      setLoadingComments((prev) => ({
        ...prev,
        [postId]: false,
      }));
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="main-layout wide">

      {/* ======================================================
          HEADER
          ====================================================== */}

      <div className="page-head">
        <h1
          className="row"
          style={{ gap: 9 }}
        >
          <ShieldCheck
            size={24}
            color="var(--accent-green)"
          />

          Bảng điều khiển quản trị
        </h1>

        <p>
          Toàn cảnh hoạt động của nền tảng Bookigma
        </p>
      </div>

      {/* ======================================================
          STAT CARDS
          ====================================================== */}

      <div
        className="grid"
        style={{
          gridTemplateColumns:
            'repeat(auto-fit, minmax(205px, 1fr))',
          marginBottom: 20,
        }}
      >
        <StatCard
          icon={DollarSign}
          label="Tổng GMV"
          value={currency(gmv)}
          sub={`Blind Book: ${currency(
            blindBoxRevenue
          )} · P2P 5%: ${currency(
            p2pCommission
          )}`}
        />

        <StatCard
          icon={Users}
          label="Người dùng"
          value={users.length}
          sub={`${
            users.filter(
              (u) =>
                u.status === 'suspended'
            ).length
          } tài khoản bị khóa`}
          color="var(--info)"
          bg="var(--info-soft)"
        />

        <StatCard
          icon={Package}
          label="Đơn hàng"
          value={orders.length}
          sub={`${
            orders.filter(
              (o) =>
                o.status === 'pending'
            ).length
          } đơn chờ xác nhận`}
          color="var(--purple)"
          bg="var(--purple-soft)"
        />

        <StatCard
          icon={Flag}
          label="Báo cáo chờ xử lý"
          value={pendingReports.length}
          sub={`Tổng ${reports.length} báo cáo`}
          color="var(--danger)"
          bg="var(--danger-soft)"
        />

        <StatCard
          icon={BookOpen}
          label="Sản phẩm"
          value={books.length}
          sub={`${pendingBooks.length} chờ duyệt`}
          color="var(--warning)"
          bg="var(--warning-soft)"
        />
      </div>

      {/* ======================================================
          TABS
          ====================================================== */}

      <div
        className="tabs"
        style={{ marginBottom: 18 }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${
              tab === t.id
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setTab(t.id)
            }
          >
            {t.label}

            {t.id === 'reports' &&
              pendingReports.length >
                0 && (
                <span
                  className="badge badge-red"
                  style={{
                    marginLeft: 6,
                  }}
                >
                  {pendingReports.length}
                </span>
              )}
          </button>
        ))}
      </div>

      {/* ======================================================
          TỔNG QUAN
          ====================================================== */}

      {tab === 'overview' && (
        <div className="stack">

          <div className="card">
            <h3
              style={{
                margin: '0 0 16px',
                fontSize: 16,
              }}
            >
              Doanh thu toàn sàn 14 ngày gần nhất
            </h3>

            <ResponsiveContainer
              width="100%"
              height={270}
            >
              <AreaChart
                data={revenueByDay}
              >
                <defs>
                  <linearGradient
                    id="gmv"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#16a34a"
                      stopOpacity={0.35}
                    />

                    <stop
                      offset="95%"
                      stopColor="#16a34a"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-color)"
                />

                <XAxis
                  dataKey="date"
                  stroke="var(--text-sub)"
                  fontSize={12}
                />

                <YAxis
                  stroke="var(--text-sub)"
                  fontSize={12}
                  tickFormatter={(v) =>
                    compactNumber(v)
                  }
                />

                <Tooltip
                  formatter={(v) =>
                    currency(v)
                  }
                  contentStyle={{
                    background:
                      'var(--bg-card)',
                    border:
                      '1px solid var(--border-color)',
                    borderRadius: 8,
                    color:
                      'var(--text-main)',
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="value"
                  name="GMV"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  fill="url(#gmv)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div
            className="grid"
            style={{
              gridTemplateColumns:
                'repeat(auto-fit, minmax(330px, 1fr))',
            }}
          >
            <div className="card">
              <h3
                style={{
                  margin: '0 0 16px',
                  fontSize: 16,
                }}
              >
                Đơn hàng theo trạng thái
              </h3>

              <ResponsiveContainer
                width="100%"
                height={240}
              >
                <PieChart>
                  <Pie
                    data={ordersByStatus}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={78}
                  >
                    {ordersByStatus.map(
                      (_, i) => (
                        <Cell
                          key={i}
                          fill={
                            CHART_COLORS[
                              i %
                                CHART_COLORS.length
                            ]
                          }
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip
                    contentStyle={{
                      background:
                        'var(--bg-card)',
                      border:
                        '1px solid var(--border-color)',
                      borderRadius: 8,
                      color:
                        'var(--text-main)',
                    }}
                  />

                  <Legend
                    wrapperStyle={{
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3
                style={{
                  margin: '0 0 16px',
                  fontSize: 16,
                }}
              >
                Doanh thu theo đối tác
              </h3>

              <ResponsiveContainer
                width="100%"
                height={240}
              >
                <BarChart
                  data={revenueByShop}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-color)"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="name"
                    stroke="var(--text-sub)"
                    fontSize={12}
                  />

                  <YAxis
                    stroke="var(--text-sub)"
                    fontSize={11}
                    tickFormatter={(v) =>
                      compactNumber(v)
                    }
                  />

                  <Tooltip
                    formatter={(v) =>
                      currency(v)
                    }
                    contentStyle={{
                      background:
                        'var(--bg-card)',
                      border:
                        '1px solid var(--border-color)',
                      borderRadius: 8,
                      color:
                        'var(--text-main)',
                    }}
                  />

                  <Bar
                    dataKey="value"
                    name="Doanh thu"
                    fill="#2563eb"
                    radius={[
                      5,
                      5,
                      0,
                      0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {pendingReports.length >
            0 && (
            <div className="card">
              <h3
                className="row"
                style={{
                  margin: '0 0 12px',
                  fontSize: 16,
                  gap: 8,
                }}
              >
                <Flag
                  size={18}
                  color="var(--danger)"
                />

                Báo cáo cần xử lý gấp
              </h3>

              {pendingReports
                .slice(0, 4)
                .map((r) => (
                  <div
                    key={r.id}
                    className="row-between"
                    style={{
                      padding: '10px 0',
                      borderBottom:
                        '1px solid var(--border-color)',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div
                      style={{
                        minWidth: 0,
                      }}
                    >
                      <div className="small strong truncate">
                        {r.targetLabel}
                      </div>

                      <div className="tiny muted">
                        {r.reason} ·{' '}
                        {timeAgo(
                          r.createdAt
                        )}
                      </div>
                    </div>

                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setTab('reports');
                        openHandler(r);
                      }}
                    >
                      Xử lý ngay
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================
          BÁO CÁO
          ====================================================== */}

      {tab === 'reports' && (
        <div className="stack">

          <div
            className="card row"
            style={{
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {[
              'pending',
              'resolved',
              'rejected',
              'all',
            ].map((f) => (
              <button
                key={f}
                className={`btn btn-sm ${
                  reportFilter === f
                    ? 'btn-primary'
                    : 'btn-ghost'
                }`}
                onClick={() =>
                  setReportFilter(f)
                }
              >
                {f === 'all'
                  ? 'Tất cả'
                  : REPORT_STATUS[f]
                      .label}{' '}
                (
                {f === 'all'
                  ? reports.length
                  : reports.filter(
                      (r) =>
                        r.status === f
                    ).length}
                )
              </button>
            ))}
          </div>

          {filteredReports.length ===
          0 ? (
            <div className="card">
              <EmptyState
                icon={CheckCircle2}
                title="Không có báo cáo nào ở mục này"
                hint="Hàng chờ đang sạch."
              />
            </div>
          ) : (
            filteredReports.map((r) => {
              const reporter =
                userById(
                  r.reporterId
                );

              const st =
                REPORT_STATUS[
                  r.status
                ];

              return (
                <div
                  key={r.id}
                  className="card"
                >
                  <div
                    className="row-between"
                    style={{
                      flexWrap: 'wrap',
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      className="row"
                      style={{
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span className="badge badge-purple">
                        {REPORT_TYPE[
                          r.type
                        ]}
                      </span>

                      <span className="strong small">
                        {r.targetLabel}
                      </span>
                    </div>

                    <span
                      className={`badge ${st.badge}`}
                    >
                      {st.label}
                    </span>
                  </div>

                  <div
                    className="small"
                    style={{
                      background:
                        'var(--bg-soft)',
                      padding: 12,
                      borderRadius: 9,
                      marginBottom: 12,
                    }}
                  >
                    {r.targetContent && (
                      <div
                        style={{
                          marginBottom: 8,
                        }}
                      >
                        <div className="tiny muted">
                          Nội dung đối tượng
                        </div>

                        <div
                          style={{
                            whiteSpace:
                              'pre-wrap',
                          }}
                        >
                          {r.targetContent}
                        </div>
                      </div>
                    )}

                    <div
                      className="strong"
                      style={{
                        color:
                          'var(--danger)',
                        marginBottom: 4,
                      }}
                    >
                      Lý do: {r.reason}
                    </div>

                    {r.detail && (
                      <div className="muted">
                        {r.detail}
                      </div>
                    )}
                  </div>

                  <div
                    className="row-between"
                    style={{
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    <div
                      className="row tiny muted"
                      style={{ gap: 8 }}
                    >
                      <img
                        src={
                          reporter?.avatar
                        }
                        alt=""
                        className="avatar"
                        style={{
                          width: 22,
                          height: 22,
                        }}
                      />

                      Báo cáo bởi{' '}
                      <b>
                        {reporter?.name}
                      </b>{' '}
                      ·{' '}
                      {dateTime(
                        r.createdAt
                      )}
                    </div>

                    {r.status ===
                    'pending' ? (
                      <div
                        className="row"
                        style={{
                          gap: 8,
                          flexWrap:
                            'wrap',
                        }}
                      >
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() =>
                            applyAction(r)
                          }
                        >
                          {r.type ===
                          'post'
                            ? 'Ẩn bài đăng'
                            : r.type ===
                              'user'
                            ? 'Khóa tài khoản'
                            : r.type ===
                              'book'
                            ? 'Gỡ sản phẩm'
                            : 'Ghi nhận'}
                        </button>

                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() =>
                            openHandler(r)
                          }
                        >
                          Kết luận xử lý
                        </button>
                      </div>
                    ) : (
                      <div
                        className="tiny muted"
                        style={{
                          textAlign:
                            'right',
                          maxWidth: 380,
                        }}
                      >
                        Xử lý bởi{' '}
                        <b>
                          {userById(
                            r.handledBy
                          )?.name ||
                            'Admin'}
                        </b>
                        : {r.handledNote}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ======================================================
          NGƯỜI DÙNG
          ====================================================== */}

      {tab === 'users' && (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Vai trò</th>
                <th>Tham gia</th>
                <th>Điểm</th>
                <th>Đơn hàng</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {users.map((u) => {
                const userOrders =
                  orders.filter(
                    (o) =>
                      o.userId === u.id
                  );

                return (
                  <tr key={u.id}>
                    <td>
                      <div className="row">
                        <img
                          src={u.avatar}
                          alt=""
                          className="avatar"
                          style={{
                            width: 34,
                            height: 34,
                          }}
                        />

                        <div
                          style={{
                            minWidth: 0,
                          }}
                        >
                          <div className="small strong truncate">
                            {u.name}
                          </div>

                          <div className="tiny muted truncate">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          u.role ===
                          'admin'
                            ? 'badge-purple'
                            : u.role ===
                              'shop'
                            ? 'badge-blue'
                            : ''
                        }`}
                      >
                        {u.role ===
                        'admin'
                          ? 'Quản trị'
                          : u.role ===
                            'shop'
                          ? 'Chủ shop'
                          : 'Độc giả'}
                      </span>
                    </td>

                    <td className="small muted">
                      {u.joinedAt}
                    </td>

                    <td className="small">
                      {u.points.toLocaleString(
                        'vi-VN'
                      )}
                    </td>

                    <td className="small">
                      {userOrders.length}
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          u.status ===
                          'active'
                            ? 'badge-green'
                            : 'badge-red'
                        }`}
                      >
                        {u.status ===
                        'active'
                          ? 'Hoạt động'
                          : 'Bị khóa'}
                      </span>
                    </td>

                    <td>
                      {u.id !==
                        user.id && (
                        <div
                          className="row"
                          style={{
                            gap: 6,
                            flexWrap:
                              'wrap',
                          }}
                        >
                          <select
                            className="input"
                            value={String(
                              u.role ||
                                'user'
                            ).toLowerCase()}
                            style={{
                              width: 120,
                              minHeight: 32,
                              padding:
                                '4px 8px',
                            }}
                            onChange={async (
                              e
                            ) => {
                              try {
                                await updateUserRole(
                                  u.id,
                                  e.target.value.toUpperCase()
                                );

                                toast(
                                  `Đã cập nhật role của ${u.name}.`,
                                  'success'
                                );
                              } catch (error) {
                                toast(
                                  error.message ||
                                    'Không thể cập nhật role.',
                                  'error'
                                );
                              }
                            }}
                          >
                            <option value="user">
                              USER
                            </option>

                            <option value="shop">
                              SHOP
                            </option>

                            <option value="moderator">
                              MODERATOR
                            </option>

                            <option value="admin">
                              ADMIN
                            </option>
                          </select>

                          <button
                            className="btn btn-ghost btn-sm"
                            style={{
                              color:
                                u.status ===
                                'active'
                                  ? 'var(--danger)'
                                  : 'var(--accent-green)',
                            }}
                            onClick={async () => {
                              const next =
                                u.status ===
                                'active'
                                  ? 'suspended'
                                  : 'active';

                              try {
                                await setUserStatus(
                                  u.id,
                                  next
                                );

                                toast(
                                  next ===
                                  'suspended'
                                    ? `Đã khóa tài khoản ${u.name}.`
                                    : `Đã mở khóa ${u.name}.`
                                );
                              } catch (error) {
                                toast(
                                  error.message ||
                                    'Không thể cập nhật trạng thái.',
                                  'error'
                                );
                              }
                            }}
                          >
                            {u.status ===
                            'active' ? (
                              <>
                                <Lock
                                  size={14}
                                />{' '}
                                Khóa
                              </>
                            ) : (
                              <>
                                <Unlock
                                  size={14}
                                />{' '}
                                Mở khóa
                              </>
                            )}
                          </button>

                          <button
                            className="btn btn-ghost btn-sm"
                            style={{
                              color:
                                'var(--danger)',
                            }}
                            onClick={async () => {
                              if (
                                !window.confirm(
                                  `Xóa vĩnh viễn tài khoản ${u.name}?`
                                )
                              ) {
                                return;
                              }

                              try {
                                await deleteUser(
                                  u.id
                                );

                                toast(
                                  `Đã xóa tài khoản ${u.name}.`,
                                  'info'
                                );
                              } catch (error) {
                                toast(
                                  error.message ||
                                    'Không thể xóa tài khoản.',
                                  'error'
                                );
                              }
                            }}
                          >
                            <Trash2
                              size={14}
                            />{' '}
                            Xóa
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ======================================================
          SẢN PHẨM
          ====================================================== */}

      {tab === 'books' && (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Shop</th>
                <th>Giá</th>
                <th>Đã bán</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {books.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link
                      to={`/book/${b.id}`}
                      className="row"
                    >
                      <img
                        src={b.cover}
                        alt=""
                        className="book-cover"
                        style={{
                          width: 32,
                          height: 44,
                        }}
                      />

                      <div
                        style={{
                          minWidth: 0,
                          maxWidth: 240,
                        }}
                      >
                        <div className="small strong truncate">
                          {b.title}
                        </div>

                        <div className="tiny muted truncate">
                          {b.author} ·{' '}
                          {b.category}
                        </div>
                      </div>
                    </Link>
                  </td>

                  <td className="small">
                    {
                      shops.find(
                        (s) =>
                          s.id ===
                          b.shopId
                      )?.name
                    }
                  </td>

                  <td className="small price">
                    {currency(b.price)}
                  </td>

                  <td className="small">
                    {b.sold.toLocaleString(
                      'vi-VN'
                    )}
                  </td>

                  <td>
                    <span
                      className={`badge ${
                        b.status ===
                        'active'
                          ? 'badge-green'
                          : b.status ===
                            'pending'
                          ? 'badge-amber'
                          : 'badge-red'
                      }`}
                    >
                      {b.status ===
                      'active'
                        ? 'Đang bán'
                        : b.status ===
                          'pending'
                        ? 'Chờ duyệt'
                        : 'Đã gỡ'}
                    </span>
                  </td>

                  <td>
                    <div
                      className="row"
                      style={{ gap: 4 }}
                    >
                      {b.status ===
                        'pending' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() =>
                            changeBookStatus(
                              b,
                              'active',
                              `Đã duyệt "${b.title}".`
                            )
                          }
                        >
                          <CheckCircle2
                            size={14}
                          />{' '}
                          Duyệt
                        </button>
                      )}

                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          const next =
                            b.status ===
                            'hidden'
                              ? 'active'
                              : 'hidden';

                          changeBookStatus(
                            b,
                            next,
                            next ===
                            'hidden'
                              ? 'Đã gỡ sản phẩm.'
                              : 'Đã hiển thị lại sản phẩm.'
                          );
                        }}
                      >
                        {b.status ===
                        'hidden' ? (
                          <Eye
                            size={14}
                          />
                        ) : (
                          <EyeOff
                            size={14}
                          />
                        )}
                      </button>

                      <button
                        className="btn-icon"
                        style={{
                          color:
                            'var(--danger)',
                        }}
                        onClick={() =>
                          removeBook(b)
                        }
                        aria-label="Xóa"
                      >
                        <Trash2
                          size={15}
                        />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ======================================================
          BÀI ĐĂNG
          ====================================================== */}

      {tab === 'posts' && (
        <div className="stack">

          {posts.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={MessageCircle}
                title="Chưa có bài đăng"
                hint="Không có bài đăng nào trong cơ sở dữ liệu."
              />
            </div>
          ) : (
            posts.map((p) => {
              const author =
                userById(
                  p.authorId
                );

              const comments =
                Array.isArray(
                  p.comments
                )
                  ? p.comments
                  : [];

              const commentCount =
                comments.length;

              const isExpanded =
                Boolean(
                  expandedComments[
                    p.id
                  ]
                );

              const isLoading =
                Boolean(
                  loadingComments[
                    p.id
                  ]
                );

              const reportCount =
                reports.filter(
                  (r) =>
                    r.type ===
                      'post' &&
                    r.targetId ===
                      p.id
                ).length;

              return (
                <div
                  key={p.id}
                  className="card"
                >

                  {/* ------------------------------------------------
                      THÔNG TIN NGƯỜI ĐĂNG
                      ------------------------------------------------ */}

                  <div
                    className="row-between"
                    style={{
                      marginBottom: 10,
                      flexWrap:
                        'wrap',
                      gap: 8,
                    }}
                  >
                    <div className="row">
                      <img
                        src={
                          author?.avatar ||
                          p.avatarUrl ||
                          'https://i.pravatar.cc/150?img=12'
                        }
                        alt=""
                        className="avatar"
                        style={{
                          width: 34,
                          height: 34,
                        }}
                      />

                      <div>
                        <div className="small strong">
                          {author?.name ||
                            p.authorName ||
                            'Người dùng'}
                        </div>

                        <div className="tiny muted">
                          {timeAgo(
                            p.time
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className="row"
                      style={{
                        gap: 8,
                      }}
                    >
                      {reportCount >
                        0 && (
                        <span className="badge badge-red">
                          {reportCount}{' '}
                          báo cáo
                        </span>
                      )}

                      {p.hidden && (
                        <span className="badge badge-red">
                          Đã ẩn
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ------------------------------------------------
                      NỘI DUNG BÀI ĐĂNG
                      ------------------------------------------------ */}

                  <p
                    className="small clamp-3"
                    style={{
                      margin:
                        '0 0 12px',
                    }}
                  >
                    {p.content}
                  </p>

                  {/* =================================================
                      COMMENT - THU GỌN / MỞ RỘNG
                      ================================================= */}

                  <div
                    style={{
                      marginBottom: 12,
                      borderTop:
                        '1px solid var(--border-color)',
                      paddingTop: 10,
                    }}
                  >

                    {/* Nút mở / đóng comment */}

                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() =>
                        toggleComments(
                          p.id
                        )
                      }
                      style={{
                        width: '100%',
                        justifyContent:
                          'space-between',
                        padding:
                          '9px 10px',
                        fontWeight: 600,
                      }}
                      aria-expanded={
                        isExpanded
                      }
                      aria-label={
                        isExpanded
                          ? 'Thu gọn bình luận'
                          : 'Xem bình luận'
                      }
                    >
                      <span
                        className="row"
                        style={{
                          gap: 7,
                        }}
                      >
                        <MessageCircle
                          size={15}
                        />

                        <span>
                          Bình luận (
                          {
                            commentCount
                          }
                          )
                        </span>
                      </span>

                      {isExpanded ? (
                        <ChevronUp
                          size={17}
                        />
                      ) : (
                        <ChevronDown
                          size={17}
                        />
                      )}
                    </button>

                    {/* =================================================
                        DANH SÁCH COMMENT
                        Chỉ render khi admin mở comment
                        ================================================= */}

                    {isExpanded && (
                      <div
                        style={{
                          marginTop: 8,
                          border:
                            '1px solid var(--border-color)',
                          borderRadius: 9,
                          overflow:
                            'hidden',
                        }}
                      >

                        {isLoading && (
                          <div
                            className="tiny muted"
                            style={{
                              padding: 12,
                              textAlign:
                                'center',
                            }}
                          >
                            Đang cập nhật bình luận...
                          </div>
                        )}

                        {!isLoading &&
                          commentCount ===
                            0 && (
                            <div
                              className="tiny muted"
                              style={{
                                padding: 14,
                                textAlign:
                                  'center',
                              }}
                            >
                              Chưa có bình luận.
                            </div>
                          )}

                        {!isLoading &&
                          comments.map(
                            (
                              rawComment,
                              index
                            ) => {
                              /*
                               * Chuẩn hóa dữ liệu comment
                               * từ backend/AppProvider.
                               */
                              const comment =
                                normalizeCommentForDisplay(
                                  rawComment
                                );

                              return (
                                <div
                                  key={
                                    comment.id ||
                                    `${p.id}-comment-${index}`
                                  }
                                  style={{
                                    padding:
                                      '11px 12px',
                                    borderBottom:
                                      index <
                                      comments.length -
                                        1
                                        ? '1px solid var(--border-color)'
                                        : 'none',
                                    background:
                                      'var(--bg-card)',
                                  }}
                                >
                                  <div
                                    className="row-between"
                                    style={{
                                      gap: 10,
                                      alignItems:
                                        'flex-start',
                                    }}
                                  >

                                    {/* USER + COMMENT */}

                                    <div
                                      className="row"
                                      style={{
                                        gap: 9,
                                        alignItems:
                                          'flex-start',
                                        minWidth: 0,
                                        flex: 1,
                                      }}
                                    >
                                      {/* Avatar user comment */}

                                      <img
                                        src={
                                          comment.avatarUrl
                                        }
                                        alt=""
                                        className="avatar"
                                        style={{
                                          width: 32,
                                          height: 32,
                                          flexShrink: 0,
                                        }}
                                      />

                                      <div
                                        style={{
                                          minWidth: 0,
                                          flex: 1,
                                        }}
                                      >

                                        {/* Tên user */}

                                        <div
                                          className="small strong"
                                          style={{
                                            lineHeight:
                                              1.35,
                                          }}
                                        >
                                          {
                                            comment.authorName
                                          }
                                        </div>

                                        {/* Username */}

                                        {comment.username && (
                                          <div
                                            className="tiny muted"
                                            style={{
                                              marginTop: 1,
                                            }}
                                          >
                                            @
                                            {
                                              comment.username
                                            }
                                          </div>
                                        )}

                                        {/* Nội dung comment */}

                                        <div
                                          className="small"
                                          style={{
                                            marginTop: 5,
                                            whiteSpace:
                                              'pre-wrap',
                                            wordBreak:
                                              'break-word',
                                            overflowWrap:
                                              'anywhere',
                                            lineHeight:
                                              1.5,
                                          }}
                                        >
                                          {comment.text ||
                                            '(Không có nội dung)'}
                                        </div>

                                        {/* Thời gian */}

                                        {comment.time && (
                                          <div
                                            className="tiny muted"
                                            style={{
                                              marginTop: 5,
                                            }}
                                          >
                                            {dateTime(
                                              comment.time
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* XÓA COMMENT */}

                                    <button
                                      type="button"
                                      className="btn btn-ghost btn-sm"
                                      style={{
                                        color:
                                          'var(--danger)',
                                        flexShrink: 0,
                                      }}
                                      onClick={() =>
                                        handleDeleteComment(
                                          rawComment,
                                          p.id
                                        )
                                      }
                                      disabled={
                                        isLoading
                                      }
                                      title="Xóa bình luận"
                                    >
                                      <Trash2
                                        size={
                                          13
                                        }
                                      />

                                      <span>
                                        Xóa
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              );
                            }
                          )}
                      </div>
                    )}
                  </div>

                  {/* =================================================
                      THÔNG TIN LIKE / COMMENT
                      ================================================= */}

                  <div
                    className="row-between"
                    style={{
                      paddingTop: 10,
                      borderTop:
                        '1px solid var(--border-color)',
                      flexWrap:
                        'wrap',
                      gap: 8,
                    }}
                  >
                    <span className="tiny muted">
                      {
                        (
                          Array.isArray(
                            p.likedBy
                          )
                            ? p.likedBy
                            : []
                        ).length
                      }{' '}
                      thích ·{' '}
                      {commentCount}{' '}
                      bình luận
                    </span>

                    <div
                      className="row"
                      style={{
                        gap: 8,
                      }}
                    >

                      {/* ẨN / HIỆN BÀI */}

                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setPostHidden(
                            p.id,
                            !p.hidden
                          );

                          toast(
                            p.hidden
                              ? 'Đã hiện lại bài đăng.'
                              : 'Đã ẩn bài đăng.'
                          );
                        }}
                      >
                        {p.hidden ? (
                          <>
                            <Eye
                              size={14}
                            />{' '}
                            Hiện lại
                          </>
                        ) : (
                          <>
                            <EyeOff
                              size={14}
                            />{' '}
                            Ẩn bài
                          </>
                        )}
                      </button>

                      {/* XÓA BÀI */}

                      <button
                        className="btn btn-ghost btn-sm"
                        style={{
                          color:
                            'var(--danger)',
                        }}
                        onClick={async () => {
                          if (
                            !window.confirm(
                              'Xóa vĩnh viễn bài đăng này?'
                            )
                          ) {
                            return;
                          }

                          try {
                            await deletePost(
                              p.id
                            );

                            /*
                             * Đồng bộ lại posts
                             * từ backend sau khi xóa.
                             */
                            await refreshPosts();

                            toast(
                              'Đã xóa bài đăng.',
                              'info'
                            );
                          } catch (error) {
                            toast(
                              error.message ||
                                'Không thể xóa bài đăng.',
                              'error'
                            );
                          }
                        }}
                      >
                        <Trash2
                          size={14}
                        />{' '}
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ======================================================
          ĐƠN HÀNG
          ====================================================== */}

      {tab === 'orders' && (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách hàng</th>
                <th>Sản phẩm</th>
                <th>Tổng tiền</th>
                <th>
                  Doanh thu Bookigma
                </th>
                <th>Thanh toán</th>
                <th>Trạng thái</th>
                <th>Thời gian</th>
              </tr>
            </thead>

            <tbody>
              {[...orders]
                .sort(
                  (a, b) =>
                    b.createdAt -
                    a.createdAt
                )
                .map((o) => (
                  <tr key={o.id}>
                    <td className="small strong">
                      {o.code}
                    </td>

                    <td className="small">
                      {o.buyerName ||
                        userById(
                          o.userId
                        )?.name}
                    </td>

                    <td
                      className="small truncate"
                      style={{
                        maxWidth: 220,
                      }}
                    >
                      {o.items
                        .map(
                          (i) =>
                            `${
                              bookById(
                                i.bookId
                              )?.title ||
                              i.title
                            } ×${i.qty}`
                        )
                        .join(', ')}
                    </td>

                    <td className="small price">
                      {currency(
                        o.total
                      )}
                    </td>

                    <td className="small">
                      {o.status ===
                      'cancelled'
                        ? '—'
                        : currency(
                            o.items
                              .filter(
                                (i) =>
                                  i.blind
                              )
                              .reduce(
                                (
                                  x,
                                  i
                                ) =>
                                  x +
                                  i.price *
                                    i.qty,
                                0
                              ) +
                              (o.p2p
                                ? o.total *
                                  P2P_COMMISSION_RATE
                                : 0)
                          )}
                    </td>

                    <td className="small muted">
                      {o.payment.toUpperCase()}
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          ORDER_STATUS[
                            o.status
                          ].badge
                        }`}
                      >
                        {
                          ORDER_STATUS[
                            o.status
                          ].label
                        }
                      </span>
                    </td>

                    <td className="tiny muted">
                      {dateTime(
                        o.createdAt
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ======================================================
          MODAL KẾT LUẬN BÁO CÁO
          ====================================================== */}

      <Modal
        open={!!handling}
        onClose={() =>
          setHandling(null)
        }
        title="Kết luận xử lý báo cáo"
        footer={
          <>
            <button
              className="btn btn-ghost"
              onClick={() =>
                finishReport(
                  'rejected'
                )
              }
            >
              <XCircle size={16} /> Từ
              chối báo cáo
            </button>

            <button
              className="btn btn-primary"
              onClick={() =>
                finishReport(
                  'resolved'
                )
              }
            >
              <CheckCircle2
                size={16}
              />{' '}
              Xác nhận đã xử lý
            </button>
          </>
        }
      >
        <div
          className="small"
          style={{
            background:
              'var(--bg-soft)',
            padding: 12,
            borderRadius: 9,
            marginBottom: 14,
          }}
        >
          <div className="strong">
            {handling?.targetLabel}
          </div>

          <div
            className="muted"
            style={{
              marginTop: 4,
            }}
          >
            Lý do:{' '}
            {handling?.reason}
          </div>

          {handling?.detail && (
            <div
              className="muted tiny"
              style={{
                marginTop: 4,
              }}
            >
              {handling.detail}
            </div>
          )}
        </div>

        <Field
          label="Ghi chú xử lý (gửi tới người báo cáo)"
          style={{
            marginBottom: 0,
          }}
        >
          {(id) => (
            <textarea
              id={id}
              className="textarea"
              value={handleNote}
              onChange={(e) =>
                setHandleNote(
                  e.target.value
                )
              }
              placeholder="Ví dụ: Đã ẩn bài đăng và cảnh cáo tài khoản vi phạm lần 1."
            />
          )}
        </Field>
      </Modal>
    </div>
  );
}