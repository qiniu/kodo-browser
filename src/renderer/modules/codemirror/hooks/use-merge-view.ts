import {useCallback, useEffect, useState} from "react";
import {MergeView, MergeViewConfiguration} from "codemirror/addon/merge/merge";

import CodeMirror from "../compatible";

const useMergeView = (mergeViewConfiguration: MergeViewConfiguration) => {
  const [element, setElement] = useState<HTMLElement>();
  const [editor, setEditor] = useState<MergeView>();

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

    setEditor(CodeMirror.MergeView(
      element,
      mergeViewConfiguration,
    ));

    return () => {
      setEditor(undefined);
      element.remove();
    };
  }, [element]);

  return {
    ref,
    editor,
  };
}

export default useMergeView;
