export interface TabProps {
	name: string;
	tooltip?: string;
	shortcut?: string;
	icon?: string;
}

export const fxSpeedTabs: TabProps[] = [
	{
		name: 'slow',
		tooltip: 'FastFX speed: slow',
	},
	{
		name: 'medium',
		tooltip: 'FastFX speed: medium',
	},
	{
		name: 'fast',
		tooltip: 'FastFX speed: fast',
	},
];

export const speedTabs: TabProps[] = [
	{
		name: '50%',
		tooltip: 'Clip speed: 50%',
	},
	{
		name: '100%',
		tooltip: 'Clip speed: 100%',
	},
	{
		name: '200%',
		tooltip: 'Clip speed: 200%',
	},
	{
		name: '300%',
		tooltip: 'Clip speed: 300%',
	},
];

export const zoomButtons: TabProps[] = [
	{
		name: 'zoom in',
		icon: 'minimize',
		tooltip: 'Zoom in',
	},
	{
		name: 'zoom out',
		icon: 'maximize',
		tooltip: 'Zoom out',
	},
];

export const filterButtons: TabProps[] = [
	{
		name: 'flashes',
		icon: 'lightbulb-on',
	},
	{
		name: 'custom',
		icon: 'floppy-disk',
	},
];

export const actionButtons: TabProps[] = [
	{
		name: 'deletePreset',
		icon: 'trash-can',
		tooltip: 'Delete custom preset',
	},
	{
		name: 'target',
		icon: 'crosshairs',
		tooltip: 'Set target tracks',
	},
	{
		name: 'cut',
		icon: 'scissors',
		tooltip: 'Change speed & cut clip',
	},
	{
		name: 'speed',
		icon: 'gauge',
		tooltip: 'Change speed',
	},
	{
		name: 'delete',
		icon: 'xmark',
		tooltip: 'Delete FastFX',
	},
	{
		name: 'apply',
		icon: 'check',
		tooltip: 'Apply FastFX',
	},
];

export const editButtons: TabProps[] = [
	{
		name: 'cancel',
		icon: 'trash-can',
		shortcut: 'esc',
		tooltip: 'Remove FastFX',
	},
	{
		name: 'save',
		icon: 'floppy-disk',
		tooltip: 'Save as new FastFX preset',
	},
	{
		name: 'ok',
		icon: 'check',
		shortcut: 'shift+space',
		tooltip: 'Done',
	},
];
