import RequestTrackingPanel from '../components/RequestTrackingPanel';
import {PORTAL_API} from '../components/portalApi';
import StaffLayout from "../components/StaffLayout";
import { useState, useEffect } from "react";



/* SIMPLE LINE ICONS */
const ICONS = {
  chart: <path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M17 14a5 5 0 0 1 4.5 5" />
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
  megaphone: (
    <>
      <path d="M3 11v3a1 1 0 0 0 1 1h2l8 4V6L6 10H4a1 1 0 0 0-1 1z" />
      <path d="M18 9a4 4 0 0 1 0 6" />
    </>
  ),
  message: <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  report: (
    <>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="13" r="3.5" />
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
  access: (
    <>
      <circle cx="12" cy="4.5" r="1.8" />
      <path d="M5 8.5l7 1.5 7-1.5M12 10v5M9 21l3-6 3 6" />
    </>
  ),
  down: <path d="M6 9l6 6 6-6" />,
  up: <path d="M6 15l6-6 6 6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4-4" />
    </>
  ),
  check: <path d="M20 6L9 17l-5-5" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  send: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />,
  phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
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

/* ACCESSIBILITY DROPDOWN */


const API_EMERGENCY_URL = PORTAL_API+"/emergency-requests";
const API_BROADCAST_URL = PORTAL_API+"/broadcast-alerts";

export default function StaffEmergency({
  fontSize = "text-base",
  setFontSize = () => {},
  themeMode = "light",
  setThemeMode = () => {},
  isDyslexicFont = false,
  setIsDyslexicFont = () => {},
}) {


  const [user, setUser] = useState({ firstName: "", lastName: "", role: "Staff" });
  const [activeTab, setActiveTab] = useState("broadcast"); 
  

  // Broadcast Form State
  const [broadcastForm, setBroadcastForm] = useState({
    title: "",
    alert_type: "",
    priority: "GENERAL",
    message: ""
  });
  const [broadcastHistory, setBroadcastHistory] = useState([]);

  // Emergency Requests State
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionData = localStorage.getItem("userSession");
    if (sessionData) {
      try {
        const p = JSON.parse(sessionData);
        setUser({
          firstName: p.firstName || p.acc_username || "",
          lastName: p.lastName || "",
          role: p.role || "Staff",
        });
      } catch (err) {
        console.error("Failed to parse session", err);
      }
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resEmergency, resBroadcast] = await Promise.all([
        fetch(API_EMERGENCY_URL,{headers:{Authorization:"Bearer "+localStorage.getItem("portalToken")}}),
        fetch(API_BROADCAST_URL,{headers:{Authorization:"Bearer "+localStorage.getItem("portalToken")}})
      ]);
      const dataEmergency = await resEmergency.json();
      const dataBroadcast = await resBroadcast.json();

      if (dataEmergency.success) setRequests(dataEmergency.requests || []);
      if (dataBroadcast.success) setBroadcastHistory(dataBroadcast.broadcasts || []);
    } catch (err) {
      console.error("Error fetching emergency data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcastSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(API_BROADCAST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json",Authorization:"Bearer "+localStorage.getItem("portalToken") },
        body: JSON.stringify({
          ...broadcastForm,
          staff_name: `${user.firstName} ${user.lastName}`.trim() || "LGU Staff"
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("Broadcast alert sent successfully!");
        setBroadcastForm({ title: "", alert_type: "", priority: "GENERAL", message: "" });
        fetchData();
      } else {
        alert("Failed to send broadcast.");
      }
    } catch (err) {
      console.error("Error broadcasting alert:", err);
      alert("Server error when broadcasting.");
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_EMERGENCY_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert("Failed to update status.");
      }
    } catch (err) {
      console.error("Error updating emergency status:", err);
    }
  };

  

  

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === "All") return true;
    return (r.status || "Broadcasted").toLowerCase() === statusFilter.toLowerCase();
  });

  const countStatus = (st) => requests.filter((r) => (r.status || "Broadcasted").toLowerCase() === st.toLowerCase()).length;

  const isHighContrast = themeMode === "contrast";
  const isDarkMode = themeMode === "dark";

  const t = isHighContrast
    ? {
        page: "bg-black text-yellow-300",
        sidebar: "bg-black text-yellow-300 border-r-2 border-yellow-400",
        topbar: "bg-black border-b-2 border-yellow-400",
        navActive: "bg-yellow-400 text-black font-bold",
        navIdle: "text-yellow-300 hover:bg-zinc-900",
        card: "bg-black border-2 border-yellow-400",
        heading: "text-yellow-400",
        muted: "text-yellow-200",
        subtle: "text-yellow-200/80",
        tile: "bg-yellow-400 text-black",
        avatar: "bg-yellow-400 text-black",
        userBox: "border border-yellow-400/50",
        divider: "border-yellow-400/40",
        logout: "bg-yellow-400 text-black hover:bg-yellow-300 font-bold",
        iconBtn: "text-yellow-300 hover:bg-zinc-900",
        countPill: "bg-yellow-400 text-black",
        rolePill: "bg-yellow-400 text-black",
        input: "bg-zinc-900 border-2 border-yellow-400 text-yellow-200 placeholder:text-yellow-200/60",
        segIdle: "text-yellow-300 hover:bg-zinc-800",
        segActive: "bg-yellow-400 text-black",
      }
    : isDarkMode
    ? {
        page: "bg-slate-950 text-slate-100",
        sidebar: "bg-slate-900 text-slate-100 border-r border-slate-800",
        topbar: "bg-slate-900 border-b border-slate-800",
        navActive: "bg-sky-600 text-white font-semibold",
        navIdle: "text-slate-300 hover:bg-slate-800 hover:text-white",
        card: "bg-slate-900 border border-slate-800",
        heading: "text-white",
        muted: "text-slate-300",
        subtle: "text-slate-400",
        tile: "bg-slate-800 text-sky-300",
        avatar: "bg-sky-600 text-white",
        userBox: "bg-slate-800/60 border border-slate-800",
        divider: "border-slate-800",
        logout: "border border-rose-500/60 text-rose-300 hover:bg-rose-950/50 font-semibold",
        iconBtn: "text-slate-300 hover:bg-slate-800",
        countPill: "bg-rose-600 text-white",
        rolePill: "bg-slate-800 text-sky-300",
        input: "bg-slate-800 border border-slate-600 text-slate-100 placeholder:text-slate-400",
        segIdle: "text-slate-200 hover:bg-slate-700",
        segActive: "bg-sky-600 text-white",
      }
    : {
        page: "bg-slate-50 text-slate-800",
        sidebar: "bg-white text-slate-700 border-r border-slate-200",
        topbar: "bg-white border-b border-slate-200",
        navActive: "bg-[#0F2A47] text-white font-semibold",
        navIdle: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        card: "bg-white border border-slate-200 shadow-sm",
        heading: "text-slate-900",
        muted: "text-slate-600",
        subtle: "text-slate-500",
        tile: "bg-slate-100 text-[#0F2A47]",
        avatar: "bg-[#0F2A47] text-white",
        userBox: "bg-slate-50 border border-slate-200",
        divider: "border-slate-200",
        logout: "border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold",
        iconBtn: "text-slate-600 hover:bg-slate-100",
        countPill: "bg-rose-600 text-white",
        rolePill: "bg-slate-100 text-[#0F2A47] border border-slate-200",
        input: "bg-white border border-slate-300 text-slate-800 placeholder:text-slate-400",
        segIdle: "text-slate-700 hover:bg-slate-200",
        segActive: "bg-[#0F2A47] text-white",
      };

  const focusRing = isHighContrast ? "outline-none focus-visible:ring-4 focus-visible:ring-white" : "outline-none focus-visible:ring-4 focus-visible:ring-sky-400";

  

  

  return (
    <StaffLayout user={user} fontSize={fontSize} setFontSize={setFontSize} themeMode={themeMode} setThemeMode={setThemeMode} isDyslexicFont={isDyslexicFont} setIsDyslexicFont={setIsDyslexicFont}>
      

      {/* SIDEBAR */}
      

      {/* MAIN CONTENT */}
      
        

        <div className="space-y-6 w-full min-w-0">
          <div>
            <h1 className={`text-[1.6em] sm:text-[1.9em] font-bold tracking-tight ${t.heading}`}>Emergency Alerts</h1>
            <p className={`text-[1em] mt-1.5 ${t.muted}`}>Broadcast alerts and manage incoming SOS requests from PWD users</p>
          </div>

          {/* Navigation Tabs (Broadcast vs Requests) */}
          <div className="flex gap-3 border-b pb-4">
            <button
              onClick={() => setActiveTab("broadcast")}
              className={`px-6 py-2.5 rounded-xl font-semibold text-[0.95em] transition cursor-pointer ${
                activeTab === "broadcast" ? t.segActive : `border ${t.card}${t.segIdle}`
              }`}
            >
              📡 Broadcast Alert
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`relative px-6 py-2.5 rounded-xl font-semibold text-[0.95em] transition cursor-pointer ${
                activeTab === "requests" ? t.segActive : `border ${t.card}${t.segIdle}`
              }`}
            >
              🚨 User Emergency Requests
              {requests.filter((r) => (r.status || "Broadcasted") === "Broadcasted").length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[0.7em] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {requests.filter((r) => (r.status || "Broadcasted") === "Broadcasted").length}
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: BROADCAST ALERT */}
          {activeTab === "broadcast" && (
            <div className="space-y-6">
              <div className={`p-6 sm:p-8 rounded-2xl space-y-6 ${t.card}`}>
                <div>
                  <h3 className={`font-bold text-[1.2em] ${t.heading}`}>Broadcast Emergency Alert</h3>
                  <p className={`text-[0.9em] ${t.subtle}`}>Alert will be sent instantly to all PWD users</p>
                </div>

                <form onSubmit={handleBroadcastSubmit} className="space-y-4">
                  <div>
                    <label className={`block text-[0.9em] font-semibold mb-1.5 ${t.heading}`}>Alert Title</label>
                    <input
                      type="text"
                      placeholder="e.g., Typhoon Warning"
                      value={broadcastForm.title}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                      className={`w-full px-4 py-3 rounded-lg text-[0.95em] ${t.input} ${focusRing}`}
                      required
                    />
                  </div>
                  <div>
                    <label className={`block text-[0.9em] font-semibold mb-1.5 ${t.heading}`}>Alert Type / Category</label>
                    <input
                      type="text"
                      placeholder="e.g., Announcement, Weather Alert"
                      value={broadcastForm.alert_type}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, alert_type: e.target.value })}
                      className={`w-full px-4 py-3 rounded-lg text-[0.95em] ${t.input} ${focusRing}`}
                      required
                    />
                  </div>
                  <div>
                    <label className={`block text-[0.9em] font-semibold mb-1.5 ${t.heading}`}>Priority Level</label>
                    <select
                      value={broadcastForm.priority}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, priority: e.target.value })}
                      className={`w-full px-4 py-3 rounded-lg text-[0.95em] ${t.input} ${focusRing}`}
                    >
                      <option value="GENERAL">General</option>
                      <option value="URGENT">Urgent</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[0.9em] font-semibold mb-1.5 ${t.heading}`}>Message</label>
                    <textarea
                      rows="4"
                      placeholder="Enter alert message..."
                      value={broadcastForm.message}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                      className={`w-full px-4 py-3 rounded-lg text-[0.95em] ${t.input} ${focusRing}`}
                      required
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[1em] transition cursor-pointer shadow-md"
                  >
                    <Icon name="send" className="w-5 h-5" /> Send Alert to All PWD Users
                  </button>
                </form>
              </div>

              {/* Broadcast History */}
              <div className={`p-6 rounded-2xl space-y-4 ${t.card}`}>
                <h3 className={`font-bold text-[1.15em] ${t.heading}`}>Broadcast History</h3>
                {broadcastHistory.length > 0 ? (
                  broadcastHistory.map((item) => (
                    <div key={item.id} className={`p-4 rounded-xl border space-y-2 ${t.divider}`}>
                      <div className="flex justify-between items-center">
                        <span className={`font-bold text-[1.05em] ${t.heading}`}>{item.title}</span>
                        <span className="text-[0.75em] px-2.5 py-1 rounded-full font-bold uppercase bg-amber-100 text-amber-800">
                          {item.priority || "GENERAL"}
                        </span>
                      </div>
                      <p className={`text-[0.85em] ${t.subtle}`}>{item.category}</p>
                      <p className={`text-[0.95em] ${t.muted}`}>{item.message}</p>
                      <p className={`text-[0.75em] ${t.subtle}`}>By: {item.sender || 'LGU Staff'} • {new Date(item.created_at).toLocaleString('en-PH',{timeZone:'Asia/Manila'})}</p>
                    </div>
                  ))
                ) : (
                  <p className={`text-[0.9em] ${t.subtle}`}>No broadcast history yet.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: USER EMERGENCY REQUESTS */}
          {activeTab === "requests" && (
            <div className="space-y-6">
              {/* Status Filters */}
              <div className={`p-2 rounded-2xl flex gap-2 overflow-x-auto ${t.card}`}>
                {["All", "Broadcasted", "In Progress", "Resolved"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2.5 rounded-xl font-semibold text-[0.9em] whitespace-nowrap cursor-pointer transition ${
                      statusFilter === status ? t.segActive : t.segIdle
                    }`}
                  >
                    {status} ({status === "All" ? requests.length : countStatus(status)})
                  </button>
                ))}
              </div>

              {/* Request Cards */}
              <div className="space-y-4">
                {loading ? (
                  <div className={`p-8 rounded-2xl text-center ${t.card} ${t.subtle}`}>Loading emergency requests...</div>
                ) : filteredRequests.length > 0 ? (
                  filteredRequests.map((req) => {
                    const status = req.status || "Broadcasted";
                    return (
                      <article
                        key={req.id}
                        className={`p-6 rounded-2xl border-l-4 border-l-rose-600 space-y-4 ${t.card}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h2 className={`font-bold text-[1.15em] ${t.heading}`}>{req.full_name || "Unknown User"}</h2>
                            <p className={`text-[0.85em] ${t.subtle}`}>PWD ID: {req.pwd_id || "No ID"}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full text-[0.75em] font-bold uppercase bg-rose-100 text-rose-700">
                              Emergency
                            </span>
                            <span className={`px-3 py-1 rounded-full text-[0.75em] font-bold ${status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>
                              {status}
                            </span>
                          </div>
                        </div>

                        <div className={`flex flex-wrap items-center gap-3 text-[0.9em] font-semibold ${t.heading}`}>
                          <span className="text-rose-600">⚠️ {req.emergency_type || "Emergency SOS"}</span>
                          <span>•</span>
                          <span className={t.subtle}>📍 {req.location || "N/A"}</span>
                        </div>

                        <p className={`p-3.5 rounded-xl text-[0.95em] border ${t.userBox} ${t.muted}`}>
                          {req.details || "No details provided."}
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          <p className={`text-[0.8em] ${t.subtle}`}>
                            {new Date(req.created_at).toLocaleString('en-PH',{timeZone:'Asia/Manila'})}
                          </p>

                          <div className="flex items-center gap-2">
                            {status === 'Broadcasted' && (
                              <button
                                onClick={() => handleUpdateStatus(req.id, "In Progress")}
                                className={`px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-[0.85em] transition cursor-pointer ${focusRing}`}
                              >
                                Acknowledge / In Progress
                              </button>
                            )}
                            {status !== 'Resolved' && (
                              <button
                                onClick={() => handleUpdateStatus(req.id, "Resolved")}
                                className={`px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[0.85em] transition cursor-pointer ${focusRing}`}
                              >
                                Mark Resolved
                              </button>
                            )}
                          </div>
                        </div>
                      <RequestTrackingPanel resource="emergency" id={req.id} role="staff" themeMode={themeMode}/>
                      </article>
                    );
                  })
                ) : (
                  <div className={`p-10 rounded-2xl flex flex-col items-center text-center ${t.card}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${t.tile}`}>
                      <Icon name="inbox" className="w-6 h-6" />
                    </div>
                    <p className={`text-[0.95em] font-medium ${t.muted}`}>No emergency requests found.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      
    </StaffLayout>
  );
}