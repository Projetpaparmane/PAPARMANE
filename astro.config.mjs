import { defineConfig } from "astro/config";

// https://astro.build/config — static output, perfect for Netlify.
export default defineConfig({
  site: "https://paparmane.netlify.app",
  server: { port: 4321 },
});
