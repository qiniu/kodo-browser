import {compareVersion} from "./utils";

interface MigratorOptions {
  prevVersionGetter: () => Promise<string>,
  currVersionGetter: () => Promise<string>,
  currVersionSetter: (version: string) => Promise<void>,
}

export interface MigrateStep {
  version: string,
  up?: () => Promise<void>,
  down?: () => Promise<void>,
}

export class Migrator {
  private prevVersionGetter: () => Promise<string>
  private currVersionGetter: () => Promise<string>
  private currVersionSetter: (version: string) => Promise<void>
  private migrateSteps: MigrateStep[]

  constructor({
    prevVersionGetter,
    currVersionGetter,
    currVersionSetter,
  }: MigratorOptions) {
    this.prevVersionGetter = prevVersionGetter;
    this.currVersionGetter = currVersionGetter;
    this.currVersionSetter = currVersionSetter;
    this.migrateSteps = [];
  }

  register(...steps: MigrateStep[]) {
    this.migrateSteps = this.migrateSteps.concat(steps);
  }

  async upgrade() {
    const prevVersion = await this.prevVersionGetter();
    const currVersion = await this.currVersionGetter();
    // currVersion <= prevVersion
    if (compareVersion(currVersion, prevVersion) <= 0) {
      return;
    }
    const upSteps = this.migrateSteps
      .filter(s => {
        if (typeof s.up !== "function") {
          return false;
        }
        // prevVersion < s.version <= currVersion
        return compareVersion(s.version, currVersion) <= 0 && compareVersion(s.version, prevVersion) > 0;
      })
      .sort((a, b) => compareVersion(a.version, b.version));
    for (const upStep of upSteps) {
      await upStep.up?.();
      await this.currVersionSetter(upStep.version);
    }
  }

  async downgrade() {
    const prevVersion = await this.prevVersionGetter();
    const currVersion = await this.currVersionGetter();
    // currVersion >= prevVersion
    if (compareVersion(currVersion, prevVersion) >= 0) {
      return;
    }
    const downSteps = this.migrateSteps
      .filter(s => {
        if (typeof s.down !== "function") {
          return false;
        }
        // currVersion < s.version <= prevVersion
        return compareVersion(s.version, currVersion) > 0 && compareVersion(s.version, prevVersion) <= 0;
      })
      .sort((a, b) => -compareVersion(a.version, b.version));
    for (const downStep of downSteps) {
      await downStep.down?.();
      await this.currVersionSetter(downStep.version);
    }
  }
}

