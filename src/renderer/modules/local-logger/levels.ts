export enum LogLevel {
  All,
  Debug,
  Info,
  Warning,
  Error,
  No,
}


let currentLogLevel = LogLevel.Error;

export function getLevel(): LogLevel {
  return currentLogLevel
}

/**
 * if not debugEnv, debug level will be info level.
 */
export function setLevel(level: LogLevel) {
  // ignore debugEnv type
  // @ts-ignore
  if (level === LogLevel.Debug && !(window?.debugEnv || global?.debugEvn)) {
    currentLogLevel = LogLevel.Info;
    return;
  }
  currentLogLevel = level
}
