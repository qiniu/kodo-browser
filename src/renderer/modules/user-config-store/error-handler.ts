import {toast} from "react-hot-toast";

import * as Logger from "@renderer/modules/local-logger";

export default function handleLoadError(err: Error): void {
  toast.error(err.message);
  Logger.error(err);
}
