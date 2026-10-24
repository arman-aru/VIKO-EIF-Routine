// TEMPORARY diagnostic — remove after investigating the EduPage block
const BASE = "https://vikoeif.edupage.org";
const API = BASE + "/rpr/server/maindbi.js?__func=mainDBIAccessor";
const BODY = JSON.stringify({ __args: [null, "2026", { vt_filter: { datefrom: "2026-10-26", dateto: "2026-11-01" } }, { op: "fetch", needed_part: { classes: ["id"] }, needed_combos: {} }], __gsh: "00000000" });
const BROWSER = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  "Accept": "*/*",
  "Accept-Language": "lt-LT,lt;q=0.9,en;q=0.8",
  "Origin": BASE,
  "Referer": BASE + "/timetable/",
  "X-Requested-With": "XMLHttpRequest",
};

const probe = async (name, url, init) => {
  const t = Date.now();
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
    const text = await r.text();
    return { name, status: r.status, ms: Date.now() - t, head: text.slice(0, 80) };
  } catch (e) {
    return { name, error: `${e.name}: ${e.message}`, ms: Date.now() - t };
  }
};

export default async () => {
  const results = await Promise.all([
    probe("get-page", BASE + "/timetable/", {}),
    probe("get-page-browser", BASE + "/timetable/", { headers: BROWSER }),
    probe("post-api-plain", API, { method: "POST", headers: { "Content-Type": "application/json" }, body: BODY }),
    probe("post-api-browser", API, { method: "POST", headers: { ...BROWSER, "Content-Type": "application/json; charset=UTF-8" }, body: BODY }),
    probe("control-vvf", "https://vikovvf.edupage.org/timetable/", {}),
  ]);
  return new Response(JSON.stringify(results, null, 2), { headers: { "Content-Type": "application/json" } });
};

export const config = { path: "/api/diag" };
