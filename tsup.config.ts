import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"], // CommonJS output for Node.js
  target: "node16", // or whatever version you're using
  outDir: "dist",
  clean: true, // Cleans the output folder before bundling
  sourcemap: true, // Enables sourcemaps for debugging
  minify: false, // Can be true for production
  watch: true, // Enables watch mode for hot-reload
});
