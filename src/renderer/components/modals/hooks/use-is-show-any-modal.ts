import {useSyncExternalStore} from "react";

import displayModalCounterStore from "@renderer/components/modals/hooks/modal-counter-store";

const useIsShowAnyModal = () => {
  const displayModalShowed = useSyncExternalStore(
    displayModalCounterStore.subscribe,
    () => displayModalCounterStore.getSnapshot().showed
  );
  return displayModalShowed > 0;
};

export default useIsShowAnyModal;
