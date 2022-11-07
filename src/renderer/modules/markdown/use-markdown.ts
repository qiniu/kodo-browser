import {useCallback, useEffect, useMemo, useState} from "react";
import showdown, {ConverterOptions} from "showdown";

const useMarkdown = (converterOptions?: ConverterOptions) => {
  const [element, setElement] = useState<HTMLElement>();
  const [text, setText] = useState<string>("");

  const ref = useCallback((node: HTMLElement | null) => {
    if (!node) {
      return;
    }

    setElement(node);
  }, []);

  const converter = useMemo(() => {
    return new showdown.Converter(converterOptions);
  }, [converterOptions]);

  useEffect(() => {
    if (!element) {
      return;
    }

    element.innerHTML = converter.makeHtml(text);

  }, [element, text]);

  return {
    ref,
    setText,
  };
};

export default useMarkdown;
