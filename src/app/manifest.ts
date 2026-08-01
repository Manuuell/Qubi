import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Qubi",
    short_name: "Qubi",
    description: "Tu espacio de trabajo tipo Notion, gratis y autoalojado.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0d13",
    theme_color: "#0a0d13",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
