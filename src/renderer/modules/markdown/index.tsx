import React, {useEffect} from "react";

import {ConverterOptions} from "showdown";

import useMarkdown from "./use-markdown";

interface MarkdownViewProps {
  text: string | undefined,
  converterOptions?: ConverterOptions,
}

const MarkdownView: React.FC<MarkdownViewProps> = ({
  text = "",
  converterOptions,
}) => {
  const {ref, setText} = useMarkdown(converterOptions);

  useEffect(() => {
    setText(text);
  }, [text]);

  return (
    <div ref={ref}/>
  );
};

export default MarkdownView;
