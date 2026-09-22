import { EDUPAGE_ENDPOINTS, proxyToEdupage } from "../lib/edupageProxy.mjs";

// Teachers, subjects, classrooms and groups metadata
export default (req) => proxyToEdupage(req, EDUPAGE_ENDPOINTS.all);
