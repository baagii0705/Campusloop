import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const required = [
  "<!DOCTYPE html>",
  '<meta name="viewport"',
  'id="modal"',
  'id="postForm"',
  'src="./appwrite-client.js"',
];

const missing = required.filter((value) => !html.includes(value));
if (missing.length) {
  throw new Error(`Static validation failed; missing: ${missing.join(", ")}`);
}

if (/api[_-]?key|secret[_-]?key|cloudflare[_-]?token/i.test(html)) {
  throw new Error("Static validation failed; a likely secret was found in the HTML.");
}

console.log("Static HTML validation passed.");
