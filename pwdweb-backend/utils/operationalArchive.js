// Only operational queries use this predicate. Reports and audit history do not.
const KINDS=new Set(['emergency','broadcast','service','announcement']);
function visible(kind,id){
 if(!KINDS.has(kind)||!/^\w+\.id$|^id$/.test(id))throw Error('Invalid archive query reference.');
 return `NOT EXISTS (SELECT 1 FROM portal_archived_records ar WHERE ar.kind='${kind}' AND ar.record_id=${id} AND ar.active=1)`;
}
async function assertVisible(connection,kind,id){
 if(!KINDS.has(kind))throw Error('Invalid archive kind.');
 const [rows]=await connection.execute('SELECT record_id FROM portal_archived_records WHERE kind=? AND record_id=? AND active=1 FOR UPDATE',[kind,id]);
 if(rows.length)throw Object.assign(Error('This record is archived. Ask an administrator to restore it in System Settings first.'),{status:409});
}
module.exports={visible,assertVisible};
