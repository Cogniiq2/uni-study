import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Studium – Wirtschaftsinformatik",
    short_name: "Studium",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#4f46e5",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
