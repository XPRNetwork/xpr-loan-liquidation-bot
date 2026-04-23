import fs from "node:fs";
import path from "node:path";

const LOGS_DIR = path.resolve(process.cwd(), "logs");

function ensureLogsDir() {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

export function appendLog(filename: string, line: string) {
  ensureLogsDir();
  const timestamp = new Date().toISOString();
  fs.appendFileSync(
    path.join(LOGS_DIR, filename),
    `[${timestamp}] ${line}\n`
  );
}
