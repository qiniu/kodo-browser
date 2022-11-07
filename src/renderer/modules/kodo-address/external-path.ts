import lodash from "lodash";

import {localFile} from "@renderer/modules/persistence";

import {KodoAddress} from "./types";

export interface ExternalPathItem extends KodoAddress {
  regionId: string,
}

export interface ExternalPath {
  list: ExternalPathItem[];
}

export interface KodoExternalPathOptions {
  persistPath: string,
}

export class KodoExternalPath {
  static getPersistPath(ak: string) {
    return `external_paths_${ak}.json`;
  }

  private readonly persistPath: string;

  constructor({persistPath}: KodoExternalPathOptions) {
    this.persistPath = persistPath;
  }

  read(): ExternalPath {
    const jsonStrData = localFile
      .read(this.persistPath)
      .toString();
    if (!jsonStrData) {
      return {
        list: [],
      };
    }
    let data = JSON.parse(jsonStrData);
    return {
      list: data.map((d: {
        bucketId: string,
        fullPath: string,
        shortPath: string,
        regionId: string,
        objectPrefix: string,
      }) => {
        const sep = "://";
        const sepIndex = d.fullPath.indexOf(sep);
        return {
          protocol: d.fullPath.slice(0, sepIndex + sep.length),
          path: d.shortPath + "/",
          regionId: d.regionId,
        };
      }),
    };
  }

  save(value: ExternalPath) {
    localFile.save(
      this.persistPath,
      JSON.stringify(value.list.map(d => {
        let shortPath = d.path;
        if (shortPath.endsWith("/")) {
          shortPath = shortPath.slice(0, -1);
        }
        const [bucketId] = shortPath.split("/", 1);
        return {
          bucketId: bucketId,
          fullPath: `${d.protocol}${shortPath}`,
          shortPath: shortPath,
          regionId: d.regionId,
          objectPrefix: shortPath.slice(`${bucketId}/`.length),
        };
      })),
    );
  }

  addExternalPath(target: ExternalPathItem) {
    const externalPath = this.read();
    externalPath.list.push(target);
    this.save(externalPath);
  }

  deleteExternalPath(target: ExternalPathItem) {
    const externalPath = this.read();
    lodash.remove(
      externalPath.list,
      ep =>
        ep.protocol === target.protocol &&
        ep.path === target.path &&
        ep.regionId === target.regionId
    );
    this.save(externalPath);
  }
}
