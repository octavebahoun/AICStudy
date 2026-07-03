import * as Lucide from "lucide-react";

//  Icon 
export const Icon = ({
  name,
  size = 18,
  color = "currentColor",
  className = "",
}) => {
  const icons = {
    dashboard: Lucide.LayoutDashboard,
    courses: Lucide.Book,
    quiz: Lucide.HelpCircle,
    forum: Lucide.MessageSquare,
    progress: Lucide.BarChart3,
    certificates: Lucide.Award,
    users: Lucide.Users,
    settings: Lucide.Settings,
    logout: Lucide.LogOut,
    bell: Lucide.Bell,
    menu: Lucide.Menu,
    close: Lucide.X,
    plus: Lucide.Plus,
    check: Lucide.Check,
    star: Lucide.Star,
    ai: Lucide.Zap,
    download: Lucide.Download,
    edit: Lucide.Edit3,
    trash: Lucide.Trash2,
    eye: Lucide.Eye,
    report: Lucide.FileBarChart,
    chevronRight: Lucide.ChevronRight,
    chevronLeft: Lucide.ChevronLeft,
    chevronDown: Lucide.ChevronDown,
    user: Lucide.User,
    send: Lucide.Send,
    catalog: Lucide.Search,
    play: Lucide.Play,
    pin: Lucide.Pin,
    heart: Lucide.Heart,
    save: Lucide.Save,
    alert: Lucide.AlertTriangle,
    x: Lucide.X,
    fileText: Lucide.FileText,
    folders: Lucide.FolderOpen,
    book: Lucide.Book,
    trending: Lucide.TrendingUp,
    award: Lucide.Award,
    scroll: Lucide.Scroll,
    bookOpen: Lucide.BookOpen,
    checkCircle: Lucide.CheckCircle,
    hand: Lucide.MoveHorizontal, 
    wave: Lucide.Hand,
  };

  const LucideIcon = icons[name] || Lucide.HelpCircle;
  return <LucideIcon size={size} color={color} className={className} />;
};

//  Avatar 
export const Avatar = ({ initials = "?", size = 36, bg = "#1E3A5F" }) => (
  <div
    className="avatar"
    style={{
      width: size,
      height: size,
      background: bg,
      color: "white",
      fontSize: size * 0.35,
    }}
  >
    {initials}
  </div>
);

//  Badge 
export const Badge = ({ type = "gray", children }) => (
  <span className={`badge badge-${type}`}>{children}</span>
);

//  ProgressBar 
export const ProgressBar = ({ value = 0, max = 100, color }) => (
  <div className="progress-bar">
    <div
      className="progress-fill"
      style={{
        width: `${Math.min((value / max) * 100, 100)}%`,
        background: color || undefined,
      }}
    />
  </div>
);

//  Spinner 
export const Spinner = ({ dark = false }) => (
  <div className={`spinner${dark ? " spinner-dark" : ""}`} />
);

//  StatCard 
export const StatCard = ({ icon, label, value, trend, bg = "var(--surface-blue)" }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ background: bg }}>
      {icon}
    </div>
    <div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
    {trend && <div className="stat-trend">{trend}</div>}
  </div>
);

//  CourseThumb 
export const CourseThumb = ({ thumbnail, color, size = 36 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: 8,
      background: color,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      fontWeight: 700,
      fontSize: size * 0.33,
      flexShrink: 0,
      fontFamily: "Fraunces, serif",
    }}
  >
    {thumbnail}
  </div>
);

//  AIPanel 
export const AIPanel = ({
  title,
  children,
  onAction,
  actionLabel,
  loading,
}) => (
  <div className="ai-panel">
    <div className="ai-panel-title">
      <Icon name="ai" size={16} color="var(--accent)" />
      {title}
    </div>
    {children}
    {onAction && (
      <button
        className="btn btn-accent btn-sm mt-3"
        onClick={onAction}
        disabled={loading}
      >
        {loading ? (
          <Spinner />
        ) : (
          <>
            <Icon name="ai" size={14} />
            {actionLabel}
          </>
        )}
      </button>
    )}
  </div>
);

//  Modal 
export const Modal = ({ open, onClose, title, children, maxWidth = 560 }) => {
  if (!open) return null;
  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth }}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="btn-icon" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

//  BarChart 
export const BarChart = ({ data, height = 120 }) => {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div
      style={{ display: "flex", alignItems: "flex-end", gap: "6px", height }}
    >
      {data.map((d, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <div
            style={{
              flex: 1,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
            }}
          >
            <div
              title={`${d.label}: ${d.value}`}
              style={{
                background: d.color || "var(--accent)",
                borderRadius: "4px 4px 0 0",
                height: `${(d.value / max) * 100}%`,
                opacity: 0.85,
                transition: "height 0.4s ease",
                minHeight: 4,
              }}
            />
          </div>
          {d.label && (
            <div
              style={{ fontSize: 10, color: "var(--token-color-palette-neutral-400)", whiteSpace: "nowrap" }}
            >
              {d.label}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

//  EmptyState 
export const EmptyState = ({ icon = "📭", title, desc, action }) => (
  <div className="empty-state">
    <div className="empty-icon">{icon}</div>
    {title && <div className="empty-title">{title}</div>}
    {desc && <div className="empty-desc">{desc}</div>}
    {action && <div style={{ marginTop: 16 }}>{action}</div>}
  </div>
);
