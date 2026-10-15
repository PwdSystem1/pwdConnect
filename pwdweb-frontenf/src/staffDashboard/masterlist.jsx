import {CANDELARIA_BARANGAYS,barangayKey,barangayOptionsFor} from '../components/candelariaBarangays';
import {useNavigate} from 'react-router-dom';
import MemberListPrint from '../components/MemberListPrint';
import {sortMembers} from '../components/MemberRegisterTable';
import {useSearchParams} from 'react-router-dom';
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
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  edit: <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />,
  trash: <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />,
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

const formatDateForInput = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* ACCESSIBILITY DROPDOWN
   Phone: panel pinned under the header, full width (never cut off).
   Tablet/PC: hangs from the button. */


const EMPTY_MEMBER = {
  first_name: "",
  middle_name: "",
  last_name: "",
  sex: "Male",
  birthday: "",
  age: "",
  contact_numb: "",
  email: "",
  occupation: "",
  province: "",
  municipality: "",
  baranggay: "",
  street: "",
  house_number: "",
  disability: "",
  blood_type: "Unknown",
  pwd_id: "",
  civil_status: "Single",
  acc_username: "",
  expired_date: "",
  member_since: "",
};

const DISABILITY_TYPES = [
  "Physical Disability",
  "Visual Impairment",
  "Deaf / Hard of Hearing",
  "Psychosocial Disability",
  "Intellectual Disability",
  "Learning Disability",
  "Mental Disability",
  "Chronic Illness",
  "Cancer",
  "Rare Disease",
  "Other",
];

const API_URL = PORTAL_API+'/users/pwd-members';
const normalizeDisability=value=>String(value||'').trim().toLowerCase();
const manilaToday=()=>new Date(Date.now()+28800000).toISOString().slice(0,10);
const birthdayLabel=member=>{const birthday=String(member.birthday||'').slice(0,10),today=manilaToday();return birthday.slice(5)===today.slice(5)?'Birthday today':birthday.slice(5,7)===today.slice(5,7)?'Birthday this month':'';};

const calculateAge = (dob) => {
  if (!dob) return 0;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
};

