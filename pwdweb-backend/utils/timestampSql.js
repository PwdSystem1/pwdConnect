// Only for MySQL TIMESTAMP columns, not UTC/Manila DATETIME ledger fields.
// UNIX_TIMESTAMP reads a TIMESTAMP as an instant in any SQL session timezone.
const EPOCH="CAST('1970-01-01 00:00:00' AS DATETIME)";
function column(value){if(!/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?$/.test(value))throw new Error('Invalid timestamp SQL column.');return value;}
function timestampUtcSql(value){return `DATE_FORMAT(TIMESTAMPADD(SECOND,UNIX_TIMESTAMP(${column(value)}),${EPOCH}),'%Y-%m-%dT%H:%i:%sZ')`;}
function timestampManilaSql(value,pattern='%Y-%m-%d %H:%i:%s'){
 if(!['%Y-%m-%d %H:%i:%s','%Y-%m-%d'].includes(pattern))throw new Error('Invalid timestamp SQL format.');
 return `DATE_FORMAT(TIMESTAMPADD(SECOND,UNIX_TIMESTAMP(${column(value)})+28800,${EPOCH}),'${pattern}')`;
}
function timestampRangeSql(value){const c=column(value);return `UNIX_TIMESTAMP(${c})>=? AND UNIX_TIMESTAMP(${c})<?`;}
function manilaEpochRange(start,endExclusive){return [start,endExclusive].map(value=>{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Invalid Manila report boundary.');
 const n=Date.parse(value+'T00:00:00+08:00');if(!Number.isFinite(n))throw new Error('Invalid Manila report boundary.');return n/1000;
});}
module.exports={timestampUtcSql,timestampManilaSql,timestampRangeSql,manilaEpochRange};
