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
    // The 'assetsDir' option specifies the directory for generated assets
    // (like JS, CSS, and images) relative to the 'outDir'.
    // By setting it to an empty string (''), we tell Vite to place the
    // assets directly inside the output directory, effectively flattening the structure.
    assetsDir: "",

    // You can also change the name of the output directory if needed.
    // outDir: 'build' // for example, to build to a 'build' folder instead of 'dist'
  },
});
