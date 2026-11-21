import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ChatterBuds Voice Translator",
    short_name: "ChatterBuds",
    description: "WhatsApp-style voice-only translator with instant live earbud calls",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0B141A",
    theme_color: "#0B141A",
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
