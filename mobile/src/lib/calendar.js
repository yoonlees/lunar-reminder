import KoreanLunarCalendar from 'korean-lunar-calendar';
import { Solar } from 'lunar-javascript';

const SOLAR_TERMS_KR = {
  '立春': '입춘', '雨水': '우수', '惊蛰': '경칩', '春分': '춘분', '清明': '청명', '谷雨': '곡우',
  '立夏': '입하', '小满': '소만', '芒种': '망종', '夏至': '하지', '小暑': '소서', '大暑': '대서',
  '立秋': '입추', '处暑': '처서', '白露': '백로', '秋分': '추분', '寒露': '한로', '霜降': '상강',
  '立冬': '입동', '小雪': '소설', '大雪': '대설', '冬至': '동지', '小寒': '소한', '大寒': '대한',
};

const cal = new KoreanLunarCalendar();

export function generateCalendarDays(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const now = new Date();
  const days = [];

  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ type: 'empty', id: `empty-${i}` });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cal.setSolarDate(year, month + 1, d);
    const lunar = cal.getLunarCalendar();

    const termChinese = Solar.fromYmd(year, month + 1, d).getLunar().getJieQi();
    const term = termChinese ? SOLAR_TERMS_KR[termChinese] || termChinese : '';

    const fullDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = new Date(year, month, d).getDay();
    const isToday =
      d === now.getDate() && month === now.getMonth() && year === now.getFullYear();

    let holidayName = '';
    let isHoliday = false;
    const m = month + 1;

    if (lunar.month === 1 && lunar.day === 1) { holidayName = '설날'; isHoliday = true; }
    if (lunar.month === 8 && lunar.day === 15) { holidayName = '추석'; isHoliday = true; }
    if (lunar.month === 4 && lunar.day === 8) { holidayName = '석가탄신일'; isHoliday = true; }
    if (m === 1 && d === 1) { holidayName = '신정'; isHoliday = true; }
    if (m === 3 && d === 1) { holidayName = '삼일절'; isHoliday = true; }
    if (m === 5 && d === 5) { holidayName = '어린이날'; isHoliday = true; }
    if (m === 6 && d === 6) { holidayName = '현충일'; isHoliday = true; }
    if (m === 8 && d === 15) { holidayName = '광복절'; isHoliday = true; }
    if (m === 10 && d === 3) { holidayName = '개천절'; isHoliday = true; }
    if (m === 10 && d === 9) { holidayName = '한글날'; isHoliday = true; }
    if (m === 12 && d === 25) { holidayName = '성탄절'; isHoliday = true; }

    days.push({
      type: 'day',
      id: `day-${d}`,
      day: d,
      lunarDateStr: `${lunar.month}.${lunar.day}`,
      lunarMonth: lunar.month,
      lunarDay: lunar.day,
      term,
      holidayName,
      isHoliday,
      isToday,
      fullDateStr,
      dayOfWeek,
    });
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
