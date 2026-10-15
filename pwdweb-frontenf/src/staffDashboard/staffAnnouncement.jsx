import {PORTAL_API} from '../components/portalApi';
import StaffLayout from "../components/StaffLayout";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react";


const API_URL=PORTAL_API+'/announcements';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;



function getTheme(mode) {
  if (mode === "contrast") {
    return {
      page: "bg-black text-yellow-300",
      sidebar: "bg-black border-r-2 border-yellow-400",
      topbar: "bg-black border-b-2 border-yellow-400",
      card: "bg-black border-2 border-yellow-400",
      heading: "text-yellow-400",
      muted: "text-yellow-200",
      divider: "border-yellow-400/40",
      active: "bg-yellow-400 text-black",
      idle: "text-yellow-300 hover:bg-zinc-900",
      tile: "bg-yellow-400 text-black",
      input: "bg-black text-yellow-300 border-2 border-yellow-400",
      primary: "bg-yellow-400 text-black hover:bg-yellow-300",
      secondary: "border-2 border-yellow-400 hover:bg-zinc-900",
      danger: "text-yellow-300 border border-yellow-400 hover:bg-zinc-900",
      error: "bg-black border-2 border-yellow-400 text-yellow-300",
      focus: "outline-none focus-visible:ring-4 focus-visible:ring-white",
    };
  }

  if (mode === "dark") {
    return {
      page: "bg-slate-950 text-slate-100",
      sidebar: "bg-slate-900 border-r border-slate-800",
      topbar: "bg-slate-900 border-b border-slate-800",
      card: "bg-slate-900 border border-slate-800",
      heading: "text-white",
      muted: "text-slate-300",
      divider: "border-slate-800",
      active: "bg-sky-600 text-white",
      idle: "text-slate-300 hover:bg-slate-800",
      tile: "bg-slate-800 text-sky-300",
      input: "bg-slate-800 text-slate-100 border border-slate-600",
      primary: "bg-sky-600 text-white hover:bg-sky-500",
      secondary: "border border-slate-600 hover:bg-slate-800",
      danger: "text-rose-300 hover:bg-rose-950",
      error: "bg-rose-950 text-rose-200 border border-rose-800",
      focus: "outline-none focus-visible:ring-4 focus-visible:ring-sky-400",
    };
  }

  return {
    page: "bg-slate-50 text-slate-800",
    sidebar: "bg-white text-slate-700 border-r border-slate-200",
    topbar: "bg-white border-b border-slate-200",
    card: "bg-white border border-slate-200 shadow-sm",
    heading: "text-slate-900",
    muted: "text-slate-600",
    divider: "border-slate-200",
    active: "bg-[#0F2A47] text-white",
    idle: "text-slate-600 hover:bg-slate-100",
    tile: "bg-slate-100 text-[#0F2A47]",
    input: "bg-white text-slate-900 border border-slate-300",
    primary: "bg-[#0F2A47] text-white hover:bg-sky-800",
    secondary: "border border-slate-300 hover:bg-slate-100",
    danger: "text-rose-700 hover:bg-rose-50",
    error: "bg-rose-50 text-rose-800 border border-rose-200",
    focus: "outline-none focus-visible:ring-4 focus-visible:ring-sky-400",
  };
}

async function request(url, options = {}) {
  const response = await fetch(url===API_URL&&(options.method||'GET')==='GET'?API_URL+'/manage':url,{...options,headers:{...options.headers,Authorization:'Bearer '+(localStorage.getItem('portalToken')||'')}});
  if (!(response.headers.get("content-type") || "").includes("application/json")) {
    throw new Error(`Announcement API returned ${response.status}. Register /api/announcements and restart the backend.`);
  }
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Unable to complete the request.");
  }

  return data;
}

