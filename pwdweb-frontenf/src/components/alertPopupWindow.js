export const POPUP_WINDOW_MS=24*60*60*1000;
export function popupEligible(alert,now=Date.now()){
 const created=Date.parse(alert.created_at||'');
 return Number.isSafeInteger(Number(alert.id))&&Number(alert.id)>0&&Number.isFinite(created)&&created<=now&&now-created<POPUP_WINDOW_MS&&alert.popup_eligible!==false;
}
