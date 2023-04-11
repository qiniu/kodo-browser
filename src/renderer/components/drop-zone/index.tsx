import React, {DragEventHandler, useEffect, useState} from "react";
import classNames from "classnames";

import "./drop-zone.scss";

interface DropZoneProps {
  enterText?: string,
  overText?: string,
  alwaysShow?: boolean,
  disabled?: boolean,
  // costumeContainer?: HTMLElement,
  onDropped: (filePaths: string[]) => void,
}

const DropZone: React.FC<React.HTMLProps<HTMLDivElement> & DropZoneProps> = ({
  enterText,
  overText,
  alwaysShow= false,
  disabled = false,
  // costumeContainer = <div/>,
  onDropped,
  ...divProps
}) => {
  const [contentText, setContentText] = useState(enterText);
  const [showDropZone, setShowDropZone] = useState(alwaysShow);

  useEffect(() => {
    if (disabled) {
      if (!alwaysShow) {
        setShowDropZone(false);
      }
      return;
    }

    if (alwaysShow) {
      setShowDropZone(true);
      return;
    }
    let enterTimes = 0;

    const handleBodyDragEnter = () => {
      enterTimes += 1;
      if (enterTimes > 1) {
        return;
      }
      setShowDropZone(true);
    }

    // hover is required, or else drop event will not fire
    const handleBodyDragOver = (e: DragEvent) => {
      e.preventDefault();
    }

    const handleBodyDragLeave = () => {
      enterTimes -= 1;
      if (enterTimes > 0) {
        return
      }
      setShowDropZone(false);
    }

    const handleBodyDrop = () => {
      enterTimes = 0;
      setShowDropZone(false);
    }

    document.body.addEventListener("dragenter", handleBodyDragEnter);
    document.body.addEventListener("dragover", handleBodyDragOver);
    document.body.addEventListener("dragleave", handleBodyDragLeave);
    document.body.addEventListener("drop", handleBodyDrop);
    return () => {
      document.body.removeEventListener("dragenter", handleBodyDragEnter)
      document.body.removeEventListener("dragover", handleBodyDragOver)
      document.body.removeEventListener("dragleave", handleBodyDragLeave)
      document.body.removeEventListener("drop", handleBodyDrop)
    }
  }, [alwaysShow, disabled]);

  const handleDragEnter: DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    if (overText) {
      setContentText(overText)
    }
  }
  const handleDragLeave: DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    if (enterText) {
      setContentText(enterText)
    }
  }
  // hover is required, or else drop event will not fire
  const handleDragOver: DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
  }
  const handleDrop: DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();

    setContentText(enterText);
    onDropped(Array.prototype.map.call(
      e.dataTransfer.files,
      (f: File) => f.path,
    ) as string[]);
  }

  return (
    <div
      {...divProps}
      hidden={!showDropZone}
      className={classNames(divProps.className, "drop-zone")}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/*costumeContainer*/}
      <h1>{contentText}</h1>
    </div>
  );
};

export default DropZone;
