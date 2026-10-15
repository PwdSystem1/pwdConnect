import {PORTAL_API} from '../components/portalApi';
import {stopSpeech} from '../components/speechPlayer';
import UserLayout from "../components/UserLayout";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/* SIMPLE LINE ICONS (walang kailangang i-install na library) */
const ICONS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3l9.5 17h-19z" />
      <path d="M12 10v4M12 17.3v.01" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  qr: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v.01M14 20h3M20 17v4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  access: (
    <>
      <circle cx="12" cy="4.5" r="1.8" />
      <path d="M5 8.5l7 1.5 7-1.5M12 10v5M9 21l3-6 3 6" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  logout: (
    <>
      <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="M16 8l4 4-4 4M20 12H9" />
    </>
  ),
  inbox: (
    <>
      <path d="M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="M3 13h5l1 3h6l1-3h5" />
    </>
  ),
  chevron: <path d="M9 6l6 6-6 6" />,
  down: <path d="M6 9l6 6 6-6" />,
  up: <path d="M6 15l6-6 6 6" />,
};

function Icon({ name, className = "w-5 h-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

/* ACCESSIBILITY DROPDOWN MENU */


export default function Dashboard({
  fontSize = "text-base",
  setFontSize = () => {},
  themeMode = "light",
  setThemeMode = () => {},
  isDyslexicFont = false,
  setIsDyslexicFont = () => {},
}) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  
  // States para sa Real-time Notification at Alert Polling
  const [receivedAlerts, setReceivedAlerts] = useState([]);
  useEffect(() => {
    const savedSession = localStorage.getItem("userSession");
    if (!savedSession) {
      navigate("/");
      return;
    }

    const userData = JSON.parse(savedSession);
    setUser(userData);

    // Kumokonekta sa backend route na gumagamit ng serviceController / serviceRoutes
    if (userData && userData.pwd_id) {
      fetchUserRequests(userData.pwd_id);
    }
  }, [navigate]);

  // Background Polling para sa Live Received Alerts (Bawat 5 segundo)


  useEffect(()=>{let active=true;const controller=new AbortController();async function load(){try{const response=await fetch(`${PORTAL_API}/received-alerts`,{headers:{Authorization:'Bearer '+localStorage.getItem('portalToken')},signal:controller.signal});const data=await response.json();if(active&&data.success)setReceivedAlerts(data.alerts||[]);}catch{}}load();const timer=setInterval(load,5000);return()=>{active=false;controller.abort();clearInterval(timer);};},[]);
  const fetchUserRequests = async (pwdId) => {
    try {
      const response = await fetch(`${PORTAL_API}/service-requests/${encodeURIComponent(pwdId)}`, {headers:{Authorization: "Bearer " + localStorage.getItem("portalToken")}});
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error("Error fetching requests for dashboard:", err);
    }
  };

  const isHighContrast = themeMode === "contrast";
  const isDarkMode = themeMode === "dark";

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-8 text-lg font-semibold ${isHighContrast ? "bg-black text-yellow-400" : isDarkMode ? "bg-slate-950 text-slate-300" : "bg-slate-50 text-slate-600"}`}>
        <span className="animate-pulse">Loading...</span>
      </div>
    );
  }

  const displayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`
    : user.acc_username || "User";

  // Dynamic counting para sa Total at Pending Requests batay sa database
  const totalRequests = requests.length;
  const pendingRequests = requests.filter(
    (req) => !req.status || req.status.toLowerCase() === "pending"
  ).length;

  /* THEME TOKENS (light / dark / high contrast) */
  const t = isHighContrast
    ? {
        page: "bg-black text-yellow-300",
        sidebar: "bg-black text-yellow-300 border-b-2 lg:border-b-0 lg:border-r-2 border-yellow-400",
        navActive: "bg-yellow-400 text-black font-bold",
        navIdle: "text-yellow-300 hover:bg-zinc-900",
        card: "bg-black border-2 border-yellow-400",
        row: "border-yellow-400/40",
        heading: "text-yellow-400",
        muted: "text-yellow-200",
        subtle: "text-yellow-200/80",
        tile: "bg-yellow-400 text-black",
        tileAlert: "bg-yellow-400 text-black",
        hero: "bg-zinc-900 border-2 border-yellow-400 text-yellow-300",
        heroChip: "bg-yellow-400 text-black",
        avatar: "bg-yellow-400 text-black",
        userBox: "border border-yellow-400/50",
        divider: "border-yellow-400/40",
        link: "bg-yellow-400 text-black hover:bg-yellow-300",
        logout: "bg-yellow-400 text-black hover:bg-yellow-300 font-bold",
        actionHover: "hover:bg-zinc-900",
        brand: "bg-yellow-400 text-black",
      }
    : isDarkMode
    ? {
        page: "bg-slate-950 text-slate-100",
        sidebar: "bg-slate-900 text-slate-100 border-b lg:border-b-0 lg:border-r border-slate-800",
        navActive: "bg-sky-600 text-white font-semibold",
        navIdle: "text-slate-300 hover:bg-slate-800 hover:text-white",
        card: "bg-slate-900 border border-slate-800",
        row: "border-slate-800",
        heading: "text-white",
        muted: "text-slate-300",
        subtle: "text-slate-400",
        tile: "bg-slate-800 text-sky-300",
        tileAlert: "bg-rose-950 text-rose-300",
        hero: "bg-slate-900 border border-slate-800 text-white",
        heroChip: "bg-slate-800 text-slate-200",
        avatar: "bg-sky-600 text-white",
        userBox: "bg-slate-800/60 border border-slate-800",
        divider: "border-slate-800",
        link: "bg-slate-800 text-sky-200 hover:bg-slate-700",
        logout: "border border-rose-500/60 text-rose-300 hover:bg-rose-950/50 font-semibold",
        actionHover: "hover:bg-slate-800/70",
        brand: "bg-sky-600 text-white",
      }
    : {
        page: "bg-slate-50 text-slate-800",
        sidebar: "bg-white text-slate-700 border-b lg:border-b-0 lg:border-r border-slate-200",
        navActive: "bg-[#0F2A47] text-white font-semibold",
        navIdle: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        card: "bg-white border border-slate-200 shadow-sm",
        row: "border-slate-200",
        heading: "text-slate-900",
        muted: "text-slate-600",
        subtle: "text-slate-500",
        tile: "bg-slate-100 text-[#0F2A47]",
        tileAlert: "bg-rose-50 text-rose-700",
        hero: "bg-[#0F2A47] text-white",
        heroChip: "bg-white/15 text-white",
        avatar: "bg-[#0F2A47] text-white",
        userBox: "bg-slate-50 border border-slate-200",
        divider: "border-slate-200",
        link: "bg-slate-100 text-[#0F2A47] hover:bg-slate-200",
        logout: "border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold",
        actionHover: "hover:bg-slate-50 hover:border-slate-300",
        brand: "bg-[#0F2A47] text-white",
      };

  const focusRing = isHighContrast
    ? "outline-none focus-visible:ring-4 focus-visible:ring-white"
    : "outline-none focus-visible:ring-4 focus-visible:ring-sky-400";

  const getStatusStyles = (status) => {
    const s = (status || "pending").toLowerCase();
    if (isHighContrast) return { pill: "bg-yellow-400 text-black", dot: "bg-black" };
    if (["approved", "completed", "done", "resolved"].includes(s)) {
      return isDarkMode
        ? { pill: "bg-emerald-950 text-emerald-300", dot: "bg-emerald-400" }
        : { pill: "bg-emerald-50 text-emerald-800 border border-emerald-200", dot: "bg-emerald-600" };
    }
    if (["rejected", "declined", "cancelled"].includes(s)) {
      return isDarkMode
        ? { pill: "bg-rose-950 text-rose-300", dot: "bg-rose-400" }
        : { pill: "bg-rose-50 text-rose-800 border border-rose-200", dot: "bg-rose-600" };
    }
    return isDarkMode
      ? { pill: "bg-amber-950 text-amber-300", dot: "bg-amber-400" }
      : { pill: "bg-amber-50 text-amber-800 border border-amber-200", dot: "bg-amber-600" };
  };

  // Naka-group ang sidebar para magkakasama ang magkakaugnay na pages
  

  const quickActions = [
    { label: "Request Service", path: "/requests", icon: "file", danger: false },
    { label: "Emergency Alert", path: "/emergency", icon: "alert", danger: true },
    { label: "My QR Code", path: "/qr-code", icon: "qr", danger: false },
    { label: "My Profile", path: "/profile", icon: "user", danger: false },
    { label: "Announcements", path: "/announcements", icon: "bell", danger: false },
  ];

  const stats = [
    { label: "Total Requests", value: totalRequests, icon: "file" },
    { label: "Pending Requests", value: pendingRequests, icon: "clock" },
    { label: "Active Alerts", value: receivedAlerts.length, icon: "bell" },
  ];

  return (
    <UserLayout user={user} title="Dashboard" fontSize={fontSize} setFontSize={setFontSize} themeMode={themeMode} setThemeMode={setThemeMode} isDyslexicFont={isDyslexicFont} setIsDyslexicFont={setIsDyslexicFont}>
      
      {/* SIDEBAR */}
      

      {/* MAIN CONTENT */}
      
        

        {/* Welcome Banner */}
        <div className={`rounded-2xl p-7 sm:p-8 mb-8 flex flex-wrap items-center justify-between gap-4 ${t.hero}`}>
          <div>
            <h2 className="text-[1.7em] font-bold leading-tight">Welcome, {displayName}!</h2>
            <p className="text-[0.95em] opacity-80 mt-1.5">Here is a summary of your account.</p>
          </div>
          <span className={`px-4 py-2 rounded-lg text-[0.9em] font-semibold ${t.heroChip}`}>
            PWD ID: {user.pwd_id || "N/A"}
          </span>
        </div>

        {/* Counter Cards */}
        <section aria-label="Summary" className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          {stats.map((s) => (
            <div key={s.label} className={`p-6 rounded-2xl ${t.card}`}>
              <div className="flex items-center justify-between mb-5">
                <div className={`text-[0.95em] font-semibold ${t.muted}`}>{s.label}</div>
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${t.tile}`}>
                  <Icon name={s.icon} className="w-6 h-6" />
                </div>
              </div>
              <div className={`text-[3em] leading-none font-bold tabular-nums ${t.heading}`}>
                {s.value}
              </div>
            </div>
          ))}
        </section>

        {/* Quick Actions */}
        <section aria-label="Quick Actions" className="mb-10">
          <h3 className={`text-[1.25em] font-bold mb-4 ${t.heading}`}>
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {quickActions.map((a) => (
              <button
                key={a.path}
                onClick={() => navigate(a.path)}
                className={`p-5 min-h-24 rounded-2xl text-left transition cursor-pointer flex items-center gap-4 ${t.card} ${t.actionHover} ${focusRing}`}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${a.danger ? t.tileAlert : t.tile}`}>
                  <Icon name={a.icon} className="w-6 h-6" />
                </div>
                <div className={`font-semibold text-[1em] flex-1 ${t.heading}`}>{a.label}</div>
                <Icon name="chevron" className={`w-5 h-5 shrink-0 ${t.subtle}`} />
              </button>
            ))}
          </div>
        </section>

        {/* Recent Service Requests Preview */}
        <section aria-label="My Service Requests" className={`rounded-2xl ${t.card}`}>
          <div className={`flex justify-between items-center gap-4 px-6 sm:px-8 py-5 border-b ${t.divider}`}>
            <h3 className={`text-[1.25em] font-bold ${t.heading}`}>
              My Service Requests
            </h3>
            <button
              onClick={() => navigate("/requests")}
              className={`text-[0.9em] font-semibold cursor-pointer px-5 py-2.5 min-h-11 rounded-lg transition ${focusRing} ${t.link}`}
            >
              View All
            </button>
          </div>

          <div>
            {requests.length === 0 ? (
              <div className="py-14 text-center flex flex-col items-center">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${t.tile}`}>
                  <Icon name="inbox" className="w-7 h-7" />
                </div>
                <p className={`text-[1em] font-medium ${t.muted}`}>
                  No service requests found.
                </p>
              </div>
            ) : (
              requests.slice(0, 2).map((req, index) => {
                const status = getStatusStyles(req.status);
                return (
                  <div
                    key={req.req_id || req.id || Math.random()}
                    className={`flex flex-wrap items-center justify-between gap-3 px-6 sm:px-8 py-5 ${index > 0 ? `border-t ${t.row}` : ""}`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-11 h-11 shrink-0 rounded-lg flex items-center justify-center ${t.tile}`}>
                        <Icon name="clock" className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className={`font-semibold text-[1em] ${t.heading}`}>
                          {req.service_type}
                        </h4>
                        <p className={`text-[0.9em] truncate max-w-md ${t.muted}`}>
                          {req.description}
                        </p>
                        <p className={`text-[0.8em] mt-0.5 ${t.subtle}`}>
                          {req.created_at ? new Date(req.created_at).toLocaleDateString() : ""}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-2 text-[0.8em] px-3 py-1.5 rounded-full font-semibold ${status.pill}`}>
                      <span className={`w-2 h-2 rounded-full ${status.dot}`} aria-hidden="true" />
                      {req.status || "Pending"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>
      
    </UserLayout>
  );
}
