import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import frappeui from "frappe-ui/vite";
import { resolve } from "node:path";

export default defineConfig({
	plugins: [
		frappeui({ frappeProxy: false, buildConfig: false, jinjaBootData: false }),
		vue(),
	],
	resolve: {
		alias: {
			"@": resolve(__dirname, "src"),
		},
	},
	test: {
		globals: true,
		environment: "happy-dom",
		setupFiles: [resolve(__dirname, "src/test/setup.js")],
		include: ["src/**/*.{test,spec}.{js,ts}", "test/**/*.{test,spec}.{js,ts}"],
		server: {
			deps: {
				inline: ["frappe-ui"],
			},
		},
	},
});
