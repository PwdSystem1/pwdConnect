export function portalTheme(mode) {
  const focus='outline-none focus-visible:ring-4 focus-visible:ring-sky-400';
  if(mode==='contrast')return{
    page:'bg-black text-yellow-300',sidebar:'bg-black border-r-2 border-yellow-400',header:'bg-black border-b-2 border-yellow-400',
    card:'bg-black border-2 border-yellow-400',heading:'text-yellow-400',muted:'text-yellow-200',subtle:'text-yellow-200/80',
    active:'bg-yellow-400 text-black',idle:'text-yellow-300 hover:bg-zinc-900',tile:'bg-yellow-400 text-black',
    input:'bg-black text-yellow-300 border-2 border-yellow-400',divider:'border-yellow-400/40',
    primary:'bg-yellow-400 text-black hover:bg-yellow-300',secondary:'border-2 border-yellow-400 hover:bg-zinc-900',
    unread:'bg-zinc-900',badge:'bg-yellow-400 text-black',error:'border-2 border-yellow-400 text-yellow-300',
    focus:'outline-none focus-visible:ring-4 focus-visible:ring-white',bubble:'bg-yellow-400 text-black',
  };
  if(mode==='dark')return{
    page:'bg-slate-950 text-slate-100',sidebar:'bg-slate-900 border-r border-slate-800',header:'bg-slate-900 border-b border-slate-800',
    card:'bg-slate-900 border border-slate-800',heading:'text-white',muted:'text-slate-300',subtle:'text-slate-400',
    active:'bg-sky-600 text-white',idle:'text-slate-300 hover:bg-slate-800',tile:'bg-slate-800 text-sky-300',
    input:'bg-slate-800 text-slate-100 border border-slate-600',divider:'border-slate-800',
    primary:'bg-sky-600 text-white hover:bg-sky-500',secondary:'border border-slate-600 hover:bg-slate-800',
    unread:'bg-sky-950/40',badge:'bg-rose-600 text-white',error:'bg-rose-950 border border-rose-800 text-rose-200',focus,bubble:'bg-sky-700 text-white',
  };
  return{
    page:'bg-slate-50 text-slate-800',sidebar:'bg-white border-r border-slate-200',header:'bg-white border-b border-slate-200',
    card:'bg-white border border-slate-200 shadow-sm',heading:'text-slate-900',muted:'text-slate-600',subtle:'text-slate-500',
    active:'bg-[#0F2A47] text-white',idle:'text-slate-600 hover:bg-slate-100',tile:'bg-slate-100 text-[#0F2A47]',
    input:'bg-white text-slate-900 border border-slate-300',divider:'border-slate-200',
    primary:'bg-[#0F2A47] text-white hover:bg-sky-800',secondary:'border border-slate-300 hover:bg-slate-100',
    unread:'bg-sky-50',badge:'bg-rose-600 text-white',error:'bg-rose-50 border border-rose-200 text-rose-800',focus,bubble:'bg-[#0F2A47] text-white',
  };
}
