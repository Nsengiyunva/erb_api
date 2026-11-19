import { execFile } from "child_process";
import { RequestHandler } from "express";

// /var/ugpass is an NFS (hard) mount. When the NFS server is unreachable, any
// file call on it blocks a libuv worker thread forever. Node only has 4 of
// those by default, so after four such requests EVERY other file operation in
// the process (saving a registration photo, serving profile pictures, ...)
// queues behind them and times out — while database-only routes stay fast.
//
// This guard probes the mount from a *child process* (a hung child cannot
// block Node's threads) and lets routes refuse immediately while it is down.
const PROBE_PATH = process.env.UGPASS_PROBE_PATH || "/var/ugpass/destination";
const PROBE_EVERY_MS = 10_000;
const PROBE_TIMEOUT_MS = 3_000;

let healthy = true;
let probing = false;

function probe() {
  // A child stuck on the dead mount stays in uninterruptible sleep until the
  // NFS server returns; never start another while one is outstanding.
  if (probing) return;
  probing = true;
  let finished = false;
  const giveUp = setTimeout(() => {
    if (!finished) {
      if (healthy) console.error(`[ugpass] ${PROBE_PATH} not responding — refusing document requests until it recovers`);
      healthy = false;
    }
  }, PROBE_TIMEOUT_MS);

  execFile("stat", ["-t", PROBE_PATH], { timeout: PROBE_TIMEOUT_MS + 2000, killSignal: "SIGKILL" }, (err) => {
    finished = true;
    clearTimeout(giveUp);
    if (!healthy && !err) console.log(`[ugpass] ${PROBE_PATH} is responding again`);
    healthy = !err;
    probing = false;
  });
}

probe();
setInterval(probe, PROBE_EVERY_MS).unref();

export const ugpassAvailable = () => healthy;

/** Route guard: answers 503 straight away instead of hanging on a dead mount. */
export const requireUgpass: RequestHandler = (_req, res, next) => {
  if (healthy) return next();
  res.status(503).json({ message: "The certificate store is temporarily unavailable. Please try again shortly." });
};