export const metadata = {
  title: "Privacy Policy – Lunar Calendar Reminder",
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px", fontFamily: "sans-serif", lineHeight: 1.7, color: "#111" }}>
      <h1>Privacy Policy</h1>
      <p><em>Last updated: July 2026</em></p>

      <p>Lunar Calendar Reminder ("we", "our", or "the app") is a Korean lunar calendar app with reminder functionality. We take your privacy seriously and collect only what is necessary to provide the service.</p>

      <h2>Information We Collect</h2>
      <ul>
        <li><strong>Google account information</strong> — when you sign in with Google, we receive your name and email address via Supabase Auth. This is used solely to associate your reminders with your account.</li>
        <li><strong>Reminder data</strong> — the dates and titles of reminders you create are stored in our database so they persist across devices.</li>
      </ul>

      <h2>Information We Do Not Collect</h2>
      <ul>
        <li>We do not collect location data.</li>
        <li>We do not collect device identifiers or advertising IDs.</li>
        <li>We do not sell or share your data with third parties.</li>
      </ul>

      <h2>Data Storage</h2>
      <p>Your data is stored securely via <a href="https://supabase.com">Supabase</a>, hosted on AWS infrastructure. You can delete your account and all associated data at any time by contacting us.</p>

      <h2>Third-Party Services</h2>
      <ul>
        <li><strong>Google OAuth</strong> — for sign-in only. Governed by <a href="https://policies.google.com/privacy">Google's Privacy Policy</a>.</li>
        <li><strong>Supabase</strong> — database and authentication. Governed by <a href="https://supabase.com/privacy">Supabase's Privacy Policy</a>.</li>
      </ul>

      <h2>Children's Privacy</h2>
      <p>This app is not directed at children under 13. We do not knowingly collect personal information from children.</p>

      <h2>Contact</h2>
      <p>For privacy questions or data deletion requests, contact us at <a href="mailto:yoonlees@gmail.com">yoonlees@gmail.com</a>.</p>
    </main>
  );
}
