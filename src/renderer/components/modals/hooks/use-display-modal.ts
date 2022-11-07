import {useState} from "react";

interface DisplayModalState<T> {
  show: boolean,
  data: T,
}

interface DisplayModalFns<T> {
  showModal: T extends undefined ? () => void : (data: T) => void,
  closeModal: T extends undefined ? () => void : (data: T) => void,
  toggleModal:T extends undefined ? () => void :  (data: T) => void,
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

  const showModal = (data?: T) => setShowWithData(v => ({
    show: true,
    data: data === undefined
      ? v.data
      : {
        ...v.data,
        ...data,
      },
  }));
  const closeModal = (data?: T) => setShowWithData(v => ({
    show: false,
    data: data === undefined
      ? v.data
      : {
        ...v.data,
        ...data,
      },
  }));
  const toggleModal = (data?: T) => setShowWithData(v => ({
    show: !show,
    data: data === undefined
      ? v.data
      : {
        ...v.data,
        ...data,
      },
  }));

  return [
    {
      show,
      data,
    },
    {
      showModal,
      closeModal,
      toggleModal,
    }
  ];
}

export default useDisplayModal;
