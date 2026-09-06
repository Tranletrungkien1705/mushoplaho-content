// Quet Gmail INBOX (IMAP) tim reply tu cac lead da gui -> POST /mark-replied.
// Chay trong GitHub Actions. Secrets: GMAIL_USER, GMAIL_APP_PASS, LR_BASE, LR_TOKEN.
import { ImapFlow } from "imapflow";

const { GMAIL_USER, GMAIL_APP_PASS, LR_BASE, LR_TOKEN } = process.env;
if (!GMAIL_USER || !GMAIL_APP_PASS || !LR_BASE || !LR_TOKEN) { console.error("thieu secret"); process.exit(1); }

const client = new ImapFlow({
  host: "imap.gmail.com", port: 993, secure: true,
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS }, logger: false
});

const emails = new Set();
await client.connect();
try {
  await client.mailboxOpen("INBOX");
  // lay thu 30 ngay gan nhat, doc dia chi nguoi gui
  const since = new Date(Date.now() - 30 * 864e5);
  for await (const msg of client.fetch({ since }, { envelope: true })) {
    const from = msg.envelope?.from?.[0]?.address;
    if (from) emails.add(from.toLowerCase());
  }
} finally {
  await client.logout();
}

const list = [...emails];
console.log("nguoi gui trong INBOX 30 ngay:", list.length);

// gui len worker de match voi lead da lien he
const r = await fetch(`${LR_BASE}/mark-replied?t=${encodeURIComponent(LR_TOKEN)}`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ emails: list })
});
const res = await r.json();
console.log("ket qua mark-replied:", JSON.stringify(res));
if (!res.ok) process.exit(1);
console.log(`==> danh dau 'da tra loi': ${res.marked} lead`);
