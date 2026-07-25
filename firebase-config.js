// ============================================================
// CONFIGURACIÓN DE FIREBASE
// Reemplaza estos valores con los de TU proyecto de Firebase.
// Los encuentras en: Configuración del proyecto > Tus apps > SDK setup
// (En el README te explico paso a paso dónde sacarlos.)
// ============================================================
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  databaseURL: "https://TU_PROYECTO-default-rtdb.firebaseio.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
