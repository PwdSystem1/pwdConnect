import PageSpeech from './components/PageSpeech';
import PublicDetailsDialog from './components/PublicDetailsDialog';
import StaffMembership from './staffDashboard/staffMembership';
import AdminSystemSettings from './adminDashboard/adminSystemSettings';
import AdminAuditLogs from './adminDashboard/adminAuditLogs';
import {speakSpeech,stopSpeech} from './components/speechPlayer';
import AnnouncementOversight from './adminDashboard/adminAnnouncementOversight';
import AdminReport from './adminDashboard/adminReport';
import CommunityOverview from './components/CommunityOverview';
import PublicFooter from './components/PublicFooter';
import PublicBrand from './components/PublicBrand';
import PasswordRecovery from './publicPortal/PasswordRecovery';
import LinkProfileEmail from './publicPortal/LinkProfileEmail';
import AdminUserManagement from './adminDashboard/adminUserManagement';
import ChangeInitialPassword from './publicPortal/ChangeInitialPassword';
import CompleteProfile from './verification/CompleteProfile';
import AdminApprovals from './adminDashboard/adminApprovals';
import VerifyingDashboard from './verification/VerifyingDashboard';
import VerifyEmail from './verification/VerifyEmail';
import { acceptLoginSession } from './components/loginSession';
import AdminDashboard from "./adminDashboard/adminDash";
import AdminMessages from "./adminDashboard/adminMessages";
import AdminNotifications from "./adminDashboard/adminNotifications";
import StaffQRScanner from "./staffDashboard/staffQRScanner.jsx";
import StaffProfile from "./staffDashboard/staffProfile.jsx";
import StaffReport from "./staffDashboard/staffReport.jsx";
import StaffMessages from "./staffDashboard/staffMessages.jsx";
import StaffNotifications from "./staffDashboard/staffNotifications.jsx";
import React, { useState, useEffect, createContext, useContext } from "react";
import { Routes, Route, useNavigate, Navigate, Link } from "react-router-dom";

import "./App.css";
import AccountPage from "./publicPortal/AccountPage";
import { PORTAL_API } from "./components/portalApi";

import UserDashboard from "./userDashboard/userDash.jsx";
import ServiceReq from "./userDashboard/serviceReq.jsx";
import SendAlerts from "./userDashboard/sendAlerts.jsx"; 
import ReceivedAlerts from "./userDashboard/receivedAlerts.jsx";
import PWDProfile from "./userDashboard/PWDprofile.jsx";
import PwdQR from "./userDashboard/pwdQR.jsx";
import PwdAnnouncement from "./userDashboard/pwdAnnouncement.jsx";
import UserMessages from "./userDashboard/userMessages.jsx";
import UserNotifications from "./userDashboard/userNotifications.jsx";


import StaffDashboard from "./staffDashboard/staffDash";
import Masterlist from "./staffDashboard/masterlist.jsx";
import StaffReq from "./staffDashboard/staffReq.jsx";
import StaffEmergency from "./staffDashboard/staffEmergency.jsx";
import StaffAnnouncement from "./staffDashboard/staffAnnouncement.jsx"
const SpeechLanguageContext = createContext({language:"en",setLanguage:()=>{}});

const PROGRAMS = [
  {
    id: 1,
    title: "Livelihood Program",
    description: "Skills development and employment support for Persons With Disabilities.",
    image: "https://via.placeholder.com/400x250",
  },
];

const PASTPRO = [
  {
    id: 1,
    title: "Livelihood Program",
    description: "Skills development and employment support for Persons With Disabilities.",
    image: "https://via.placeholder.com/400x250",
  },
];

const EVENTS = [
  {
    id: 1,
    title: "PWD Medical Mission & Checkup",
    date: "July 15, 2026",
    location: "Municipal Gym",
    time: "8:00 AM",
    description:
      "Free medical consultations, eye checkups, hearing assessments, and health screenings for registered PWD beneficiaries.",
  },
];

// icon = pangalan ng SVG icon (hindi na emoji)
const HOTLINES = [
  { id: 1, name: "Municipal Hall", number: "(042) 585 4390", phones: [{label:"(042) 585 4390",dial:"0425854390"}], icon: "building" },
  { id: 2, name: "Candelaria Police Station", number: "166 / 741-7244", phones: [{label:"166",dial:"166"},{label:"741-7244",dial:"7417244"}], icon: "shield" },
  { id: 3, name: "Candelaria Fire Station", number: "585-4472", phones: [{label:"585-4472",dial:"5854472"}], icon: "flame" },
  { id: 4, name: "MDRRM Office", number: "116", phones: [{label:"116",dial:"116"}], icon: "cross" },
];

/* SIMPLE LINE ICONS (walang kailangang i-install na library) */
const ICONS = {
  access: (
    <>
      <circle cx="12" cy="4.5" r="1.8" />
      <path d="M5 8.5l7 1.5 7-1.5M12 10v5M9 21l3-6 3 6" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  down: <path d="M6 9l6 6 6-6" />,
  up: <path d="M6 15l6-6 6 6" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  shield: <path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z" />,
  home: (
    <>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8v.01" />
    </>
  ),
  list: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M17 14a5 5 0 0 1 4.5 5" />
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
  speaker: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9z" />
      <path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11" />
    </>
  ),
  stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  alert: (
    <>
      <path d="M12 3l9.5 17h-19z" />
      <path d="M12 10v4M12 17.3v.01" />
    </>
  ),
  building: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3" />
    </>
  ),
  flame: <path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />,
  cross: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
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

