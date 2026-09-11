// Quet hop THU DA GUI -> bao worker biet nhung lead MINH DA TRA LOI (ngung nhac sai).
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
const { GMAIL_USER, GMAIL_APP_PASS, LR_BASE, LR_TOKEN } = process.env;
if (!GMAIL_USER || !GMAIL_APP_PASS || !LR_BASE || !LR_TOKEN) { console.error("thieu secret"); process.exit(1); }

const c = new ImapFlow({ host: "imap.gmail.com", port: 993, secure: true,
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS }, logger: false });
await c.connect();
const messages = [];
try {
  let sentBox = null;
  for (const b of await c.list()) {
    const su = String(b.specialUse || ""), fl = [...(b.flags || [])].join(" ");
    if (su === "\Sent" || fl.includes("\Sent")) { sentBox = b.path; break; }
  }
  await c.mailboxOpen(sentBox || "INBOX");
  console.log("quet hop:", sentBox || "INBOX");
  const since = new Date(Date.now() - 30 * 864e5);
  for await (const m of c.fetch({ since }, { envelope: true, source: true })) {
    const to = (m.envelope?.to || []).map(x => (x.address || "").toLowerCase()).filter(Boolean);
    if (!to.length) continue;
    let text = ""; try { const p = await simpleParser(m.source); text = (p.text || "").split(/\n\s*(On .{0,120}wrote:|Vào .{0,120}đã viết:)/)[0].trim(); } catch { }
    messages.push({ to, date: m.envelope?.date, text: text.slice(0, 2000) });
  }
} finally { try { await c.logout(); } catch { } }
console.log("thu da gui 30 ngay:", messages.length);
const r = await fetch(`${LR_BASE}/mark-my-reply?t=${encodeURIComponent(LR_TOKEN)}`, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages })
});
const res = await r.json();
console.log("ket qua:", JSON.stringify(res));
