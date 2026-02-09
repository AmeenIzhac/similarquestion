// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyB6AsXNJ7p30H3CGsrh4yVGOvqUQEcbG_c",
    authDomain: "similarquestion-284db.firebaseapp.com",
    projectId: "similarquestion-284db",
    storageBucket: "similarquestion-284db.firebasestorage.app",
    messagingSenderId: "616343843174",
    appId: "1:616343843174:web:c6c7ec2676fa36c75398a7",
    measurementId: "G-6R998LPVDS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);