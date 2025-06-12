import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDaaupXyWaqDZrY_4V-AqU5O-lIg5UKA-Q",
  authDomain: "impactful-water-416422.firebaseapp.com",
  projectId: "impactful-water-416422",
  storageBucket: "impactful-water-416422.firebasestorage.app",
  messagingSenderId: "980627040178",
  appId: "1:980627040178:web:52f2a24e3c74142103a6ab",
  measurementId: "G-58S8M1B11L"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);


// const firebaseConfig = {
//   apiKey: "AIzaSyDaaupXyWaqDZrY_4V-AqU5O-lIg5UKA-Q",
//   authDomain: "impactful-water-416422.firebaseapp.com",
//   projectId: "impactful-water-416422",
//   storageBucket: "impactful-water-416422.firebasestorage.app",
//   messagingSenderId: "980627040178",
//   appId: "1:980627040178:web:c153597d584a0ba303a6ab",
//   measurementId: "G-WNHMZ26HVZ"
// };