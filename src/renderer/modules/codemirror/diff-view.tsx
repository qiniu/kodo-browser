import React, {MutableRefObject, useEffect} from "react";
import {MergeView} from "codemirror/addon/merge/merge";

import useMergeView from "./hooks/use-merge-view";

type DiffViewProps = {
  dirtiedValue: string,
  originalValue: string,
  editorRef?: MutableRefObject<MergeView | undefined>
  // extensions: Extension[];
};

const DiffView: React.FC<DiffViewProps> = ({
  dirtiedValue,
  originalValue,
  editorRef,
}) => {
  const {ref: editorContainerRef, editor} = useMergeView({
    value: dirtiedValue,
    origLeft: originalValue,
    lineNumbers: true,
    lineWrapping: false,
    showDifferences: true,
    connect: "align",
    collapseIdentical: true,
    // readonly
    allowEditingOriginals: false,
    revertButtons: false,
  });

  // update right
  useEffect(() => {
    const rightEditor = editor?.rightOriginal();
    if (!editor || !rightEditor) {
      return;
    }
    rightEditor.setValue(dirtiedValue);
    editor.setShowDifferences(true);
  }, [dirtiedValue]);

  // update left
  useEffect(() => {
    const leftEditor = editor?.leftOriginal();
    if (!editor || !leftEditor) {
      return;
    }
    leftEditor.setValue(dirtiedValue);
    editor.setShowDifferences(true);
  }, [originalValue]);

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

export default DiffView;
