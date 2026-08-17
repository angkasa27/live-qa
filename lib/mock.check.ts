// Self-check for the only non-trivial logic in the mock layer.
// Run: node --experimental-strip-types lib/mock.check.ts
import assert from "node:assert/strict";
import { paginate, questions } from "./mock.ts";

const list = questions.slice(0, 25);

const p1 = paginate(list, null, 10);
assert.equal(p1.items.length, 10);
assert.equal(p1.items[0].id, list[0].id);
assert.equal(p1.nextCursor, list[9].id);

const p2 = paginate(list, p1.nextCursor, 10);
assert.equal(p2.items[0].id, list[10].id);
assert.equal(p2.nextCursor, list[19].id);

// Final partial page: shorter than the limit, and the cursor must clear.
const p3 = paginate(list, p2.nextCursor, 10);
assert.equal(p3.items.length, 5);
assert.equal(p3.nextCursor, null);

// Exact-multiple boundary: the last full page must not advertise a page that doesn't exist.
const exact = paginate(list.slice(0, 20), paginate(list.slice(0, 20), null, 10).nextCursor, 10);
assert.equal(exact.items.length, 10);
assert.equal(exact.nextCursor, null);

assert.deepEqual(paginate([], null, 10), { items: [], nextCursor: null });
// An unknown cursor must not silently replay page one.
assert.deepEqual(paginate(list, "nope", 10), { items: [], nextCursor: null });

console.log("paginate ok");
