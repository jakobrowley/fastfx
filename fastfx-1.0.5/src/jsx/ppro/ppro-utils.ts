import { divideNumberByTwo, forEach, roundToNearest, trySilently } from '../utils/utils';

// ProjectItem Helpers

export const forEachChild = (item: ProjectItem, callback: (item: ProjectItem) => void, reverse?: boolean) => {
	const len = item.children.numItems;
	if (reverse) {
		for (let i = len - 1; i > -1; i--) {
			callback(item.children[i]);
		}
	} else {
		for (let i = 0; i < len; i++) {
			callback(item.children[i]);
		}
	}
};

export const deleteItem = (item: ProjectItem) => {
	if (item.type === 2 /* BIN */) {
		item.deleteBin();
	} else {
		const tmpBin = app.project.rootItem.createBin('tmp');
		item.moveBin(tmpBin);
		tmpBin.deleteBin();
	}
};

export const getChildByName = (item: ProjectItem, name: string, type?: number): ProjectItem | undefined => {

	for (let i = 0; i < item.children.numItems; i++) {
		const child = item.children[i];
		if (child.name === name && (type === undefined || child.type === type)) {
			return child;
		}
	}
};
export const searchProjectItemByName = (item: ProjectItem, name: string): ProjectItem | null =>
{
	for (let i = 0; i < item.children.numItems; i++) {
		const child = item.children[i];
		if (child.name === name) {
			return child;
		}
	}

	for (let i = 0; i < item.children.numItems; i++) {
		const child = item.children[i];
		if(child.children != undefined && child.children.numItems>0)
		{
			const find_item = searchProjectItemByName(child,name);
			if(find_item) return find_item;
		}
	}
	return null;
}
export const getParentItem = (item: ProjectItem) => {
	const dir = item.treePath.split('\\');
	if (dir.length < 2) {
		return app.project.rootItem;
	}
	let current = app.project.rootItem;
	for (let i = 2; i < dir.length - 1; i++) {
		const name = dir[i];
		const next = getChildByName(current, name);
		if (next) {
			current = next;
		}
	}
	return current;
};

export const findItemByPath = (item: ProjectItem, path: string): ProjectItem | undefined => {
	const len = item.children.numItems;
	for (let i = 0; i < len; i++) {
		const child = item.children[i];
		if (child.children && child.children.numItems > 0) {
			const res = findItemByPath(child, path);
			if (res) {
				return res;
			}
		} else if (child.getMediaPath() === path) {
			return child;
		}
	}
};

// Sequence Helpers

export const getSequenceByNodeId = (nodeId: string) => {
	const sequences = app.project.sequences;
	for (let i = 0; i < sequences.numSequences; i++) {
		const sequence = sequences[i];
		if (sequence.projectItem.nodeId === nodeId) {
			return sequence;
		}
	}
};

export const getSequenceByName = (name: string) => {
	const sequences = app.project.sequences;
	for (let i = 0; i < sequences.numSequences; i++) {
		const sequence = sequences[i];
		if (sequence.name === name) {
			return sequence;
		}
	}
};

export const getSequenceLengthInFrames = (seq: Sequence) => {
	const settings = seq.getSettings();
	const end = seq.end;
	const fps = settings.videoFrameRate.ticks;
	const frames = Math.round(parseInt(end) / parseInt(fps));
	return frames;
};

export const getSequenceLengthInTicks = (seq: Sequence) => {
	return parseInt(seq.end);
};

export const forEachVideoTrack = (
	sequence: Sequence,
	callback: (track: Track, index: number) => void,
	reverse?: boolean
) => {
	const num = sequence.videoTracks.numTracks;
	if (reverse) {
		for (let i = num - 1; i > -1; i--) {
			callback(sequence.videoTracks[i], i);
		}
	} else {
		for (let i = 0; i < num; i++) {
			callback(sequence.videoTracks[i], i);
		}
	}
};

export const forEachAudioTrack = (
	sequence: Sequence,
	callback: (track: Track, index: number) => void,
	reverse?: boolean
) => {
	const num = sequence.audioTracks.numTracks;
	if (reverse) {
		for (let i = num - 1; i > -1; i--) {
			callback(sequence.audioTracks[i], i);
		}
	} else {
		for (let i = 0; i < num; i++) {
			callback(sequence.audioTracks[i], i);
		}
	}
};

