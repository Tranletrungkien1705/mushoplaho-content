// Quet Gmail INBOX (IMAP) tim reply tu cac lead da gui -> POST /mark-replied (kem noi dung)
// -> gan label Gmail "Lead-Radar" cho cac email khach da khop.
// Chay trong GitHub Actions. Secrets: GMAIL_USER, GMAIL_APP_PASS, LR_BASE, LR_TOKEN.
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

const { GMAIL_USER, GMAIL_APP_PASS, LR_BASE, LR_TOKEN } = process.env;
if (!GMAIL_USER || !GMAIL_APP_PASS || !LR_BASE || !LR_TOKEN) { console.error("thieu secret"); process.exit(1); }
const LABEL = "Lead-Radar";

const client = new ImapFlow({
  host: "imap.gmail.com", port: 993, secure: true,
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS }, logger: false
});

const byEmail = new Map();   // email -> {email, subject, text, uid}
await client.connect();
try {
  // tao label neu chua co
  try { await client.mailboxCreate(LABEL); console.log("tao label", LABEL); } catch { /* da co */ }

  await client.mailboxOpen("INBOX");
  const since = new Date(Date.now() - 30 * 864e5);
  for await (const msg of client.fetch({ since }, { uid: true, envelope: true, source: true })) {
    const from = msg.envelope?.from?.[0]?.address;
    if (!from) continue;
    const em = from.toLowerCase();
    if (byEmail.has(em)) continue;
    let text = "";
    try { const p = await simpleParser(msg.source); text = (p.text || p.subject || "").trim(); } catch {}
    byEmail.set(em, { email: em, subject: msg.envelope?.subject || "", text: text.slice(0, 3000), uid: msg.uid });
  }

  const messages = [...byEmail.values()].map(({ email, subject, text }) => ({ email, subject, text }));
  console.log("nguoi gui trong INBOX 30 ngay:", messages.length);

  const r = await fetch(`${LR_BASE}/mark-replied?t=${encodeURIComponent(LR_TOKEN)}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages })
  });
  const res = await r.json();
  console.log("ket qua mark-replied:", JSON.stringify(res));
  if (!res.ok) { await client.logout(); process.exit(1); }
  console.log(`==> danh dau 'da tra loi': ${res.marked} lead`);

  // gan label cho cac email da khop la lead that
  const matched = res.matched || [];
  const uids = matched.map(em => byEmail.get(em)?.uid).filter(Boolean);
  if (uids.length) {
    try { await client.messageCopy(uids, LABEL, { uid: true }); console.log(`gan label "${LABEL}" cho ${uids.length} email`); }
    catch (e) { console.log("label loi:", String(e).slice(0, 120)); }
  }
} finally {
  try { await client.logout(); } catch {}
}
