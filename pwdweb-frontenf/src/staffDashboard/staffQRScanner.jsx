import {useSearchParams} from 'react-router-dom';
import QRWorkflowResult from './QRWorkflowResult';
import QRLookupHistory from './QRLookupHistory';
import { useEffect, useRef, useState } from 'react';
import { Camera, ImageUp, ScanQrCode, Square } from 'lucide-react';
import StaffLayout from '../components/StaffLayout';
import useStaffAccount from '../components/useStaffAccount';
import { portalRequest } from '../components/portalApi';
import { portalTheme } from '../components/portalTheme';

export default function StaffQRScanner(props){
 const [params,setParams]=useSearchParams(),purpose=params.get('purpose')==='masterlist'?'masterlist':'delivery',targetRequestId=/^[1-9]\d*$/.test(params.get('request_id')||'')?params.get('request_id'):'';
 const staff=useStaffAccount(),t=portalTheme(props.themeMode||'light');
 const [scanning,setScanning]=useState(false),[starting,setStarting]=useState(false),[busy,setBusy]=useState(false),[result,setResult]=useState(null),[error,setError]=useState(''),[manual,setManual]=useState(''),[pwdId,setPwdId]=useState(params.get('pwd_id')||''),[historyVersion,setHistoryVersion]=useState(0),[notice,setNotice]=useState('');
 const videoRef=useRef(null),controlsRef=useRef(null),streamRef=useRef(null),cameraVersion=useRef(0),operationVersion=useRef(0),requestRef=useRef(null),busyRef=useRef(false),imageUrl=useRef(null),fileRef=useRef(null);
 const button=`inline-flex items-center justify-center gap-2 px-4 py-3 min-h-11 rounded-lg font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${t.focus}`;
 function stopCamera(update=true){cameraVersion.current++;controlsRef.current?.stop();controlsRef.current=null;const stream=streamRef.current||videoRef.current?.srcObject;if(stream&&typeof stream.getTracks==='function')stream.getTracks().forEach(track=>track.stop());streamRef.current=null;if(videoRef.current)videoRef.current.srcObject=null;if(update){setScanning(false);setStarting(false);}}
 useEffect(()=>{const hide=()=>{if(document.hidden)stopCamera();};document.addEventListener('visibilitychange',hide);return()=>{document.removeEventListener('visibilitychange',hide);stopCamera(false);operationVersion.current++;requestRef.current?.abort();if(imageUrl.current)URL.revokeObjectURL(imageUrl.current);};},[]);
 async function verify(payload,method="QR"){
  if(busyRef.current)return;stopCamera();setResult(null);setNotice('');setError('');
  if(typeof payload!=='string'||(method==='QR'?!/^PWDCONNECT:v1:[a-f0-9]{64}$/.test(payload.trim()):!payload.trim()||payload.trim().length>50)){setError(method==='QR'?'This is not a valid PWDConnect member QR.':'Enter an exact PWD ID, up to 50 characters.');return;}
  busyRef.current=true;setBusy(true);requestRef.current?.abort();const controller=new AbortController();requestRef.current=controller;
  try{const data=await portalRequest(method==='QR'?'/qr/verify':'/qr/lookup-id',{method:'POST',body:JSON.stringify(method==='QR'?{qrPayload:payload.trim()}:{pwd_id:payload.trim()}),signal:controller.signal});if(!controller.signal.aborted){setResult({...data,lookupMethod:method});setNotice('Member record found. Review identity and current ID status below.');}}
  catch(e){if(e.name!=='AbortError')setError(e.message);}finally{if(!controller.signal.aborted){busyRef.current=false;setBusy(false);}}
 }
 async function startCamera(){
  if(starting||scanning||busyRef.current)return;setError('');setResult(null);setNotice('');
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){setError('Camera scanning requires HTTPS or localhost and a browser with camera support. You can scan a QR image below.');return;}
  stopCamera();const version=++cameraVersion.current;setStarting(true);
  try{
   const {BrowserQRCodeReader}=await import('@zxing/browser');if(version!==cameraVersion.current)return;
   const reader=new BrowserQRCodeReader();
   const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
   if(version!==cameraVersion.current){stream.getTracks().forEach(track=>track.stop());return;}streamRef.current=stream;
   const controls=await reader.decodeFromStream(stream,videoRef.current,(decoded,_error,scanControls)=>{
    if(decoded&&version===cameraVersion.current&&!busyRef.current){scanControls.stop();void verify(decoded.getText());}
   });
   if(version!==cameraVersion.current){controls.stop();return;}controlsRef.current=controls;setScanning(true);setStarting(false);
  }catch(e){if(version===cameraVersion.current){stopCamera();setError(e.name==='NotAllowedError'?'Camera permission was denied. Allow camera access in browser settings, or upload a QR image.':e.name==='NotFoundError'?'No camera was found. Use the image scanner below.':e.name==='NotReadableError'?'The camera is busy or unavailable. Close other apps using it and try again.':'Unable to start the camera. Check camera access and use HTTPS/localhost.');}}
 }
 async function scanImage(event){
  const file=event.target.files?.[0];if(!file||busyRef.current)return;stopCamera();setError('');setResult(null);setNotice('');
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024){setError('Choose a PNG, JPEG, or WebP QR image no larger than 10 MB.');event.target.value='';return;}
  const version=++operationVersion.current;busyRef.current=true;setBusy(true);if(imageUrl.current)URL.revokeObjectURL(imageUrl.current);const url=URL.createObjectURL(file);imageUrl.current=url;
  try{const {BrowserQRCodeReader}=await import('@zxing/browser');const decoded=await new BrowserQRCodeReader().decodeFromImageUrl(url);if(version!==operationVersion.current)return;busyRef.current=false;setBusy(false);await verify(decoded.getText());}
  catch{if(version===operationVersion.current){busyRef.current=false;setBusy(false);setError('No readable QR was found in the image. Upload the member’s downloaded QR PNG or a clear, well-lit photo.');}}
  finally{URL.revokeObjectURL(url);if(imageUrl.current===url)imageUrl.current=null;event.target.value='';}
 }
 function reset(){stopCamera();operationVersion.current++;requestRef.current?.abort();busyRef.current=false;setBusy(false);setError('');setResult(null);setNotice('');setManual('');setPwdId('');if(fileRef.current)fileRef.current.value='';}
 if(!staff)return <p role="status" className="p-8">Loading staff account…</p>;
 return <StaffLayout {...props} user={staff} title="Member Lookup & Service Release">
  <p className={`mb-4 ${t.muted}`}>Scan the member’s PWDConnect QR or type an exact PWD ID to find their official record. Compare their identity before recording an actual service handover.</p><div className="flex flex-wrap gap-3 mb-5">{[["delivery","Service release / delivery"],["masterlist","Find in masterlist"]].map(([value,label])=><button key={value} type="button" disabled={busy} aria-pressed={purpose===value} onClick={()=>{reset();setParams({purpose:value});}} className={`${button} ${purpose===value?t.primary:t.secondary}`}>{label}</button>)}</div>{purpose==='delivery'&&targetRequestId&&<div className={`p-4 rounded-xl mb-5 ${t.tile}`}><p className="font-semibold">Selected service request #{targetRequestId}</p><p className="text-sm mt-2">Scan the member receiving this request, or use the PWD ID fallback. The request must belong to the returned member.</p><button type="button" disabled={busy} onClick={()=>setParams({purpose:"delivery"})} className={`underline mt-2 ${t.focus}`}>Clear request selection</button></div>}
  {error&&<p role="alert" className={`p-4 rounded-xl mb-6 ${t.error}`}>{error}</p>}
  {notice&&<p role="status" className={`p-4 rounded-xl mb-6 ${t.tile}`}>{notice}</p>}
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
   <div className="space-y-6"><section className={`p-5 sm:p-6 rounded-2xl ${t.card}`} aria-label="Camera scanner"><h2 className={`font-bold text-[1.15em] flex items-center gap-2 ${t.heading}`}><Camera className="size-5"/>Camera scanner</h2><div className="relative rounded-xl bg-slate-950 overflow-hidden mt-5 aspect-[4/3]"><video ref={videoRef} autoPlay muted playsInline aria-label="Live camera QR preview" className="w-full h-full object-cover"/>{!scanning&&!starting&&<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-300 p-4 text-center"><ScanQrCode className="size-12" aria-hidden="true"/><p>Start the camera and place the QR inside the frame.</p></div>}{(scanning||starting)&&<div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-2/3 aspect-square border-2 border-white rounded-xl shadow-[0_0_0_999px_rgba(0,0,0,0.2)]"/></div>}</div><div className="flex flex-wrap gap-3 mt-4"><button type="button" disabled={starting||scanning||busy} onClick={startCamera} className={`${button} ${t.primary}`}><Camera className="size-4"/>{starting?'Starting camera…':'Start Camera'}</button><button type="button" disabled={!scanning&&!starting} onClick={()=>stopCamera()} className={`${button} ${t.secondary}`}><Square className="size-4"/>Stop Camera</button></div><p role="status" className={`mt-3 text-[0.85em] ${t.subtle}`}>{busy?'Reading or verifying QR…':scanning?'Camera is active. Hold the QR steady.':starting?'Allow camera access when the browser asks.':'Camera is off.'}</p></section>
    <section className={`p-5 sm:p-6 rounded-2xl ${t.card}`} aria-label="Image scanner"><h2 className={`font-bold flex items-center gap-2 ${t.heading}`}><ImageUp className="size-5"/>Scan a QR image</h2><label htmlFor="qr-image" className={`block text-[0.85em] my-3 ${t.muted}`}>Upload the downloaded QR PNG or a clear QR photo.</label><input ref={fileRef} id="qr-image" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy||starting} onChange={scanImage} className={`block w-full max-w-full p-3 rounded-lg ${t.input} ${t.focus}`}/><p className={`mt-2 text-[0.8em] ${t.subtle}`}>PNG, JPEG, or WebP, up to 10 MB. Only the decoded verification reference is sent to the backend.</p></section>
    <section className={`p-5 sm:p-6 rounded-2xl ${t.card}`}><h2 className="font-bold text-lg">Manual PWD ID search</h2><p className={`text-sm mt-2 ${t.muted}`}>Fallback when the QR is unavailable or unreadable.</p><form onSubmit={e=>{e.preventDefault();void verify(pwdId,'ManualID');}} className="mt-4"><label htmlFor="manual-pwd-id" className="block font-semibold mb-2">Exact PWD ID</label><input id="manual-pwd-id" required maxLength={50} value={pwdId} onChange={e=>setPwdId(e.target.value)} disabled={busy} className={`w-full p-3 min-h-12 rounded-lg ${t.input} ${t.focus}`}/><button type="submit" disabled={busy||!pwdId.trim()} className={`mt-3 ${button} ${t.primary}`}>Search PWD ID</button></form></section><details className={`p-5 rounded-2xl ${t.card}`}><summary className={`cursor-pointer font-semibold ${t.heading}`}>USB scanner / paste QR reference</summary><form onSubmit={event=>{event.preventDefault();void verify(manual);}} className="mt-4"><label htmlFor="manual-qr" className="block text-[0.85em] mb-2">PWDConnect QR reference</label><textarea id="manual-qr" value={manual} maxLength={100} rows={3} disabled={busy} onChange={e=>setManual(e.target.value)} className={`w-full p-3 rounded-lg break-all ${t.input} ${t.focus}`}/><button type="submit" disabled={busy||!manual.trim()} className={`mt-3 ${button} ${t.primary}`}>Verify QR reference</button></form></details>
   </div>
   <QRWorkflowResult purpose={purpose} targetRequestId={targetRequestId} key={result?.eventId||"empty"} result={result} t={t} onReset={reset} onDeliveryRecorded={()=>setHistoryVersion(n=>n+1)}/>
  </div>
 <QRLookupHistory t={t} refreshKey={`${result?.eventId}-${historyVersion}`}/>
 </StaffLayout>;
}

