import {useState} from "react";

import displayModalCounterStore from "./modal-counter-store";

interface DisplayModalState<T> {
  show: boolean,
  data: T,
}

interface DisplayModalFns<T> {
  showModal: (...data: T extends undefined ? [] : [T]) => void,
  hideModal: (...data: T extends undefined ? [] : [T]) => void,
  toggleModal: (...data: T extends undefined ? [] : [T]) => void,
}

function useDisplayModal<T>(initialData: T): [DisplayModalState<T>, DisplayModalFns<T>]
function useDisplayModal<T = undefined>(): [DisplayModalState<undefined>, DisplayModalFns<undefined>]
function useDisplayModal<T>(initialData?: T): [DisplayModalState<T | undefined>, DisplayModalFns<T | undefined>] {
  const [
    {
      show,
      data,
    },
    setShowWithData,
  ] = useState({
    show: false,
    data: initialData,
  });

  const showModal = (data?: T) => {
    displayModalCounterStore.dispatch("open");
    return setShowWithData(v => ({
      show: true,
      data: data === undefined
        ? v.data
        : {
          ...v.data,
          ...data,
        },
    }));
  };
  const hideModal = (data?: T) => {
    displayModalCounterStore.dispatch("close");
    return setShowWithData(v => ({
      show: false,
      data: data === undefined
        ? v.data
        : {
          ...v.data,
          ...data,
        },
    }));
  };
  const toggleModal = (data?: T) => setShowWithData(v => {
    displayModalCounterStore.dispatch(!v.show ? "close" : "open");
    return {
      show: !v.show,
      data: data === undefined
        ? v.data
        : {
          ...v.data,
          ...data,
        },
    }
  });

  return [
    {
      show,
      data,
    },
    {
      showModal,
      hideModal,
      toggleModal,
    },
  ];
}

export default useDisplayModal;
