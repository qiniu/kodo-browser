import React from "react";

import {PropsPath} from "./types";
import Dictionary from "./lang/dict";
import {splitVariables} from "./core";
import {useI18n} from "./react-context";

interface TranslateProps<T extends Record<string, string>> {
  i18nKey: PropsPath<Dictionary>,
  data: T,
  slots?: Record<keyof T, (value: string) => React.ReactNode>
}

export const Translate = <T extends Record<string, string>>(props: TranslateProps<T>): JSX.Element => {
  const {
    i18nKey,
    data,
    slots,
  } = props;

  const {translate} = useI18n();

  return (
    <>
      {
        splitVariables(translate(i18nKey))
          .map<React.ReactNode>(snippet => {
            if (snippet.isVar) {
              return (
                <React.Fragment key={snippet.value}>
                  {
                    slots?.[snippet.value]
                      ? slots[snippet.value](data[snippet.value])
                      : data[snippet.value]
                  }
                </React.Fragment>
              );
            }
            return snippet.value;
          })
      }
    </>
  )
};