/* ACCESSIBILITY DROPDOWN MENU IN HEADER */
function AccessibilityDropdown({
  fontSize,
  setFontSize,
  themeMode,
  setThemeMode,
  isDyslexicFont,
  setIsDyslexicFont,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const {language,setLanguage}=useContext(SpeechLanguageContext);
  useEffect(()=>{if(!isOpen)return;const close=e=>{if(e.key==="Escape")setIsOpen(false);};document.addEventListener("keydown",close);return()=>document.removeEventListener("keydown",close);},[isOpen]);

  const isHC = themeMode === "contrast";
  const isDark = themeMode === "dark";

  const focusRing = isHC
    ? "outline-none focus-visible:ring-4 focus-visible:ring-white"
    : "outline-none focus-visible:ring-4 focus-visible:ring-sky-400";

  const getButtonStyles = () => {
    if (isHC) return "bg-black text-yellow-300 border-2 border-yellow-400 hover:bg-zinc-900";
    if (isDark) return "bg-slate-900 text-slate-100 border border-slate-700 hover:bg-slate-800";
    return "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 shadow-sm";
  };

  const getPanelStyles = () => {
    if (isHC) return "bg-black text-yellow-300 border-yellow-400";
    if (isDark) return "bg-slate-900 text-slate-100 border-slate-700";
    return "bg-white text-slate-800 border-slate-200";
  };

  const getTrackStyles = () => {
    if (isHC) return "bg-zinc-900 border border-yellow-400/50";
    if (isDark) return "bg-slate-800";
    return "bg-slate-100";
  };

  const activeStyles = isHC
    ? "bg-yellow-400 text-black"
    : isDark
    ? "bg-sky-600 text-white"
    : "bg-[#0F2A47] text-white";

  const idleStyles = isHC
    ? "text-yellow-300 hover:bg-zinc-800"
    : isDark
    ? "text-slate-200 hover:bg-slate-700"
    : "text-slate-700 hover:bg-slate-200";

  const labelStyles = isHC ? "text-yellow-200" : isDark ? "text-slate-400" : "text-slate-500";
  const dividerStyles = isHC ? "border-yellow-400/40" : isDark ? "border-slate-700" : "border-slate-200";

  return (
    <div className="relative inline-block text-left">
      <button
        aria-label="Accessibility options"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 min-h-11 rounded-lg font-semibold text-[0.9em] cursor-pointer transition ${focusRing} ${getButtonStyles()}`}
      >
        <Icon name="access" className="w-5 h-5" />
        <span className="hidden sm:inline">Accessibility</span>
        <Icon name={isOpen ? "up" : "down"} className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className={`fixed left-3 right-3 top-24 w-auto max-w-none max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 sm:max-h-[75vh] rounded-xl shadow-xl p-4 sm:p-5 z-50 border ${getPanelStyles()}`}
        >
          <div className="flex items-center justify-between gap-3 mb-4"><h2 className="font-bold">Accessibility</h2><button type="button" onClick={()=>setIsOpen(false)} aria-label="Close accessibility settings" className={`min-h-11 px-3 rounded-lg border ${focusRing}`}>Close</button></div>
          {/* Display Mode Switcher */}
          <div>
            <p className={`text-[0.8em] font-semibold mb-2 ${labelStyles}`}>
              Display Mode
            </p>
            <div className={`grid grid-cols-3 gap-1 p-1 rounded-lg ${getTrackStyles()}`}>
              <button
                onClick={() => setThemeMode("light")}
                aria-pressed={themeMode === "light"}
                className={`py-2.5 min-h-11 text-[0.85em] font-semibold rounded-md cursor-pointer transition ${focusRing} ${themeMode === "light" ? activeStyles : idleStyles}`}
              >
                Light
              </button>
              <button
                onClick={() => setThemeMode("dark")}
                aria-pressed={themeMode === "dark"}
                className={`py-2.5 min-h-11 text-[0.85em] font-semibold rounded-md cursor-pointer transition ${focusRing} ${themeMode === "dark" ? activeStyles : idleStyles}`}
              >
                Dark
              </button>
              <button
                onClick={() => setThemeMode("contrast")}
                aria-pressed={themeMode === "contrast"}
                className={`py-2.5 min-h-11 text-[0.85em] font-semibold rounded-md cursor-pointer transition ${focusRing} ${themeMode === "contrast" ? "bg-yellow-400 text-black" : idleStyles}`}
              >
                High
              </button>
            </div>
          </div>

          <hr className={`my-4 ${dividerStyles}`} />

          {/* Dyslexia Font */}
          <div>
            <p className={`text-[0.8em] font-semibold mb-2 ${labelStyles}`}>
              Reading Assistance
            </p>
            <button
              onClick={() => setIsDyslexicFont(!isDyslexicFont)}
              aria-pressed={isDyslexicFont}
              className={`w-full py-3 px-4 min-h-12 text-[0.9em] font-semibold rounded-lg flex items-center justify-between cursor-pointer transition border ${focusRing} ${
                isHC
                  ? "bg-black text-yellow-300 border-yellow-400 hover:bg-zinc-900"
                  : isDark
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-600"
                  : "bg-white hover:bg-slate-50 text-slate-800 border-slate-300"
              }`}
            >
              <span>Dyslexia Friendly Font</span>
              <span
                className={`text-[0.8em] px-2.5 py-1 rounded-md font-bold ${
                  isDyslexicFont
                    ? isHC
                      ? "bg-yellow-400 text-black"
                      : isDark
                      ? "bg-sky-600 text-white"
                      : "bg-[#0F2A47] text-white"
                    : isDark || isHC
                    ? "bg-white/10 text-slate-200"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {isDyslexicFont ? "ON" : "OFF"}
              </span>
            </button>
          </div>

          <hr className={`my-4 ${dividerStyles}`} />

          {/* Font Size Adjuster */}
          <div>
            <p className={`text-[0.8em] font-semibold mb-2 ${labelStyles}`}>
              Text Size
            </p>
            <div className={`flex items-center justify-between gap-1 p-1 rounded-lg ${getTrackStyles()}`}>
              <button
                onClick={() => setFontSize("text-sm")}
                aria-pressed={fontSize === "text-sm"}
                className={`flex-1 py-2.5 min-h-11 text-[0.85em] font-bold rounded-md cursor-pointer transition ${focusRing} ${fontSize === "text-sm" ? activeStyles : idleStyles}`}
              >
                A- Small
              </button>
              <button
                onClick={() => setFontSize("text-base")}
                aria-pressed={fontSize === "text-base"}
                className={`flex-1 py-2.5 min-h-11 text-[0.85em] font-bold rounded-md cursor-pointer transition ${focusRing} ${fontSize === "text-base" ? activeStyles : idleStyles}`}
              >
                A Normal
              </button>
              <button
                onClick={() => setFontSize("text-lg")}
                aria-pressed={fontSize === "text-lg"}
                className={`flex-1 py-2.5 min-h-11 text-[0.85em] font-bold rounded-md cursor-pointer transition ${focusRing} ${fontSize === "text-lg" ? activeStyles : idleStyles}`}
              >
                A+ Large
              </button>
            </div>
          </div>
          <label htmlFor="landing-speech-language" className="block text-[0.8em] font-semibold mt-5 mb-2">Speak language</label>
          <select id="landing-speech-language" value={language} onChange={e=>{setLanguage(e.target.value);stopSpeech();}} className={`w-full p-3 rounded-lg border ${focusRing} ${getPanelStyles()}`}><option value="en">English</option><option value="fil" disabled>Filipino / Tagalog — unavailable</option></select>
          <p className={`text-[0.75em] mt-2 ${labelStyles}`}>Use Read page below or Speak beside a section. English uses your device voice. Tagalog is currently unavailable.</p><PageSpeech/>
        </div>
      )}
    </div>
  );
}

