import RequestTrackingPanel from '../components/RequestTrackingPanel';
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
  plus: <path d="M12 5v14M5 12h14" />,
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


export default function ServiceReq({
  fontSize = "text-base",
  setFontSize = () => {},
  themeMode = "light",
  setThemeMode = () => {},
  isDyslexicFont = false,
  setIsDyslexicFont = () => {},
}) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  // State para sa Modal at Form Inputs
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [serviceType, setServiceType] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // List ng Service Requests ng Naka-login na User
  const [requests, setRequests] = useState([]);

  // States para sa Center Modal Notification (10 seconds lock, audio, at tts)
  useEffect(() => {
    const savedSession = localStorage.getItem("userSession");
    if (!savedSession) {
      navigate("/");
      return;
    }

    const userData = JSON.parse(savedSession);
    setUser(userData);

    const pwdId = userData.pwd_id;
    if (!pwdId) return;

    const fetchUserRequests = async () => {
      try {
        const response = await fetch(`${PORTAL_API}/service-requests/${encodeURIComponent(pwdId)}`, {headers:{Authorization: "Bearer " + localStorage.getItem("portalToken")}});
        if (response.ok) {
          const data = await response.json();
          setRequests(data.requests || []);
        }
      } catch (err) {
        console.error("Error fetching requests:", err);
      }
    };

    fetchUserRequests();
  }, [navigate]);

  // Background Polling para sa Live Received Alerts (Bawat 5 segundo - kapareho ng ibang pages)


  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!serviceType || !description) {
      alert("Please select a service type and enter a description.");
      return;
    }

    setIsSubmitting(true);

    const pwdId = user?.pwd_id;
    const newRequestData = {
      pwd_id: pwdId,
      service_type: serviceType,
      description: description,
    };

    try {
      const response = await fetch(PORTAL_API+"/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + localStorage.getItem("portalToken") },
        body: JSON.stringify(newRequestData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const res = await fetch(`${PORTAL_API}/service-requests/${encodeURIComponent(pwdId)}`, {headers:{Authorization: "Bearer " + localStorage.getItem("portalToken")}});
        if (res.ok) {
          const resultData = await res.json();
          setRequests(resultData.requests || []);
        }
        setIsModalOpen(false);
        setServiceType("");
        setDescription("");
      } else {
        alert(data.message || "Failed to submit request.");
      }
    } catch (err) {
      console.error("Error submitting request:", err);
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

  

  /* THEME TOKENS (light / dark / high contrast) - kapareho ng Dashboard */
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
        avatar: "bg-yellow-400 text-black",
        userBox: "border border-yellow-400/50",
        divider: "border-yellow-400/40",
        primary: "bg-yellow-400 text-black hover:bg-yellow-300 font-bold",
        outline: "border-2 border-yellow-400 text-yellow-300 hover:bg-zinc-900",
        input: "bg-black border-2 border-yellow-400 text-yellow-300 placeholder:text-yellow-500/60 focus:ring-4 focus:ring-white",
        logout: "bg-yellow-400 text-black hover:bg-yellow-300 font-bold",
        brand: "bg-yellow-400 text-black",
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
        avatar: "bg-sky-600 text-white",
        userBox: "bg-slate-800/60 border border-slate-800",
        divider: "border-slate-800",
        primary: "bg-sky-600 text-white hover:bg-sky-500 font-semibold",
        outline: "border border-slate-600 text-slate-200 hover:bg-slate-800",
        input: "bg-slate-800 border border-slate-600 text-slate-100 placeholder:text-slate-500 focus:ring-4 focus:ring-sky-400/40 focus:border-sky-500",
        logout: "border border-rose-500/60 text-rose-300 hover:bg-rose-950/50 font-semibold",
        brand: "bg-sky-600 text-white",
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
        avatar: "bg-[#0F2A47] text-white",
        userBox: "bg-slate-50 border border-slate-200",
        divider: "border-slate-200",
        primary: "bg-[#0F2A47] text-white hover:bg-[#173b63] font-semibold",
        outline: "border border-slate-300 text-slate-700 hover:bg-slate-50",
        input: "bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-4 focus:ring-sky-400/40 focus:border-sky-600",
        logout: "border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold",
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
  

  return (
    <UserLayout user={user} title="Service Requests" fontSize={fontSize} setFontSize={setFontSize} themeMode={themeMode} setThemeMode={setThemeMode} isDyslexicFont={isDyslexicFont} setIsDyslexicFont={setIsDyslexicFont}>
      {/* 1. SIDEBAR */}
      

      {/* 2. MAIN CONTENT AREA */}
      
        {/* Top Header with Accessibility Dropdown */}
        

        {/* Subtitle and New Request Button */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <p className={`text-[1em] font-medium ${t.muted}`}>
            Apply for and track your service requests
          </p>

          <button
            onClick={() => setIsModalOpen(true)}
            className={`px-5 py-3 min-h-12 rounded-lg text-[0.95em] transition flex items-center gap-2.5 cursor-pointer ${focusRing} ${t.primary}`}
          >
            <Icon name="plus" className="w-5 h-5" /> New Request
          </button>
        </div>

        {/* Request Cards Container */}
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className={`rounded-2xl py-14 px-8 text-center flex flex-col items-center ${t.card}`}>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${t.tile}`}>
                <Icon name="inbox" className="w-7 h-7" />
              </div>
              <p className={`text-[1em] font-medium ${t.muted}`}>
                No service requests submitted yet.
              </p>
            </div>
          ) : (
            requests.map((req) => {
              const status = getStatusStyles(req.status);
              return (
                <div
                  key={req.id || req.req_id}
                  className={`p-6 rounded-2xl flex flex-wrap items-start justify-between gap-4 transition ${t.card}`}
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${t.tile}`}>
                      <Icon name="clock" className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className={`font-semibold text-[1.05em] ${t.heading}`}>
                        {req.service_type}
                      </h3>
                      <p className={`text-[0.95em] mt-1 leading-relaxed ${t.muted}`}>
                        {req.description}
                      </p>
                      <p className={`text-[0.8em] mt-3 font-medium ${t.subtle}`}>
                        Submitted: {req.created_at ? new Date(req.created_at).toLocaleString('en-PH',{timeZone:'Asia/Manila'}) : "Recently"}
                      </p>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-2 text-[0.8em] px-3 py-1.5 rounded-full font-semibold shrink-0 ${status.pill}`}>
                    <span className={`w-2 h-2 rounded-full ${status.dot}`} aria-hidden="true" />
                    {req.status || "Pending"}
                  </span><div className="w-full"><RequestTrackingPanel resource="service" id={req.id || req.req_id} themeMode={themeMode}/></div>
                </div>
              );
            })
          )}
        </div>
      

      {/* 3. NEW SERVICE REQUEST MODAL */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-request-title"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
        >
          <div className={`rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-2xl ${t.modal}`}>
            <h3 id="new-request-title" className={`text-[1.4em] font-bold mb-1 ${t.heading}`}>
              New Service Request
            </h3>
            <p className={`text-[0.9em] mb-6 ${t.subtle}`}>
              Apply for and track your service requests
            </p>

            <form onSubmit={handleSubmitRequest} className="space-y-5">
              {/* Select Service Type Dropdown */}
              <div>
                <label htmlFor="service-type" className={`block text-[0.9em] font-semibold mb-2 ${t.heading}`}>
                  Service Type
                </label>
                <select
                  id="service-type"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className={`w-full px-4 py-3 min-h-12 rounded-lg text-[0.95em] outline-none transition ${t.input}`}
                  required
                >
                  <option value="" disabled>
                    Select a service type
                  </option>
                  <option value="Medical Assistance">Medical Assistance</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Financial Assistance">Financial Assistance</option>
                  <option value="Educational Support">Educational Support</option>
                  <option value="Employment Assistance">Employment Assistance</option>
                  <option value="Counseling Services">Counseling Services</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Description Textarea */}
              <div>
                <label htmlFor="request-description" className={`block text-[0.9em] font-semibold mb-2 ${t.heading}`}>
                  Description
                </label>
                <textarea
                  id="request-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your service request in detail..."
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
                  className={`flex-1 py-3 min-h-12 rounded-lg text-[0.95em] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${focusRing} ${t.primary}`}
                >
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </UserLayout>
  );
}
