import { type Tikz } from './types';
import { Worker, spawn, Thread } from 'threads';

export type ThreadZ = typeof Thread;
export type TikzWorkerThread = Tikz & ThreadZ & Thread;

let tex: TikzWorkerThread | undefined;
let rootUrl: string = '.';

/**
 * Create a TikzJax worker thread.
 *
 * Example usage:
 * (async () => {
 *   const worker = await createWorker();
 *   const svg = await worker.tex2svg('\\begin{document}\\end{document}');
 *   console.log(svg);
 *   await finishWorker(worker);
 * })();
 * @returns {Promise<TikzWorkerThread>}
 */
export async function createWorker(): Promise<TikzWorkerThread> {
  if (!rootUrl) {
    throw new Error(
      'Root URL is not set. Please set it using setRootUrl() before creating a worker.',
    );
  }

  if (tex) {
    return tex;
  }

  const worker: any = await spawn(new Worker(`${rootUrl}/tikz-worker.js`));
  tex = worker as TikzWorkerThread;
  Thread.events(worker).subscribe((e: any) => {
    if (e.type == 'message' && typeof e.data === 'string') console.log(e.data);
  });

  // Load the assembly and core dump.
  try {
    tex.setRootPath(`${rootUrl}/../tex`);
    await tex.load();
  } catch (err) {
    console.log(err);
  }

  return tex;
}

/**
 * Finish and terminate the TikzJax worker thread.
 *
 * @param {TikzWorkerThread} worker the TikzJax worker thread to terminate
 */
export async function finishWorker(worker: TikzWorkerThread) {
  await Thread.terminate(worker);
}

/**
 * Get the root URL for loading resources.
 *
 * @returns {string}
 */
export function getRootUrl(): string {
  return rootUrl;
}

/**
 * Set the root URL for loading resources.
 *
 * @param {string} url the root URL
 */
export function setRootUrl(url: string) {
  if (url !== rootUrl) {
    rootUrl = url;
  }
}

/**
 * Default behavior: set root URL based on the current script location.
 */
if (typeof document !== 'undefined' && document.currentScript) {
  /** @ts-ignore */
  const url = document.currentScript.src;
  rootUrl = url.replace(/\/worker\.js(?:\?.*)?$/, '');
}