// Section Speak controls retain the original layout and support translated narration.
const FILIPINO_SPEECH = {
 "Welcome to PWDConnect Candelaria's Inclusive Information System dedicated to empowering Persons with Disabilities through accessible programs, services, announcements, and community support.": "Maligayang pagdating sa PWDConnect ng Candelaria. Layunin ng sistemang ito na suportahan ang mga taong may kapansanan sa pamamagitan ng mga programang madaling ma-access, serbisyo, anunsiyo, at tulong ng komunidad.",
 "Our Mission: To advocate for the rights, welfare, and full integration of Persons with Disabilities into society by providing accessible services, livelihood assistance, and inclusive opportunities.": "Ang aming misyon ay itaguyod ang mga karapatan, kapakanan, at pakikilahok sa lipunan ng mga taong may kapansanan sa pamamagitan ng mga serbisyo, tulong sa kabuhayan, at pantay na pagkakataon.",
 "Our Vision: A barrier-free, inclusive, and compassionate Candelaria where Persons with Disabilities are empowered, respected, and active participants in community development.": "Ang aming pangarap ay isang Candelaria na walang hadlang, bukas sa lahat, at may malasakit, kung saan ang mga taong may kapansanan ay sinusuportahan, iginagalang, at aktibong nakikilahok sa pagpapaunlad ng komunidad.",
 "Core Values: Inclusivity, Integrity, Accessibility, Compassion, and Empowerment in every service provided for the Candelaria PWD community.": "Mga pangunahing pagpapahalaga: pagiging bukas sa lahat, katapatan, madaling pag-access, malasakit, at pagbibigay-kakayahan sa bawat serbisyong inihahatid sa komunidad ng PWD sa Candelaria.",
 "Livelihood Program. Skills development and employment support for Persons With Disabilities.": "Programa sa kabuhayan. Pagsasanay sa mga kasanayan at suporta sa paghahanap ng trabaho para sa mga taong may kapansanan.",
 "Livelihood Program Initiative. Skills development and employment support for Persons With Disabilities.": "Proyekto sa kabuhayan. Pagsasanay sa mga kasanayan at suporta sa trabaho para sa mga taong may kapansanan.",
 "Upcoming event: PWD Medical Mission & Checkup, on July 15, 2026, at Municipal Gym, 8:00 AM. Description: Free medical consultations, eye checkups, hearing assessments, and health screenings for registered PWD beneficiaries.": "Aktibidad: Medical mission at checkup para sa PWD. Hulyo kinse, dalawang libo at dalawampu't anim, sa Municipal Gym, alas otso ng umaga. Libreng konsultasyong medikal, pagsusuri sa mata at pandinig, at pagsusuring pangkalusugan para sa mga rehistradong benepisyaryong PWD.",
 "LGU Candelaria Quezon. Municipal Hall Compound, Poblacion, Candelaria, Quezon.": "Opisina ng pamahalaang lokal ng Candelaria. Municipal Hall Compound, Poblacion, Candelaria, Quezon.",
 "PDAO Candelaria Division. Welfare Building, Municipal Compound.": "Dibisyon ng PDAO sa Candelaria. Welfare Building, Municipal Compound."
};
function TTSControls({ textToSpeak, onStop }) {
 const {language}=useContext(SpeechLanguageContext);
 const [notice,setNotice]=useState('');
 const translated=FILIPINO_SPEECH[textToSpeak]||(textToSpeak.includes(' emergency hotline. Phone number: ')?textToSpeak.replace(' emergency hotline. Phone number: ','. Numero ng telepono para sa emerhensiya: '):null);
 useEffect(()=>{stopSpeech();setNotice('');return()=>stopSpeech();},[language]);
 const handleSpeak=()=>{
  if(language==='fil'&&!translated){setNotice('Wala pang Filipino translation para sa tekstong ito. Piliin muna ang English.');return;}
  speakSpeech(language==='fil'?translated:textToSpeak,language,setNotice);
 };
 return <div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={handleSpeak} className="flex items-center gap-1.5 text-[0.8em] font-semibold bg-sky-700 text-white hover:bg-sky-800 px-3.5 py-2 min-h-10 rounded-lg transition cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-sky-400" title="Read text using the English device voice"><Icon name="speaker" className="w-4 h-4"/>Speak</button><button type="button" onClick={()=>{onStop();setNotice('');}} className="flex items-center gap-1.5 text-[0.8em] font-semibold border-2 border-current bg-transparent hover:opacity-70 px-3.5 py-2 min-h-10 rounded-lg transition cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-sky-400" title="Stop Speech"><Icon name="stop" className="w-4 h-4"/>Stop</button></div>{notice&&<p role="status" className="text-[0.8em] mt-2 max-w-sm">{notice}</p>}</div>;
}

// Heading ng bawat section
function SectionHeading({ title, subtitle, t }) {
  return (
    <div className="max-w-3xl">
      <h2 className={`text-[1.8em] sm:text-[2.2em] font-bold tracking-tight leading-tight ${t.title}`}>{title}</h2>
      <p className={`mt-3 text-[1.1em] leading-relaxed ${t.muted}`}>{subtitle}</p>
    </div>
  );
}

