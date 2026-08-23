import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Qubi",
    short_name: "Qubi",
    description:
      "Organiza las tareas de tu equipo, cronometra el trabajo y lleva el registro de horas por proyecto. Gratis y autoalojada.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0d13",
    theme_color: "#0a0d13",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
