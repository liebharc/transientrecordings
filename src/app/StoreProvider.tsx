"use client";
import { useRef } from "react";
import { Provider } from "react-redux";
import { makeStore, AppStore } from "../lib/store";
import { PersistGate } from "redux-persist/integration/react";
import { Persistor } from "redux-persist";

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeRef = useRef<AppStore>(undefined);
  const persistorRef = useRef<Persistor>(undefined);
  if (!storeRef.current) {
    // Create the store instance the first time this renders
    const newStoreConfig = makeStore();
    storeRef.current = newStoreConfig.store;
    persistorRef.current = newStoreConfig.persistor;
  }

  if (!persistorRef.current) {
    return null;
  }

  return (
    <Provider store={storeRef.current}>
      <PersistGate loading={null} persistor={persistorRef.current}>
        {children}
      </PersistGate>
    </Provider>
  );
}