function LandingPage({
  fontSize,
  setFontSize,
  themeMode,
  setThemeMode,
  isDyslexicFont,
  setIsDyslexicFont,
}) {
  const navigate = useNavigate();
  const [isLoginOpen, setIsLoginOpen] = useState(() => new URLSearchParams(window.location.search).has("login") || new URLSearchParams(window.location.search).get("portal")==="1");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [readMore,setReadMore]=useState(null);
  const closeDetails=()=>{stopSpeech();setReadMore(null);};

  useEffect(()=>{
    if(!isSidebarOpen&&!isLoginOpen)return;
    const overlay=document.querySelector('[data-landing-overlay]'),previous=document.activeElement,overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';overlay?.querySelector('button,input,a')?.focus();
    const key=e=>{if(e.key==='Escape'){setIsSidebarOpen(false);setIsLoginOpen(false);setPassword("");}if(e.key==='Tab'&&overlay){const items=Array.from(overlay.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select')).filter(el=>el.getClientRects().length);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};
    document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
  },[isSidebarOpen,isLoginOpen]);
  useEffect(()=>()=>stopSpeech(),[]);

  // User Login States
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleStopSpeech = () => stopSpeech();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();if(isLoading)return;setLoginError('');setIsLoading(true);
    try{
      const response=await fetch(PORTAL_API+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
      if(!response.headers.get('content-type')?.includes('application/json'))throw Error('Login API is unavailable. Check the backend server.');
      const data=await response.json();if(!response.ok||!data.success)throw Error(data.message||'Unable to sign in.');
      const destination=acceptLoginSession(data);setIsLoginOpen(false);setUsername('');setPassword('');navigate(destination);
    }catch(error){setLoginError(error.message||'Cannot connect to the backend server.');}finally{setIsLoading(false);}
  };

  const isHighContrast = themeMode === "contrast";
  const isDarkMode = themeMode === "dark";

  /* THEME TOKENS (light / dark / high contrast) - kapareho ng Dashboard at Service Requests */
  const t = isHighContrast
    ? {
        page: "bg-black text-yellow-300",
        header: "bg-black border-b-2 border-yellow-400",
        navLink: "text-yellow-300 hover:bg-zinc-900",
        brand: "text-yellow-400",
        brandSub: "text-yellow-200",
        secA: "bg-zinc-950 border-t border-yellow-400/30",
        secB: "bg-black border-t border-yellow-400/30",
        title: "text-yellow-400",
        heading: "text-yellow-400",
        body: "text-yellow-100",
        muted: "text-yellow-200",
        subtle: "text-yellow-200/80",
        card: "bg-black border-2 border-yellow-400",
        tile: "bg-yellow-400 text-black",
        tileAlert: "bg-yellow-400 text-black",
        accent: "text-yellow-400",
        alertText: "text-yellow-400",
        badge: "bg-yellow-400 text-black",
        chip: "bg-yellow-400 text-black",
        primary: "bg-yellow-400 text-black hover:bg-yellow-300 font-bold",
        outline: "border-2 border-yellow-400 text-yellow-300 hover:bg-zinc-900",
        ghostBtn: "bg-black text-yellow-300 border-2 border-yellow-400 hover:bg-zinc-900",
        drawer: "bg-black text-yellow-300 border-l-2 border-yellow-400",
        drawerItem: "hover:bg-zinc-900 text-yellow-300",
        divider: "border-yellow-400/40",
        modal: "bg-black text-yellow-300 border-2 border-yellow-400",
        input: "bg-black border-2 border-yellow-400 text-yellow-300 placeholder:text-yellow-500/60 focus:ring-4 focus:ring-white",
        error: "bg-black border-2 border-yellow-400 text-yellow-300",
        closeBtn: "border border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black",
        footer: "bg-black border-t-2 border-yellow-400 text-yellow-300",
        footerMuted: "text-yellow-200",
      }
    : isDarkMode
    ? {
        page: "bg-slate-950 text-slate-100",
        header: "bg-slate-900 border-b border-slate-800",
        navLink: "text-slate-200 hover:bg-slate-800",
        brand: "text-sky-300",
        brandSub: "text-slate-400",
        secA: "bg-slate-900",
        secB: "bg-slate-950",
        title: "text-sky-300",
        heading: "text-white",
        body: "text-slate-300",
        muted: "text-slate-300",
        subtle: "text-slate-400",
        card: "bg-slate-900 border border-slate-800",
        tile: "bg-slate-800 text-sky-300",
        tileAlert: "bg-rose-950 text-rose-300",
        accent: "text-sky-300",
        alertText: "text-rose-300",
        badge: "bg-slate-800 text-sky-300 border border-slate-700",
        chip: "bg-sky-600 text-white",
        primary: "bg-sky-600 text-white hover:bg-sky-500 font-semibold",
        outline: "border-2 border-sky-400 text-sky-300 hover:bg-slate-800",
        ghostBtn: "bg-slate-900 text-slate-100 border border-slate-700 hover:bg-slate-800",
        drawer: "bg-slate-900 text-slate-100 border-l border-slate-800",
        drawerItem: "hover:bg-slate-800 text-slate-200",
        divider: "border-slate-800",
        modal: "bg-slate-900 text-slate-100 border border-slate-700",
        input: "bg-slate-800 border border-slate-600 text-slate-100 placeholder:text-slate-500 focus:ring-4 focus:ring-sky-400/40 focus:border-sky-500",
        error: "bg-rose-950 border border-rose-700 text-rose-200",
        closeBtn: "border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white",
        footer: "bg-slate-950 border-t border-slate-800 text-slate-200",
        footerMuted: "text-slate-400",
      }
    : {
        page: "bg-slate-50 text-slate-800",
        header: "bg-white border-b border-slate-200",
        navLink: "text-slate-700 hover:bg-slate-100",
        brand: "text-[#0F2A47]",
        brandSub: "text-slate-500",
        secA: "bg-slate-50",
        secB: "bg-white",
        title: "text-[#0F2A47]",
        heading: "text-slate-900",
        body: "text-slate-600",
        muted: "text-slate-600",
        subtle: "text-slate-500",
        card: "bg-white border border-slate-200 shadow-sm",
        tile: "bg-sky-100 text-[#0F2A47]",
        tileAlert: "bg-rose-50 text-rose-700",
        accent: "text-[#0F2A47]",
        alertText: "text-rose-700",
        badge: "bg-white text-[#0F2A47] border border-slate-300",
        chip: "bg-[#0F2A47] text-white",
        primary: "bg-[#0F2A47] text-white hover:bg-[#173b63] font-semibold",
        outline: "border-2 border-[#0F2A47] text-[#0F2A47] hover:bg-slate-100",
        ghostBtn: "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 shadow-sm",
        drawer: "bg-white text-slate-800",
        drawerItem: "hover:bg-slate-100 text-slate-800",
        divider: "border-slate-200",
        modal: "bg-white text-slate-800 border border-slate-200",
        input: "bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:ring-4 focus:ring-sky-400/40 focus:border-sky-600",
        error: "bg-rose-50 border border-rose-300 text-rose-800",
        closeBtn: "border border-slate-200 text-slate-500 hover:bg-slate-100",
        footer: "bg-[#0F2A47] text-white",
        footerMuted: "text-slate-300",
      };

  const secondaryBtn = isHighContrast
    ? "border-2 border-yellow-400 text-yellow-300 hover:bg-zinc-900 font-semibold"
    : isDarkMode
    ? "border border-slate-600 text-slate-200 hover:bg-slate-800 font-semibold"
    : "border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold";

  const focusRing = isHighContrast
    ? "outline-none focus-visible:ring-4 focus-visible:ring-white"
    : "outline-none focus-visible:ring-4 focus-visible:ring-sky-400";

  const navLinks = [
    { href: "#home", label: "Home" },
    { href: "#about", label: "About Us" },
    { href: "#programs", label: "Programs" },
    { href: "#projects", label: "Projects" },
    { href: "#events", label: "Events" },
    { href: "#contact", label: "Contact" },
  ];

  const quickLinks = [
    { href: "#home", label: "Home", icon: "home" },
    { href: "#about", label: "About Us", icon: "info" },
    { href: "#programs", label: "Programs", icon: "list" },
    { href: "#projects", label: "Projects", icon: "folder" },
    { href: "#events", label: "Events", icon: "calendar" },
    { href: "#contact", label: "Contact Us", icon: "phone" },
  ];

  return (
    <div
      className={`min-h-screen relative ${fontSize} ${
        isDyslexicFont ? "font-mono" : "font-sans"
      } ${t.page}`}
    >
      {/* 1. HEADER / NAVIGATION */}
      <header className={`sticky top-0 z-40 shadow-sm ${t.header}`}>
        <nav className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <Link to="/" aria-label="PWDConnect home" className={`rounded-lg ${focusRing}`}><PublicBrand themeMode={themeMode}/></Link>

          <ul className="hidden lg:flex items-center gap-1 font-medium">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={`px-2 py-2.5 rounded-lg text-[0.85em] transition inline-block ${focusRing} ${t.navLink}`}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Accessibility at Sidebar Menu Button sa Kanang Dulo */}
          <div className="flex items-center gap-3">
            <AccessibilityDropdown
              fontSize={fontSize}
              setFontSize={setFontSize}
              themeMode={themeMode}
              setThemeMode={setThemeMode}
              isDyslexicFont={isDyslexicFont}
              setIsDyslexicFont={setIsDyslexicFont}
            />

            <button
              onClick={() => setIsSidebarOpen(true)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 min-h-11 rounded-lg font-semibold text-[0.9em] cursor-pointer transition ${focusRing} ${t.ghostBtn}`}
              aria-label="Open Menu"
              aria-expanded={isSidebarOpen}
              title="Open Menu"
            >
              <Icon name="menu" className="w-5 h-5" />
              <span className="hidden sm:inline">Menu</span>
            </button>
          </div>
        </nav>
      </header>

      {/* POPUP SIDEBAR MENU */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          ></div>

          {/* Sidebar Drawer (Lumalabas sa KANANG DULO ngayon para mas natural) */}
          <div
            data-landing-overlay role="dialog" aria-modal="true" aria-label="Navigation menu"
            className={`relative w-80 max-w-full h-full overflow-y-auto overscroll-contain shadow-2xl p-6 flex flex-col justify-between z-10 transition-transform duration-300 ${t.drawer}`}
          >
            <div>
              <div className={`flex items-center justify-between pb-5 border-b ${t.divider}`}>
                <div className="flex items-center gap-3">
                  <PublicBrand themeMode={themeMode}/>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  aria-label="Close menu"
                  className={`w-11 h-11 rounded-lg flex items-center justify-center cursor-pointer transition ${focusRing} ${t.closeBtn}`}
                >
                  <Icon name="close" className="w-5 h-5" />
                </button>
              </div>

              {/* Menu Items */}
              <div className="mt-6 space-y-1">
                <p className={`text-[0.8em] font-semibold mb-2 px-2 ${t.subtle}`}>
                  Portal Access
                </p>
                <button type="button" onClick={()=>{setIsSidebarOpen(false);setLoginError('');setShowPassword(false);setPassword('');setIsLoginOpen(true);}} className={`w-full flex items-center gap-3.5 px-4 py-3 min-h-12 rounded-lg font-semibold text-[0.95em] ${focusRing} ${t.drawerItem}`}><Icon name="user" className="w-5 h-5 shrink-0"/>Sign in</button>
                <button type="button" onClick={()=>{setIsSidebarOpen(false);navigate('/create-account');}} className={`w-full flex items-center gap-3.5 px-4 py-3 min-h-12 rounded-lg font-semibold text-[0.95em] ${focusRing} ${t.drawerItem}`}><Icon name="user" className="w-5 h-5 shrink-0"/>Create Account</button>

                <p className={`text-[0.8em] font-semibold mt-6 mb-2 px-2 ${t.subtle}`}>
                  Quick Links
                </p>
                {quickLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3.5 px-4 py-3 min-h-12 rounded-lg text-[0.95em] font-medium transition ${focusRing} ${t.drawerItem}`}
                  >
                    <Icon name={link.icon} className="w-5 h-5 shrink-0" /> {link.label}
                  </a>
                ))}
              </div>
            </div>

            <div className={`pt-5 border-t text-[0.8em] text-center ${t.divider} ${t.subtle}`}>
              <p>PWDConnect Candelaria © 2026</p>
            </div>
          </div>
        </div>
      )}

      <main id="landing-main-content">
      {/* 2. HERO SECTION */}
      <section id="home" className={`py-16 md:py-24 ${t.secA}`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8 grid md:grid-cols-2 gap-8 lg:gap-16 items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <span className={`inline-block px-4 py-2 rounded-full text-[0.85em] font-semibold ${t.badge}`}>
                PDAO Candelaria Official Portal
              </span>
              <TTSControls
                textToSpeak="Welcome to PWDConnect Candelaria's Inclusive Information System dedicated to empowering Persons with Disabilities through accessible programs, services, announcements, and community support."
                onStop={handleStopSpeech}
              />
            </div>

            <h1 className={`mt-4 text-[2.1em] sm:text-[2.6em] md:text-[3.25em] break-words font-bold tracking-tight leading-[1.1] ${t.title}`}>
              Empowering Our PWD <br /> Community
            </h1>

            <p className={`mt-6 text-[1.1em] leading-relaxed max-w-xl ${t.body}`}>
              Welcome to PWDConnect — Candelaria's Inclusive Information System dedicated to empowering Persons with
              Disabilities through accessible programs, services, announcements, and community support.
            </p>

            <div className="flex flex-wrap gap-4 mt-8">
              <a
                href="#programs"
                className={`px-7 py-3.5 min-h-12 rounded-lg transition shadow-sm ${focusRing} ${t.primary}`}
              >
                Explore Services
              </a>
              <a
                href="#programs"
                className={`px-7 py-3.5 min-h-12 rounded-lg font-semibold transition ${focusRing} ${t.outline}`}
              >
                View Programs
              </a>
              <button type="button" onClick={()=>navigate("/create-account")} className={`px-7 py-3.5 min-h-12 rounded-lg font-semibold ${focusRing} ${t.ghostBtn}`}>Create Account</button>
            </div>
            <ul aria-label="PWDConnect values" className={`flex flex-wrap gap-x-5 gap-y-3 mt-6 text-[0.9em] ${t.muted}`}>
              {["Inclusive", "Accessible", "Empowering"].map((item) => (
                <li key={item} className="flex items-center gap-2 font-medium">
                  <span aria-hidden="true" className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center ${t.tile}`}>
                    <Icon name="check" className="w-4 h-4" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0">
            <CommunityOverview themeMode={themeMode}/>
          </div>
        </div>
      </section>

      {/* 3. ABOUT US SECTION */}
      <section id="about" className={`py-16 md:py-24 ${t.secB}`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <SectionHeading
            t={t}
            title="About Us"
            subtitle="Persons with Disability Affairs Office (PDAO) - Candelaria, Quezon"
          />

          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className={`p-7 rounded-2xl flex flex-col justify-between ${t.card}`}>
              <div>
                <div className="flex justify-between items-start gap-3 mb-5">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${t.tile}`}>
                    <Icon name="target" className="w-6 h-6" />
                  </div>
                  <TTSControls
                    textToSpeak="Our Mission: To advocate for the rights, welfare, and full integration of Persons with Disabilities into society by providing accessible services, livelihood assistance, and inclusive opportunities."
                    onStop={handleStopSpeech}
                  />
                </div>
                <h3 className={`text-[1.4em] font-bold ${t.heading}`}>
                  Our Mission
                </h3>
                <p className={`mt-3 leading-relaxed ${t.body}`}>
                  To advocate for the rights, welfare, and full integration of Persons with Disabilities into society by providing accessible services, livelihood assistance, and inclusive opportunities.
                </p>
              </div>
            </div>

            <div className={`p-7 rounded-2xl flex flex-col justify-between ${t.card}`}>
              <div>
                <div className="flex justify-between items-start gap-3 mb-5">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${t.tile}`}>
                    <Icon name="eye" className="w-6 h-6" />
                  </div>
                  <TTSControls
                    textToSpeak="Our Vision: A barrier-free, inclusive, and compassionate Candelaria where Persons with Disabilities are empowered, respected, and active participants in community development."
                    onStop={handleStopSpeech}
                  />
                </div>
                <h3 className={`text-[1.4em] font-bold ${t.heading}`}>
                  Our Vision
                </h3>
                <p className={`mt-3 leading-relaxed ${t.body}`}>
                  A barrier-free, inclusive, and compassionate Candelaria where Persons with Disabilities are empowered, respected, and active participants in community development.
                </p>
              </div>
            </div>

            <div className={`p-7 rounded-2xl flex flex-col justify-between ${t.card}`}>
              <div>
                <div className="flex justify-between items-start gap-3 mb-5">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${t.tile}`}>
                    <Icon name="users" className="w-6 h-6" />
                  </div>
                  <TTSControls
                    textToSpeak="Core Values: Inclusivity, Integrity, Accessibility, Compassion, and Empowerment in every service provided for the Candelaria PWD community."
                    onStop={handleStopSpeech}
                  />
                </div>
                <h3 className={`text-[1.4em] font-bold ${t.heading}`}>
                  Core Values
                </h3>
                <p className={`mt-3 leading-relaxed ${t.body}`}>
                  Inclusivity, Integrity, Accessibility, Compassion, and Empowerment in every service provided for the Candelaria PWD community.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PROGRAMS SECTION */}
      <section id="programs" className={`py-16 md:py-24 ${t.secA}`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <SectionHeading
            t={t}
            title="Our Programs"
            subtitle="Programs and services offered by PDAO Candelaria to support and empower the PWD community."
          />

          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {PROGRAMS.map((program) => (
              <div
                key={program.id}
                className={`rounded-2xl overflow-hidden flex flex-col justify-between ${t.card}`}
              >
                <img src={program.image} alt={program.title} className="w-full h-56 object-cover bg-slate-200" />
                <div className="p-6">
                  <h3 className={`text-[1.25em] font-bold ${t.heading}`}>
                    {program.title}
                  </h3>
                  <p className={`mt-2 leading-relaxed ${t.body}`}>
                    {program.description}
                  </p>
                  <div className="mt-4">
                    <TTSControls
                      textToSpeak={`${program.title}. ${program.description}`}
                      onStop={handleStopSpeech}
                    />
                  </div>
                </div>
                <div className={`px-6 py-4 border-t flex justify-end items-center ${t.divider}`}>
                  <button onClick={()=>setReadMore({item:program,category:"Program"})} aria-haspopup="dialog" aria-label={`Read more about ${program.title}`} className={`font-semibold px-4 py-2 min-h-11 rounded-lg cursor-pointer transition ${focusRing} ${t.outline}`}>
                    Read More
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. PROJECTS SECTION */}
      <section id="projects" className={`py-16 md:py-24 ${t.secB}`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <SectionHeading
            t={t}
            title="Past Projects"
            subtitle="Initiatives successfully implemented to build better opportunities for all."
          />

          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {PASTPRO.map((item) => (
              <div
                key={`project-${item.id}`}
                className={`rounded-2xl overflow-hidden flex flex-col justify-between ${t.card}`}
              >
                <div className={`w-full h-56 flex items-center justify-center ${isHighContrast ? "bg-zinc-900 text-yellow-200" : isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-200 text-slate-500"}`}>
                  Project Image
                </div>
                <div className="p-6">
                  <h3 className={`text-[1.25em] font-bold ${t.heading}`}>
                    {item.title} Initiative
                  </h3>
                  <p className={`mt-2 leading-relaxed ${t.body}`}>
                    {item.description}
                  </p>
                  <div className="mt-4">
                    <TTSControls
                      textToSpeak={`${item.title} Initiative. ${item.description}`}
                      onStop={handleStopSpeech}
                    />
                  </div>
                </div>
                <div className={`px-6 py-4 border-t flex justify-end items-center ${t.divider}`}>
                  <button onClick={()=>setReadMore({item:{...item,title:item.title+" Initiative"},category:"Past Project"})} aria-haspopup="dialog" aria-label={`Read more about ${item.title} Initiative`} className={`font-semibold px-4 py-2 min-h-11 rounded-lg cursor-pointer transition ${focusRing} ${t.outline}`}>
                    Read More
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. EVENTS SECTION */}
      <section id="events" className={`py-16 md:py-24 ${t.secA}`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <SectionHeading
            t={t}
            title="Upcoming Events"
            subtitle="Mark your calendars for upcoming programs, medical missions, and activities."
          />

          <div className="grid md:grid-cols-2 gap-6 mt-12">
            {EVENTS.map((event) => (
              <div
                key={event.id}
                className={`rounded-2xl overflow-hidden flex flex-col justify-between ${t.card}`}
              >
                <div className={`h-56 flex items-center justify-center ${isHighContrast ? "bg-zinc-900 text-yellow-200" : isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-200 text-slate-500"}`}>
                  Event Image Banner
                </div>
                <div className="p-7">
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <TTSControls
                      textToSpeak={`Upcoming event: ${event.title}, on ${event.date}, at ${event.location}, ${event.time}. Description: ${event.description}`}
                      onStop={handleStopSpeech}
                    />
                    <span className={`px-4 py-2 rounded-lg text-[0.9em] font-semibold ${t.chip}`}>
                      {event.date}
                    </span>
                  </div>
                  <h3 className={`text-[1.5em] font-bold mt-5 ${t.heading}`}>
                    {event.title}
                  </h3>
                  <p className={`mt-3 font-medium flex flex-wrap items-center gap-x-5 gap-y-1.5 ${t.muted}`}>
                    <span className="flex items-center gap-2">
                      <Icon name="pin" className="w-5 h-5" /> {event.location}
                    </span>
                    <span className="flex items-center gap-2">
                      <Icon name="clock" className="w-5 h-5" /> {event.time}
                    </span>
                  </p>
                  <p className={`mt-4 leading-relaxed ${t.body}`}>
                    {event.description}
                  </p>

                  <div className="flex justify-end items-center mt-8">
                    <button
                      onClick={()=>setReadMore({item:event,category:"Event"})} aria-haspopup="dialog" aria-label={`Read more about ${event.title}`} className={`px-5 py-2.5 min-h-11 rounded-lg font-semibold cursor-pointer transition ${focusRing} ${t.outline}`}
                    >
                      Read More
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. CONTACT SECTION */}
      <section id="contact" className={`py-16 md:py-24 ${t.secB}`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <SectionHeading
            t={t}
            title="Connect With Us"
            subtitle="Reach out directly via official messaging platforms or visit our offices."
          />

          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <div className={`rounded-2xl p-8 flex flex-col justify-between ${t.card}`}>
              <div>
                <div className="flex justify-between items-start gap-3">
                  <h3 className={`text-[1.6em] font-bold leading-tight ${t.heading}`}>
                    LGU Candelaria Quezon
                  </h3>
                </div>
                <div className="mt-3">
                  <TTSControls
                    textToSpeak="LGU Candelaria Quezon. Municipal Hall Compound, Poblacion, Candelaria, Quezon."
                    onStop={handleStopSpeech}
                  />
                </div>
                <p className={`mt-5 leading-relaxed ${t.body}`}>
                  Keep track of municipal ordinances, planning updates, and official announcements.
                </p>
                <p className={`mt-5 font-medium flex items-start gap-2.5 ${t.muted}`}>
                  <Icon name="pin" className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>Municipal Hall Compound, Poblacion, Candelaria, Quezon</span>
                </p>
              </div>
              <a
                href="https://www.facebook.com/dessicatedcoconutcapitaloftheworld"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit LGU Candelaria Quezon Facebook page (opens in a new tab)"
                className={`mt-8 px-6 py-3 min-h-12 rounded-lg w-fit font-semibold cursor-pointer transition ${focusRing} ${t.outline}`}
              >
                Visit Facebook Page
              </a>
            </div>

            <div className={`rounded-2xl p-8 flex flex-col justify-between ${t.card}`}>
              <div>
                <div className="flex justify-between items-start gap-3">
                  <h3 className={`text-[1.6em] font-bold leading-tight ${t.heading}`}>
                    PDAO Candelaria Division
                  </h3>
                </div>
                <div className="mt-3">
                  <TTSControls
                    textToSpeak="PDAO Candelaria Division. Welfare Building, Municipal Compound."
                    onStop={handleStopSpeech}
                  />
                </div>
                <p className={`mt-5 leading-relaxed ${t.body}`}>
                  Reach our officers for registration concerns, profiling, and assistance requests.
                </p>
                <p className={`mt-5 font-medium flex items-start gap-2.5 ${t.muted}`}>
                  <Icon name="pin" className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>Welfare Building, Municipal Compound</span>
                </p>
              </div>
              <button
                type="button"
                disabled
                aria-label="PDAO Facebook link is not yet available"
                className={`mt-8 px-6 py-3 min-h-12 rounded-lg w-fit font-semibold opacity-60 cursor-not-allowed ${t.primary}`}
              >
                Facebook link coming soon
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 8. EMERGENCY HOTLINES SECTION */}
      <section className={`py-16 md:py-24 ${t.secA}`}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <SectionHeading
            t={t}
            title="Emergency Hotlines"
            subtitle="Contact the municipal office and emergency services using the numbers below."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mt-12">
            {HOTLINES.map((hotline) => (
              <div
                key={hotline.id}
                className={`rounded-2xl p-6 flex flex-col justify-between ${t.card}`}
              >
                <div className="w-full flex flex-wrap justify-between items-start gap-3 mb-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${t.tileAlert}`}>
                    <Icon name={hotline.icon} className="w-7 h-7" />
                  </div>
                  <TTSControls
                    textToSpeak={`${hotline.name} emergency hotline. Phone number: ${hotline.number}`}
                    onStop={handleStopSpeech}
                  />
                </div>
                <h3 className={`text-[1.2em] font-bold ${t.heading}`}>{hotline.name}</h3>
                <div className={`mt-1 flex flex-wrap items-center gap-x-2 font-bold text-[1.6em] tabular-nums ${t.alertText}`}>
                  {hotline.phones.map((phone,index)=><React.Fragment key={phone.dial}>{index>0&&<span aria-hidden="true">/</span>}<a href={`tel:${phone.dial}`} aria-label={`Call ${hotline.name} at ${phone.label}`} className={`min-h-11 inline-flex items-center rounded-md underline underline-offset-4 ${focusRing}`}>{phone.label}</a></React.Fragment>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      </main>
      {/* 9. FOOTER */}
      <PublicFooter themeMode={themeMode}/>

      {readMore&&<PublicDetailsDialog item={readMore.item} category={readMore.category} themeMode={themeMode} fontSize={fontSize} isDyslexicFont={isDyslexicFont} onClose={closeDetails}><TTSControls textToSpeak={`${readMore.item.title}. ${readMore.item.fullDescription||readMore.item.description}`} onStop={handleStopSpeech}/></PublicDetailsDialog>}
      {/* 10. USER LOGIN MODAL */}
      {isLoginOpen && (
        <div
          data-landing-overlay
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-login-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-all"
        >
          <div
            className={`w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl p-5 sm:p-8 relative shadow-2xl ${t.modal}`}
          >
            <button
              onClick={() => {
                setIsLoginOpen(false);
                setLoginError("");
              }}
              aria-label="Close login"
              className={`absolute top-5 right-5 w-11 h-11 rounded-lg flex items-center justify-center cursor-pointer transition ${focusRing} ${t.closeBtn}`}
            >
              <Icon name="close" className="w-5 h-5" />
            </button>

            <h2 id="user-login-title" className={`text-[1.5em] font-bold pr-12 ${t.heading}`}>Sign in to PWDConnect</h2>
            <p className={`text-[0.95em] mt-1 ${t.subtle}`}>
              Use your account username and password to continue.
            </p>

            <form onSubmit={handleLoginSubmit} className="mt-6 space-y-5">
              {loginError && (
                <div role="alert" className={`p-3.5 text-[0.9em] font-semibold rounded-lg flex items-start gap-2.5 ${t.error}`}>
                  <Icon name="alert" className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label htmlFor="login-username" className={`block text-[0.9em] font-semibold mb-2 ${t.heading}`}>
                  Account Username
                </label>
                <input
                  id="login-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  maxLength={60}
                  placeholder="Enter your username"
                  className={`w-full px-4 py-3 min-h-12 rounded-lg text-[0.95em] transition outline-none ${t.input}`}
                />
              </div>

              <div>
                <label htmlFor="login-password" className={`block text-[0.9em] font-semibold mb-2 ${t.heading}`}>
                  Password
                </label>
                <input
                  id="login-password"
                  autoComplete="current-password"
                  maxLength={128}
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 min-h-12 rounded-lg text-[0.95em] transition outline-none ${t.input}`}
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="showPassword"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="w-5 h-5 rounded cursor-pointer accent-sky-700"
                />
                <label htmlFor="showPassword" className="text-[0.9em] cursor-pointer select-none">
                  Show Password
                </label>
              </div>

              <Link to="/forgot-password" onClick={()=>{setIsLoginOpen(false);setPassword('');}} className={`inline-block underline font-semibold ${focusRing}`}>Forgot password?</Link>
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginOpen(false);
                    setLoginError("");
                  }}
                  className={`px-6 py-3 min-h-12 rounded-lg text-[0.95em] transition cursor-pointer ${focusRing} ${secondaryBtn}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`px-6 py-3 min-h-12 rounded-lg text-[0.95em] transition cursor-pointer ${focusRing} ${t.primary} ${
                    isLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isLoading ? "Logging in..." : "Login"}
                </button>
              </div>
            </form>

            <hr className={`my-6 ${t.divider}`} />

            <div className={`text-[0.9em] space-y-1 ${t.subtle}`}>
              <p className={`font-semibold ${t.heading}`}>Don't have an account?</p>
              <p className="leading-relaxed">
                <Link to="/create-account" onClick={()=>{setIsLoginOpen(false);setPassword('');}} className="underline font-semibold">Create an account</Link> or <Link to="/create-account" onClick={()=>{setIsLoginOpen(false);setPassword('');}} className="underline">resend email verification</Link>.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function App() {
  const [speechLanguage,setSpeechLanguage]=useState(()=>"en");
  useEffect(()=>{localStorage.setItem("public_speechLanguage",speechLanguage);},[speechLanguage]);
  const [fontSize, setFontSize] = useState(
    () => localStorage.getItem("app_fontSize") || "text-base"
  );
  const [themeMode, setThemeMode] = useState(
    () => localStorage.getItem("app_themeMode") || "light"
  );
  const [isDyslexicFont, setIsDyslexicFont] = useState(
    () => localStorage.getItem("app_isDyslexicFont") === "true"
  );

  useEffect(() => {
    localStorage.setItem("app_fontSize", fontSize);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem("app_themeMode", themeMode);
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem("app_isDyslexicFont", isDyslexicFont);
  }, [isDyslexicFont]);

  const accessibilityProps = {
    fontSize,
    setFontSize,
    themeMode,
    setThemeMode,
    isDyslexicFont,
    setIsDyslexicFont,
  };

  return (
    <SpeechLanguageContext.Provider value={{language:speechLanguage,setLanguage:setSpeechLanguage}}>
    <Routes>
      <Route path="/admin-settings" element={<AdminSystemSettings {...accessibilityProps}/>} />
      <Route path="/admin-audit" element={<AdminAuditLogs {...accessibilityProps}/>} />
      <Route path="/admin-announcements" element={<AnnouncementOversight {...accessibilityProps}/>} />
      <Route path="/admin-reports" element={<AdminReport {...accessibilityProps}/>} />
      <Route path="/admin-users" element={<AdminUserManagement {...accessibilityProps}/>} />
      <Route path="/change-initial-password" element={<ChangeInitialPassword {...accessibilityProps}/>} />
      <Route path="/" element={<LandingPage {...accessibilityProps} />} />
      <Route path="/link-email" element={<LinkProfileEmail {...accessibilityProps} />} />
      <Route path="/forgot-password" element={<PasswordRecovery key="request" {...accessibilityProps}/>} />
      <Route path="/reset-password" element={<PasswordRecovery key="reset" mode="reset" {...accessibilityProps}/>} />
      <Route path="/create-account" element={<AccountPage key="register" mode="register" {...accessibilityProps} />} />
      <Route path="/verify-email" element={<VerifyEmail {...accessibilityProps} />} />
      <Route path="/portal/admin" element={<Navigate to="/?login=1" replace />} />
      <Route path="/portal/:portalKind" element={<Navigate to="/?login=1" replace />} />
      <Route path="/admin-access" element={<Navigate to="/admin-dashboard" replace />} />
      <Route path="/admin-approvals" element={<AdminApprovals {...accessibilityProps} />} />
      <Route path="/complete-profile" element={<CompleteProfile {...accessibilityProps} />} />
      <Route path="/verifying-dashboard" element={<VerifyingDashboard {...accessibilityProps} />} />
      <Route path="/admin-dashboard" element={<AdminDashboard {...accessibilityProps} />} />
      <Route path="/admin-messages" element={<AdminMessages {...accessibilityProps} />} />
      <Route path="/admin-notifications" element={<AdminNotifications {...accessibilityProps} />} />
      <Route path="/dashboard" element={<UserDashboard {...accessibilityProps} />} />
      <Route path="/requests" element={<ServiceReq {...accessibilityProps} />} />
      <Route path="/emergency" element={<SendAlerts {...accessibilityProps} />} />
      <Route path="/received-alerts" element={<ReceivedAlerts {...accessibilityProps} />} />
      <Route path="/qr-code" element={<PwdQR {...accessibilityProps} />} />
      <Route path="/profile" element={<PWDProfile {...accessibilityProps} />} />
      <Route path="/announcements" element={<PwdAnnouncement {...accessibilityProps} />} />
      <Route path="/messages" element={<UserMessages {...accessibilityProps} />} />
      <Route path="/notifications" element={<UserNotifications {...accessibilityProps} />} />

      {/* staff */}
      <Route path="/staff-messages" element={<StaffMessages {...accessibilityProps} />} />
      <Route path="/staff-notifications" element={<StaffNotifications {...accessibilityProps} />} />
      <Route path="/staff-reports" element={<StaffReport {...accessibilityProps} />} />
      <Route path="/staff-profile" element={<StaffProfile {...accessibilityProps} />} />
      <Route path="/staff-qr-scanner" element={<StaffQRScanner {...accessibilityProps} />} />
      <Route path="/staff-dashboard" element={<StaffDashboard {...accessibilityProps} />} />
      <Route path="/staff-masterlist" element={<Masterlist {...accessibilityProps} />} />
      <Route path="/staff-membership" element={<StaffMembership {...accessibilityProps}/>} />
      <Route path="/staff-requests" element={<StaffReq {...accessibilityProps} />} />
      <Route path="/staff-emergency" element={<StaffEmergency {...accessibilityProps} />} />
      <Route path="/staff-announcements" element={<StaffAnnouncement {...accessibilityProps} />} />
    </Routes>
    </SpeechLanguageContext.Provider>
  );
}

