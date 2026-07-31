export type OnboardingStep = {
  target: string | null; // valor de data-tour, o null para un paso centrado
  title: string;
  body: string;
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    target: null,
    title: "Bienvenido a Qubi",
    body: "Te damos un repaso rápido de lo esencial para que le saques provecho desde ya. Puedes salir cuando quieras.",
  },
  {
    target: "tour-search",
    title: "Busca cualquier cosa",
    body: "Encuentra páginas y bases de datos al instante con ⌘K (o Ctrl K en Windows).",
  },
  {
    target: "tour-home",
    title: "Vuelve al inicio",
    body: "Este botón te trae de regreso al panel principal del espacio desde cualquier parte de Qubi.",
  },
  {
    target: "tour-create",
    title: "Crea contenido",
    body: "Un proyecto agrupa tareas con tablero, lista, calendario y cronograma. Las páginas son para notas y documentos, y las bases de datos organizan información en tablas, tableros, calendarios o galerías.",
  },
  {
    target: "tour-projects",
    title: "Tus proyectos",
    body: "Aquí aparecen los proyectos que ya creaste. Toca uno para ver sus tareas.",
  },
  {
    target: "tour-agenda",
    title: "Tu agenda",
    body: "Aquí ves todas las tareas que tienes pendientes en todos tus proyectos, agrupadas por fecha de vencimiento.",
  },
  {
    target: "tour-hours",
    title: "Registro de horas",
    body: "Cronometra tu trabajo en vivo o carga las horas manualmente, y descarga el resumen mensual en Excel.",
  },
  {
    target: "tour-members",
    title: "Tu equipo",
    body: "Invita personas por correo y gestiona sus roles: propietario, admin, miembro o invitado.",
  },
  {
    target: "tour-account",
    title: "Tu cuenta",
    body: "Cambia tu foto, tu nombre, la apariencia de Qubi o cierra sesión desde aquí.",
  },
  {
    target: "tour-help",
    title: "Vuelve cuando quieras",
    body: "Toca este ícono en cualquier momento para volver a ver esta guía desde el principio.",
  },
];
