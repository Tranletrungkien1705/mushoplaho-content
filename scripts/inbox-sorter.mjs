// Tu dong phan loai email KHONG phai lead vao label rieng + SKIP INBOX.
// Chi chuyen mail KHOP LUAT; mail la khong khop van o nguyen Inbox (an toan).
// Secrets: GMAIL_USER, GMAIL_APP_PASS. Tham so: DAYS (mac dinh 365), DRY=1 de chi xem truoc.
import { ImapFlow } from "imapflow";

const { GMAIL_USER, GMAIL_APP_PASS, DAYS = "365", DRY = "" } = process.env;
if (!GMAIL_USER || !GMAIL_APP_PASS) { console.error("thieu GMAIL_USER/GMAIL_APP_PASS"); process.exit(1); }

// LUAT: [regex ten mien nguoi gui, label]  - xet tu tren xuong
const RULES = [
  [/(^|\.)youtube\.com$|youtube-noreply/i,                          "Auto/YouTube"],
  [/(^|\.)linkedin\.com$/i,                                         "Auto/LinkedIn"],
  [/(itviec|vietnamworks|topdev|careerbuilder|jobstreet|indeed|glassdoor|ziprecruiter|welcometothejungle)\./i, "Auto/Viec-lam"],
  [/(facebookmail|metamail|facebook)\.com$/i,                       "Auto/Facebook"],
  [/(^|\.)(accounts\.)?google\.com$|googlemail\.com$/i,             "Auto/Google"],
  [/brevo\.com$|brevosend\.com$|sendinblue/i,                       "Auto/Brevo"],
  [/resend\.dev$/i,                                                 "Auto/App-idocNet"],
  [/(openai|anthropic|huggingface|supabase|neon\.tech|koyeb|resend|github|cloudflare|vercel|netlify|render)\./i, "Auto/Dev-Services"],
  [/(vietcombank|techcombank|mbbank|vpbank|bidv|momo|zalopay|tpbank|acb)\./i, "Auto/Ngan-hang"],
  [/(shopee|lazada|tiktok|accesstrade)\./i,                         "Auto/Mua-sam"],
];

const labelFor = (from) => { for (const [re, lb] of RULES) if (re.test(from)) return lb; return null; };

const c = new ImapFlow({ host: "imap.gmail.com", port: 993, secure: true,
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS }, logger: false });

await c.connect();
try {
  await c.mailboxOpen("INBOX");
  const since = new Date(Date.now() - parseInt(DAYS, 10) * 864e5);
  const jobs = [];   // {uid, box, from}
  for await (const m of c.fetch({ since }, { uid: true, envelope: true })) {
    const from = (m.envelope?.from?.[0]?.address || "").toLowerCase();
    const domain = from.split("@")[1] || "";
    const box = labelFor(domain) || labelFor(from);
    if (box) jobs.push({ uid: m.uid, box, from });
  }
  const byBox = {};
  jobs.forEach(j => (byBox[j.box] = byBox[j.box] || []).push(j.uid));
  console.log("Mail khop luat:", jobs.length, "| so label:", Object.keys(byBox).length);
  for (const [box, uids] of Object.entries(byBox)) {
    console.log(`  ${box}: ${uids.length} mail`);
    if (DRY) continue;
    try { await c.mailboxCreate(box); } catch { }
    try { await c.messageMove(uids, box, { uid: true }); console.log(`   -> da chuyen ${uids.length} mail vao ${box}`); }
    catch (e) { console.log("   loi move:", String(e).slice(0, 100)); }
  }
  console.log(DRY ? "(DRY RUN - chua chuyen gi)" : "XONG");
} finally { try { await c.logout(); } catch { } }
