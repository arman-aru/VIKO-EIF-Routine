// Forwards timetable requests to EduPage from the same origin as the app,
// so production needs no separately hosted backend and no CORS setup.

export const EDUPAGE_ENDPOINTS = {
  all: "https://vikoeif.edupage.org/rpr/server/maindbi.js?__func=mainDBIAccessor",
  current:
    "https://vikoeif.edupage.org/timetable/server/currenttt.js?__func=curentttGetData",
};

const UPSTREAM_TIMEOUT_MS = 15000;

const json = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const isValidPayload = (body) =>
  body !== null && typeof body === "object" && Array.isArray(body.__args);

export const proxyToEdupage = async (req, upstreamUrl) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Request body must be JSON" }, 400);
  }
  if (!isValidPayload(payload)) {
    return json({ error: "Invalid timetable request" }, 400);
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!upstream.ok) {
      console.error(`EduPage responded ${upstream.status} for ${upstreamUrl}`);
      return json({ error: "Timetable source is unavailable" }, 502);
    }

    return new Response(await upstream.text(), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`EduPage request failed for ${upstreamUrl}:`, err.message);
    return json({ error: "Timetable source is unavailable" }, 502);
  }
};
