import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD0UrjUQa8FTV6_68JGxPpiotzjXMN-P4A",
  authDomain: "pulsar.com",
  projectId: "recycling-logistics-app",
  storageBucket: "recycling-logistics-app.firebasestorage.app",
  messagingSenderId: "600023019605",
  appId: "1:600023019605:android:d41327a559cd21488164dc"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
