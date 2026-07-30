export const metadata = {
  title: "Support – Lunar Calendar Reminder",
};

export default function SupportPage() {
  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px", fontFamily: "sans-serif", lineHeight: 1.7, color: "#111" }}>
      <h1>Support</h1>
      <p>Need help with Lunar Calendar Reminder? We're here to assist.</p>

      <h2>Contact</h2>
      <p>Email us at <a href="mailto:yoonlees@gmail.com">yoonlees@gmail.com</a> and we'll get back to you as soon as possible.</p>

      <h2>Frequently Asked Questions</h2>

      <h3>How do I add a reminder?</h3>
      <p>Sign in with Google, then tap any date on the calendar. Enter a title and choose whether the reminder should repeat yearly by solar or lunar date.</p>

      <h3>What is a lunar date reminder?</h3>
      <p>A lunar date reminder repeats on the same lunar calendar date each year — useful for ancestral memorial days (제사) and traditional Korean holidays.</p>

      <h3>How do I delete a reminder?</h3>
      <p>Tap the date with the reminder, then tap the delete button in the edit sheet.</p>

      <h3>How do I navigate between months?</h3>
      <p>Swipe left or right on the calendar, or tap the ‹ › arrows in the header.</p>
    </main>
  );
}
