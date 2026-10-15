import wordmark from '../assets/pwdconnect-wordmark.png';
export default function PublicBrand({themeMode='light',subtitle='Candelaria, Quezon'}){
 const contrast=themeMode==='contrast',dark=themeMode==='dark';
 return <span className="block w-[168px] sm:w-[220px] shrink-0"><span className="relative block w-full aspect-[5.2/1] overflow-hidden"><img src={wordmark} alt="PWDConnect" className="absolute w-full max-w-none h-auto left-0 top-1/2 -translate-y-1/2" style={{filter:contrast?'brightness(0) invert(1) sepia(1) saturate(6)':dark?'brightness(0) invert(1)':undefined}}/></span><span className={`block mt-1 text-[0.7em] ${contrast?'text-yellow-300':dark?'text-slate-300':'text-slate-600'}`}>{subtitle}</span></span>;
}
