// Encoding time comes from the ledger, independently of member_since.
function encodingSeries(start,end,rows,tracking,bucket='day') {
 const counts=new Map(rows.map(r=>[r.date,Number(r.members||0)]));
 const result=[],cursor=new Date(start+'T00:00:00Z'),finish=new Date(end+'T00:00:00Z');
 if(bucket==='month')cursor.setUTCDate(1);
 while(cursor<=finish){
  const date=cursor.toISOString().slice(0,bucket==='month'?7:10);
  const next=bucket==='month'?new Date(Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth()+1,1)):new Date(cursor.getTime()+86400000);
  const boundary=next.toISOString().slice(0,10)+' 00:00:00';
  const coverage=!tracking||boundary<=tracking?'Not tracked':(date+(bucket==='month'?'-01':'')+' 00:00:00'<tracking?'Partial':'Tracked');
  result.push({date,members:coverage==='Not tracked'?null:(counts.get(date)||0),coverage});
  cursor.setTime(next.getTime());
 }
 return result;
}
module.exports={encodingSeries};
