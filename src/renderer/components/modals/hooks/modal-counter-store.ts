const displayModalCounterStore = {
  data: {
    showed: 0,
  },
  listeners: new Set<() => void>(),
  subscribe(l: () => void) {
    displayModalCounterStore.listeners.add(l);
    return () => displayModalCounterStore.listeners.delete(l);
  },
  getSnapshot() {
    return displayModalCounterStore.data;
  },
  dispatch(action: "open" | "close") {
    switch (action) {
      case "open":
        displayModalCounterStore.data.showed += 1;
        break;
      case "close":
        displayModalCounterStore.data.showed -= 1;
        break;
      default:
        return;
    }
    displayModalCounterStore.listeners.forEach(l => l());
  },
};

export default displayModalCounterStore;
