import lodash from 'lodash';

import {HttpUrl} from "@renderer/const/patterns";
import {localFile} from "@renderer/modules/persistence";

export interface RegionSetting {
  /* s3 id */
  identifier: string,
  label: string,
  endpoint: string,
}

export interface Endpoint {
  ucUrl: string,
  regions: RegionSetting[],
}

export interface Refer {
  referTo: string,
  keyPath: string[],
}

const DEFAULT_ENDPOINT: Endpoint = {
  ucUrl: "",
  regions: [{
    identifier: "",
    label: "",
    endpoint: "",
  }],
};

export class PrivateEndpointPersistence {
  static Path = "config.json";

  save(value: Endpoint) {
    localFile.save(
      PrivateEndpointPersistence.Path,
      JSON.stringify({
        // Backward Compatibility
        uc_url: value.ucUrl,
        regions: value.regions.map(r => ({
          id: r.identifier,
          label: r.label,
          endpoint: r.endpoint,
        })),
      }),
    );
  }

  saveRefer(value: Refer) {
    localFile.save(
      PrivateEndpointPersistence.Path,
      JSON.stringify({
        refer_to: value.referTo,
        key_path: value.keyPath,
      }),
    );
  }

  read(): Endpoint {
    const jsonStrData = localFile
        .read(PrivateEndpointPersistence.Path)
        .toString();
    if (!jsonStrData) {
      return DEFAULT_ENDPOINT;
    }
    const data = JSON.parse(jsonStrData);
    if (data.hasOwnProperty("refer_to")) {
      return this.readFromRefer({
        referTo: data.refer_to,
        keyPath: data.key_path,
      });
    }
    return {
      // Backward Compatibility
      ucUrl: data.uc_url,
      regions: (data.regions ?? [])
        .map((r: {id: string, label: string, endpoint: string}) => ({
          identifier: r.id,
          label: r.label,
          endpoint: r.endpoint,
        })),
    };
  }

  validate(): boolean {
    const data = this.read();
    if (!data.ucUrl || !data.ucUrl.match(HttpUrl)) {
      return false;
    }
    return !data.regions.some(r => !r.identifier || !r.endpoint);
  }

  private readFromRefer(refer: Refer): Endpoint {
    const jsonStrData = localFile
      .read(refer.referTo)
      .toString();
    if (!jsonStrData) {
      return DEFAULT_ENDPOINT;
    }
    const data = lodash.get(
      JSON.parse(jsonStrData),
      refer.keyPath,
      null
    );
    if (!data) {
      return DEFAULT_ENDPOINT;
    }
    return {
      ucUrl: data.ucUrl,
      regions: (data.regions ?? [])
        .map((r: {id: string, label: string, endpoint: string}) => ({
          identifier: r.id,
          label: r.label,
          endpoint: r.endpoint,
        })),
    };
  }
}

export const privateEndpointPersistence = new PrivateEndpointPersistence();
