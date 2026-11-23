// RFC 5545: UTC dates, escaped text and lines folded at UTF-8 octet boundaries.
const text=value=>String(value||'').replace(/\\/g,'\\\\').replace(/\r\n?|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const stamp=value=>new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
export function foldCalendarLine(line){
 const out=[];let part='',bytes=0;
 for(const char of line){const n=new TextEncoder().encode(char).length;if(bytes+n>75){out.push(part);part=' ';bytes=1}part+=char;bytes+=n}out.push(part);return out.join('\r\n');
}
export function eventCalendar(event,now=new Date()){
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//sol1o.me//Campus Events//MN','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT','UID:'+text(event.id)+'@sol1o.me','DTSTAMP:'+stamp(now),'DTSTART:'+stamp(event.starts_at),'DTEND:'+stamp(event.ends_at),'SUMMARY:'+text(event.title),'LOCATION:'+text(event.location),'DESCRIPTION:'+text(event.description+'\n'+(event.price_note||'')+(event.registration_url?'\n'+event.registration_url:'')),'END:VEVENT','END:VCALENDAR'];
 return lines.map(foldCalendarLine).join('\r\n')+'\r\n';
}

const dayMs = 86_400_000;
const weekMs = dayMs * 7;
const ulaanbaatarOffset = 8 * 60 * 60 * 1000;
const lessonTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
function termDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const date = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(date) && new Date(date).toISOString().startsWith(value) ? date : NaN;
}
function lessonStamp(day, time) {
  const [hour, minute] = time.split(':').map(Number);
  return stamp(day + (hour * 60 + minute) * 60000 - ulaanbaatarOffset);
}

export function timetableCalendar(lessons, termStart, termEnd, now = new Date()) {
  const start = termDate(termStart);
  const end = termDate(termEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    throw new RangeError('Улирлын эхлэх, дуусах огноог зөв сонгоно уу.');
  }
  const startWeekday = (new Date(start).getUTCDay() + 6) % 7;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//sol1o.me//Timetable//MN', 'CALSCALE:GREGORIAN'];
  for (const lesson of lessons) {
    if (!Number.isInteger(lesson.day) || lesson.day < 0 || lesson.day > 6 ||
        !lessonTime.test(lesson.start) || !lessonTime.test(lesson.end) || lesson.start >= lesson.end) continue;
    const first = start + ((lesson.day - startWeekday + 7) % 7) * dayMs;
    if (first > end) continue;
    const count = Math.floor((end - first) / weekMs) + 1;
    lines.push(
      'BEGIN:VEVENT',
      'UID:' + text(lesson.id) + '-' + termStart + '@timetable.sol1o.me',
      'DTSTAMP:' + stamp(now),
      'DTSTART:' + lessonStamp(first, lesson.start),
      'DTEND:' + lessonStamp(first, lesson.end),
      'SUMMARY:' + text(lesson.name)
    );
    if (lesson.room) lines.push('LOCATION:' + text(lesson.room));
    if (count > 1) lines.push('RRULE:FREQ=WEEKLY;COUNT=' + count);
    lines.push('END:VEVENT');
  }
  if (lines.length === 4) throw new RangeError('Сонгосон хугацаанд хуваарьтай хичээл алга.');
  lines.push('END:VCALENDAR');
  return lines.map(foldCalendarLine).join('\r\n') + '\r\n';
}
