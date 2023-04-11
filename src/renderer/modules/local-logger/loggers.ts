import {getLevel, LogLevel} from "./levels";
import parseErrorStack, {StackFrame} from "./parse-error-stack";

const IS_NATIVE_LOGGER = false;
const SAVE_LOG_STACK = false;
const MAX_LOG_STACK = 100;

interface LogQueue {
  logArgs: any[],
  callStack: StackFrame[],
}

const logQueue: LogQueue[] = [];

const debug = IS_NATIVE_LOGGER
  ? console.debug
  : (...args: any[]) => {
    if (getLevel() > LogLevel.Debug) {
      return;
    }
    console.debug(...args);
    saveLogs(args, new Error().stack);
  }

const info = IS_NATIVE_LOGGER
  ? console.info
  : (function (...args: any[]) {
    if (getLevel() > LogLevel.Info) {
      return;
    }
    console.info(...args);
    saveLogs(args, new Error().stack);
  }).bind(console);

const warn = IS_NATIVE_LOGGER
  ? console.warn
  : (...args: any[]) => {
    if (getLevel() > LogLevel.Warning) {
      return;
    }
    console.warn(...args);
    saveLogs(args, new Error().stack);
  }

const error = IS_NATIVE_LOGGER
  ? console.error
  : (...args: any[]) => {
    if (getLevel() > LogLevel.Error) {
      return;
    }
    console.error(...args);
    saveLogs(args, new Error().stack);
  }

export {
  debug,
  info,
  warn,
  error,
};

function saveLogs(logArgs: any[], stackStr: string = "") {
  if (SAVE_LOG_STACK) {
    if (logQueue.length >= MAX_LOG_STACK) {
      logQueue.shift();
    }
    logQueue.push({
      logArgs: logArgs,
      callStack: parseErrorStack(stackStr),
    });
  }
}
