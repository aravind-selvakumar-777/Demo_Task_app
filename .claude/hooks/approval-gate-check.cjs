// PreToolUse hook (matcher: Agent|Task): blocks invoking the code-review
// subagent in the requirements-to-release pipeline until the user has
// approved via the UserPromptSubmit gate (see approval-gate-prompt.js).
const path = require("node:path");
const fs = require("node:fs");

const MARKER_PATH = path.join(__dirname, ".state", "rtr-approved");
const GATED_SUBAGENT = "code-review";

let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const subagentType = input.tool_input && input.tool_input.subagent_type;
  if (subagentType !== GATED_SUBAGENT) {
    process.exit(0);
  }

  if (!fs.existsSync(MARKER_PATH)) {
    process.stderr.write(
      "Approval gate: the user has not approved the implementation yet. " +
        "Stop and ask the user to reply 'approve' (or 'approved'/'continue') " +
        "before invoking the code-review subagent.\n"
    );
    process.exit(2);
  }

  fs.unlinkSync(MARKER_PATH);
  process.exit(0);
});
