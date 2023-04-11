import {useState} from "react";

type ConfirmState = {
  isShowConfirm: true,
  handleConfirm: (ok: boolean) => void,
} | {
  isShowConfirm: false,
  handleConfirm: undefined,
}

type ToggleConfirmFunctionReturnType<T extends boolean> =
  T extends true ? Promise<boolean> :
    T extends false ? undefined :
      never;

export default function usePromiseConfirm(): [ConfirmState, typeof toggleConfirm] {
  const [
    confirmState,
    setConfirmState,
  ] = useState<ConfirmState>({isShowConfirm: false, handleConfirm: undefined});

  function toggleConfirm<T extends boolean>(open: T): ToggleConfirmFunctionReturnType<T> {
    if (!open) {
      setConfirmState({
        isShowConfirm: false,
        handleConfirm: undefined,
      });
      return undefined as ToggleConfirmFunctionReturnType<T>;
    }
    return new Promise<boolean>(resolve => {
      setConfirmState({
        isShowConfirm: true,
        handleConfirm: resolve,
      });
    }) as ToggleConfirmFunctionReturnType<T>;
  }

  return [confirmState, toggleConfirm];
}