const getExpiryStatus = (expiryDateStr) => {
  if (!expiryDateStr) return { text: "Valid", type: "valid" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { text: "Expired", type: "expired", days: Math.abs(diffDays) };
  if (diffDays <= 15) return { text: `${diffDays}d left`, type: "expiring", days: diffDays };
  return { text: "Valid", type: "valid", days: diffDays };
};

export default function StaffMasterlist({
  fontSize = "text-base",
  setFontSize = () => {},
  themeMode = "light",
  setThemeMode = () => {},
  isDyslexicFont = false,
  setIsDyslexicFont = () => {},
}) {


  const navigate=useNavigate();
  const [user, setUser] = useState({ firstName: "", lastName: "", role: "Staff" });
  const [pwdList, setPwdList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sexFilter, setSexFilter] = useState("All Sexes");
  const [searchParams,setSearchParams]=useSearchParams();
  const disabilityFilter=searchParams.get('disability')||'All Disability Types';
  const birthdayFilter=searchParams.get('birthdays')||'all';
  const barangayFilter=barangayKey(searchParams.get('barangay')||'');
  const scannedMember=searchParams.get('member')||'',exactPwd=searchParams.get('pwd_id')||'';
  const clearScanned=()=>{const next=new URLSearchParams(searchParams);next.delete('member');next.delete('pwd_id');setSearchParams(next);};
  const [sortOrder,setSortOrder]=useState('name');
  const setBarangayFilter=value=>{const next=new URLSearchParams(searchParams);if(!value)next.delete('barangay');else next.set('barangay',value);setSearchParams(next);};
  const barangayOptions=barangayOptionsFor([...pwdList.map(m=>m.baranggay||m.barangay),searchParams.get('barangay')]);
  const setDisabilityFilter=value=>{const next=new URLSearchParams(searchParams);if(value==='All Disability Types')next.delete('disability');else next.set('disability',value);setSearchParams(next);};
  const setBirthdayFilter=value=>{const next=new URLSearchParams(searchParams);if(value==='all')next.delete('birthdays');else next.set('birthdays',value);setSearchParams(next);};
  const disabilityOptions=Array.from(new Map([disabilityFilter,...pwdList.map(m=>m.disability||m.disability_type),...DISABILITY_TYPES].filter(v=>v&&v!=='All Disability Types').map(v=>[normalizeDisability(v),String(v).trim()])).values()).sort((a,b)=>a.localeCompare(b));

   // phone/tablet sidebar drawer
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentMemberId, setCurrentMemberId] = useState(null);
  const [newMember, setNewMember] = useState(EMPTY_MEMBER);

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
        console.error("Failed to parse user session", err);
      }
    }
    fetchPwdList();
  }, []);

  // Drawer: lock page scroll, Esc closes, auto-close when resized to PC width
  

  // Esc closes whichever modal is open
  useEffect(() => {
    if (!showAddModal && !showEditModal) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setShowAddModal(false);
        setShowEditModal(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showAddModal, showEditModal]);

  const fetchPwdList = () => {
    setLoading(true);
    fetch(API_URL, { headers: { Authorization: `Bearer ${localStorage.getItem("portalToken") || ""}` } })
      .then((res) => res.json())
      .then((data) => {
        let rawList = [];
        if (Array.isArray(data)) rawList = data;
        else if (data.success && Array.isArray(data.members)) rawList = data.members;
        else if (data.success && Array.isArray(data.data)) rawList = data.data;
        else if (data.data && Array.isArray(data.data)) rawList = data.data;

        setPwdList(
          rawList.map((m) => ({
            ...m,
            expired_date: formatDateForInput(m.expired_date || m.expiry_date),
            birthday: formatDateForInput(m.birthday || m.date_of_birth),
            disability: m.disability || m.disability_type || "",
            contact_numb: m.contact_numb || m.contact_number || "",
            baranggay: m.baranggay || m.barangay || "",
            street: m.street || m.street_address || "",
          }))
        );
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching PWD list from database:", err);
        setLoading(false);
      });
  };

  

  

  // ADD MEMBER SUBMIT
  const handleAddMemberSubmit = (e) => {
    e.preventDefault();
    const payload = { ...newMember, office_record_confirmed:true, acc_username:"", age: newMember.birthday ? calculateAge(newMember.birthday) : newMember.age };
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("portalToken") || ""}` },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setShowAddModal(false);
          fetchPwdList();
          setNewMember(EMPTY_MEMBER);
          alert(data.message);
        } else {
          alert(data.message || data.error || "Failed to add member.");
        }
      })
      .catch((err) => {
        console.error("Error adding member:", err);
        alert("Server error when adding member.");
      });
  };

  // OPEN EDIT MODAL
  const handleOpenEdit = (member) => {
    setCurrentMemberId(member.id);
    setNewMember({
      first_name: member.first_name || "",
      middle_name: member.middle_name || "",
      last_name: member.last_name || "",
      sex: member.sex || "Male",
      birthday: formatDateForInput(member.birthday || member.date_of_birth),
      age: member.age || "",
      contact_numb: member.contact_numb || member.contact_number || "",
      email: member.email || member.email_address || "",
      occupation: member.occupation || "",
      province: member.province || "",
      municipality: member.municipality || "",
      baranggay: member.baranggay || member.barangay || "",
      street: member.street || member.street_address || "",
      house_number: member.house_number || "",
      disability: member.disability || member.disability_type || "",
      blood_type: member.blood_type || "Unknown",
      pwd_id: member.pwd_id || "",
      civil_status: member.civil_status || "Single",
      acc_username: member.acc_username || "",
      expired_date: formatDateForInput(member.expired_date || member.expiry_date),
      member_since: formatDateForInput(member.member_since),
    });
    setShowEditModal(true);
  };

  // EDIT MEMBER SUBMIT
  const handleEditMemberSubmit = (e) => {
    e.preventDefault();
    const payload = {};
    Object.keys(newMember).forEach((key) => {
      if (newMember[key] !== undefined) {
        payload[key] = newMember[key];
      }
    });
    if (payload.birthday) payload.age = calculateAge(payload.birthday);

    fetch(`${API_URL}/${currentMemberId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("portalToken") || ""}` },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setShowEditModal(false);
          fetchPwdList();
          setNewMember(EMPTY_MEMBER);
          setCurrentMemberId(null);
        } else {
          alert(data.message || data.error || "Failed to update member.");
        }
      })
      .catch((err) => {
        console.error("Error updating member:", err);
        alert("Server error when updating member.");
      });
  };

  // DELETE MEMBER
  const handleDeleteMember = (id) => {
    if (!window.confirm("Are you sure you want to delete this PWD member?")) return;
    fetch(`${API_URL}/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("portalToken") || ""}` } })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) fetchPwdList();
        else alert("Failed to delete member.");
      })
      .catch((err) => {
        console.error("Error deleting member:", err);
        alert("Server error when deleting member.");
      });
  };

  const filteredMembers = sortMembers(pwdList.filter((m) => {
    const fullName = `${m.first_name || ""} ${m.middle_name || ""} ${m.last_name || ""}`.toLowerCase();
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      fullName.includes(query) ||
      (m.pwd_id || "").toLowerCase().includes(query) ||
      (m.baranggay || m.barangay || "").toLowerCase().includes(query) ||
      (m.contact_numb || m.contact_number || "").toLowerCase().includes(query);
    const expiryType = getExpiryStatus(m.expired_date || m.expiry_date).type;
    const matchesStatus = statusFilter === "All" || expiryType === statusFilter.toLowerCase();
    const matchesSex = sexFilter === "All Sexes" || m.sex?.toLowerCase() === sexFilter.toLowerCase();
    const matchesDisability =
      disabilityFilter === "All Disability Types" || normalizeDisability(m.disability || m.disability_type) === normalizeDisability(disabilityFilter);
    const birthday=birthdayLabel(m);
    const matchesBirthday=birthdayFilter==='all'||(birthdayFilter==='today'?birthday==='Birthday today':birthdayFilter==='this-month'?Boolean(birthday):true);
    const matchesBarangay=!barangayFilter||barangayKey(m.baranggay||m.barangay)===barangayFilter;
    return (!scannedMember||String(m.id)===scannedMember)&&(!exactPwd||m.pwd_id===exactPwd)&&matchesSearch && matchesStatus && matchesSex && matchesDisability && matchesBirthday && matchesBarangay;
  }),sortOrder);
  const printFilters=[exactPwd?'Exact PWD ID: '+exactPwd:'',disabilityFilter!=='All Disability Types'?'Disability: '+disabilityFilter:'',barangayFilter?'Barangay: '+(barangayOptions.find(([value])=>value===barangayFilter)?.[1]||barangayFilter):'',searchTerm.trim()?'Search: '+searchTerm.trim():'',statusFilter!=='All'?'ID status: '+statusFilter:'',sexFilter!=='All Sexes'?'Sex: '+sexFilter:'',birthdayFilter!=='all'?'Birthday: '+birthdayFilter:''].filter(Boolean).join(' · ')||'All members';

  const totalMembers = pwdList.length;
  const countType = (type) => pwdList.filter((m) => getExpiryStatus(m.expired_date || m.expiry_date).type === type).length;
  const validCount = countType("valid");
  const expiringCount = countType("expiring");
  const expiredCount = countType("expired");

  const isHighContrast = themeMode === "contrast";
  const isDarkMode = themeMode === "dark";

  /* THEME TOKENS (light / dark / high contrast) */
  const t = isHighContrast
    ? {
        page: "bg-black text-yellow-300",
        sidebar: "bg-black text-yellow-300 border-r-2 border-yellow-400",
        topbar: "bg-black border-b-2 border-yellow-400",
        navActive: "bg-yellow-400 text-black font-bold",
        navIdle: "text-yellow-300 hover:bg-zinc-900",
        card: "bg-black border-2 border-yellow-400",
        row: "bg-zinc-900 border border-yellow-400/50",
        heading: "text-yellow-400",
        muted: "text-yellow-200",
        subtle: "text-yellow-200/80",
        tile: "bg-yellow-400 text-black",
        avatar: "bg-yellow-400 text-black",
        userBox: "border border-yellow-400/50",
        divider: "border-yellow-400/40",
        link: "bg-yellow-400 text-black hover:bg-yellow-300",
        primary: "bg-yellow-400 text-black hover:bg-yellow-300 font-bold",
        logout: "bg-yellow-400 text-black hover:bg-yellow-300 font-bold",
        iconBtn: "text-yellow-300 hover:bg-zinc-900",
        countPill: "bg-yellow-400 text-black",
        rolePill: "bg-yellow-400 text-black",
        input: "bg-zinc-900 border-2 border-yellow-400 text-yellow-200 placeholder:text-yellow-200/60",
        thead: "bg-zinc-900 text-yellow-400",
        rowHover: "hover:bg-zinc-900",
        segTrack: "bg-zinc-900 border border-yellow-400/50",
        segIdle: "text-yellow-300 hover:bg-zinc-800",
        segActive: "bg-yellow-400 text-black",
        modal: "bg-black border-2 border-yellow-400 text-yellow-300",
        valid: "bg-yellow-400 text-black",
        expiring: "bg-yellow-400 text-black",
        expired: "bg-yellow-400 text-black",
        validDot: "bg-black",
        expiringDot: "bg-black",
        expiredDot: "bg-black",
        optionBg: "bg-black text-yellow-300",
      }
    : isDarkMode
    ? {
        page: "bg-slate-950 text-slate-100",
        sidebar: "bg-slate-900 text-slate-100 border-r border-slate-800",
        topbar: "bg-slate-900 border-b border-slate-800",
        navActive: "bg-sky-600 text-white font-semibold",
        navIdle: "text-slate-300 hover:bg-slate-800 hover:text-white",
        card: "bg-slate-900 border border-slate-800",
        row: "bg-slate-800/70 border border-slate-700",
        heading: "text-white",
        muted: "text-slate-300",
        subtle: "text-slate-400",
        tile: "bg-slate-800 text-sky-300",
        avatar: "bg-sky-600 text-white",
        userBox: "bg-slate-800/60 border border-slate-800",
        divider: "border-slate-800",
        link: "bg-slate-800 text-sky-200 hover:bg-slate-700",
        primary: "bg-sky-600 text-white hover:bg-sky-500 font-semibold",
        logout: "border border-rose-500/60 text-rose-300 hover:bg-rose-950/50 font-semibold",
        iconBtn: "text-slate-300 hover:bg-slate-800",
        countPill: "bg-rose-600 text-white",
        rolePill: "bg-slate-800 text-sky-300",
        input: "bg-slate-800 border border-slate-600 text-slate-100 placeholder:text-slate-400",
        thead: "bg-slate-800/60 text-slate-300",
        rowHover: "hover:bg-slate-800/60",
        segTrack: "bg-slate-800",
        segIdle: "text-slate-200 hover:bg-slate-700",
        segActive: "bg-sky-600 text-white",
        modal: "bg-slate-900 border border-slate-700 text-slate-100",
        valid: "bg-emerald-950 text-emerald-300",
        expiring: "bg-amber-950 text-amber-300",
        expired: "bg-rose-950 text-rose-300",
        validDot: "bg-emerald-400",
        expiringDot: "bg-amber-400",
        expiredDot: "bg-rose-400",
        optionBg: "bg-slate-800 text-slate-100",
      }
    : {
        page: "bg-slate-50 text-slate-800",
        sidebar: "bg-white text-slate-700 border-r border-slate-200",
        topbar: "bg-white border-b border-slate-200",
        navActive: "bg-[#0F2A47] text-white font-semibold",
        navIdle: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        card: "bg-white border border-slate-200 shadow-sm",
        row: "bg-slate-50 border border-slate-200",
        heading: "text-slate-900",
        muted: "text-slate-600",
        subtle: "text-slate-500",
        tile: "bg-slate-100 text-[#0F2A47]",
        avatar: "bg-[#0F2A47] text-white",
        userBox: "bg-slate-50 border border-slate-200",
        divider: "border-slate-200",
        link: "bg-slate-100 text-[#0F2A47] hover:bg-slate-200",
        primary: "bg-[#0F2A47] text-white hover:bg-[#143a63] font-semibold",
        logout: "border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold",
        iconBtn: "text-slate-600 hover:bg-slate-100",
        countPill: "bg-rose-600 text-white",
        rolePill: "bg-slate-100 text-[#0F2A47] border border-slate-200",
        input: "bg-white border border-slate-300 text-slate-800 placeholder:text-slate-400",
        thead: "bg-slate-50 text-slate-600",
        rowHover: "hover:bg-slate-50",
        segTrack: "bg-slate-100",
        segIdle: "text-slate-700 hover:bg-slate-200",
        segActive: "bg-[#0F2A47] text-white",
        modal: "bg-white border border-slate-200 text-slate-800",
        valid: "bg-emerald-50 text-emerald-800 border border-emerald-200",
        expiring: "bg-amber-50 text-amber-800 border border-amber-200",
        expired: "bg-rose-50 text-rose-700 border border-rose-200",
        validDot: "bg-emerald-600",
        expiringDot: "bg-amber-600",
        expiredDot: "bg-rose-600",
        optionBg: "bg-white text-slate-800",
      };

  const focusRing = isHighContrast
    ? "outline-none focus-visible:ring-4 focus-visible:ring-white"
    : "outline-none focus-visible:ring-4 focus-visible:ring-sky-400";

  

  
  const field = `w-full px-3.5 py-2.5 min-h-11 rounded-lg text-[0.95em] ${t.input} ${focusRing}`;

  const statusBadge = (type, text) => (
    <span className={`inline-flex items-center gap-2 w-fit px-3 py-1.5 rounded-full text-[0.8em] font-semibold ${t[type]}`}>
      <span className={`w-2 h-2 rounded-full ${t[`${type}Dot`]}`} aria-hidden="true" />
      {text}
    </span>
  );

  const stats = [
    { label: "Total Members", value: totalMembers },
    { label: "Valid IDs", value: validCount },
    { label: "Expiring within 15 days", value: expiringCount },
    { label: "Expired", value: expiredCount },
  ];

  const formField = (label, key, p = {}) => (
    <div>
      <label htmlFor={`m-${key}`} className="block text-[0.9em] font-semibold mb-1.5">
        {label}
      </label>
      <input
        id={`m-${key}`}
        value={newMember[key] || ""}
        onChange={(e) => setNewMember({ ...newMember, [key]: e.target.value })}
        className={field}
        {...p}
      />
    </div>
  );

  const formSelect = (label, key, options, p = {}) => (
    <div>
      <label htmlFor={`m-${key}`} className="block text-[0.9em] font-semibold mb-1.5">
        {label}
      </label>
      <select
        id={`m-${key}`}
        value={newMember[key] || ""}
        onChange={(e) => setNewMember({ ...newMember, [key]: e.target.value })}
        className={field}
        {...p}
      >
        {options.map(([v, l]) => (
          <option key={v} value={v} className={t.optionBg}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );

  /* Modal: bottom sheet on phones, centered dialog on larger screens */
  const modalShell = (id, title, onClose, formId, submitLabel, body) => (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className={`w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col ${fontSize} ${t.modal}`}
      >
        <div className={`flex justify-between items-center px-5 sm:px-8 py-4 sm:py-5 border-b shrink-0 ${t.divider}`}>
          <h3 id={id} className="font-bold text-[1.25em]">
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className={`w-11 h-11 rounded-lg flex items-center justify-center cursor-pointer transition ${focusRing} ${t.iconBtn}`}
          >
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 sm:p-8 overflow-y-auto flex-1">{body}</div>
        <div className={`grid grid-cols-2 sm:flex sm:justify-end gap-3 px-5 sm:px-8 py-4 border-t shrink-0 ${t.divider}`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-3 min-h-12 rounded-lg text-[0.95em] font-semibold cursor-pointer transition ${focusRing} ${t.link}`}
          >
            Cancel
          </button>
          <button
            type="submit"
            form={formId}
            className={`px-5 py-3 min-h-12 rounded-lg text-[0.95em] cursor-pointer transition ${focusRing} ${t.primary}`}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );

  const rowActions = (m) => (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleOpenEdit(m)}
        aria-label={`Edit ${m.first_name || "member"}`}
        className={`w-11 h-11 rounded-lg flex items-center justify-center cursor-pointer transition ${focusRing} ${t.iconBtn}`}
      >
        <Icon name="edit" className="w-5 h-5 text-sky-500" />
      </button>
      <button
        onClick={() => handleDeleteMember(m.id)}
        aria-label={`Delete ${m.first_name || "member"}`}
        className={`w-11 h-11 rounded-lg flex items-center justify-center cursor-pointer transition ${focusRing} ${t.iconBtn}`}
      >
        <Icon name="trash" className="w-5 h-5 text-rose-500" />
      </button>
    </div>
  );

  const memberName = (m) => `${m.first_name || ""} ${m.middle_name ? m.middle_name + " " : ""}${m.last_name || ""}`;

  return (
    <StaffLayout user={user} fontSize={fontSize} setFontSize={setFontSize} themeMode={themeMode} setThemeMode={setThemeMode} isDyslexicFont={isDyslexicFont} setIsDyslexicFont={setIsDyslexicFont}>
      {/* Backdrop behind the phone drawer */}
      

      {/* SIDEBAR: slide-in drawer on phone/tablet, fixed column on PC */}
      

      {/* MAIN CONTENT */}
      
        

        <div className="space-y-6 w-full min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className={`text-[1.6em] sm:text-[1.9em] font-bold tracking-tight ${t.heading}`}>PWD Masterlist</h1>
              <p className={`text-[1em] mt-1.5 ${t.muted}`}>
                {totalMembers} registered members. {expiringCount} expiring soon, {expiredCount} expired.
              </p>
            </div>
            <button
              onClick={() => {
                setNewMember(EMPTY_MEMBER);
                setShowAddModal(true);
              }}
              className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-5 py-3 min-h-12 rounded-lg text-[0.95em] cursor-pointer transition ${focusRing} ${t.primary}`}
            >
              <Icon name="plus" className="w-5 h-5" /> Add Member
            </button>
          </div>

          <section aria-label="Summary" className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((s) => (
              <div key={s.label} className={`p-4 sm:p-5 rounded-2xl ${t.card}`}>
                <p className={`text-[1.8em] sm:text-[2em] font-bold leading-none ${t.heading}`}>{s.value}</p>
                <p className={`text-[0.85em] sm:text-[0.9em] font-medium mt-2 ${t.muted}`}>{s.label}</p>
              </div>
            ))}
          </section>

          {/* Filters: stacked on phone, one row on PC */}
          <section aria-label="Search and filters" className={`p-4 sm:p-5 rounded-2xl flex flex-col lg:flex-row lg:items-center gap-4 ${t.card}`}>
            <div className="relative lg:flex-1">
              <label htmlFor="member-search" className="sr-only">
                Search members
              </label>
              <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${t.subtle}`}>
                <Icon name="search" className="w-5 h-5" />
              </span>
              <input
                id="member-search"
                type="text"
                placeholder="Search name, PWD ID, barangay, contact"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-11 pr-4 py-2.5 min-h-11 rounded-lg text-[0.95em] ${t.input} ${focusRing}`}
              />
            </div>

            <div role="group" aria-label="Filter by ID status" className={`grid grid-cols-4 lg:flex gap-1 p-1 rounded-lg ${t.segTrack}`}>
              {["All", "Valid", "Expiring", "Expired"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  aria-pressed={statusFilter === st}
                  className={`px-2 sm:px-4 py-2.5 min-h-11 rounded-md text-[0.8em] sm:text-[0.85em] font-semibold cursor-pointer transition ${focusRing} ${statusFilter === st ? t.segActive : t.segIdle}`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-3">
              <select
                aria-label="Filter by sex"
                value={sexFilter}
                onChange={(e) => setSexFilter(e.target.value)}
                className={`w-full px-3.5 py-2.5 min-h-11 rounded-lg text-[0.9em] font-semibold ${t.input} ${focusRing}`}
              >
                {["All Sexes", "Male", "Female"].map((o) => (
                  <option key={o} className={t.optionBg}>
                    {o}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by disability type"
                value={disabilityFilter==='All Disability Types'?disabilityFilter:normalizeDisability(disabilityFilter)}
                onChange={(e) => setDisabilityFilter(e.target.value)}
                className={`w-full px-3.5 py-2.5 min-h-11 rounded-lg text-[0.9em] font-semibold ${t.input} ${focusRing}`}
              >
                {["All Disability Types", ...disabilityOptions].map((o) => (
                  <option key={o} value={o==='All Disability Types'?o:normalizeDisability(o)} className={t.optionBg}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <div className="flex flex-wrap gap-3"><button type="button" onClick={()=>navigate('/staff-qr-scanner?purpose=masterlist')} className={`px-4 py-3 rounded-lg min-h-11 font-semibold ${t.outline||t.input} ${focusRing}`}>Scan QR / look up PWD ID</button>{(scannedMember||exactPwd)&&<button type="button" onClick={clearScanned} className={`px-4 py-3 rounded-lg min-h-11 ${t.input} ${focusRing}`}>Clear scanned member filter</button>}</div><section aria-label="Barangay and sorting" className={`p-4 rounded-2xl flex flex-wrap items-end gap-4 ${t.card}`}><div className="min-w-0 flex-1 basis-56"><label htmlFor="masterlist-barangay" className="block font-semibold text-[0.9em] mb-2">Barangay</label><select id="masterlist-barangay" value={barangayFilter} onChange={e=>setBarangayFilter(e.target.value)} className={`w-full p-3 rounded-lg ${t.input} ${focusRing}`}><option value="">All barangays</option>{barangayOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div><div className="min-w-0 flex-1 basis-56"><label htmlFor="masterlist-sort" className="block font-semibold text-[0.9em] mb-2">Sort members</label><select id="masterlist-sort" value={sortOrder} onChange={e=>setSortOrder(e.target.value)} className={`w-full p-3 rounded-lg ${t.input} ${focusRing}`}><option value="name">Member name (surname A–Z)</option><option value="barangay">Barangay, then name</option><option value="disability">Disability, then name</option></select></div></section>
          <section aria-label="Birthday filters" className={`p-4 rounded-2xl flex flex-wrap items-center gap-3 ${t.card}`}>
            <label htmlFor="birthday-filter" className="font-semibold text-[0.9em]">Birthday program</label>
            <select id="birthday-filter" value={birthdayFilter} onChange={e=>setBirthdayFilter(e.target.value)} className={`px-3 py-3 rounded-lg max-w-full ${t.input} ${focusRing}`}><option value="all">All birthdays</option><option value="today">Birthdays today</option><option value="this-month">Birthdays this month</option></select>
            <span className={`text-[0.85em] ${t.subtle}`}>{filteredMembers.length} matching members · Asia/Manila</span>
            <button type="button" onClick={()=>{setSearchParams({});setSearchTerm('');setStatusFilter('All');setSexFilter('All Sexes');setSortOrder('name');}} className={`px-3 py-3 rounded-lg font-semibold ${t.link} ${focusRing}`}>Clear filters</button>
            <a href="/staff-dashboard" className="underline text-[0.85em]">Create birthday requests in Dashboard</a>
          </section>
          <MemberListPrint allMembers={pwdList} filteredMembers={filteredMembers} filters={printFilters} order={sortOrder} disabled={loading} t={t} themeMode={themeMode} preparedBy={[user.firstName,user.lastName].filter(Boolean).join(' ')}/>
          {/* Members */}
          <section aria-label="Members" className={`rounded-2xl overflow-hidden ${t.card}`}>
            {loading ? (
              <p className={`px-5 py-8 text-center ${t.subtle}`}>Loading members...</p>
            ) : filteredMembers.length === 0 ? (
              <div className="px-5 py-10 flex flex-col items-center text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${t.tile}`}>
                  <Icon name="inbox" className="w-6 h-6" />
                </div>
                <p className={`text-[0.95em] font-medium ${t.muted}`}>No members found.</p>
              </div>
            ) : (
              <>
                {/* Phone: one card per member */}
                <ul className="md:hidden p-3 space-y-3">
                  {filteredMembers.map((m, idx) => {
                    const expiry = getExpiryStatus(m.expired_date || m.expiry_date);
                    const details = [
                      ["Age", m.age || calculateAge(m.birthday)],
                      ["Sex", m.sex],
                      ["Civil status", m.civil_status],
                      ["Blood type", m.blood_type || "Unknown"],
                      ["Disability", m.disability],
                      ["Barangay", m.baranggay || m.barangay || "N/A"],
                      ["Contact", m.contact_numb || "N/A"],
                      ["Birthday", m.birthday],
                    ];
                    return (
                      <li key={m.id || m.pwd_id || idx} className={`p-4 rounded-xl ${t.row} ${birthdayLabel(m)?'border-l-4 border-sky-500':''}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className={`font-semibold break-words ${t.heading}`}>{memberName(m)}</p>{birthdayLabel(m)&&<p className={`text-[0.8em] font-semibold mt-1 ${t.heading}`}>🎂 {birthdayLabel(m)}</p>}
                            <p className={`text-[0.85em] ${t.subtle}`}>{m.pwd_id}</p>
                          </div>
                          {rowActions(m)}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                          {statusBadge(expiry.type, expiry.text)}
                          <span className={`text-[0.85em] ${t.subtle}`}>Expires {m.expired_date || "N/A"}</span>
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[0.9em]">
                          {details.map(([k, v]) => (
                            <div key={k} className="min-w-0">
                              <dt className={`text-[0.85em] ${t.subtle}`}>{k}</dt>
                              <dd className="break-words">{v || "N/A"}</dd>
                            </div>
                          ))}
                        </dl>
                      </li>
                    );
                  })}
                </ul>

                {/* Tablet / PC: table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`text-[0.85em] font-semibold ${t.thead}`}>
                        {["PWD ID", "Expiry", "Full Name", "Age", "DOB", "Sex", "Civil Status", "Disability Type", "Blood Type", "Barangay", "Contact", "Actions"].map((h) => (
                          <th key={h} scope="col" className={`px-4 lg:px-5 py-4 whitespace-nowrap border-b ${t.divider}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={`text-[0.9em] divide-y ${t.divider}`}>
                      {filteredMembers.map((m, idx) => {
                        const expiry = getExpiryStatus(m.expired_date || m.expiry_date);
                        return (
                          <tr key={m.id || m.pwd_id || idx} className={`transition ${t.rowHover} ${birthdayLabel(m)?'border-l-4 border-sky-500':''}`}>
                            <td className={`px-4 lg:px-5 py-4 font-semibold whitespace-nowrap ${t.heading}`}>{m.pwd_id}</td>
                            <td className="px-4 lg:px-5 py-4">
                              <div className="flex flex-col gap-1.5">
                                <span className="whitespace-nowrap">{m.expired_date || m.expiry_date}</span>
                                {statusBadge(expiry.type, expiry.text)}
                              </div>
                            </td>
                            <td className={`px-4 lg:px-5 py-4 font-semibold whitespace-nowrap ${t.heading}`}>{memberName(m)}{birthdayLabel(m)&&<span className="block text-[0.8em] font-semibold mt-1">🎂 {birthdayLabel(m)}</span>}</td>
                            <td className="px-4 lg:px-5 py-4">{m.age || calculateAge(m.birthday)}</td>
                            <td className="px-4 lg:px-5 py-4 whitespace-nowrap">{m.birthday}</td>
                            <td className="px-4 lg:px-5 py-4">{m.sex}</td>
                            <td className="px-4 lg:px-5 py-4">{m.civil_status}</td>
                            <td className="px-4 lg:px-5 py-4">{m.disability}</td>
                            <td className="px-4 lg:px-5 py-4">{m.blood_type || "Unknown"}</td>
                            <td className="px-4 lg:px-5 py-4">{m.baranggay || m.barangay || "N/A"}</td>
                            <td className="px-4 lg:px-5 py-4 whitespace-nowrap">{m.contact_numb || "N/A"}</td>
                            <td className="px-2 lg:px-3 py-2 whitespace-nowrap">{rowActions(m)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
      

      {/* ADD MEMBER MODAL */}
      {showAddModal &&
        modalShell(
          "add-member-title",
          "Add PWD Member",
          () => setShowAddModal(false),
          "add-member-form",
          "Add Member",
          <form id="add-member-form" onSubmit={handleAddMemberSubmit} className="space-y-8"><p className="text-sm">This official LGU member is saved directly to the masterlist and User Management. No login account is created here.</p><label className="flex gap-3 items-start text-sm"><input type="checkbox" required className="size-5 shrink-0"/>I checked the official LGU record and physician documentation for this member.</label>
            <fieldset>
              <legend className="font-bold text-[1.05em] mb-3">ID & Account Information</legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {formField("PWD ID *", "pwd_id", { type: "text", required: true, placeholder: "e.g. PWD-2026-008" })}
                <p className="text-sm self-center">Admin can create login access in User Management. The member can also register online, then complete staff verification and admin approval.</p>
                {formField("ID Expiration Date *", "expired_date", { type: "date", required:true })}
                {formField("Member Since", "member_since", { type: "date", max: new Date(Date.now()+8*3600000).toISOString().slice(0,10) })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="font-bold text-[1.05em] mb-3">Personal Information</legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                {formField("First Name *", "first_name", { type: "text", required: true })}
                {formField("Middle Name", "middle_name", { type: "text" })}
                {formField("Last Name *", "last_name", { type: "text", required: true })}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {formField("Birthday *", "birthday", { type: "date", required: true })}
                {formField("Age", "age", { type: "number", placeholder: "Auto / Manual" })}
                {formSelect("Sex *", "sex", [["Male", "Male"], ["Female", "Female"]])}
                {formSelect("Civil Status *", "civil_status", [
                  ["Single", "Single"],
                  ["Married", "Married"],
                  ["Widowed", "Widowed"],
                  ["Separated", "Separated"],
                ])}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {formSelect("Blood Type", "blood_type", [
                  ["Unknown", "Unknown"],
                  ["A+", "A+"],
                  ["A-", "A-"],
                  ["B+", "B+"],
                  ["B-", "B-"],
                  ["AB+", "AB+"],
                  ["AB-", "AB-"],
                  ["O+", "O+"],
                  ["O-", "O-"],
                ])}
                {formField("Occupation", "occupation", { type: "text", placeholder: "Occupation" })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="font-bold text-[1.05em] mb-3">Disability</legend>
              {formSelect("Disability *", "disability", [["", "Select type"], ...DISABILITY_TYPES.map((d) => [d, d])], { required: true })}
            </fieldset>

            <fieldset>
              <legend className="font-bold text-[1.05em] mb-3">Address & Contact</legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                {formField("House Number", "house_number", { type: "text", placeholder: "House No." })}
                {formField("Street *", "street", { type: "text", required: true, placeholder: "Street / Purok" })}
                {formSelect("Barangay *","baranggay",[["","Select barangay"],...CANDELARIA_BARANGAYS.map(v=>[v,v]),...(newMember.baranggay&&!CANDELARIA_BARANGAYS.includes(newMember.baranggay)?[[newMember.baranggay,newMember.baranggay+" (existing entry)"]]:[])],{required:true})}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                {formField("Municipality *", "municipality", { type: "text", required: true, placeholder: "Municipality" })}
                {formField("Province *", "province", { type: "text", required: true, placeholder: "Province" })}
                {formField("Contact Number *", "contact_numb", { type: "tel", required: true, placeholder: "+63 9XX XXX XXXX" })}
              </div>
              {formField("Email Address", "email", { type: "email", placeholder: "email@example.com" })}
            </fieldset>
          </form>
        )}

      {/* EDIT MEMBER MODAL */}
      {showEditModal &&
        modalShell(
          "edit-member-title",
          "Edit PWD Member",
          () => setShowEditModal(false),
          "edit-member-form",
          "Save Changes",
          <form id="edit-member-form" onSubmit={handleEditMemberSubmit} className="space-y-8">
            <fieldset>
              <legend className="font-bold text-[1.05em] mb-3">ID & Account Information</legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {formField("PWD ID", "pwd_id", { type: "text" })}
                {formField("Account Username", "acc_username", { type: "text", readOnly: true })}
                {formField("ID Expiration Date", "expired_date", { type: "date" })}
                {formField("Member Since", "member_since", { type: "date", max: new Date(Date.now()+8*3600000).toISOString().slice(0,10) })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="font-bold text-[1.05em] mb-3">Personal Information</legend>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                {formField("First Name", "first_name", { type: "text" })}
                {formField("Middle Name", "middle_name", { type: "text" })}
                {formField("Last Name", "last_name", { type: "text" })}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {formField("Birthday", "birthday", { type: "date" })}
                {formField("Age", "age", { type: "number" })}
                {formSelect("Sex", "sex", [["", "Select Sex"], ["Male", "Male"], ["Female", "Female"]])}
                {formSelect("Civil Status", "civil_status", [
                  ["", "Select Status"],
                  ["Single", "Single"],
                  ["Married", "Married"],
                  ["Widowed", "Widowed"],
                  ["Separated", "Separated"],
                ])}
              </div>
            </fieldset>

            <fieldset>
              <legend className="font-bold text-[1.05em] mb-3">Disability and Contact</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {formSelect("Disability", "disability", [["", "Select type"], ...DISABILITY_TYPES.map((d) => [d, d])])}
                {formField("Contact Number", "contact_numb", { type: "tel" })}
                {formField("Email Address", "email", { type: "email" })}
                {formField("Occupation", "occupation", { type: "text" })}
                {formField("Blood Type", "blood_type", { type: "text" })}
                {formField("House Number", "house_number", { type: "text" })}
                {formField("Street", "street", { type: "text" })}
                {formSelect("Barangay","baranggay",[["","Select barangay"],...CANDELARIA_BARANGAYS.map(v=>[v,v]),...(newMember.baranggay&&!CANDELARIA_BARANGAYS.includes(newMember.baranggay)?[[newMember.baranggay,newMember.baranggay+" (existing entry)"]]:[])],{required:false})}
                {formField("Municipality", "municipality", { type: "text" })}
                {formField("Province", "province", { type: "text" })}
              </div>
            </fieldset>
          </form>
        )}
    </StaffLayout>
  );
}



