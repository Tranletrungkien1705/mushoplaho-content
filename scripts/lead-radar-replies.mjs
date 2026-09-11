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
    let text = "", inReplyTo = "", references = "";
    try {
      const p = await simpleParser(msg.source);
      text = (p.text || p.subject || "").trim();
      inReplyTo = p.inReplyTo || "";
      references = Array.isArray(p.references) ? p.references.join(" ") : (p.references || "");
    } catch {}
    byEmail.set(em, { email: em, subject: msg.envelope?.subject || "", text: text.slice(0, 3000), inReplyTo, references, uid: msg.uid });
  }

  const messages = [...byEmail.values()].map(({ email, subject, text, inReplyTo, references }) => ({ email, subject, text, inReplyTo, references }));
  console.log("nguoi gui trong INBOX 30 ngay:", messages.length);

  const r = await fetch(`${LR_BASE}/mark-replied?t=${encodeURIComponent(LR_TOKEN)}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages })
  });
  const res = await r.json();
  console.log("ket qua mark-replied:", JSON.stringify(res));
  if (!res.ok) { await client.logout(); process.exit(1); }
  console.log(`==> danh dau 'da tra loi': ${res.marked} lead`);

  // gan label + SKIP INBOX cho MOI email cua lead (ke ca mail CU), label theo cong ty/domain (worker tinh)
  const toLabel = res.leadEmails && res.leadEmails.length ? res.leadEmails : (res.matched || []);
  const labels = res.labels || {};
  const created = new Set();
  for (const em of toLabel) {
    const rec = byEmail.get(em);
    if (!rec?.uid) continue;
    const box = labels[em] || `${LABEL}/${(em.split("@")[1] || "other").toLowerCase()}`;
    if (!created.has(box)) { try { await client.mailboxCreate(box); } catch { } created.add(box); }
    try { await client.messageMove(rec.uid, box, { uid: true }); console.log(`move -> ${box} (${em})`); }   // move = ra khoi Inbox
    catch (e) { console.log("move loi", em, String(e).slice(0, 80)); }
  }
} finally {
  try { await client.logout(); } catch {}
}
