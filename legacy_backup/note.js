document.addEventListener('DOMContentLoaded', () => {
    const noteDateDisplay = document.getElementById('noteDateDisplay');
    const noteInput = document.getElementById('noteInput');
    const saveNoteBtn = document.getElementById('saveNoteBtn');

    // Get date from query param
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date'); // YYYY-MM-DD

    if (!dateParam) {
        document.body.innerHTML = `
            <div style="color: white; padding: 20px; font-family: sans-serif;">
                <h1>Error: No date specified</h1>
                <p>Current URL: ${window.location.href}</p>
                <p>Search Params: ${window.location.search}</p>
                <a href="index.html" style="color: #FF6B6B;">Return to Calendar</a>
            </div>
        `;
        return;
    }

    // Format date for display
    const [year, month, day] = dateParam.split('-');
    const dateObj = new Date(year, month - 1, day);
    noteDateDisplay.textContent = dateObj.toLocaleDateString('default', { year: 'numeric', month: 'long', day: 'numeric' });

    // Load existing note
    const storageKey = `note_${dateParam}`;
    const savedNote = localStorage.getItem(storageKey);
    if (savedNote) {
        noteInput.value = savedNote;
    }

    // Save note
    saveNoteBtn.addEventListener('click', () => {
        const noteContent = noteInput.value;
        if (noteContent.trim() === '') {
            localStorage.removeItem(storageKey);
        } else {
            localStorage.setItem(storageKey, noteContent);
        }
        alert('Note saved!');
        window.location.href = 'index.html';
    });
});