export default function StaffAnnouncement({
  fontSize = "text-base",
  setFontSize = () => {},
  themeMode = "light",
  setThemeMode = () => {},
  isDyslexicFont = false,
  setIsDyslexicFont = () => {},
}) {
  const navigate = useNavigate();
  const t = getTheme(themeMode);

  const [user, setUser] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  
  
  const [editor, setEditor] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [picture, setPicture] = useState(null);
  const [pictureLoading, setPictureLoading] = useState(false);
  const pictureInputRef = useRef(null);
  const pictureVersion = useRef(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const dialogRef = useRef(null);
  

  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem("userSession") || "null");

      if (!session?.staff_username) {
        navigate("/", { replace: true });
        return;
      }

      setUser(session);
    } catch {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();

    request(API_URL, { signal: controller.signal })
      .then((data) => setAnnouncements(data.announcements))
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [user]);

  

  

  useEffect(() => {
    if (editor && !dialogRef.current.open) dialogRef.current.showModal();
    if (!editor && dialogRef.current.open) dialogRef.current.close();
  }, [editor]);

  

  const button = `min-h-11 px-4 py-2.5 rounded-lg font-semibold
    inline-flex items-center justify-center gap-2 transition cursor-pointer
    disabled:opacity-50 disabled:cursor-not-allowed ${t.focus}`;

  

  function openEditor(announcement = null) {
    pictureVersion.current += 1;
    setPicture(null);
    setPictureLoading(false);
    if (pictureInputRef.current) pictureInputRef.current.value = "";
    setTitle(announcement?.title || "");
    setContent(announcement?.content || "");
    setFormError("");
    setNotice("");
    setEditor(announcement || { id: null });
  }

  async function selectPicture(event) {
    const version = ++pictureVersion.current;
    const file = event.target.files?.[0];
    setPictureLoading(false);
    setPicture(null);
    setFormError("");
    if (!file) { setPictureLoading(false); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setFormError("Choose a PNG, JPEG, or WebP picture.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFormError("Picture must not exceed 5 MB.");
      event.target.value = "";
      return;
    }
    setPictureLoading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Unable to read the picture."));
        reader.readAsDataURL(file);
      });
      await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = resolve;
        image.onerror = () => reject(new Error("This file is not a readable picture."));
        image.src = dataUrl;
      });
      if (version === pictureVersion.current) setPicture(dataUrl);
    } catch (error) {
      if (version === pictureVersion.current) {
        setFormError(error.message);
        if (pictureInputRef.current) pictureInputRef.current.value = "";
      }
    } finally {
      if (version === pictureVersion.current) setPictureLoading(false);
    }
  }

  async function reload() {
    setError("");
    setLoading(true);

    try {
      const data = await request(API_URL);
      setAnnouncements(data.announcements);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function save(event) {
    event.preventDefault();
    if (!editor || busy || pictureLoading) return;

    const payload = { title: title.trim(), content: content.trim() };
    if (editor.id === null && !picture) {
      setFormError("Please choose an announcement picture.");
      return;
    }
    if (picture) payload.pic = picture;

    if (!payload.title || !payload.content) {
      setFormError("Please enter a title and announcement content.");
      return;
    }

    setBusy(true);
    setFormError("");

    try {
      const isEditing = editor.id !== null;
      const data = await request(
        isEditing ? `${API_URL}/${editor.id}` : API_URL,
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      setAnnouncements((previous) =>
        isEditing
          ? previous.map((item) =>
              item.id === editor.id ? data.announcement : item
            )
          : [data.announcement, ...previous]
      );

      setNotice(isEditing ? "Announcement updated." : "Announcement created.");
      setEditor(null);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(announcement) {
    if (busy || !window.confirm(`Delete "${announcement.title}"?`)) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await request(`${API_URL}/${announcement.id}`, { method: "DELETE" });
      setAnnouncements((previous) =>
        previous.filter((item) => item.id !== announcement.id)
      );
      setNotice("Announcement deleted.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <StaffLayout user={user} fontSize={fontSize} setFontSize={setFontSize} themeMode={themeMode} setThemeMode={setThemeMode} isDyslexicFont={isDyslexicFont} setIsDyslexicFont={setIsDyslexicFont}>
      

      

      
        

        <div className="space-y-6 w-full min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className={`text-[1.6em] sm:text-[1.9em] font-bold
                tracking-tight ${t.heading}`}>
                Announcements Management
              </h1>
              <p className={`text-[1em] mt-1.5 ${t.muted}`}>
                Create and manage announcements for PWD users.
              </p>
            </div>
            <button
              disabled={!user || loading || busy}
              onClick={() => openEditor()}
              className={`${button} ${t.primary}`}
            >
              <Plus className="w-5 h-5" aria-hidden="true" />
              Create Announcement
            </button>
          </div>

          <p role="status" aria-live="polite" className={t.muted}>{notice}</p>

          {error && (
            <div role="alert" className={`rounded-xl p-4 ${t.error}`}>
              <p>{error}</p>
              <button onClick={reload} className={`mt-3 ${button} ${t.secondary}`}>
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className={`rounded-2xl p-8 text-center ${t.card}`} role="status">
              Loading announcements…
            </div>
          ) : !error && announcements.length === 0 ? (
            <div className={`rounded-2xl p-10 text-center ${t.card}`}>
              <Megaphone className={`w-10 h-10 mx-auto mb-3 ${t.muted}`}
                aria-hidden="true" />
              <p className={`font-semibold ${t.heading}`}>No announcements yet.</p>
              <p className={`mt-2 ${t.muted}`}>Create your first announcement.</p>
            </div>
          ) : (
            <section aria-label="Announcements" className="space-y-4">
              {announcements.map((announcement) => (
                <article key={announcement.id}
                  className={`rounded-2xl p-5 sm:p-7 ${t.card}`}>
                  {announcement.pic && (
                    <div className="mb-5 rounded-xl">
                      <img src={announcement.pic} alt={`Announcement: ${announcement.title}`}
                        loading="lazy" className="w-full max-h-[28rem] object-contain rounded-xl" />
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-lg flex items-center
                      justify-center shrink-0 ${t.tile}`}>
                      <Megaphone className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <h2 className={`text-[1.15em] font-semibold
                          break-words min-w-0 ${t.heading}`}>
                          {announcement.title}
                        </h2><span className={`px-2 py-1 rounded-full text-[0.75em] ${t.tile}`}>{announcement.status || 'Published'}</span>
                        <div className="flex gap-1 shrink-0">
                          <button
                            aria-label={`Edit ${announcement.title}`}
                            disabled={busy}
                            onClick={() => openEditor(announcement)}
                            className={`${button} px-3 ${t.idle}`}
                          >
                            <Pencil className="w-5 h-5" aria-hidden="true" />
                          </button>
                          <button
                            aria-label={`Delete ${announcement.title}`}
                            disabled={busy}
                            onClick={() => remove(announcement)}
                            className={`${button} px-3 ${t.danger}`}
                          >
                            <Trash2 className="w-5 h-5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                      <p className={`mt-2 text-[1em] leading-relaxed
                        whitespace-pre-wrap break-words ${t.muted}`}>
                        {announcement.content}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      

      {/* Native dialog supplies focus trapping and returns focus on close. */}
      <dialog
        ref={dialogRef}
        aria-labelledby="announcement-dialog-title"
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
        onClose={() => setEditor(null)}
        className={`m-auto w-[calc(100%_-_2rem)] max-w-3xl max-h-[90vh]
          overflow-y-auto rounded-2xl p-6 sm:p-8 backdrop:bg-black/50
          ${t.card} ${themeMode === "contrast" ? "text-yellow-300"
            : themeMode === "dark" ? "text-slate-100" : "text-slate-800"}`}
      >
        <form onSubmit={save} className="space-y-5">
          <h2 id="announcement-dialog-title"
            className={`text-[1.4em] font-bold ${t.heading}`}>
            {editor?.id != null ? "Edit Announcement" : "Create Announcement"}
          </h2>

          {formError && (
            <p role="alert" className={`p-3 rounded-lg ${t.error}`}>{formError}</p>
          )}

          <div>
            <label htmlFor="announcement-title" className="block font-semibold mb-2">
              Title
            </label>
            <input
              id="announcement-title"
              autoFocus
              required
              maxLength={255}
              disabled={busy}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter announcement title"
              className={`w-full min-h-12 rounded-lg px-4 py-3
                ${t.input} ${t.focus}`}
            />
          </div>

          <div>
            <label htmlFor="announcement-content" className="block font-semibold mb-2">
              Content
            </label>
            <textarea
              id="announcement-content"
              required
              maxLength={555}
              rows={7}
              disabled={busy}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Enter announcement content"
              aria-describedby="announcement-content-limit"
              className={`w-full rounded-lg px-4 py-3 resize-y
                ${t.input} ${t.focus}`}
            />
            <p id="announcement-content-limit"
              className={`text-[0.8em] mt-1 ${t.muted}`}>
              {content.length}/555 characters
            </p>
          </div>

          <div>
            <label htmlFor="announcement-picture" className="block font-semibold mb-2">
              Announcement Picture {editor?.id == null ? "*" : "(replace optional)"}
            </label>
            <input id="announcement-picture" ref={pictureInputRef} type="file"
              accept="image/png,image/jpeg,image/webp" disabled={busy || pictureLoading}
              onChange={selectPicture} aria-describedby="announcement-picture-help"
              className={`w-full rounded-lg p-3 ${t.input} ${t.focus}`} />
            <p id="announcement-picture-help" className={`text-[0.8em] mt-2 ${t.muted}`}>
              PNG, JPEG, or WebP. Maximum 5 MB. On edit, no new file keeps the existing picture.
            </p>
            {pictureLoading && <p role="status" className="mt-2">Checking picture…</p>}
            {(picture || editor?.pic) && (
              <img src={picture || editor.pic} alt="Announcement picture preview"
                className="w-full max-h-72 object-contain rounded-xl mt-4" />
            )}
            {picture && (
              <button type="button" disabled={busy}
                onClick={() => {
                  pictureVersion.current += 1;
                  setPicture(null);
                  if (pictureInputRef.current) pictureInputRef.current.value = "";
                }} className={`mt-3 ${button} ${t.secondary}`}>
                Clear selected picture
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditor(null)}
              className={`${button} ${t.secondary}`}
            >
              Cancel
            </button>
            <button type="submit" disabled={busy || pictureLoading}
              className={`${button} ${t.primary}`}>
              {busy ? "Saving…" : editor?.id != null ? "Save Changes" : "Create"}
            </button>
          </div>
        </form>
      </dialog>
    </StaffLayout>
  );
}

