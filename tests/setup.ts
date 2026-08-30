import { baseUrl, scratchUrl } from "./dburl.ts";

// lib/db.ts reads DATABASE_URL once at import time, so repoint it before any test module loads.
//
// Unconditionally. This used to be skipped when TEST_DATABASE_URL was set, on the assumption that
// setting it meant you had aimed the tests somewhere safe yourself. That left DATABASE_URL
// pointing at the app's own database while global-setup.ts happily built a scratch one nobody
// used, and the integration tests truncated production. scratchUrl() returns TEST_DATABASE_URL
// when it is set and refuses anything that is not a _test database, so there is no case left
// where the app's own URL should survive into a test run.
const base = baseUrl();
if (base) process.env.DATABASE_URL = scratchUrl(base);
