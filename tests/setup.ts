import { baseUrl, testUrl } from "./dburl.ts";

// lib/db.ts reads DATABASE_URL once at import time, so run it past the host guard before any
// test module loads. The URL itself comes back unchanged — tests use the local database
// directly — but a run aimed at anything remote dies here, before the first truncate, rather
// than halfway through emptying it.
const base = baseUrl();
if (base) process.env.DATABASE_URL = testUrl(base);
