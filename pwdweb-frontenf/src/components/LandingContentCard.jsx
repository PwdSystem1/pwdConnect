export default function LandingContentCard({item,category,event=false,t,focusRing,onReadMore,speech}){
 return <article className={`rounded-xl overflow-hidden flex flex-col min-w-0 ${t.card}`}>
  <div className={event?'':'flex sm:block gap-3 p-3 pb-0 sm:p-0'}>
   {item.image&&<img src={item.image} alt={item.imageAlt||''} width="1200" height="800" loading="lazy" className={event?'w-full aspect-[3/2] object-cover max-h-44 sm:max-h-48':'w-20 h-24 sm:w-full sm:h-36 object-cover rounded-lg sm:rounded-none shrink-0'}/>}
   <div className={event?'p-4 pb-0':'min-w-0 sm:p-4 sm:pb-0'}>
    {event&&<p className={`text-[0.75em] font-semibold mb-2 ${t.muted}`}>{item.date} · {item.time==='To be announced'?'Time to be announced':item.time+' PHT'}</p>}
    <h3 className={`font-bold leading-snug line-clamp-2 ${event?'text-[1.15em]':'text-[1em]'} ${t.heading}`}>{item.title}</h3>
    <p className={`mt-2 text-[0.875em] leading-relaxed ${event?'line-clamp-3':'line-clamp-2'} ${t.body}`}>{item.description}</p>
    {event&&<p className={`mt-2 text-[0.8em] leading-relaxed ${t.muted}`}>{item.location==='To be announced'?'Venue to be announced':item.location}</p>}
   </div>
  </div>
  <div className="px-3 sm:px-4 pt-2"><p className={`text-[0.65em] ${t.muted}`}>{item.image?'AI-generated illustration':''}</p></div>
  <div className="p-3 sm:p-4 pt-2 sm:pt-2 mt-auto flex flex-wrap items-center justify-between gap-2">
   {speech}<button type="button" aria-label={`Read more about ${item.title}`} aria-haspopup="dialog" onClick={onReadMore} className={`text-[0.8em] min-h-11 px-3 rounded-lg font-semibold ${focusRing} ${t.outline}`}>Read More</button>
  </div>
 </article>;
}
