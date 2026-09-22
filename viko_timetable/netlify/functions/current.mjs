import { EDUPAGE_ENDPOINTS, proxyToEdupage } from "../lib/edupageProxy.mjs";

// Timetable for one group over a date range
export default (req) => proxyToEdupage(req, EDUPAGE_ENDPOINTS.current);
