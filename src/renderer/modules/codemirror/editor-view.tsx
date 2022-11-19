import React, {MutableRefObject, useEffect} from "react";
import {Editor} from "codemirror";

import useEditorView from "./hooks/use-editor-view";
import "./code-mirror-container.scss";

type EditorViewProps = {
  defaultValue: string,
  readOnly?: boolean,
  editorRef?: MutableRefObject<Editor | undefined>
  // extensions: Extension[];
};

const EditorView: React.FC<EditorViewProps> = ({
  defaultValue,
  readOnly,
  editorRef,
}) => {
  const {ref: editorContainerRef, editor} = useEditorView({
    value: defaultValue,
    lineNumbers: true,
    lineWrapping: false,
    readOnly,
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    editor.setValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    if (!editorRef) {
      return;
    }
    editorRef.current = editor;
  }, [editor]);

  return (
    <div
      className="code-mirror-container"
      ref={editorContainerRef}
    />
  );
};

export default EditorView;
