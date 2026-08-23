#!/usr/bin/env node
// Fetch a YouTube recording's captions and normalise them into data/<id>.transcript.json.
//
//   node scripts/ingest-youtube.mjs <url-or-id> [--lang id]
//
// This does the mechanical half only: fetch, dedupe, timestamp, save. Splitting the transcript
// into question-answer pairs is a judgement call that needs a model — see INGESTION.md for the
// prompt to hand an agent once this has run.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DATA_DIR = new URL("../data/", import.meta.url).pathname;

function die(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

/** Accepts a full watch URL, a youtu.be link, or a bare 11-character id. */
function parseVideoId(input) {
  if (/^[\w-]{11}$/.test(input)) return input;
  let url;
  try {
    url = new URL(input);
  } catch {
    die(`Not a YouTube URL or video id: ${input}`);
  }
  const id = url.hostname.endsWith("youtu.be")
    ? url.pathname.slice(1)
    : url.searchParams.get("v");
  if (!id || !/^[\w-]{11}$/.test(id)) die(`Could not find a video id in: ${input}`);
  return id;
}

function ytdlp(args) {
  try {
    return execFileSync("yt-dlp", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (err) {
    if (err.code === "ENOENT") die("yt-dlp is not installed. Try: pip install -U yt-dlp");
    die(`yt-dlp failed:\n${err.stderr || err.message}`);
  }
}

/** json3 caption events -> [{ t, text }], with the rolling duplicates auto-captions emit removed. */
function parseJson3(raw) {
  const out = [];
  for (const e of JSON.parse(raw).events ?? []) {
    if (!e.segs) continue;
    const text = e.segs.map((s) => s.utf8 ?? "").join("").replace(/\n/g, " ").trim();
    if (!text || out.at(-1)?.text === text) continue;
    out.push({ t: Math.floor(e.tStartMs / 1000), text });
  }
  return out;
}

// Two ways a Q&A session signals a new question. The host-cue kind is easy; the bare
// interrogative kind is not, and a video may use only the second (see INGESTION.md).
const CUES = [
  /\bselanjutnya\b/i,
  /\bpertanyaan\b/i,
  /\bpenanya\b/i,
  /\bdari (bapak|ibu|saudara|hamba allah|jemaah)\b/i,
  /\bnext question\b/i,
];
const INTERROGATIVES =
  /\b(apakah|bagaimana|bolehkah|apa hukum(nya)?|mengapa|kenapa|adakah|how do|what is|why do|is it)\b/i;

function findCandidates(segments) {
  const hits = [];
  for (const [i, s] of segments.entries()) {
    const cue = CUES.some((re) => re.test(s.text));
    const ask = INTERROGATIVES.test(s.text);
    if (!cue && !ask) continue;
    // Collapse runs — one boundary per ~20s neighbourhood.
    if (hits.at(-1) && s.t - hits.at(-1).t < 20) continue;
    hits.push({ t: s.t, kind: cue ? "cue" : "ask", text: segments.slice(i, i + 4).map((x) => x.text).join(" ") });
  }
  return hits;
}

const hhmmss = (s) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const langFlag = args.indexOf("--lang");
const lang = langFlag === -1 ? "id" : args[langFlag + 1];
const target = args.find((a) => !a.startsWith("--") && a !== lang);
if (!target) die("Usage: node scripts/ingest-youtube.mjs <url-or-id> [--lang id]");

const id = parseVideoId(target);
console.log(`→ ${id} (captions: ${lang})`);

const [title, channel, duration] = ytdlp([
  "--skip-download",
  "--print", "%(title)s\n%(channel)s\n%(duration)s",
  `https://www.youtube.com/watch?v=${id}`,
]).trim().split("\n");

const tmp = mkdtempSync(join(tmpdir(), "yt-ingest-"));
ytdlp([
  "--skip-download",
  "--write-auto-subs",
  "--write-subs",
  "--sub-langs", `${lang}.*,${lang}`,
  "--sub-format", "json3",
  "-o", join(tmp, "cap"),
  `https://www.youtube.com/watch?v=${id}`,
]);

const capFile = readdirSync(tmp).find((f) => f.endsWith(".json3"));
if (!capFile) {
  rmSync(tmp, { recursive: true, force: true });
  die(`No "${lang}" captions available for this video. Try another --lang.`);
}
const segments = parseJson3(readFileSync(join(tmp, capFile), "utf8"));
rmSync(tmp, { recursive: true, force: true });
if (!segments.length) die("Caption track was empty.");

mkdirSync(DATA_DIR, { recursive: true });
const outPath = join(DATA_DIR, `${id}.transcript.json`);
writeFileSync(
  outPath,
  JSON.stringify(
    {
      videoId: id,
      url: `https://youtu.be/${id}`,
      title,
      channel,
      lang,
      kind: "asr",
      durationSeconds: Number(duration) || segments.at(-1).t,
      note: "Auto-generated captions via yt-dlp. t = seconds from start.",
      segments,
    },
    null,
    1,
  ) + "\n",
  "utf8",
);

const candidates = findCandidates(segments);

console.log(`✓ ${segments.length} segments over ${hhmmss(segments.at(-1).t)} → data/${id}.transcript.json`);
console.log(`✓ ${candidates.length} candidate question boundaries (${candidates.filter((c) => c.kind === "cue").length} from host cues)`);

console.log(`\n── paste into lib/mock.ts events[] ──`);
console.log(`  {
    id: "${id.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 24)}",
    name: ${JSON.stringify(title)},
    startsAt: "${new Date().toISOString().slice(0, 10)}T19:00:00+07:00",
    venue: ${JSON.stringify(channel)},
    speaker: "TODO",
    mode: "recorded",
    youtubeId: "${id}",
  },`);

console.log(`\n── first candidates (full list is in the transcript) ──`);
for (const c of candidates.slice(0, 12)) {
  console.log(`  ${hhmmss(c.t).padStart(6)} [${c.kind}] ${c.text.slice(0, 88)}`);
}
console.log(`\nNext: follow INGESTION.md to turn these into Q&A pairs.`);
