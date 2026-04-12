import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { cep, runAction } from 'vite-cep-plugin';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import cepConfig from './cep.config';
import pkg from './package.json';
import path from 'path';
import { extendscriptConfig } from './vite.es.config';

const extensions = ['.js', '.ts', '.tsx'];

const devDist = 'dist';
const cepDist = 'cep';

const src = path.resolve(__dirname, 'src');
const root = path.resolve(src, 'js');
const outDir = path.resolve(__dirname, 'dist', 'cep');

const debugReact = process.env.DEBUG_REACT === 'true';
const isProduction = process.env.NODE_ENV === 'production';
const isMetaPackage = process.env.ZIP_PACKAGE === 'true';
const isPackage = process.env.ZXP_PACKAGE === 'true' || isMetaPackage;
const isServe = process.env.SERVE_PANEL === 'true';
const action = process.env.ACTION;

let input = {};
cepConfig.panels.map((panel) => {
	input[panel.name] = path.resolve(root, panel.mainPath);
});

const config = {
	cepConfig,
	isProduction,
	isPackage,
	isMetaPackage,
	isServe,
	debugReact,
	dir: `${__dirname}/${devDist}`,
	cepDist: cepDist,
	zxpDir: `${__dirname}/${devDist}/zxp`,
	zipDir: `${__dirname}/${devDist}/zip`,
	packages: cepConfig.installModules || [],
};

if (action) {
	runAction(config, action);
	process.exit();
}

// Sentry source map upload is opt-in: only runs when SENTRY_AUTH_TOKEN is set.
// Without the token, builds still work normally, they just won't upload sourcemaps.
// To enable: add SENTRY_AUTH_TOKEN to .env.local (which is gitignored).
// See ~/Plugins/_shared/sentry-secrets.md for the token value.
const sentryPlugin = process.env.SENTRY_AUTH_TOKEN
	? sentryVitePlugin({
			org: 'tiny-tapes',
			project: 'fastfx',
			authToken: process.env.SENTRY_AUTH_TOKEN,
			release: { name: `fastfx@${pkg.version}` },
			sourcemaps: {
				filesToDeleteAfterUpload: ['**/*.map'],
			},
			telemetry: false,
	  })
	: null;

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), cep(config), ...(sentryPlugin ? [sentryPlugin] : [])],
	css: {
		preprocessorOptions: {
			scss: {
				additionalData: `@import "./src/_mantine";`,
			},
		},
	},
	resolve: {
		alias: [{ find: '@esTypes', replacement: path.resolve(__dirname, 'src') }],
	},
	root,
	clearScreen: false,
	server: {
		port: cepConfig.port,
	},
	preview: {
		port: cepConfig.servePort,
	},

	build: {
		sourcemap: isPackage ? cepConfig.zxp.sourceMap : cepConfig.build?.sourceMap,
		watch: {
			include: 'src/jsx/**',
		},
		// commonjsOptions: {
		//   transformMixedEsModules: true,
		// },
		rollupOptions: {
			input,
			output: {
				manualChunks: {},
				// esModule: false,
				preserveModules: false,
				format: 'cjs',
			},
		},
		target: 'chrome74',
		outDir,
		minify: 'terser',
		terserOptions: {
			mangle: true,
			compress: {
				drop_console: true,
				keep_infinity: true,
				passes: 3,
				unsafe: true,
			},
			output: {
				comments: false,
			},
		},
	},
});

// rollup es3 build
const outPathExtendscript = path.join('dist', 'cep', 'jsx', 'index.js');
extendscriptConfig(`src/jsx/index.ts`, outPathExtendscript, cepConfig, extensions, isProduction, isPackage);
