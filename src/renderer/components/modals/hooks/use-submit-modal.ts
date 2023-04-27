import React, {useState} from "react";

type AsyncFunction = (...args: any[]) => Promise<any> | void;

type UseHandleSubmit = <T extends AsyncFunction>(fn: T, ...args: Parameters<T>) => (e?: React.BaseSyntheticEvent) => (Promise<Awaited<ReturnType<T>>> | void);

type SubmitModalHook = () => {
  state: {
    isSubmitting: boolean,
    // isSubmitSuccessful: boolean,
  }
  handleSubmit: UseHandleSubmit,
  // reset,
};

const useSubmitModal: SubmitModalHook = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit: UseHandleSubmit = (fn, ...args) => {
    return (e) => {
      e?.preventDefault();

      const p = fn(...args);
      if (p) {
        setIsSubmitting(true);
        p.finally(() => {
          setIsSubmitting(false);
        });
      }
      return p;
    }
  }

  return {
    state: {
      isSubmitting,
    },
    handleSubmit,
  };
}

export default useSubmitModal;
