import {MigrateStep} from "../../migrator";

import up from "./upgrade";
import down from "./downgrade";

export const v2_2_0: MigrateStep = {
  version: "2.2.0",
  up,
  down,
};
