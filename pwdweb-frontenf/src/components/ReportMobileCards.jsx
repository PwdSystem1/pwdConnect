export default function ReportMobileCards({records=[],label,empty}){
 return <div className="report-mobile-cards" role="list" aria-label={label}>
  {records.length?records.map(record=><article key={record.key} role="listitem" className="report-record"><dl>{record.fields.map(([name,value])=><div key={name} className="report-record-field"><dt>{name}</dt><dd>{value??'—'}</dd></div>)}</dl></article>):<p className="py-6">{empty}</p>}
 </div>;
}