export const forEachClip = (track: Track, callback: (clip: TrackItem, index: number) => void, reverse?: boolean) => {
	const num = track.clips.numItems;
	if (reverse) {
		for (let i = num - 1; i > -1; i--) {
			callback(track.clips[i], i);
		}
	} else {
		for (let i = 0; i < num; i++) {
			callback(track.clips[i], i);
		}
	}
};

export const insertVideoClip = (
	sequence: Sequence,
	qeSequence: Sequence,
	track: Track,
	clipToInsert: ProjectItem,
	seconds: number
) => {
	let unlockedTracks: Track[] = [];
	let numTracks = 0;
	forEachAudioTrack(sequence, (curTrack) => {
		if (!curTrack.isLocked()) {
			unlockedTracks.push(curTrack);
		}
		curTrack.setLocked(1);
		numTracks++;
	});
	track.insertClip(clipToInsert, seconds);
	qeSequence.removeAudioTrack(numTracks);
	forEach(unlockedTracks, (curTrack) => {
		curTrack.setLocked(0);
	});
};

export const unselectAllClips = (sequence: Sequence, video: boolean = true, audio: boolean = true) => {
	if (video) {
		forEachVideoTrack(sequence, (track) => {
			forEachClip(track, (clip) => {
				clip.setSelected(false, true);
			});
		});
	}
	if (audio) {
		forEachAudioTrack(sequence, (track) => {
			forEachClip(track, (clip) => {
				clip.setSelected(false, true);
			});
		});
	}
};

export const getQESequence = (sequence: Sequence) => {
	app.project.openSequence(sequence.sequenceID);
	const qeSequence = qe!.project.getActiveSequence();
	sequence.close();
	return qeSequence;
};

// Clip Helpers

export const getSelectedVideoClip = (
	sequence: Sequence
): { selectedClip: TrackItem | undefined; selectedClipIndex: number | undefined } => {
	let selectedClip: TrackItem | undefined = undefined;
	let selectedClipIndex: number | undefined = undefined;
	let foundSelected = false;

	forEachVideoTrack(sequence, (track) => {
		forEachClip(track, (clip, index) => {
			if (foundSelected) return;
			if (clip.isSelected()) {
				selectedClip = clip;
				selectedClipIndex = index;
				foundSelected = true;
				return;
			}
		});
		if (foundSelected) return;
	});

	return { selectedClip, selectedClipIndex };
};

export const getTrackIndexByClip = (
	sequence: Sequence,
	clipToFind: TrackItem,
	isVideoTrack: boolean
): number | null => {
	let foundTrackIndex: number | null = null;
	if (isVideoTrack) {
		forEachVideoTrack(sequence, (track, index) => {
			forEachClip(track, (clip) => {
				if (foundTrackIndex) return;
				if (clip.nodeId === clipToFind.nodeId) {
					foundTrackIndex = index;
					return;
				}
			});
			if (foundTrackIndex) return;
		});
	} else {
		forEachAudioTrack(sequence, (track, index) => {
			forEachClip(track, (clip) => {
				if (foundTrackIndex) return;
				if (clip.nodeId === clipToFind.nodeId) {
					foundTrackIndex = index;
					return;
				}
			});
			if (foundTrackIndex) return;
		});
	}

	return foundTrackIndex!;
};

export const getClipByName = (track: Track, name: string): TrackItem | null => {
	let foundClip: TrackItem | null = null;
	forEachClip(track, (clip) => {
		if (foundClip) return;
		if (clip.name === name) {
			foundClip = clip;
			return;
		}
	});
	return foundClip;
};

export const getClipsByName = (
	track: Track,
	qeTrack: Track,
	name: string
): { foundClip: TrackItem | null; foundQeClip: QETrackItem | null } => {
	let foundClip: TrackItem | null = null;
	let foundQeClip: QETrackItem | null = null;
	forEachClip(track, (clip) => {
		if (foundClip) return;
		if (clip.name === name) {
			foundClip = clip;
			return;
		}
	});
	forEachQEClip(qeTrack, (qeClip) => {
		if (foundQeClip) return;
		if (qeClip.name === name) {
			foundQeClip = qeClip;
			return;
		}
	});
	return { foundClip, foundQeClip };
};

