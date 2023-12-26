import {lock, unlock, Options} from "lockfile"

export function lockfile(path: string, opts?: Options): Promise<void> {
  return new Promise((resolve, reject) => {
    const callback = (err: Error | null) => {
      if (err) {
        reject(err)
        return
      }
      resolve()
    }
    opts ? lock(path, opts, callback) : lock(path, callback)
  })
}

export async function unlockFile(path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    unlock(path, (err: Error | null) => {
      if (err) {
        reject(err)
        return
      }
      resolve()
    })
  })
}

export async function withLockFile(path: string, fn: () => Promise<void>, options?: Options) {
  await lockfile(path, options)
  await fn()
  await unlockFile(path)
}
