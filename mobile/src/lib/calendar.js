import KoreanLunarCalendar from 'korean-lunar-calendar';
import { Solar } from 'lunar-javascript';

const SOLAR_TERMS_KR = {
  '立春': '입춘', '雨水': '우수', '惊蛰': '경칩', '春分': '춘분', '清明': '청명', '谷雨': '곡우',
  '立夏': '입하', '小满': '소만', '芒种': '망종', '夏至': '하지', '小暑': '소서', '大暑': '대서',
  '立秋': '입추', '处暑': '처서', '白露': '백로', '秋分': '추분', '寒露': '한로', '霜降': '상강',
  '立冬': '입동', '小雪': '소설', '大雪': '대설', '冬至': '동지', '小寒': '소한', '大寒': '대한',
};

const cal = new KoreanLunarCalendar();

function buildDay(y, m1, d, id, isOtherMonth, now) {
  cal.setSolarDate(y, m1, d);
  const lunar = cal.getLunarCalendar();
  const termChinese = isOtherMonth ? '' : Solar.fromYmd(y, m1, d).getLunar().getJieQi();
  const term = termChinese ? SOLAR_TERMS_KR[termChinese] || termChinese : '';
  const fullDateStr = `${y}-${String(m1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const dayOfWeek = new Date(y, m1 - 1, d).getDay();
  const isToday = !isOtherMonth &&
    d === now.getDate() && (m1 - 1) === now.getMonth() && y === now.getFullYear();

  let holidayName = '';
  let isHoliday = false;
  if (!isOtherMonth) {
    if (lunar.month === 1 && lunar.day === 1) { holidayName = '설날'; isHoliday = true; }
    if (lunar.month === 8 && lunar.day === 15) { holidayName = '추석'; isHoliday = true; }
    if (lunar.month === 4 && lunar.day === 8) { holidayName = '석가탄신일'; isHoliday = true; }
    if (m1 === 1 && d === 1) { holidayName = '신정'; isHoliday = true; }
    if (m1 === 3 && d === 1) { holidayName = '삼일절'; isHoliday = true; }
    if (m1 === 5 && d === 5) { holidayName = '어린이날'; isHoliday = true; }
    if (m1 === 6 && d === 6) { holidayName = '현충일'; isHoliday = true; }
    if (m1 === 8 && d === 15) { holidayName = '광복절'; isHoliday = true; }
    if (m1 === 10 && d === 3) { holidayName = '개천절'; isHoliday = true; }
    if (m1 === 10 && d === 9) { holidayName = '한글날'; isHoliday = true; }
    if (m1 === 12 && d === 25) { holidayName = '성탄절'; isHoliday = true; }
  }

  return {
    type: 'day',
    id,
    day: d,
    lunarDateStr: `${lunar.month}.${lunar.day}`,
    lunarMonth: lunar.month,
    lunarDay: lunar.day,
    term,
    holidayName,
    isHoliday,
    isToday,
    isOtherMonth,
    fullDateStr,
    dayOfWeek,
  };
}

export function generateCalendarDays(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const m1 = month + 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const now = new Date();
  const days = [];

  // Leading days from previous month
  const prevYear = month === 0 ? year - 1 : year;
  const prevM1 = month === 0 ? 12 : month;
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    days.push(buildDay(prevYear, prevM1, d, `prev-${d}`, true, now));
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(buildDay(year, m1, d, `day-${d}`, false, now));
  }

  // Trailing days from next month
  const trailing = (7 - (days.length % 7)) % 7;
  const nextYear = month === 11 ? year + 1 : year;
  const nextM1 = month === 11 ? 1 : m1 + 1;
  for (let d = 1; d <= trailing; d++) {
    days.push(buildDay(nextYear, nextM1, d, `next-${d}`, true, now));
  }

  return days;
}

export function getLunarDate(solarDateStr) {
  const [year, month, day] = solarDateStr.split('-').map(Number);
  cal.setSolarDate(year, month, day);
  return cal.getLunarCalendar();
}

export function matchesReminder(reminder, day) {
  if (!day || day.type === 'empty') return false;
  if (reminder.solar_date === day.fullDateStr) return true;
  if (reminder.recurrence === 'yearly') {
    const isLunarRecurrence = reminder.lunar_date?.isLunar !== false;
    if (isLunarRecurrence) {
      return reminder.lunar_date?.month == day.lunarMonth && reminder.lunar_date?.day == day.lunarDay;
    }
    const [, rM, rD] = reminder.solar_date.split('-').map(Number);
    const [, dM, dD] = day.fullDateStr.split('-').map(Number);
    return rM === dM && rD === dD;
  }
  return false;
}
