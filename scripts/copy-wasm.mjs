// Copies the sql.js WebAssembly binary into /public so the SQL sandbox is self-hosted (no CDN dependency).
import { copyFileSync, mkdirSync } from "node:fs";
mkdirSync("public", { recursive: true });
copyFileSync("node_modules/sql.js/dist/sql-wasm.wasm", "public/sql-wasm.wasm");
