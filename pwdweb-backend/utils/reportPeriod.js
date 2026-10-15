const DAY = 86400000;
function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Use a valid YYYY-MM-DD date.');
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0,10) !== value) throw new Error('The date does not exist.');
  return date;
}
function iso(date) { return date.toISOString().slice(0,10); }
function period(query={}) {
  const mode=query.mode||'monthly';
  if (!['weekly','monthly','custom','all'].includes(mode)) throw new Error('Choose weekly, monthly, custom, or all.');
  const today=iso(new Date(Date.now()+8*60*60*1000));
  let start,end;
  if(mode==='all'){start=parseDate(query.start||'1900-01-01');end=parseDate(query.end||today);}
  else if(mode==='custom'){start=parseDate(query.start);end=parseDate(query.end);}
  else {
    const anchor=parseDate(query.date||today);
    if(mode==='weekly'){start=new Date(anchor.getTime()-((anchor.getUTCDay()+6)%7)*DAY);end=new Date(start.getTime()+6*DAY);}
    else{start=new Date(Date.UTC(anchor.getUTCFullYear(),anchor.getUTCMonth(),1));end=new Date(Date.UTC(anchor.getUTCFullYear(),anchor.getUTCMonth()+1,0));}
  }
  if(end<start || (mode!=='all' && (end-start)/DAY>=366)) throw new Error('Choose an ordered range of at most 366 days.');
  return {mode,start:iso(start),end:iso(end),endExclusive:iso(new Date(end.getTime()+DAY)),timezone:'Asia/Manila'};
}
function positive(value,fallback=null){if(value===undefined||value==='')return fallback;if(!/^[1-9]\d*$/.test(String(value))||!Number.isSafeInteger(Number(value)))throw new Error('Invalid pagination value.');return Number(value);}
function snapshot(value){return value==='0'||value===0?0:positive(value);}
function csvCell(value){let text=String(value??'');if(/^[\s]*[=+\-@]/.test(text)||/^[\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
module.exports={period,positive,snapshot,csvCell};
