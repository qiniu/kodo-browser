import {Dispatch, SetStateAction, useCallback, useRef, useState} from "react";

import useUnmount from "./use-unmount";

type MayUndefined<T> = T | undefined;

/*
 * React lifecycle hook that calls a function when the component will unmount. Use useLifecycles if you need both a mount and unmount function.
 *
 * Source code modified from [react-use/useRafState](https://github.com/streamich/react-use/blob/cb5dca6ab12ba37ee80ee9d9f4b14f973e5b0d49/src/useRafState.ts).
 * Licensed under [The Unlicense](https://unlicense.org).
 **/
function useRafState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>]
function useRafState<S = undefined>(): [MayUndefined<S>, Dispatch<SetStateAction<MayUndefined<S>>>]

function useRafState<S>(initialState?: S | (() => S)): [(MayUndefined<S>), Dispatch<SetStateAction<(MayUndefined<S>)>>] {
  const frame = useRef(0);
  const [state, setState] = useState<MayUndefined<S>>(initialState);

  const setRafState = useCallback((
    value: MayUndefined<S> | ((prevState: MayUndefined<S>) => MayUndefined<S>)
  ) => {
    cancelAnimationFrame(frame.current);

    frame.current = requestAnimationFrame(() => {
      setState(value);
    });
  }, []);

  useUnmount(() => {
    cancelAnimationFrame(frame.current);
  });

  return [state, setRafState];
}

export default useRafState;
