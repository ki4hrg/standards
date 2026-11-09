import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest. Added to a home screen, the app opens standalone. Without
// `scope`, the browser takes it from the page the app was added from and shows its own bars on
// every other page. Browsers fetch this without cookies, so it must not sit behind sign-in.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "__APP__",
    short_name: "__APP__",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Light `--color-page` from app/globals.css; the manifest takes one colour.
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
