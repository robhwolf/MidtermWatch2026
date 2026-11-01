// Prints the seconds to wait before starting the next run, or nothing once the
// schedule is over.
import { nextRun } from './lib/next-run.mjs';

const now = Date.now();
const at = nextRun(now);
if (at !== null) console.log(Math.ceil((at - now) / 1000));
