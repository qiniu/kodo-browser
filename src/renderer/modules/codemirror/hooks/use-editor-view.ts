import {useCallback, useEffect, useState} from "react";
import {Editor, EditorConfiguration} from "codemirror";

import CodeMirror from "../compatible";

const useEditorView = (editorConfiguration: EditorConfiguration) => {
  const [element, setElement] = useState<HTMLElement>();
  const [editor, setEditor] = useState<Editor>();

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

    setEditor(CodeMirror(
      element,
      editorConfiguration,
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

export default useEditorView;
