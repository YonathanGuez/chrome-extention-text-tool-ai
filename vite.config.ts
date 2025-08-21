import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: "manifest.json",
          dest: ".",
        },
      ],
    }),
  ],
  build: {
    // By setting it to an empty string (''), we tell Vite to place the
    // assets directly inside the output directory, effectively flattening the structure.
    assetsDir: "",
  },
});
