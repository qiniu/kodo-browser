import {useState} from "react";

type DisplayModalHook = () => [
  boolean,
  {
    showModal: () => void,
    closeModal: () => void,
    toggleModal: () => void,
  }
]

const useDisplayModal: DisplayModalHook = () => {
  const [show, setShow] = useState(false);

  const showModal = () => setShow(true);
  const closeModal = () => setShow(false);
  const toggleModal = () => setShow(!show);

  return [
    show,
    {
      showModal,
      closeModal,
      toggleModal,
    }
  ]
}

export default useDisplayModal;
