import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDOJ9kmkBQQhS6XIAqwd6Gt4zuplJSqOUE",
  authDomain: "leadsites-a356b.firebaseapp.com",
  projectId: "leadsites-a356b",
  storageBucket: "leadsites-a356b.appspot.com",
  messagingSenderId: "15730446165",
  appId: "1:15730446165:web:fe6943c4548f185697e9dc",
  measurementId: "G-YSW1BVXVZD",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };
