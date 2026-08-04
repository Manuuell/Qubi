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
    target: "tour-home",
    title: "Vuelve al inicio",
    body: "Este botón te trae de regreso al panel principal del espacio desde cualquier parte de Qubi.",
  },
  {
    target: "tour-agenda",
    title: "Tu agenda",
    body: "Aquí ves todas las tareas que tienes pendientes en todos tus proyectos, agrupadas por fecha de vencimiento.",
  },
  {
    target: "tour-create",
    title: "Crea un proyecto",
    body: "Un proyecto agrupa las tareas del equipo y las muestra en tablero, lista, calendario y cronograma.",
  },
  {
    target: "tour-projects",
    title: "Tus proyectos",
    body: "Aquí aparecen los proyectos que ya creaste. Toca uno para ver sus tareas.",
  },
  {
    target: "tour-chat",
    title: "Chatea con tu equipo",
    body: "Mensajes 1 a 1 y canales grupales por proyecto, con reacciones, menciones @ y archivos adjuntos.",
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
    target: "tour-notifications",
    title: "Notificaciones",
    body: "Avisos de menciones, asignaciones y vencimientos. Desde aquí puedes ver el historial completo.",
  },
  {
    target: "tour-account",
    title: "Tu cuenta",
    body: "Toca tu foto o nombre para ver tu perfil. Desde aquí también cambias la apariencia de Qubi o cierras sesión.",
  },
  {
    target: "tour-help",
    title: "Vuelve cuando quieras",
    body: "Toca este ícono en cualquier momento para volver a ver esta guía desde el principio.",
  },
];
