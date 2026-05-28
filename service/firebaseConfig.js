import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyD0UrjUQa8FTV6_68JGxPpiotzjXMN-P4A",
  authDomain: "recycling-logistics-app.firebaseapp.com",
  projectId: "recycling-logistics-app",
  storageBucket: "recycling-logistics-app.firebasestorage.app",
  messagingSenderId: "600023019605",
  appId: "1:600023019605:android:d41327a559cd21488164dc",
};

const app = initializeApp(firebaseConfig);

class AsyncStoragePersistence {
  static type = "LOCAL";

  constructor() {
    this.type = "LOCAL";
    this._shouldAllowMigration = true;
  }

  async _isAvailable() {
    return true;
  }

  async _set(key, value) {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  }

  async _get(key) {
    const storedValue = await AsyncStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : null;
  }

  async _remove(key) {
    await AsyncStorage.removeItem(key);
  }

  _addListener() {}

  _removeListener() {}
}

export const auth = Platform.OS === "web"
  ? getAuth(app)
  : (() => {
      try {
        return initializeAuth(app, {
          persistence: AsyncStoragePersistence,
        });
      } catch {
        return getAuth(app);
      }
    })();
export const db = Platform.OS === "web"
  ? getFirestore(app)
  : (() => {
      try {
        return initializeFirestore(app, {
          experimentalForceLongPolling: true,
          useFetchStreams: false,
        });
      } catch {
        return getFirestore(app);
      }
    })();
export const storage = getStorage(app);
