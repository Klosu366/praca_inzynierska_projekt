import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Twoja konfiguracja z konsoli Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAkwnsSy8ynW11OsPf-KWEaTqCvbpqq6_0",
  authDomain: "tarantula-world-db.firebaseapp.com",
  projectId: "tarantula-world-db",
  storageBucket: "tarantula-world-db",
  messagingSenderId: "76963561227",
  appId: "1:76963561227:web:932e7b35014858a5a1ac0e",
  measurementId: "G-9FC1BQ8SF4",
};

// Inicjalizacja aplikacji Firebase
const app = initializeApp(firebaseConfig);

// Inicjalizacja obu usług: Firestore (baza danych) i Storage (magazyn plików)
const db = getFirestore(app);
const storage = getStorage(app);

// Eksportujemy oba połączenia, aby używać ich w całej aplikacji
export { db, storage };
