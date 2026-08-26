import { baseUrl, scratchUrl } from "./dburl.ts";

// lib/db.ts reads DATABASE_URL once at import time, so repoint it before any test module loads.
const base = baseUrl();
if (base && !process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = scratchUrl(base);
