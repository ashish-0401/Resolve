import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Debt, Transfer } from '../worker-thread/simplify.js';

// CONCEPT: Worker Thread Wrapper (simplify.service.ts)
// The greedy simplification algorithm is CPU-bound — sorting and iterating over
// all debts. Running it on the main thread would block all other HTTP requests.
// This service spawns a Node.js worker thread (a separate V8 isolate) to run
// the algorithm, keeping the main event loop responsive.
//
// Interview: "I offload the simplification to a worker thread — a separate V8
// isolate with its own event loop. The main thread posts the debts, the worker
// computes the result, and posts it back via message passing. This keeps the
// API responsive even for large groups."

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runSimplification(debts: Debt[]): Promise<Transfer[]> {
  return new Promise((resolve, reject) => {
    // tsx can run .ts files directly in worker threads
    const workerPath = path.resolve(__dirname, '../worker-thread/simplify.ts');

    const worker = new Worker(workerPath, {
      workerData: { debts },
      // tsx requires this to handle TypeScript in worker threads
      execArgv: ['--import', 'tsx'],
    });

    worker.on('message', (result: Transfer[]) => {
      resolve(result);
    });

    worker.on('error', (err) => {
      reject(err);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker thread exited with code ${code}`));
      }
    });
  });
}

export type { Debt, Transfer };
