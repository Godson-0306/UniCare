import { execFileSync } from "node:child_process";
import os from "node:os";

const PORTS = [3000, 3001, 8000];

function run(command, args) {
  try {
    return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
}

function windowsPidsForPort(port) {
  const powershellPids = run("powershell.exe", [
    "-NoProfile",
    "-Command",
    `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess`,
  ])
    .split(/\r?\n/)
    .map((pid) => pid.trim())
    .filter(Boolean);

  if (powershellPids.length > 0) {
    return powershellPids;
  }

  return run("netstat", ["-ano"])
    .split(/\r?\n/)
    .filter((line) => line.includes(`:${port}`) && line.includes("LISTENING"))
    .map((line) => line.trim().split(/\s+/).at(-1))
    .filter(Boolean);
}

function unixPidsForPort(port) {
  return run("lsof", ["-ti", `tcp:${port}`])
    .split(/\r?\n/)
    .map((pid) => pid.trim())
    .filter(Boolean);
}

function stopPid(pid) {
  if (pid === String(process.pid)) return;
  if (os.platform() === "win32") {
    run("taskkill", ["/PID", pid, "/F"]);
  } else {
    run("kill", ["-TERM", pid]);
  }
}

const pids = new Set();
for (const port of PORTS) {
  const found = os.platform() === "win32" ? windowsPidsForPort(port) : unixPidsForPort(port);
  found.forEach((pid) => pids.add(pid));
}

if (pids.size > 0) {
  console.log(`Stopping stale dev server process(es): ${[...pids].join(", ")}`);
  pids.forEach(stopPid);
} else {
  console.log("No stale dev server processes found.");
}
