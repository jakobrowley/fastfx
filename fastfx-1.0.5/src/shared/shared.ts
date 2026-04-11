import config from '../../cep.config';
export const ns = config.id;

export const appData = {
	productAuthor: 'TinyTapes',
	productName: 'Fast_FX',
	licenseFileParts: ['ff', 'tt', 'li'],
	licenseKeyParts: ['FAST', 'TT'],
	licenseKeyListToken: '9p67YbckYnC8pgyptaii1x8gxr9x9VYm9S8T',
};

export type SettingsType = {
	category: string | null;
	subcategory: string | null;
	fxSpeed: string | null;
	speed: string | null;
	preset: string | null;
	fx: Array<{ [key: string]: any }> | null;
	preview: string;
};

export type SliderType = {
	value: number;
	visible: boolean;
};

export type SlidersType = {
	[name: string]: SliderType;
};

export const editSliderDefaults = {
	'intensity': 1,
	'd. blur': 5,
	'flash': 0,
	'm. blur': 180,
};

export const editSliderMinMax = {
	'intensity': { min: 1, max: 10 },
	'd. blur': { min: 1, max: 10 },
	'flash': { min: -100, max: 100 },
	'm. blur': { min: 0, max: 360 },
};
