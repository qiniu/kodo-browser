import {localFile} from "@renderer/modules/persistence";

interface RegionSetting {
  /* s3 id */
  identifier: string,
  label: string,
  endpoint: string,
}

export interface Endpoint {
  ucUrl: string,
  regions: RegionSetting[],
}

const DEFAULT_ENDPOINT: Endpoint = {
  ucUrl: "",
  regions: [{
    identifier: "",
    label: "",
    endpoint: "",
  }],
};

class PrivateEndpointPersistence {
  static ConfigFile = "config.json";

  save(value: Endpoint) {
    localFile.save(
      PrivateEndpointPersistence.ConfigFile,
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

  read(): Endpoint {
    const jsonStrData = localFile
        .read(PrivateEndpointPersistence.ConfigFile)
        .toString();
    if (!jsonStrData) {
      return DEFAULT_ENDPOINT;
    }
    let data = JSON.parse(jsonStrData);
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
}

export const privateEndpointPersistence = new PrivateEndpointPersistence();
