/**
 * Prints the exceptions and console lines out of a `wrangler tail --format json`
 * capture, and nothing else.
 *
 * A raw tail is mostly request records; the two or three lines that matter are
 * buried in them. Kept as a file rather than inlined in the workflow so the
 * quoting survives - the previous inline version was a shell heredoc wrapping a
 * node -e wrapping a JS string, which is three levels of escaping to get wrong.
 */
import { existsSync, readFileSync } from "node:fs";

const path = process.argv[2] ?? "/tmp/tail.log";
if (!existsSync(path)) {
  console.log(`(no tail capture at ${path})`);
  process.exit(0);
}

let seen = 0;
for (const line of readFileSync(path, "utf8").split("\n")) {
  if (!line.trim()) continue;

  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue;
  }

  const problems = [...(event.exceptions ?? []), ...(event.logs ?? [])];
  if (problems.length === 0) continue;

  seen += 1;
  console.log("URL:", event.event?.request?.url ?? "(none)");
  console.log("outcome:", event.outcome ?? "(none)");
  for (const problem of problems) {
    const message =
      typeof problem.message === "string"
        ? problem.message
        : JSON.stringify(problem.message);
    console.log("  ", problem.name ?? problem.level ?? "?", "|", message);
    if (problem.stack) {
      console.log(String(problem.stack).split("\n").slice(0, 8).join("\n"));
    }
  }
}

if (seen === 0) console.log("(no exceptions or console lines captured)");
