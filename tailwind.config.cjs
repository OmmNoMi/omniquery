const frappeUIPreset = require("frappe-ui/tailwind");
const colors = require("tailwindcss/colors");

module.exports = {
	presets: [frappeUIPreset],
	content: [
		"./src/**/*.{vue,js,ts,jsx,tsx}",
		"./omniquery/www/omniquery.html",
		"./node_modules/frappe-ui/src/components/**/*.{vue,js,ts,jsx,tsx}",
	],
	darkMode: "class",
	theme: {
		extend: {
			colors: {
				slate: colors.slate,
				emerald: colors.emerald,
				amber: colors.amber,
				rose: colors.rose,
				brand: {
					blue: '#4285F4',
					green: '#34A853',
					red: '#EA4335',
					yellow: '#FBBC05',
					purple: '#673AB7',
				}
			},
			fontFamily: {
				sans: ['"Google Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
				mono: ['"JetBrains Mono"', 'monospace'],
			}
		}
	}
};
