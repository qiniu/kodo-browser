import {useCallback, useEffect, useState} from "react";

const useIsOverflow = () => {
  const [element, setElement] = useState<HTMLElement>();
  const [isOverflow, setIsOverflow] = useState(false);

  const ref = useCallback((node: HTMLElement | null) => {
    if (!node) {
      return;
    }

    setElement(node);
  }, []);

  useEffect(() => {
    if (!element) {
      return;
    }

    const checkOverflow = () => {
      if (
        element.clientWidth < element.scrollWidth ||
        element.clientHeight < element.scrollHeight
      ) {
        setIsOverflow(true);
      } else {
        setIsOverflow(false);
      }
    };

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [element]);

  return {
    ref,
    isOverflow,
  };
};

export default useIsOverflow;
