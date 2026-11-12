// RFC 5545: UTC dates, escaped text and lines folded at UTF-8 octet boundaries.
const text=value=>String(value||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const stamp=value=>new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
export function foldCalendarLine(line){
 const out=[];let part='',bytes=0;
 for(const char of line){const n=new TextEncoder().encode(char).length;if(bytes+n>75){out.push(part);part=' ';bytes=1}part+=char;bytes+=n}out.push(part);return out.join('\r\n');
}
export function eventCalendar(event,now=new Date()){
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//sol1o.me//Campus Events//MN','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT','UID:'+text(event.id)+'@sol1o.me','DTSTAMP:'+stamp(now),'DTSTART:'+stamp(event.starts_at),'DTEND:'+stamp(event.ends_at),'SUMMARY:'+text(event.title),'LOCATION:'+text(event.location),'DESCRIPTION:'+text(event.description+'\n'+(event.price_note||'')+(event.registration_url?'\n'+event.registration_url:'')),'END:VEVENT','END:VCALENDAR'];
 return lines.map(foldCalendarLine).join('\r\n')+'\r\n';
}
