import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyD0UrjUQa8FTV6_68JGxPpiotzjXMN-P4A",
  authDomain: "recycling-logistics-app.firebaseapp.com",
  projectId: "recycling-logistics-app",
  storageBucket: "recycling-logistics-app.appspot.com",
  messagingSenderId: "600023019605",
  appId: "1:600023019605:android:d41327a559cd21488164dc",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
