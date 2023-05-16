import {useState} from "react";

import {BatchTaskStatus} from "./types";

export interface BatchProgressState {
  status: BatchTaskStatus,
  total: number,
  finished: number,
  errored: number,
}

const defaultBatchProgressState: BatchProgressState = {
  status: BatchTaskStatus.Standby,
  total: 0,
  finished: 0,
  errored: 0,
}

const useBatchProgress = (
  initState: BatchProgressState = defaultBatchProgressState
): [BatchProgressState, typeof setBatchProgressState] => {
  const [batchProgressState, setState] = useState<BatchProgressState>(initState);
  function setBatchProgressState(
    state: Partial<BatchProgressState> | ((state: BatchProgressState) => Partial<BatchProgressState>)
  ) {
    if (typeof state === "function") {
      setState(s => ({
        ...s,
        ...state(s)
      }));
      return;
    }
    setState(s => ({
      ...s,
      ...state,
    }));
  }
  return [batchProgressState, setBatchProgressState];
}

export default useBatchProgress;
