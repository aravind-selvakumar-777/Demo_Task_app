// UserPromptSubmit hook: records approval for the requirements-to-release
// pipeline's implementation gate when the user replies approve/approved/continue.
const path = require("node:path");
const fs = require("node:fs");

const MARKER_PATH = path.join(__dirname, ".state", "rtr-approved");
const APPROVAL_PATTERN = /^(approve|approved|continue)\b/i;

let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const prompt = (input.prompt || "").trim();
  if (APPROVAL_PATTERN.test(prompt)) {
    fs.mkdirSync(path.dirname(MARKER_PATH), { recursive: true });
    fs.writeFileSync(MARKER_PATH, "");
  }
  process.exit(0);
});
