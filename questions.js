// ============================================================
// BANCO DE PREGUNTAS
// Cada pregunta tiene 3 opciones fijas ("options").
// El juego agrega automáticamente una 4ta opción en blanco para
// que Paul o Claudia escriban su propia respuesta.
// No hay respuesta "correcta": es para comentar en el chat.
// ============================================================
const QUESTIONS = [
  {
    question: "¿Si alguien más te ofreciera la relación perfecta, me dejarías?",
    options: ["No, elijo lo que estamos construyendo", "La perfección no existe, me quedo contigo", "Lo pensaría, pero me quedaría"]
  },
  {
    question: "¿Alguna vez has pensado en irte? Si es así, ¿qué te detuvo?",
    options: ["Nunca lo he pensado", "El amor que te tengo", "Nuestros buenos momentos y promesas"]
  },
  {
    question: "¿Qué es lo más difícil de quererme?",
    options: ["Nuestras diferencias de carácter", "Los problemas de comunicación a veces", "Nada, es muy fácil quererte"]
  },
  {
    question: "¿Sientes que eres feliz conmigo o hay algo que te falta?",
    options: ["Soy muy feliz, no me falta nada", "Soy feliz, pero siempre podemos mejorar juntos", "A veces siento que nos falta más tiempo"]
  },
  {
    question: "¿Cuál es el miedo más grande que tienes de nuestro futuro juntos?",
    options: ["Que la rutina nos termine apagando", "Alejarnos poco a poco sin darnos cuenta", "No lograr entendernos en los momentos difíciles"]
  },
  {
    question: "¿Hay algo que tienes miedo de decirme por temor a cómo podría reaccionar?",
    options: ["No, siento que puedo decirte todo", "A veces prefiero callar para evitar discusiones", "Sí, algunas cosas que prefiero guardarme"]
  },
  {
    question: "Si pudieras cambiar una sola cosa de nuestra relación sin herirme, ¿qué sería?",
    options: ["Pasaríamos más tiempo de calidad juntos", "Mejoraríamos la forma en que nos comunicamos", "No cambiaría absolutamente nada"]
  }
];