export const getClipsBetweenTimes = (track: Track, startTime: Time, endTime: Time,frameDuration:Time) => {
	let clips: TrackItem[] = [];
	forEachClip(track, (clip) => {

		var start =Math.max(clip.start.seconds,startTime.seconds);
		var end = Math.min(clip.end.seconds,endTime.seconds);
		if(start<end)
		{
			clips.push(clip);
		}
	/*	if (clip.start.seconds >= startTime.seconds && clip.end.seconds <= endTime.seconds) {
			clips.push(clip);
		}
		else if(Math.abs(startTime.seconds-clip.start.seconds)<frameDuration.seconds &&
		Math.abs(endTime.seconds-clip.end.seconds)<frameDuration.seconds)
		{
			clips.push(clip);
		}
		*/
	});
	return clips;
};

function timeToSecondsAndFrames(timeInSeconds: number, fps: number): string {
	const seconds = Math.floor(timeInSeconds);
	const frames = Math.round((timeInSeconds - seconds) * fps);
	return `${seconds}s ${frames}f`;
}

export const getClipAtTime = (track: Track, time: Time): TrackItem | null => {
	let clip: TrackItem | null = null;
	forEachClip(track, (curClip) => {
		if (clip) return;
		if (curClip.start.ticks === time.ticks) {
			clip = curClip;
			return;
		}
	});
	return clip;
};

export const getClipsAtTime = (
	track: Track,
	qeTrack: Track,
	time: Time
): { clip: TrackItem | null; qeClip: QETrackItem | null } => {
	let qeClip: QETrackItem | null = null;
	let clip: TrackItem | null = null;
	forEachClip(track, (curClip) => {
		if (clip) return;
		if (curClip.start.ticks === time.ticks) {
			clip = curClip;
			return;
		}
	});
	forEachQEClip(qeTrack, (curClip) => {
		if (qeClip) return;
		if (curClip.start.ticks.toString() === time.ticks) {
			qeClip = curClip;
			return;
		}
	});
	return { clip, qeClip };
};

export const getClipAtCTI = (track: Track, qeTrack: Track) => {
	// DOESNT WORK
	let qeClipIndices: number[] = [];
	let clip: TrackItem | undefined;
	let qeClip: QETrackItem | undefined;
	forEachQEClip(qeTrack, (qeClip, index) => {
		trySilently(function () {
			const name = qeClip.name; // fails if clip is blank
			qeClipIndices.push(index);
		});
	});
	for (let i = 0; i < qeClipIndices.length; i++) {
		const curQeClip = qeTrack.getItemAt(qeClipIndices[i]);
		const curClip = track.clips[i];
		if (curClip.start.ticks === qe!.project.getActiveSequence().CTI.ticks.toString()) {
			clip = curClip;
			qeClip = curQeClip;
		}
	}

	return { clip, qeClip };
};

export const splitSequenceLength = (sequence: Sequence): { lower: number; upper: number } => {
	const durFrames = getSequenceLengthInFrames(sequence);
	const { lower, upper } = divideNumberByTwo(durFrames);
	return { lower, upper };
};

// Component Helpers

export const forEachComponent = (
	clip: TrackItem,
	callback: (component: Component, index: number) => void,
	reverse?: boolean
) => {
	const num = clip.components.numItems;
	if (reverse) {
		for (let i = num - 1; i > -1; i--) {
			callback(clip.components[i], i);
		}
	} else {
		for (let i = 0; i < num; i++) {
			callback(clip.components[i], i);
		}
	}
};

// Transition Helpers

export const applyConstantPower = (clip: QETrackItem, start: boolean, durationTimecode: string) => {
	const translations: Record<string, string> = {
		en_US: 'Constant Power',
		en_GB: 'Constant Power',
		de_DE: 'Konstante Leistung',
		es_ES: 'Potencia constante',
		fr_FR: 'Puissance constante',
		it_IT: 'Potenza costante',
		ja_JP: 'コンスタントパワー',
		ko_KR: '지속 가감속',
		pt_BR: 'Potência constante',
		ru_RU: 'Постоянная мощность',
		zh_CN: '恒定功率',
	};
	const language = $.locale;
	const transitionName = translations[language] || translations['en_US'];
	const transition = qe!.project.getAudioTransitionByName(transitionName);
	clip.addTransition(transition, start, durationTimecode);
};

// Time Helpers

export const addTime = (a: Time, b: Time) => {
	const ticks = parseInt(a.ticks) + parseInt(b.ticks);
	let time = new Time();
	time.ticks = ticks.toString();
	return time;
};

