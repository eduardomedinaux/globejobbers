import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
  			mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
  			// Landing v2 (design system v2) — escopadas ao wrapper .gj-landing
  			display: ["var(--font-fraunces)", "serif"],
  			grotesk: ["var(--font-grotesk)", "ui-sans-serif", "sans-serif"],
  			spacemono: ["var(--font-space-mono)", "ui-monospace", "monospace"],
  		},
  		boxShadow: {
  			// Sombra dura (sem blur) do design system v2 da landing
  			dura: "4px 4px 0 #17130C",
  			"dura-sm": "2px 2px 0 #17130C",
  			"dura-laranja": "4px 4px 0 #E05A26",
  			"dura-amarelo": "4px 4px 0 #F2B23A",
  			"dura-papel": "4px 4px 0 #FAF4E8",
  		},
  		colors: {
  			// Paleta da landing v2 (aditiva — não altera nada renderizado hoje)
  			papel: "#FAF4E8",
  			"papel-card": "#FFFBF2",
  			tinta: "#17130C",
  			"gj-teal": "#0F4D4A",
  			laranja: "#E05A26",
  			amarelo: "#F2B23A",
  			jeans: "#7BA4D8",
  			"jeans-escuro": "#4E79B5",
  			folha: "#2E6B4F",
  			terracota: "#C7431F",
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: 'hsl(var(--destructive))',
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
