import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import frappeui from "frappe-ui/vite";
import { resolve } from "node:path";

export default defineConfig({
	plugins: [
		frappeui(),
		vue(),
	],
	css: {
		postcss: resolve(__dirname, "postcss.config.cjs"),
	},
	define: {
		"process.env.NODE_ENV": JSON.stringify("production"),
	},
	build: {
		outDir: "omniquery/public/dist",
		emptyOutDir: false,
		assetsDir: ".",
		cssCodeSplit: false,
		assetsInlineLimit: 0,
		lib: {
			entry: resolve(__dirname, "src/main.js"),
			name: "OmniQuery",
			formats: ["iife"],
			fileName: () => "omniquery.bundle.js",
		},
		rollupOptions: {
			output: {
				assetFileNames: (info) => {
					if ((info.name || "").endsWith(".css")) return "omniquery.bundle.css";
					return "[name][extname]";
				},
				inlineDynamicImports: true,
			},
		},
	},
});
