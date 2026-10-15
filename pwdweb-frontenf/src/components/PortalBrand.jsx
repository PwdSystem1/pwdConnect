import wordmark from '../assets/pwdconnect-wordmark.png';
export default function PortalBrand({themeMode='light',subtitle='',compact=false}){
 const dark=themeMode==='dark',contrast=themeMode==='contrast';
 return <span className={`block min-w-0 shrink ${compact?'w-28 sm:w-36':'w-40 xl:w-48'}`}><span className="relative block w-full aspect-[5.2/1] overflow-hidden"><img src={wordmark} alt="PWDConnect" className="absolute w-full max-w-none h-auto left-0 top-1/2 -translate-y-1/2" style={{filter:contrast?'brightness(0) saturate(100%) invert(90%) sepia(90%) saturate(1500%) hue-rotate(350deg)':dark?'brightness(0) invert(1)':undefined}}/></span>{subtitle&&<span className={`block mt-1 text-[0.65em] leading-tight ${contrast?'text-yellow-300':dark?'text-slate-300':'text-slate-600'}`}>{subtitle}</span>}</span>;
}
