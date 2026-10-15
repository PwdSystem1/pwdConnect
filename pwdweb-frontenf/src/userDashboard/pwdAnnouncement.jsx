import {speakSpeech,stopSpeech} from '../components/speechPlayer';
import AnnouncementReader from '../components/AnnouncementReader';
import {PORTAL_API,portalRequest} from '../components/portalApi';
import UserLayout from "../components/UserLayout";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/* SIMPLE LINE ICONS (walang kailangang i-install na library) */
const ICONS = {
  speaker: <><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11" /></>,
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


export default function UserAnnouncement({
  fontSize = "text-base", setFontSize = () => {},
  themeMode = "light", setThemeMode = () => {},
  isDyslexicFont = false, setIsDyslexicFont = () => {},
}) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [readingId, setReadingId] = useState(null);
  const [speechNotice,setSpeechNotice]=useState('');
  const [opened,setOpened]=useState(null),[opening,setOpening]=useState(false);
  async function countView(item){await portalRequest('/announcements/'+item.id+'/view',{method:'POST',body:'{}'});}
  async function openAnnouncement(item){if(opening)return;setOpening(true);try{const response=await fetch(PORTAL_API+'/announcements/'+item.id);const data=await response.json();if(!response.ok||!data.success)throw Error(data.message||'Announcement unavailable.');await countView(item);setOpened(data.announcement);}catch(e){setError(e.message);}finally{setOpening(false);}}

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("userSession") || "null");
      if (!saved?.pwd_id) { navigate("/", { replace: true }); return; }
      setUser(saved);
    } catch { navigate("/", { replace: true }); }
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    let timer;
    let controller;
    async function load() {
      controller = new AbortController();
      try {
        const response = await fetch(PORTAL_API+'/announcements', { signal: controller.signal });
        if (!(response.headers.get("content-type") || "").includes("application/json")) {
          throw new Error(`Announcement API returned ${response.status}. Register /api/announcements and restart the backend.`);
        }
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || "Unable to load announcements.");
        if (!Array.isArray(data.announcements)) throw new Error("Invalid announcement list from server.");
        if (active) { setAnnouncements(data.announcements); setError(""); }
      } catch (error) {
        if (active && error.name !== "AbortError") {
          setError(error instanceof TypeError ? "Cannot connect to the backend on port 5000." : error.message);
        }
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
          timer = setTimeout(load, 15000);
        }
      }
    }
    load();
    return () => { active = false; clearTimeout(timer); controller?.abort(); };
  }, [user, refreshKey]);

  useEffect(() => () => stopSpeech(), []);

  const isHighContrast = themeMode === "contrast";
  const isDarkMode = themeMode === "dark";
  

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



  
  const filtered = announcements.filter(item => `${item.title} ${item.content}`.toLowerCase().includes(search.trim().toLowerCase()));
  const button = `inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-11 rounded-lg font-semibold cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed ${focusRing}`;
  const inputStyles = isHighContrast ? "bg-black border-2 border-yellow-400 text-yellow-300" : isDarkMode ? "bg-slate-800 border border-slate-600 text-slate-100" : "bg-white border border-slate-300 text-slate-900";

  async function read(item) {
    try{await countView(item);}catch(e){setError(e.message);return;}
    setReadingId(item.id);
    speakSpeech(`${item.title}. ${item.content}`,localStorage.getItem('public_speechLanguage')||'en',message=>{if(message)setSpeechNotice(message);else setSpeechNotice('');},()=>setReadingId(current=>current===item.id?null:current));
  }

  if (!user) return <div role="status" className={`min-h-screen flex items-center justify-center ${fontSize} ${t.page}`}>Loading your account…</div>;

  return (
    <UserLayout user={user} title="Announcements" fontSize={fontSize} setFontSize={setFontSize} themeMode={themeMode} setThemeMode={setThemeMode} isDyslexicFont={isDyslexicFont} setIsDyslexicFont={setIsDyslexicFont}>
      {/* SIDEBAR */}
      


      
        

        {speechNotice&&<p role="status" className="p-4 mb-4">{speechNotice}</p>}
        <section aria-label="Introduction" className={`rounded-2xl p-7 sm:p-8 mb-8 ${t.hero}`}>
          <h2 className="text-[1.6em] font-bold">Stay informed and connected</h2>
          <p className="mt-2 leading-relaxed opacity-90">Read updates, activities, and announcements published by LGU staff for PWD members.</p>
          <span className={`inline-block px-3 py-1.5 rounded-lg mt-4 text-[0.85em] font-semibold ${t.heroChip}`}>{announcements.length} announcements</span>
        </section>

        <section aria-label="Search announcements" className={`rounded-2xl p-5 mb-6 flex flex-col sm:flex-row gap-4 sm:items-end ${t.card}`}>
          <div className="flex-1 min-w-0">
            <label htmlFor="announcement-search" className={`block font-semibold text-[0.9em] mb-2 ${t.heading}`}>Search announcements</label>
            <input id="announcement-search" type="search" value={search} onChange={event => setSearch(event.target.value)}
              placeholder="Search title or content" className={`w-full px-4 py-3 min-h-12 rounded-lg ${inputStyles} ${focusRing}`} />
          </div>
          <button disabled={loading || refreshing} onClick={() => { setRefreshing(true); setRefreshKey(key => key + 1); }} className={`${button} ${t.link}`}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </section>

        {error && <div role="alert" className={`rounded-xl p-4 mb-6 ${t.card}`}><p className="font-semibold">Unable to refresh announcements</p><p className="mt-2 break-words">{error}</p></div>}
        {loading ? <p role="status" className={`rounded-2xl p-10 text-center ${t.card}`}>Loading announcements…</p>
          : filtered.length === 0 ? <section className={`rounded-2xl p-10 text-center ${t.card}`}>
              <h2 className={`font-bold ${t.heading}`}>{search ? "No matching announcements" : error ? "Announcements unavailable" : "No announcements yet"}</h2>
              <p className={`mt-2 ${t.muted}`}>{search ? "Try another search term." : "Staff announcements will appear here."}</p>
            </section>
          : <section aria-label="Published announcements">
              <p role="status" className={`mb-4 text-[0.85em] ${t.subtle}`}>Showing {filtered.length} of {announcements.length} announcements</p>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {filtered.map(item => (
                  <article key={item.id} className={`rounded-2xl overflow-hidden flex flex-col min-w-0 ${t.card}`}>
                    {item.pic && <div className="p-4">
                      <img src={item.pic} alt={`Announcement: ${item.title}`} loading="lazy" className="w-full max-h-96 object-contain rounded-xl" />
                    </div>}
                    <div className="p-5 sm:p-7 flex flex-col flex-1">
                      <p className={`text-[0.75em] font-semibold mb-2 ${t.subtle}`}>LGU Announcement</p>
                      <h2 className={`text-[1.25em] font-bold leading-snug break-words ${t.heading}`}>{item.title}</h2>
                      <p className={`mt-4 mb-6 text-[0.95em] leading-relaxed whitespace-pre-wrap break-words ${t.muted}`}>{item.content}</p>
                      <div className={`mt-auto pt-4 border-t flex flex-wrap gap-3 ${t.divider}`}>
                        <button type="button" disabled={opening} onClick={()=>openAnnouncement(item)} className={`${button} ${t.link}`}>View announcement</button>
                        {"speechSynthesis" in window&&<button onClick={() => read(item)} className={`${button} ${t.link}`}><Icon name="speaker" />Read Announcement</button>}
                        {readingId === item.id && <button onClick={() => { stopSpeech(); setReadingId(null); }} className={`${button} ${t.link}`}>Stop Reading</button>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>}
      
      {opened&&<AnnouncementReader announcement={opened} themeMode={themeMode} onClose={()=>setOpened(null)}/>}
    </UserLayout>
  );
}
