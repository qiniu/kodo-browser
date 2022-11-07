import {RefObject, useEffect} from "react";

import useRafState from "./use-raf-state";

interface Position {
  left: number,
  top: number,
  isTouchEnd: boolean,
}

interface scrollConfig {
  touchEndThreshold: number,
}

const useScroll = (target: RefObject<HTMLElement>, scrollConfig?: scrollConfig): Position | undefined => {
  const [position, setPosition] = useRafState<Position>();

  useEffect(() => {
    const handler = () => {
      if (target.current) {
        const {
          scrollLeft,
          scrollTop,
          scrollHeight,
          clientHeight,
        } = target.current;
        const isTouchEnd =
          Math.round(scrollTop) + clientHeight > scrollHeight - (scrollConfig?.touchEndThreshold ?? 10);
        setPosition({
          left: scrollLeft,
          top: scrollTop,
          isTouchEnd: isTouchEnd,
        });
      }
    };

    if (target.current) {
      target.current.addEventListener('scroll', handler, {
        capture: false,
        passive: true,
      });
    }

    return () => {
      if (target.current) {
        target.current.removeEventListener('scroll', handler);
      }
    };
  }, [target]);

  return position;
}

export default useScroll;
