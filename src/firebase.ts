import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyB6AsXNJ7p30H3CGsrh4yVGOvqUQEcbG_c",
    authDomain: "similarquestion-284db.firebaseapp.com",
    projectId: "similarquestion-284db",
    storageBucket: "similarquestion-284db.firebasestorage.app",
    messagingSenderId: "616343843174",
    appId: "1:616343843174:web:c6c7ec2676fa36c75398a7",
    measurementId: "G-6R998LPVDS"
};

const app = initializeApp(firebaseConfig);
getAnalytics(app);

export const db = getFirestore(app);
