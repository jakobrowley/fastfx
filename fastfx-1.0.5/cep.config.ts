import { CEP_Config } from 'vite-cep-plugin';
import { version } from './package.json';

const config: CEP_Config = {
	version,
	id: 'fastfx',
	displayName: 'FastFX',
	symlink: 'local',
	port: 3000,
	servePort: 5000,
	startingDebugPort: 8860,
	extensionManifestVersion: 6.0,
	requiredRuntimeVersion: 9.0,
	hosts: [{ name: 'PPRO', version: '[0.0,99.9]' }],
	type: 'Panel',
	iconDarkNormal: './img/icon.png',
	iconNormal: './img/icon.png',
	iconDarkNormalRollOver: './img/icon.png',
	iconNormalRollOver: './img/icon.png',
	parameters: ['--v=0', '--enable-nodejs', '--mixed-context'],
	width: 630,
	height: 477,

	panels: [
		{
			mainPath: './main/index.html',
			name: 'main',
			panelDisplayName: 'FastFX',
			autoVisible: true,
			width: 630,
			height: 477,
		},
	],
	build: {
		jsxBin: 'off',
		sourceMap: true,
	},
	zxp: {
		country: 'US',
		province: 'CA',
		org: 'TackStudio',
		password: 'TackZxpcert17!',
		tsa: [
			'http://timestamp.digicert.com/', // Windows Only
			'http://timestamp.apple.com/ts01', // MacOS Only
		],
		allowSkipTSA: false,
		sourceMap: false,
		jsxBin: 'off',
	},
	installModules: [],
	copyAssets: ['jsx/assets', 'static', 'img'],
	copyZipAssets: [],
};
export default config;
