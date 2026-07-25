// ============================================================
// CONFIGURACIÓN DE FIREBASE
// Reemplaza estos valores con los de TU proyecto de Firebase.
// Los encuentras en: Configuración del proyecto > Tus apps > SDK setup
// (En el README te explico paso a paso dónde sacarlos.)
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyC2uT0RafzYQldcdxby3_VYagEgh3AjJGA",
  authDomain: "juego-5e759.firebaseapp.com",
  databaseURL: "https://juego-5e759-default-rtdb.firebaseio.com",
  projectId: "juego-5e759",
  storageBucket: "juego-5e759.firebasestorage.app",
  messagingSenderId: "63536558150",
  appId: "1:63536558150:web:5fb659ee8fd571fb885a47",
  measurementId: "G-GSJK42VWHW"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
