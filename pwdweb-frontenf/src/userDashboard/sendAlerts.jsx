import RequestTrackingPanel from '../components/RequestTrackingPanel';
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
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
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


export default function SendAlerts({
  fontSize = "text-base",
  setFontSize = () => {},
  themeMode = "light",
  setThemeMode = () => {},
  isDyslexicFont = false,
  setIsDyslexicFont = () => {},
}) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alertType, setAlertType] = useState("");
  const [message, setMessage] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Alerts list
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const savedSession = localStorage.getItem("userSession");
    if (!savedSession) {
      navigate("/");
      return;
    }

    const userData = JSON.parse(savedSession);
    setUser(userData);

    const pwdId = userData.pwd_id;
    if (pwdId) {
      fetchUserAlerts(pwdId);
    }
  }, [navigate]);

  const fetchUserAlerts = async (pwdId) => {
    try {
      // Direktang tinatawagan ang port 5000 gaya ng sa service requests
      const response = await fetch(`${PORTAL_API}/emergency/${encodeURIComponent(pwdId)}`,{headers:{Authorization:"Bearer "+localStorage.getItem("portalToken")}});
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      } else {
        setAlerts([]);
      }
    } catch (err) {
      console.error("Error fetching emergency alerts:", err);
      setAlerts([]);
    }
  };

  const handleSendAlert = async (e) => {
    e.preventDefault();
    if (!alertType || !message) {
      alert("Please select an alert type and enter a message.");
      return;
    }

    setIsSubmitting(true);

    const pwdId = user?.pwd_id;
    const newAlertData = {
      pwd_id: pwdId,
      alert_type: alertType,
      emergency_type: alertType,
      message: message,
      details: message,
      location: location || "Not specified",
    };

    try {
      // Ginaya ang eksaktong istilo ng service request POST URL na may http://localhost:5000
      const response = await fetch(PORTAL_API+"/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json",Authorization:"Bearer "+localStorage.getItem("portalToken") },
        body: JSON.stringify(newAlertData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        fetchUserAlerts(pwdId);
        setIsModalOpen(false);
        setAlertType("");
        setMessage("");
        setLocation("");
      } else {
        alert(data.message || "Failed to send emergency alert.");
      }
    } catch (err) {
      console.error("Error sending alert:", err);
      alert("Server connection error.");
    } finally {
      setIsSubmitting(false);
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

  

  /* THEME TOKENS (light / dark / high contrast) - kapareho ng ibang pages */
  const t = isHighContrast
    ? {
        page: "bg-black text-yellow-300",
        sidebar: "bg-black text-yellow-300 border-b-2 lg:border-b-0 lg:border-r-2 border-yellow-400",
        navActive: "bg-yellow-400 text-black font-bold",
        navIdle: "text-yellow-300 hover:bg-zinc-900",
        card: "bg-black border-2 border-yellow-400",
        modal: "bg-black text-yellow-300 border-2 border-yellow-400",
        heading: "text-yellow-400",
        muted: "text-yellow-200",
        subtle: "text-yellow-200/80",
        tile: "bg-yellow-400 text-black",
        tileAlert: "bg-yellow-400 text-black",
        avatar: "bg-yellow-400 text-black",
        userBox: "border border-yellow-400/50",
        divider: "border-yellow-400/40",
        danger: "bg-yellow-400 text-black hover:bg-yellow-300 font-bold",
        outline: "border-2 border-yellow-400 text-yellow-300 hover:bg-zinc-900",
        input: "bg-black border-2 border-yellow-400 text-yellow-300 placeholder:text-yellow-500/60 focus:ring-4 focus:ring-white",
        logout: "bg-yellow-400 text-black hover:bg-yellow-300 font-bold",
        brand: "bg-yellow-400 text-black",
        statusPill: "bg-yellow-400 text-black",
        statusDot: "bg-black",
        location: "text-yellow-300",
      }
    : isDarkMode
    ? {
        page: "bg-slate-950 text-slate-100",
        sidebar: "bg-slate-900 text-slate-100 border-b lg:border-b-0 lg:border-r border-slate-800",
        navActive: "bg-sky-600 text-white font-semibold",
        navIdle: "text-slate-300 hover:bg-slate-800 hover:text-white",
        card: "bg-slate-900 border border-slate-800",
        modal: "bg-slate-900 text-slate-100 border border-slate-700",
        heading: "text-white",
        muted: "text-slate-300",
        subtle: "text-slate-400",
        tile: "bg-slate-800 text-sky-300",
        tileAlert: "bg-rose-950 text-rose-300",
        avatar: "bg-sky-600 text-white",
        userBox: "bg-slate-800/60 border border-slate-800",
        divider: "border-slate-800",
        danger: "bg-rose-600 text-white hover:bg-rose-500 font-semibold",
        outline: "border border-slate-600 text-slate-200 hover:bg-slate-800",
        input: "bg-slate-800 border border-slate-600 text-slate-100 placeholder:text-slate-500 focus:ring-4 focus:ring-sky-400/40 focus:border-sky-500",
        logout: "border border-rose-500/60 text-rose-300 hover:bg-rose-950/50 font-semibold",
        brand: "bg-sky-600 text-white",
        statusPill: "bg-rose-950 text-rose-300",
        statusDot: "bg-rose-400",
        location: "text-sky-300",
      }
    : {
        page: "bg-slate-50 text-slate-800",
        sidebar: "bg-white text-slate-700 border-b lg:border-b-0 lg:border-r border-slate-200",
        navActive: "bg-[#0F2A47] text-white font-semibold",
        navIdle: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        card: "bg-white border border-slate-200 shadow-sm",
        modal: "bg-white text-slate-800 border border-slate-200",
        heading: "text-slate-900",
        muted: "text-slate-600",
        subtle: "text-slate-500",
        tile: "bg-slate-100 text-[#0F2A47]",
        tileAlert: "bg-rose-50 text-rose-700",
        avatar: "bg-[#0F2A47] text-white",
        userBox: "bg-slate-50 border border-slate-200",
        divider: "border-slate-200",
        danger: "bg-rose-700 text-white hover:bg-rose-800 font-semibold",
        outline: "border border-slate-300 text-slate-700 hover:bg-slate-50",
        input: "bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-4 focus:ring-sky-400/40 focus:border-sky-600",
        logout: "border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold",
        brand: "bg-[#0F2A47] text-white",
        statusPill: "bg-rose-50 text-rose-800 border border-rose-200",
        statusDot: "bg-rose-600",
        location: "text-[#0F2A47]",
      };

  const focusRing = isHighContrast
    ? "outline-none focus-visible:ring-4 focus-visible:ring-white"
    : "outline-none focus-visible:ring-4 focus-visible:ring-sky-400";

  // Naka-group ang sidebar para magkakasama ang magkakaugnay na pages
  

  return (
    <UserLayout user={user} title="Emergency Alerts" fontSize={fontSize} setFontSize={setFontSize} themeMode={themeMode} setThemeMode={setThemeMode} isDyslexicFont={isDyslexicFont} setIsDyslexicFont={setIsDyslexicFont}>
      {/* 1. SIDEBAR */}
      

      {/* 2. MAIN CONTENT AREA */}
      
        {/* Top Header with Accessibility Dropdown */}
        

        {/* Subtitle and Send New Alert Button */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <p className={`text-[1em] font-medium ${t.muted}`}>
            Broadcast urgent safety or medical emergency notifications
          </p>

          <button
            onClick={() => setIsModalOpen(true)}
            className={`px-5 py-3 min-h-12 rounded-lg text-[0.95em] transition flex items-center gap-2.5 cursor-pointer ${focusRing} ${t.danger}`}
          >
            <Icon name="alert" className="w-5 h-5" /> Send Emergency Alert
          </button>
        </div>

        {/* Alert Cards Container */}
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className={`rounded-2xl py-14 px-8 text-center flex flex-col items-center ${t.card}`}>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${t.tile}`}>
                <Icon name="inbox" className="w-7 h-7" />
              </div>
              <p className={`text-[1em] font-medium ${t.muted}`}>
                No emergency alerts sent yet.
              </p>
            </div>
          ) : (
            alerts.map((item) => (
              <div
                key={item.id || item.alert_id}
                className={`p-6 rounded-2xl flex flex-wrap items-start justify-between gap-4 transition ${t.card}`}
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${t.tileAlert}`}>
                    <Icon name="alert" className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className={`font-semibold text-[1.05em] ${t.heading}`}>
                      {item.alert_type}
                    </h3>
                    <p className={`text-[0.95em] mt-1 leading-relaxed ${t.muted}`}>
                      {item.message}
                    </p>
                    <p className={`text-[0.9em] mt-3 font-semibold flex items-center gap-2 ${t.location}`}>
                      <Icon name="pin" className="w-4 h-4 shrink-0" />
                      <span>Location: {item.location || "Not specified"}</span>
                    </p>
                    <p className={`text-[0.8em] mt-1.5 font-medium flex items-center gap-2 ${t.subtle}`}>
                      <Icon name="clock" className="w-4 h-4 shrink-0" />
                      <span>Sent: {item.created_at ? new Date(item.created_at).toLocaleString() : "Recently"}</span>
                    </p>
                  </div>
                </div>

                <span className={`inline-flex items-center gap-2 text-[0.8em] px-3 py-1.5 rounded-full font-semibold shrink-0 ${t.statusPill}`}>
                  <span className={`w-2 h-2 rounded-full ${t.statusDot}`} aria-hidden="true" />
                  {item.status || "Broadcasted"}
                </span>
                <RequestTrackingPanel resource="emergency" id={item.id || item.alert_id} themeMode={themeMode}/>
              </div>
            ))
          )}
        </div>
      

      {/* 3. SEND EMERGENCY ALERT MODAL */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="send-alert-title"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
        >
          <div className={`rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-2xl max-h-[95vh] overflow-y-auto ${t.modal}`}>
            <div className="flex items-center gap-3.5 mb-1">
              <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${t.tileAlert}`}>
                <Icon name="alert" className="w-6 h-6" />
              </div>
              <h3 id="send-alert-title" className={`text-[1.4em] font-bold ${t.heading}`}>
                Send Emergency Alert
              </h3>
            </div>
            <p className={`text-[0.9em] mb-6 ${t.subtle}`}>
              Broadcast urgent safety or medical emergency notifications
            </p>

            <form onSubmit={handleSendAlert} className="space-y-5">
              {/* Select Alert Type Dropdown */}
              <div>
                <label htmlFor="alert-type" className={`block text-[0.9em] font-semibold mb-2 ${t.heading}`}>
                  Alert Type
                </label>
                <select
                  id="alert-type"
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value)}
                  className={`w-full px-4 py-3 min-h-12 rounded-lg text-[0.95em] outline-none transition ${t.input}`}
                  required
                >
                  <option value="" disabled>
                    Select emergency type
                  </option>
                  <option value="Medical Emergency">Medical Emergency</option>
                  <option value="Physical Danger / Security">Physical Danger / Security</option>
                  <option value="Natural Disaster Hazard">Natural Disaster Hazard</option>
                  <option value="Accident / Injury">Accident / Injury</option>
                  <option value="Other Urgent Assistance">Other Urgent Assistance</option>
                </select>
              </div>

              {/* Location Input */}
              <div>
                <label htmlFor="alert-location" className={`block text-[0.9em] font-semibold mb-2 ${t.heading}`}>
                  Current Location / Address
                </label>
                <input
                  id="alert-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Barangay Hall, Purok 3..."
                  className={`w-full px-4 py-3 min-h-12 rounded-lg text-[0.95em] outline-none transition ${t.input}`}
                />
              </div>

              {/* Message Textarea */}
              <div>
                <label htmlFor="alert-message" className={`block text-[0.9em] font-semibold mb-2 ${t.heading}`}>
                  Message / Details
                </label>
                <textarea
                  id="alert-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your emergency situation clearly..."
                  rows={4}
                  className={`w-full px-4 py-3 rounded-lg text-[0.95em] outline-none transition resize-none leading-relaxed ${t.input}`}
                  required
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`flex-1 py-3 min-h-12 rounded-lg text-[0.95em] font-semibold transition cursor-pointer ${focusRing} ${t.outline}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 py-3 min-h-12 rounded-lg text-[0.95em] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${focusRing} ${t.danger}`}
                >
                  {isSubmitting ? "Sending..." : "Broadcast Alert"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </UserLayout>
  );
}
