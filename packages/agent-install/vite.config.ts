import fs from "node:fs";
import { defineConfig } from "vite-plus";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
  version: string;
};

export default defineConfig({
  pack: {
    entry: ["src/index.ts", "src/skill.ts", "src/mcp.ts", "src/agents-md.ts", "src/cli.ts"],
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    sourcemap: false,
    platform: "node",
    fixedExtension: false,
    define: {
      "process.env.VERSION": JSON.stringify(process.env.VERSION ?? packageJson.version),
    },
  },
  test: {
    globals: true,
    include: ["test/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
