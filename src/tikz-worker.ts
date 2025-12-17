import TikZJax from './index';
import { type Tikz } from './types';
import { expose } from 'threads/worker';

declare type WorkerFunction = ((...args: any[]) => any) | (() => any);
declare type WorkerModule<Keys extends string> = {
  [key in Keys]: WorkerFunction;
};
type TikzJaxModule = WorkerModule<keyof Tikz>;

/**
 * Expose TikzJax methods to worker threads.
 */
expose(TikZJax as TikzJaxModule);