export const subtractTime = (a: Time, b: Time) => {
	const ticks = parseInt(a.ticks) - parseInt(b.ticks);
	let time = new Time();
	time.ticks = ticks.toString();
	return time;
};

export const multiplyTime = (a: Time, factor: number) => {
	const ticks = parseInt(a.ticks) * factor;
	let time = new Time();
	time.ticks = ticks.toString();
	return time;
};

export const divideTime = (a: Time, factor: number) => {
	const ticks = parseInt(a.ticks) / factor;
	let time = new Time();
	time.ticks = ticks.toString();
	return time;
};

export const ticksToTime = (ticks: string) => {
	let time = new Time();
	time.ticks = ticks;
	return time;
};

export const secondsToTime = (seconds: number) => {
	let time = new Time();
	time.seconds = seconds;
	return time;
};

export const secondsToTicks = (seconds: number): string => {
	return (seconds * 254016000000).toString();
};

export const framesToTicks = (frames: number, frameDuration: number): string => {
	return secondsToTicks(frames * frameDuration);
};

export const getTimecode = (t: Time, frameRateTime: Time, videoDisplayFormat: number) => {
	const timecode = t.getFormatted(frameRateTime, videoDisplayFormat) as string;
	return timecode;
};

export const getTimecodeFromSequence = (t: Time, sequence: Sequence) => {
	return getTimecode(t, sequence.getSettings().videoFrameRate, sequence.getSettings().videoDisplayFormat);
};

// QE DOM Helpers

export const qeGetClipAt = (track: Track, index: number) => {
	let curClipIndex = -1;
	for (let i = 0; i < track.numItems; i++) {
		const item = track.getItemAt(i);
		//@ts-ignore
		const type = item.type as 'Empty' | 'Clip';
		if (type === 'Clip') {
			curClipIndex++;
			if (curClipIndex === index) {
				return item;
			}
		}
	}
};

export const forEachQEClip = (
	qeTrack: Track,
	callback: (qeClip: QETrackItem, index: number) => void,
	reverse?: boolean
) => {
	if (reverse) {
		for (let i = qeTrack.numItems - 1; i > -1; i--) {
			if (qeTrack.getItemAt(i).type === 'Clip') {
				callback(qeTrack.getItemAt(i), i);
			}
		}
	} else {
		for (let i = 0; i < qeTrack.numItems; i++) {
			if (qeTrack.getItemAt(i).type === 'Clip') {
				callback(qeTrack.getItemAt(i), i);
			}
		}
	}
};

// Metadata Helpers

export const getPrMetadata = (projectItem: ProjectItem, fields: string[]) => {
	let PProMetaURI = 'http://ns.adobe.com/premierePrivateProjectMetaData/1.0/';
	if (ExternalObject.AdobeXMPScript === undefined) {
		ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');
	}
	if (!app.isDocumentOpen() || !ExternalObject.AdobeXMPScript || !XMPMeta) {
		return {};
	}
	let xmp = new XMPMeta(projectItem.getProjectMetadata());
	let result: {
		[key: string]: string;
	} = {};
	for (let i = 0; i < fields.length; i++) {
		if (xmp.doesPropertyExist(PProMetaURI, fields[i])) {
			result[fields[i]] = xmp.getProperty(PProMetaURI, fields[i]).value;
		}
	}
	return result;
};

// Motion Graphics Template ( MOGRT ) Helpers

export const fillMogrtText = (clip: TrackItem, propName: string, text: string) => {
	const mgt = clip.getMGTComponent();
	const prop = mgt.properties.getParamForDisplayName(propName);
	if (prop) {
		const valueStr = prop.getValue();
		let value = JSON.parse(valueStr) as any;
		value.textEditValue = text;
		prop.setValue(JSON.stringify(value), 1);
	}
};

// Audio Conversions

export const dbToDec = (x: number) => Math.pow(10, (x - 15) / 20);

export const decToDb = (x: number) => 20 * Math.log(x) * Math.LOG10E + 15;

// String Conversions

export const fromId = (str: string) => {
	return str.replace(/-/g, ' ').toLowerCase();
};

// Other Helpers

export const undo = (levels: number) => {
	for (let i = 1; i <= levels; i++) {
		qe!.project.undo();
	}
};
