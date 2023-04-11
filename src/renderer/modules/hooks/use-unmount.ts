import {useEffect, useRef} from 'react';


/*
 * React lifecycle hook that calls a function when the component will unmount. Use useLifecycles if you need both a mount and unmount function.
 *
 * Source code modified from [react-use/useUnmount](https://github.com/streamich/react-use/blob/cb5dca6ab12ba37ee80ee9d9f4b14f973e5b0d49/src/useUnmount.ts).
 * licensed under [The Unlicense](https://unlicense.org).
 **/
const useUnmount = (fn: () => any): void => {
  const fnRef = useRef(fn);

  // update the ref each render so if it changes the newest callback will be invoked
  fnRef.current = fn;

  useEffect(() => () => fnRef.current(), []);
};

export default useUnmount;
