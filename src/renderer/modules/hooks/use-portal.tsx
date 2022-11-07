import React, {useCallback, useState} from "react";
import ReactDOM from "react-dom";

const usePortal = () => {
  const [element, setElement] = useState<HTMLElement>();

  const ref = useCallback((node: HTMLElement | null) => {
    if (!node) {
      return;
    }

    setElement(node);
  }, []);

  const portal = useCallback<React.FC<React.PropsWithChildren>>(({children}) => {
    if (!element) {
      return null;
    }

    return ReactDOM.createPortal(
      children,
      element,
    );
  }, [element]);

  return {
    ref,
    portal,
  };
};

export default usePortal;
