import {PORTAL_API} from '../components/portalApi';
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
  access: (
    <>
      <circle cx="12" cy="4.5" r="1.8" />
      <path d="M5 8.5l7 1.5 7-1.5M12 10v5M9 21l3-6 3 6" />
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
  speaker: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9z" />
      <path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
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


export default function ReceivedAlerts({
  fontSize = "text-base",
  setFontSize = () => {},
  themeMode = "light",
  setThemeMode = () => {},
  isDyslexicFont = false,
  setIsDyslexicFont = () => {},
}) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [receivedAlerts, setReceivedAlerts] = useState([]);
  const [sentAlerts, setSentAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State para sa pop-up banner kapag may bagong alert


  // 🔊 Text-to-Speech Function (Set to English)
  const speakAlert = (title, message) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); 
      const textToSpeak = `Alert: ${title}. Details: ${message}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'en-US'; 
      utterance.rate = 0.9; 
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Text-to-Speech is not supported by your browser.");
    }
  };

  // Web Audio API para sa tunog
  useEffect(() => {
    const savedSession = localStorage.getItem("userSession");
    if (!savedSession) {
      navigate("/");
      return;
    }

    try {
      const userData = JSON.parse(savedSession);
      setUser(userData);
    } catch (e) {
        console.error("Failed to parse session:", e);
      localStorage.removeItem("userSession");
      navigate("/");
      return;
    }

    const fetchAllAlerts = async (isInitial = false) => {
      try {
        // Isang tawag na lang sa endpoint na nagbibigay ng received at sent alerts nang sabay
        const res = await fetch(`${PORTAL_API}/received-alerts`,{headers:{Authorization:'Bearer '+(localStorage.getItem('portalToken')||'')}});
        const data = await res.json();
        
        if (data.success) {
          const fetchedReceived = data.alerts || [];
          
          setReceivedAlerts(fetchedReceived);
          setSentAlerts(data.sentAlerts || []); // Nakukuha na rito ang sent alerts pati count sa .length
        }
      } catch (error) {
        console.error("Error fetching alerts history:", error);
      } finally {
        if (isInitial) setLoading(false);
      }
    };

    fetchAllAlerts(true);

    const intervalId = setInterval(() => {
      fetchAllAlerts(false);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [navigate]);

  

  const isHighContrast = themeMode === "contrast";
  const isDarkMode = themeMode === "dark";

  if (!user) {
    return null;
  }

  const displayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.middle_name ? user.middle_name + " " : ""}${user.last_name}`
    : user.acc_username || "Maria Santos";

  /* THEME TOKENS (light / dark / high contrast) - kapareho ng ibang user pages */
  const t = isHighContrast
    ? {
        page: "bg-black text-yellow-300",
        sidebar: "bg-black text-yellow-300 border-b-2 lg:border-b-0 lg:border-r-2 border-yellow-400",
        navActive: "bg-yellow-400 text-black font-bold",
        navIdle: "text-yellow-300 hover:bg-zinc-900",
        card: "bg-black border-2 border-yellow-400",
        toast: "bg-black text-yellow-300 border-2 border-yellow-400",
        heading: "text-yellow-400",
        muted: "text-yellow-200",
        subtle: "text-yellow-200/80",
        tile: "bg-yellow-400 text-black",
        tileAlert: "bg-yellow-400 text-black",
        avatar: "bg-yellow-400 text-black",
        userBox: "border border-yellow-400/50",
        divider: "border-yellow-400/40",
        outline: "border-2 border-yellow-400 text-yellow-300 hover:bg-zinc-900",
        speakBtn: "bg-yellow-400 text-black hover:bg-yellow-300 font-bold",
        logout: "bg-yellow-400 text-black hover:bg-yellow-300 font-bold",
        brand: "bg-yellow-400 text-black",
        typeReceived: "bg-yellow-400 text-black",
        typeSent: "bg-yellow-400 text-black",
        priorityHigh: "bg-yellow-400 text-black",
        priorityNormal: "bg-yellow-400 text-black",
        closeBtn: "border border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black",
      }
    : isDarkMode
    ? {
        page: "bg-slate-950 text-slate-100",
        sidebar: "bg-slate-900 text-slate-100 border-b lg:border-b-0 lg:border-r border-slate-800",
        navActive: "bg-sky-600 text-white font-semibold",
        navIdle: "text-slate-300 hover:bg-slate-800 hover:text-white",
        card: "bg-slate-900 border border-slate-800",
        toast: "bg-slate-900 text-slate-100 border border-slate-700",
        heading: "text-white",
        muted: "text-slate-300",
        subtle: "text-slate-400",
        tile: "bg-slate-800 text-sky-300",
        tileAlert: "bg-rose-950 text-rose-300",
        avatar: "bg-sky-600 text-white",
        userBox: "bg-slate-800/60 border border-slate-800",
        divider: "border-slate-800",
        outline: "border border-slate-600 text-slate-200 hover:bg-slate-800",
        speakBtn: "bg-sky-600 text-white hover:bg-sky-500 font-semibold",
        logout: "border border-rose-500/60 text-rose-300 hover:bg-rose-950/50 font-semibold",
        brand: "bg-sky-600 text-white",
        typeReceived: "bg-sky-950 text-sky-300",
        typeSent: "bg-rose-950 text-rose-300",
        priorityHigh: "bg-rose-950 text-rose-300",
        priorityNormal: "bg-slate-800 text-slate-300",
        closeBtn: "border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white",
      }
    : {
        page: "bg-slate-50 text-slate-800",
        sidebar: "bg-white text-slate-700 border-b lg:border-b-0 lg:border-r border-slate-200",
        navActive: "bg-[#0F2A47] text-white font-semibold",
        navIdle: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        card: "bg-white border border-slate-200 shadow-sm",
        toast: "bg-white text-slate-800 border border-slate-200",
        heading: "text-slate-900",
        muted: "text-slate-600",
        subtle: "text-slate-500",
        tile: "bg-slate-100 text-[#0F2A47]",
        tileAlert: "bg-rose-50 text-rose-700",
        avatar: "bg-[#0F2A47] text-white",
        userBox: "bg-slate-50 border border-slate-200",
        divider: "border-slate-200",
        outline: "border border-slate-300 text-slate-700 hover:bg-slate-50",
        speakBtn: "bg-[#0F2A47] text-white hover:bg-[#173b63] font-semibold",
        logout: "border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold",
        brand: "bg-[#0F2A47] text-white",
        typeReceived: "bg-sky-50 text-sky-900 border border-sky-200",
        typeSent: "bg-rose-50 text-rose-800 border border-rose-200",
        priorityHigh: "bg-rose-50 text-rose-800 border border-rose-200",
        priorityNormal: "bg-slate-100 text-slate-700 border border-slate-200",
        closeBtn: "border border-slate-200 text-slate-500 hover:bg-slate-100",
      };

  const focusRing = isHighContrast
    ? "outline-none focus-visible:ring-4 focus-visible:ring-white"
    : "outline-none focus-visible:ring-4 focus-visible:ring-sky-400";

  // Naka-group ang sidebar para magkakasama ang magkakaugnay na pages
  

  // Combine and sort all alerts by date/id descending for the full history view
  const allAlertsCombined = [
    ...sentAlerts.map(a => ({ ...a, type: 'Sent' })),
    ...receivedAlerts.map(a => ({ ...a, type: 'Received' }))
  ].sort((a, b) => new Date(b.created_at || b.date || 0) - new Date(a.created_at || a.date || 0));

  const stats = [
    { label: "Alerts Sent", value: sentAlerts.length, icon: "alert", alertTone: true },
    { label: "Alerts Received", value: receivedAlerts.length, icon: "bell", alertTone: false },
  ];

  return (
    <UserLayout user={user} title="Received Alerts" fontSize={fontSize} setFontSize={setFontSize} themeMode={themeMode} setThemeMode={setThemeMode} isDyslexicFont={isDyslexicFont} setIsDyslexicFont={setIsDyslexicFont}>
      {/* 🔔 LIVE NOTIFICATION POPUP BANNER */}


      {/* SIDEBAR */}
      

      {/* MAIN CONTENT AREA */}
      
        {/* Top Header */}
        

        {/* Section Title & Subtitle (Alert History Style) */}
        <div className="mb-6">
          <h2 className={`text-[1.4em] font-bold ${t.heading}`}>
            Alert History
          </h2>
          <p className={`text-[1em] font-medium mt-1 ${t.muted}`}>
            View all emergency alerts - sent and received (Real-time live updates active)
          </p>
        </div>

        {/* Counters Grid (Alerts Sent vs Alerts Received) */}
        <section aria-label="Summary" className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          {stats.map((s) => (
            <div key={s.label} className={`p-6 rounded-2xl ${t.card}`}>
              <div className="flex items-center justify-between mb-5">
                <div className={`text-[0.95em] font-semibold ${t.muted}`}>{s.label}</div>
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${s.alertTone ? t.tileAlert : t.tile}`}>
                  <Icon name={s.icon} className="w-6 h-6" />
                </div>
              </div>
              <div className={`text-[3em] leading-none font-bold tabular-nums ${t.heading}`}>
                {s.value}
              </div>
            </div>
          ))}
        </section>

        {/* Alerts List */}
        <div className="space-y-4">
          {loading ? (
            <div className={`rounded-2xl py-14 px-8 text-center ${t.card}`}>
              <p className={`text-[1em] font-medium animate-pulse ${t.muted}`}>Loading alert history...</p>
            </div>
          ) : allAlertsCombined.length === 0 ? (
            <div className={`rounded-2xl py-14 px-8 text-center flex flex-col items-center ${t.card}`}>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${t.tile}`}>
                <Icon name="inbox" className="w-7 h-7" />
              </div>
              <p className={`text-[1em] font-medium ${t.muted}`}>
                No alert history found at this time.
              </p>
            </div>
          ) : (
            allAlertsCombined.map((alert, idx) => {
              const isHigh = alert.priority === "HIGH" || alert.priority === "URGENT" || alert.priority === "high";
              return (
                <div
                  key={alert.id || idx}
                  className={`p-6 rounded-2xl transition ${t.card}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
                        alert.type === 'Received' ? t.tile : t.tileAlert
                      }`}>
                        <Icon name={alert.type === 'Received' ? "bell" : "alert"} className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className={`font-semibold text-[1.1em] ${t.heading}`}>
                          {alert.title}
                        </h3>
                        <p className={`text-[0.9em] font-medium mt-0.5 ${t.subtle}`}>
                          {alert.category || (alert.type === 'Received' ? "Weather Alert" : "Emergency Broadcast")}
                        </p>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <span className={`text-[0.75em] px-3 py-1.5 rounded-full font-semibold ${
                        alert.type === 'Received' ? t.typeReceived : t.typeSent
                      }`}>
                        {alert.type}
                      </span>
                      <span className={`text-[0.75em] px-3 py-1.5 rounded-full font-semibold ${
                        isHigh ? t.priorityHigh : t.priorityNormal
                      }`}>
                        {alert.priority || "GENERAL"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 sm:pl-[3.75rem]">
                    <p className={`text-[0.95em] leading-relaxed ${t.muted}`}>
                      {alert.message}
                    </p>
                    
                    {/* Button para sa Text-to-Speech ng bawat alert */}
                    {alert.type === 'Received' && (
                      <div className="mt-4 flex items-center gap-3">
                        <button
                          onClick={() => speakAlert(alert.title, alert.message)}
                          className={`px-4 py-2.5 min-h-11 rounded-lg text-[0.85em] flex items-center gap-2 cursor-pointer transition ${focusRing} ${t.speakBtn}`}
                        >
                          <Icon name="speaker" className="w-5 h-5" /> Read Alert
                        </button>
                      </div>
                    )}
                    
                    <div className={`text-[0.8em] mt-4 pt-3 border-t flex flex-wrap items-center gap-x-4 gap-y-1 ${t.divider} ${t.subtle}`}>
                      <span>From: <strong className={t.heading}>{alert.sender || displayName}</strong></span>
                      <span aria-hidden="true">•</span>
                      <span>{alert.date || alert.created_at}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      
    </UserLayout>
  );
}
