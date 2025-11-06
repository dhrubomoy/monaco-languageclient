import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
    entry: {
        editor:"../../node_modules/@codingame/monaco-vscode-editor-api/esm/vs/editor/editor.worker.js",
        textmate: '../../node_modules/@codingame/monaco-vscode-textmate-service-override/vscode/src/vs/workbench/services/textMate/browser/backgroundTokenization/worker/textMateTokenizationWorker.worker.js'
    },
    output: {
        filename: "[name].js",
        path: resolve(__dirname, "./src/assets/monaco-workers"),
    },
    mode: "development",
    performance: {
        hints: false,
    },
};