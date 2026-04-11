interface ErrorMessage {
	title: string;
	text: string;
}

interface ErrorCollection {
	[key: number]: ErrorMessage;
}

export const error: ErrorCollection = {
	0: {
		title: '',
		text: '',
	},
	401: {
		title: 'No active sequence found',
		text: 'Please open a sequence',
	},
	402: {
		title: 'No clip selected',
		text: 'Please select a clip',
	},
	403: {
		title: 'Not enough video tracks',
		text: 'There should be two tracks above the selected clip',
	},
	404: {
		title: 'No audio track found',
		text: 'Please target an audio track',
	},
	405: {
		title: 'Error code: 405', //error importing items
		text: 'Please try again or contact support',
	},
	406: {
		title: 'Clash with existing clips',
		text: 'Please target another video track or move CTI',
	},
	407: {
		title: 'Error code: 407', //sfx not found
		text: 'Please try again or contact support',
	},
	408: {
		title: 'Error code: 408', //error copying handlebars
		text: 'Please try again or contact support',
	},
	409: {
		title: 'Error code: 409', //nested sequence not found
		text: 'Please try again or contact support',
	},
	410: {
		title: 'No clips found at CTI',
		text: 'Please ensure there are clips on the timeline',
	},
	411: {
		title: 'No video track found',
		text: 'Please target a video track',
	},
	412: {
		title: 'Error code: 412', //adjustment layer not imported
		text: 'Please try again or contact support',
	},
	413: {
		title: 'Error code: 413', //adjustment clip not found
		text: 'Please try again or contact support',
	},
	414: {
		title: 'Required video effect not found',
		text: 'Please try again or contact support',
	},
	415: {
		title: 'Error code: 415', //can't find clips
		text: 'Please try again or contact support',
	},
	416: {
		title: 'No tracks are targeted',
		text: 'Target either a video or audio track',
	},
	417: {
		title: 'Error code: 417', // generic error
		text: 'Please try again or contact support',
	},
	418: {
		title: 'Video effect not found',
		text: 'It could have been deleted',
	},
	419: {
		title: `'_FF' bin not found`,
		text: 'It could have been deleted or renamed',
	},
	420: {
		title: 'Project item not found',
		text: 'It could have been deleted or renamed',
	},
	421: {
		title: 'Clash with existing clips',
		text: 'Please target another audio track or move CTI',
	},
	422: {
		title: 'No FastFX found',
		text: 'Please select a FastFX clip',
	},
	423: {
		title: 'Unsupported sequence dimensions',
		text: 'Please change the sequence dimensions',
	},
};
