// Quet Gmail INBOX (IMAP) tim reply tu cac lead da gui -> POST /mark-replied (kem noi dung).
// Chay trong GitHub Actions. Secrets: GMAIL_USER, GMAIL_APP_PASS, LR_BASE, LR_TOKEN.
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

const { GMAIL_USER, GMAIL_APP_PASS, LR_BASE, LR_TOKEN } = process.env;
if (!GMAIL_USER || !GMAIL_APP_PASS || !LR_BASE || !LR_TOKEN) { console.error("thieu secret"); process.exit(1); }

const client = new ImapFlow({
  host: "imap.gmail.com", port: 993, secure: true,
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS }, logger: false
});

const byEmail = new Map();   // email -> {email, subject, text}
await client.connect();
try {
  await client.mailboxOpen("INBOX");
  const since = new Date(Date.now() - 30 * 864e5);
  for await (const msg of client.fetch({ since }, { envelope: true, source: true })) {
    const from = msg.envelope?.from?.[0]?.address;
    if (!from) continue;
    const em = from.toLowerCase();
    if (byEmail.has(em)) continue;   // giu email dau tien (moi nhat theo thu tu)
    let text = "";
    try { const p = await simpleParser(msg.source); text = (p.text || p.subject || "").trim(); } catch {}
    byEmail.set(em, { email: em, subject: msg.envelope?.subject || "", text: text.slice(0, 3000) });
  }
} finally {
  await client.logout();
}

const messages = [...byEmail.values()];
console.log("nguoi gui trong INBOX 30 ngay:", messages.length);

const r = await fetch(`${LR_BASE}/mark-replied?t=${encodeURIComponent(LR_TOKEN)}`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ messages })
});
const res = await r.json();
console.log("ket qua mark-replied:", JSON.stringify(res));
if (!res.ok) process.exit(1);
console.log(`==> danh dau 'da tra loi': ${res.marked} lead`);
