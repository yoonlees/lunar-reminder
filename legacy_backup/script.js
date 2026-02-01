import { signInWithGoogle, signOut, getCurrentUser, supabase } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', async () => {
    let currentDate = new Date();

    const monthYearDisplay = document.getElementById('monthYearDisplay');
    const calendarGrid = document.getElementById('calendarGrid');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    // Auth Elements
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userInfo = document.getElementById('userInfo');
    const userEmail = document.getElementById('userEmail');
    const authContainer = document.getElementById('authContainer');

    // Auth State Management
    function updateAuthUI(user) {
        if (user) {
            loginBtn.style.display = 'none';
            userInfo.style.display = 'flex';
            userEmail.textContent = user.email;
        } else {
            loginBtn.style.display = 'block';
            userInfo.style.display = 'none';
            userEmail.textContent = '';
        }
    }

    // Initialize Auth
    const user = await getCurrentUser();
    updateAuthUI(user);

    // Auth Event Listeners
    loginBtn.addEventListener('click', async () => {
        await signInWithGoogle();
    });

    logoutBtn.addEventListener('click', async () => {
        await signOut();
        updateAuthUI(null);
    });

    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
        updateAuthUI(session?.user ?? null);
    });

    function renderCalendar(date) {
        // Clear previous days (keep weekdays)
        const days = calendarGrid.querySelectorAll('.day');
        days.forEach(day => day.remove());

        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed

        // Update Header
        monthYearDisplay.textContent = date.toLocaleString('default', { month: 'long', year: 'numeric' });

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfWeek = new Date(year, month, 1).getDay();

        // Padding
        for (let i = 0; i < firstDayOfWeek; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.classList.add('day', 'empty');
            calendarGrid.appendChild(emptyDay);
        }

        const now = new Date();

        for (let d = 1; d <= daysInMonth; d++) {
            const dayEl = document.createElement('div');
            dayEl.classList.add('day');

            // Solar uses 1-indexed month
            const solar = Solar.fromYmd(year, month + 1, d);
            const lunar = solar.getLunar();
            const lunarDateStr = `${lunar.getMonth()}/${lunar.getDay()}`;
            const term = lunar.getJieQi();

            if (d === now.getDate() && month === now.getMonth() && year === now.getFullYear()) {
                dayEl.classList.add('today');
            }

            // Check for note
            // Format YYYY-MM-DD
            const monthStr = (month + 1).toString().padStart(2, '0');
            const dayStr = d.toString().padStart(2, '0');
            const dateStr = `${year}-${monthStr}-${dayStr}`;

            if (localStorage.getItem(`note_${dateStr}`)) {
                dayEl.classList.add('has-note');
            }

            // Click event
            dayEl.addEventListener('click', () => {
                window.location.href = `note.html?date=${dateStr}`;
            });

            let lunarInfoHtml = `<span class="lunar-date">${lunarDateStr}</span>`;
            if (term) {
                lunarInfoHtml = `<span class="term">${term}</span>` + lunarInfoHtml;
            }

            dayEl.innerHTML = `
                <span class="solar-date">${d}</span>
                <div class="lunar-info">
                    ${lunarInfoHtml}
                </div>
            `;

            calendarGrid.appendChild(dayEl);
        }
    }

    prevBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar(currentDate);
    });

    nextBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar(currentDate);
    });

    renderCalendar(currentDate);
});
