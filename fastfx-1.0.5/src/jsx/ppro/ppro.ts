import { get } from 'http';
import { SettingsType, SlidersType, editSliderDefaults, editSliderMinMax } from '../../shared/shared';
import { filter, forEach, isArray, lastIndexOf, objectKeys, remap, roundToNearest, trySilently } from '../utils/utils';
import { g } from './globals';
import {
	applyConstantPower,
	deleteItem,
	forEachAudioTrack,
	forEachChild,
	forEachClip,
	forEachComponent,
	forEachVideoTrack,
	framesToTicks,
	fromId,
	getChildByName,
	getClipByName,
	getClipsAtTime,
	getClipsBetweenTimes,
	getClipsByName,
	getParentItem,
	getQESequence,
	getSelectedVideoClip,
	getSequenceByName,
	getSequenceByNodeId,
	getTrackIndexByClip,
	insertVideoClip,
	multiplyTime,
	searchProjectItemByName,
	splitSequenceLength,
	subtractTime,
	ticksToTime,
	unselectAllClips,
} from './ppro-utils';
import { Alert } from '@mantine/core';
declare const qe: QEApplication;

export const replaceSource = () => {
	const sourceItem = app.project.rootItem.children[2];
	const replaceItem = app.project.rootItem.children[3];
	alert(sourceItem.changeMediaPath(replaceItem.treePath, false).toString());
};

export const getActiveSequenceId = () => {
	if (!app.project.activeSequence) {
		alert('No sequence is currently active.');
		return;
	}

	var sequence = app.project.activeSequence;
	var sequenceId = sequence.sequenceID;

	alert('Active sequence ID: ' + sequenceId);
};

export const deleteFx = (): number | boolean => {
	const sequence = app.project.activeSequence;
	if (!sequence) 401;
	const selectedClip = getSelectedVideoClip(sequence).selectedClip;
	if (!selectedClip) return 402;
	const treePath = selectedClip.projectItem.treePath;
	const directories = treePath.split('\\');
	const folderIndex = lastIndexOf(directories, '_FF');
	const distance = folderIndex !== -1 ? directories.length - 1 - folderIndex : -1;
	if (distance === -1) return 422;
	const assetBin = getChildByName(app.project.rootItem, '_FF', 2);
	if (!assetBin) return 419;
	if (distance === 2) {
		const regex = /([a-zA-Z0-9]{5})$/;
		const code = selectedClip.projectItem.name.match(regex);
		if (!code) return 420;
		forEachChild(assetBin, (item) => {
			if (item.name.indexOf(code[0]) !== -1) {
				deleteItem(item);
			}
		});
	} else {
		forEachVideoTrack(sequence, (track) => {
			forEachClip(
				track,
				(clip) => {
					const clipItem = clip.projectItem;
					const parent = getParentItem(clipItem);
					if (clip.isSelected() && parent.name === '_FF') {
						clip.remove(false, false);
						deleteItem(clipItem);
					}
				},
				true
			);
		});
	}
	if (assetBin && !assetBin.children.numItems) assetBin.deleteBin();
	return true;
};

export const zoom = (direction: 'in' | 'out',isMac:boolean): number | boolean => {
	const sequence = app.project.activeSequence;
	if (!sequence) return 401;
	const systemAssetsFolder = Folder(File($.fileName).parent.fsName + '/assets');
	const qeSequence = qe.project.getActiveSequence();
	const assetBin = getAssetBin();
	const uniqueId = generateId();
	const pixelAspect = sequence.getSettings().videoPixelAspectRatio;
	const pixelAspectNumerator = parseInt(pixelAspect.split(':')[0], 10);
	const pixelAspectDenominator = parseInt(pixelAspect.split(':')[1], 10);
	const [sequenceHeight, sequenceWidth] = [
		sequence.getSettings().videoFrameHeight,
		sequence.getSettings().videoFrameWidth,
	];	

	let { track, qeTrack } = findFastFXTrack(sequence, qeSequence);

	if (!track || !qeTrack) {
		deleteAssetBin();
		return 411;
	}

	const selectedClip = getSelectedVideoClip(sequence).selectedClip;
	if (!selectedClip) {
		deleteAssetBin();
		return 402;
	}

	const startTime = new Time();
	startTime.ticks = selectedClip.start.ticks;
	const endTime = new Time();
	endTime.ticks = selectedClip.end.ticks;

	const isClashing = checkClash(track, startTime, endTime);

	if (isClashing) {
		deleteAssetBin();
		return 406;
	}

	const tempBin = assetBin.createBin('_tmp');
	tempBin.select();

	//const sequenceId = getSequenceID(sequenceWidth, sequenceHeight);
	let { targetWidth,targetHeight,sequenceId } = findSequenceID(sequenceWidth,sequenceHeight);
	if (sequenceId === null) {
		tempBin.deleteBin();
		deleteAssetBin();
		return 423;
	}

	const adjustmentLayerName = `_FF Adjustment Layer_${targetWidth}x${targetHeight}`;
	const adjLayer = searchProjectItemByName(app.project.rootItem,adjustmentLayerName);
	if(adjLayer)
	{
		const delBin = assetBin.createBin('_del');
		adjLayer.moveBin(delBin);
		delBin.deleteBin();
	}

	const fileName = isMac ? 'fastfx_mac.prproj':'fastfx_win.prproj';
	//app.project.importSequences(`${systemAssetsFolder.fsName}/${fileName}`, [sequenceId]);
	app.project.importFiles([`${systemAssetsFolder.fsName}/${fileName}`], true, tempBin, false);
	if (!tempBin.children.numItems) {
		tempBin.deleteBin();
		deleteAssetBin();
		return 405;
	}
	g.adjItem = getItemByName(tempBin, adjustmentLayerName);
	if (!g.adjItem) {
		tempBin.deleteBin();
		deleteAssetBin();
		return 412;
	}

	g.adjItem.moveBin(assetBin);
	tempBin.deleteBin();

	g.adjItem.setOverridePixelAspectRatio(pixelAspectNumerator, pixelAspectDenominator);
	g.adjItem.setScaleToFrameSize();
	const adjSequence = getSequenceByName(`_FF Adjustment Seq_${targetWidth}x${targetHeight}`);
	if (adjSequence) app.project.deleteSequence(adjSequence);

	track.insertClip(g.adjItem, startTime.seconds);

	const { foundClip: tempAdjLayer, foundQeClip: tempQeAdjLayer } = getClipsByName(
		track,
		qeTrack,
		adjustmentLayerName
	);

	if (!tempAdjLayer || !tempQeAdjLayer) {
		cancelApplyPreset();
		deleteAssetBin();
		return 413;
	}

	if(tempAdjLayer.isAdjustmentLayer())
	{
		const scaleProp = tempAdjLayer.components[1].properties[1];
		const scaleFactor = getAdjustLayerScaleFactor(sequenceWidth, sequenceHeight,targetWidth, targetHeight);
		scaleProp.setValue(100 * scaleFactor, 1);
	}

	g.adjLayer = tempAdjLayer;
	const qeAdjLayer = tempQeAdjLayer;

	g.adjLayer.end = endTime;

	g.adjItem.name = `ZOOM ${direction.toUpperCase()} ${uniqueId}`;
	g.adjLayer.name = `ZOOM ${direction.toUpperCase()}`;

	const videoEffect = qe.project.getVideoEffectByName('AE.ADBE Geometry2', true);
	if (!qeAdjLayer.addVideoEffect(videoEffect)) {
		cancelApplyPreset();
		deleteAssetBin();
		return 414;
	}

	const effectProperty = g.adjLayer.components[2].properties[3];
	effectProperty.setTimeVarying(true);
	const inPoint = new Time();
	inPoint.ticks = g.adjLayer.inPoint.ticks;
	const duration = subtractTime(endTime, startTime);
	effectProperty.addKey(inPoint.seconds);
	effectProperty.addKey(inPoint.seconds + duration.seconds);
	effectProperty.setValueAtKey(inPoint.seconds, direction === 'out' ? 110 : 100, 1);
	effectProperty.setValueAtKey(inPoint.seconds + duration.seconds, direction === 'out' ? 100 : 110, 1);

	return true;
};

export const speed = (cut: boolean, speed: string): number | boolean => {
	const sequence = app.project.activeSequence;
	if (!sequence) return 401;

	const frameDuration = sequence.getSettings().videoFrameRate;
	var videoDisplayFormat = sequence.getSettings().videoDisplayFormat;
	const frameRate = 1 / frameDuration.seconds;
	if(Math.floor(frameRate*1000)==23976 && videoDisplayFormat>201)//TIMEDISPLAY_23976Timecode=110
	{
		videoDisplayFormat =110;		
	}
	const qeSequence = qe.project.getActiveSequence();

	const cti = ticksToTime(qeSequence.CTI.ticks.toString());
	const ctiTimecode = cti.getFormatted(frameDuration, videoDisplayFormat).toString();

	const selectedClip = getSelectedVideoClip(sequence).selectedClip;
	if (!selectedClip) {
		return 402;
	}

	const selectedTrackIndex = getTrackIndexByClip(sequence, selectedClip, true);
	const track = sequence.videoTracks[selectedTrackIndex!];
	const qeTrack = qeSequence.getVideoTrackAt(selectedTrackIndex!);

	const clipName = selectedClip.name;
	const uniqueId = generateId();
	selectedClip.name = uniqueId;
	const { foundClip: clip, foundQeClip: qeClip } = getClipsByName(track, qeTrack, uniqueId);
	if (!clip || !qeClip) {
		qe.project.undo();
		return 415;
	}

	if (cut) {
		trySilently(function () {
			const linkedItems = selectedClip.getLinkedItems();
			for (let i = 0; i < linkedItems.numItems; i++) {
				const linkedItem = linkedItems[i];
				if (linkedItem.mediaType === 'Audio') {
					const linkedItemTrackIndex = getTrackIndexByClip(sequence, linkedItem, false);
					const qeLinkedItemTrack = qeSequence.getAudioTrackAt(linkedItemTrackIndex!);
					qeLinkedItemTrack.razor(ctiTimecode);
				}
			}
		});
		qeTrack.razor(ctiTimecode);
		const { clip: nextClip, qeClip: nextQeClip } = getClipsAtTime(track, qeTrack, cti);
		if (!nextClip || !nextQeClip) return 415;
		nextQeClip.setSpeed(parseInt(speed) / 100, '', false, false, false);
		nextClip.name = clipName;
	} else {
		qeClip.setSpeed(parseInt(speed) / 100, '', false, false, false);
	}
	clip.name = clipName;

	return true;
};

export const target = (clear: boolean): number | boolean => {
	const sequence = app.project.activeSequence;
	if (!sequence) return 401;

	if (clear) {
		forEachVideoTrack(sequence, (track) => {
			track.name = `Video ${track.id}`;
		});
		forEachAudioTrack(sequence, (track) => {
			track.name = `Audio ${track.id}`;
		});
		return true;
	}

	let foundVideoTrack = false;
	let foundAudioTrack = false;

	forEachVideoTrack(sequence, (track) => {
		if (foundVideoTrack) return;
		foundVideoTrack = track.isTargeted();
	});

	forEachAudioTrack(sequence, (track) => {
		if (foundAudioTrack) return;
		foundAudioTrack = track.isTargeted();
	});

	if (!foundVideoTrack && !foundAudioTrack) return 416;

	const updateTrackNames = (
		forEachTrack: (sequence: any, callback: (track: any) => void) => void,
		type: 'Video' | 'Audio'
	) => {
		let targetedTrack = false;
		forEachTrack(sequence, (track) => {
			if (!targetedTrack && track.isTargeted()) {
				track.name = 'FastFX';
				targetedTrack = true;
			} else if (track.name === 'FastFX') {
				track.name = `${type} ${track.id}`;
			}
		});
	};

	foundVideoTrack && updateTrackNames(forEachVideoTrack, 'Video');
	foundAudioTrack && updateTrackNames(forEachAudioTrack, 'Audio');

	return true;
};

const framesToSeconds = (frames: number, frameRate: number): number => {
	return frames / frameRate;
};

function framesToSecondsAndFrames(totalFrames: number, fps: number): string {
	const seconds = Math.floor(totalFrames / fps);
	const frames = Math.round(totalFrames % fps);
	return `${seconds}s ${frames}f`;
}

function secondsToSecondsAndFrames(timeInSeconds: number, fps: number): string {
	const seconds = Math.floor(timeInSeconds);
	const frames = Math.round((timeInSeconds - seconds) * fps);
	return `${seconds}s ${frames}f`;
}

function timecodeToSeconds(timecode: string, frameRate: number): number {
	const parts = timecode.split(':');
	const hh = Number(parts[0]);
	const mm = Number(parts[1]);
	const ss = Number(parts[2]);
	const ff = Number(parts[3]);
	return hh * 3600 + mm * 60 + ss + ff / frameRate;
}

function secondsToTimecode(timeInSeconds: number, fps: number): string {
	const hours = Math.floor(timeInSeconds / 3600);
	const minutes = Math.floor((timeInSeconds % 3600) / 60);
	const seconds = Math.floor(timeInSeconds % 60);
	const frames = Math.floor((timeInSeconds % 1) * fps);

	return (
		`${hours < 10 ? '0' + hours : hours}` +
		`:${minutes < 10 ? '0' + minutes : minutes}` +
		`:${seconds < 10 ? '0' + seconds : seconds}` +
		`:${frames < 10 ? '0' + frames : frames}`
	);
}
function getItemByName(item:ProjectItem,name:string):ProjectItem
{
	for (let i = 0; i < item.children.numItems; i++) 
	{
		const child = item.children[i];
		if (child.name === name) {
			return child;
		}
		if( child.children !== undefined && child.children.numItems>0)
		{
			const findObj = getItemByName(child,name);
			if(findObj) return findObj;
		}
	}	
	return null;
}
function getSequenceByNameInAllChilds(item:ProjectItem,name:string):ProjectItem
{
	for (let i = 0; i < item.children.numItems; i++) 
	{
		const child = item.children[i];
		if (child.isSequence() && child.name === name) {
			return child;
		}
		if( child.children !== undefined && child.children.numItems>0)
		{
			const findObj = getSequenceByNameInAllChilds(child,name);
			if(findObj) return findObj;
		}
	}	
	return null;
}
function importSequence(item:ProjectItem,bin:ProjectItem):void
{
	var seq = getSequenceByNodeId(item.nodeId) as Sequence;

	for (var t = 0; t < seq.videoTracks.numTracks; t++)
	{
		var vtrack = seq.videoTracks[t];
		for (var c = 0; c < vtrack.clips.numItems; c++) 
		{
			var clip = vtrack.clips[c];
			var projItem = clip.projectItem; // <-- the linked 
			if(projItem.isSequence())
			{
				importSequence(projItem,bin);
			}
			else projItem.moveBin(bin);
		}
	}
	
	for (var t = 0; t < seq.audioTracks.numTracks; t++) 
	{
		var autrack = seq.audioTracks[t];
		for (var c = 0; c < autrack.clips.numItems; c++) 
		{
			var clip = autrack.clips[c];
			var projItem = clip.projectItem;
			projItem.moveBin(bin);
		}
	}
	item.moveBin(bin);
}
export const apply = (
	{ category, subcategory, fxSpeed, speed, preset, fx }: SettingsType,
	sliders: SlidersType,isMac:boolean
): number | boolean => {

	try {
		if (
			category == null ||
			subcategory == null ||
			fxSpeed == null ||
			speed == null ||
			preset == null ||
			fx == null
		) {
			return 417;
		}
		if (!app.project.activeSequence) return 401;
		const systemAssetsFolder = Folder(File($.fileName).parent.fsName + '/assets');
		const sequence = app.project.activeSequence;
		const qeSequence = qe.project.getActiveSequence();

		const assetBin = getAssetBin();
		const uniqueId = generateId();
		const frameDuration = sequence.getSettings().videoFrameRate;
		var videoDisplayFormat = sequence.getSettings().videoDisplayFormat;
		const frameRate = 1 / frameDuration.seconds;
		if(Math.floor(frameRate*1000)==23976 && videoDisplayFormat>201)//TIMEDISPLAY_23976Timecode=110
		{
			videoDisplayFormat =110;		
		}
		let cti = new Time();
		cti.seconds =qeSequence.CTI.secs;
		let ctiFrames = qeSequence.CTI.frames;

		const pixelAspect = sequence.getSettings().videoPixelAspectRatio;
		const pixelAspectNumerator = parseInt(pixelAspect.split(':')[0], 10);
		const pixelAspectDenominator = parseInt(pixelAspect.split(':')[1], 10);
		const [sequenceHeight, sequenceWidth] = [
			sequence.getSettings().videoFrameHeight,
			sequence.getSettings().videoFrameWidth,
		];

		if ('sequenceId' in fx[0]) {
			// Nested FastFX
			const nestedFx = fx[0];
			const selectedClip = getSelectedVideoClip(sequence).selectedClip;

			if (!selectedClip) {
				deleteAssetBin();
				return 402;
			}

			let { track, qeTrack, handlebarsTrack, qeHandlebarsTrack, audioTrack, qeAudioTrack } = findNestedTracks(
				sequence,
				qeSequence,
				selectedClip
			);

			if (!track || !qeTrack || !handlebarsTrack || !qeHandlebarsTrack) {
				deleteAssetBin();
				return 403;
			}

			if (!audioTrack || !qeAudioTrack) {
				deleteAssetBin();
				return 404;
			}

			const qeSelectedTrack = qeSequence.getVideoTrackAt(qeTrack.index - 1);
			const selectedTrack = sequence.videoTracks[qeTrack.index - 1];
			g.nestedBin = assetBin.createBin(`${fromId(preset).toUpperCase()} ${uniqueId}`);
			g.nestedBin.select();	
			var fileName=fx[0].subcategory;
			if('groupId' in fx[0])
			{
				fileName = `${fileName}-${fx[0].groupId}`;
			}	
			fileName = isMac ? `${fileName}_mac.prproj`:`${fileName}_win.prproj`;
			const filePath = `${systemAssetsFolder.fsName}/${fx[0].subcategory}/${fileName}`;

			const tempBin = assetBin.createBin('_tmp');
			app.project.importFiles([filePath], true, tempBin, false);

			const new_seq = getSequenceByNameInAllChilds(tempBin,preset);
			if(new_seq)
			{
				importSequence(new_seq,g.nestedBin);
			}
			
			tempBin.deleteBin();

			if (!g.nestedBin.children.numItems) {
				g.nestedBin.deleteBin();
				deleteAssetBin();
				return 405;
			}

			forEachChild(
				g.nestedBin,
				(item) => {
					if (item.name === '_FF Adjustment Layer') {
						const source = item.source;
						// item.setScaleToFrameSize();
						item.setOverridePixelAspectRatio(pixelAspectNumerator, pixelAspectDenominator);
						g.adjItem = item;
					}
					if (item.name === '_FF Nested Seq' && item.isSequence()) {
						g.nestedSeqItem = getSequenceByNodeId(item.nodeId) as Sequence;
						setSequenceSettings(g.nestedSeqItem, { frameRate, pixelAspect, sequenceHeight, sequenceWidth });
					}
					if (item.name === preset && item.isSequence()) {
						g.fullSeqItem = getSequenceByNodeId(item.nodeId) as Sequence;
						setSequenceSettings(g.fullSeqItem, { frameRate, pixelAspect, sequenceHeight, sequenceWidth });
					}
					if (item.name === '_FF SFX') {
						g.sfxItem = item;
					}
					if (nestedFx.overlays) {
						if (item.name === '_FF Overlay') {
							item.setScaleToFrameSize();
							item.setOverrideFrameRate(frameRate);
							item.setOverridePixelAspectRatio(pixelAspectNumerator, pixelAspectDenominator);
							g.overlayItems.push(item);
						}
					}
					item.name += ` ${uniqueId}`;
				},
				true
			);

			
			if(fx[0].subcategory==='film-accent-lines' || fx[0].subcategory==='film-flickers'
			|| fx[0].subcategory==='punch-holes')
			{
				
				if (
					!g.fullSeqItem 
				) {
					g.nestedBin?.deleteBin();
					deleteAssetBin();
					return 405;
				}

				forEachVideoTrack(g.fullSeqItem, (curTrack, index) => {
					if (index > 0) {
						forEachClip(curTrack, (clip) => {
							const scaleProp = clip.components[1].properties[1];
							let scaleFactor = 1;
							if (clip.isAdjustmentLayer()) {
								clip.name = `${fromId(preset).toUpperCase()}`;
								scaleFactor = getAdjustLayerScaleFactor(1920, 1080, sequenceWidth, sequenceHeight);
								scaleProp.setValue(100 * scaleFactor, 1);
							} else {
								clip.name = `${fromId(preset).toUpperCase()} OVERLAY`;
								const rotationValue = clip.components[1].properties[4].getValue();
								const isRotated = rotationValue === -90 || rotationValue === 90;
								const [frameWidth, frameHeight] = isRotated ? [2160, 3840] : [3840, 2160];
								scaleFactor = getScaleFactor(frameWidth, frameHeight, sequenceWidth, sequenceHeight);
								scaleProp.setValue(100 * scaleFactor, 1);
							}
						});
					}
				});

				const { lower: fullBefore, upper: fullAfter } = splitSequenceLength(g.fullSeqItem); // frames
				const fullStartTime = new Time();
				fullStartTime.ticks = framesToTicks(ctiFrames - fullBefore, frameDuration.seconds);

				if (fullStartTime.seconds < 0) {
					sequence.setPlayerPosition((fullBefore * frameDuration.seconds).toString());
					cti = ticksToTime(qeSequence.CTI.ticks.toString());
					ctiFrames = Math.round(cti.seconds / frameDuration.seconds);
					fullStartTime.seconds = 0;
				}

				const fullEndTime = new Time();
				fullEndTime.ticks = framesToTicks(ctiFrames + fullAfter, frameDuration.seconds);
				const isVideoClashing =	checkClash(track, fullStartTime, fullEndTime);

				if (isVideoClashing) {
					g.nestedBin?.deleteBin();
					deleteAssetBin();
					return 406;
				}

				insertVideoClip(sequence, qeSequence, track, g.fullSeqItem.projectItem, fullStartTime.seconds);

				const nestedSeqClip = getClipByName(track, `${preset} ${uniqueId}`);

				if (!nestedSeqClip) {
					g.nestedBin?.deleteBin();
					deleteAssetBin();
					return 409;
				}
				const blendProp = nestedSeqClip.components[0].properties[1];
				if(blendProp.displayName === "Blend Mode")
				{					
					if('blend' in fx[0])
					{
						var blend_mode = 22;
						if(fx[0].blend=="difference") blend_mode=5;
						else if(fx[0].blend=="divide") blend_mode=26;
						else if(fx[0].blend=="normal") blend_mode=18;
						else if(fx[0].blend=="subtract") blend_mode=25;
						blendProp.setValue(blend_mode, 1);
					}					
					else blendProp.setValue(22, 1);
				}		

				nestedSeqClip.end = fullEndTime;
				nestedSeqClip.name = fromId(preset).toUpperCase();
				g.fullSeqItem.name = `${fromId(preset).toUpperCase()} ${uniqueId}`;

				const cutTime = new Time();
				cutTime.ticks = framesToTicks(ctiFrames, frameDuration.seconds);
				const cutTimecode = cutTime.getFormatted(frameDuration, videoDisplayFormat).toString();
				qeSelectedTrack.razor(cutTimecode);
			
				return true;
			}

			if (
				!g.adjItem ||
				!g.nestedSeqItem ||
				!g.fullSeqItem ||
				!g.sfxItem ||
				(nestedFx.overlays && g.overlayItems.length === 0)
			) {
				g.nestedBin?.deleteBin();
				deleteAssetBin();
				return 405;
			}

			forEachVideoTrack(g.nestedSeqItem, (curTrack, index) => {
				if (index > 0) {
					forEachClip(curTrack, (clip) => {
						const scaleProp = clip.components[1].properties[1];
						let scaleFactor = 1;
						if (clip.isAdjustmentLayer()) {
							clip.name = `${fromId(preset).toUpperCase()}`;
							// scaleFactor =
							// 	sequenceWidth < 1920 || sequenceHeight < 1080
							// 		? 1
							// 		: getScaleFactor(1920, 1080, sequenceWidth, sequenceHeight);
							//scaleFactor = getScaleFactor(1920, 1080, sequenceWidth, sequenceHeight);

							scaleFactor = getAdjustLayerScaleFactor(1920, 1080, sequenceWidth, sequenceHeight);
							scaleProp.setValue(100 * scaleFactor, 1);
						} else {
							clip.name = `${fromId(preset).toUpperCase()} OVERLAY`;
							const rotationValue = clip.components[1].properties[4].getValue();
							const isRotated = rotationValue === -90 || rotationValue === 90;
							const [frameWidth, frameHeight] = isRotated ? [2160, 3840] : [3840, 2160];
							scaleFactor = getScaleFactor(frameWidth, frameHeight, sequenceWidth, sequenceHeight);
							scaleProp.setValue(100 * scaleFactor, 1);
						}
					});
				}
			});
	    	const { lower: fullBefore, upper: fullAfter } = splitSequenceLength(g.fullSeqItem); // frames
			const fullStartTime = new Time();
			fullStartTime.ticks = framesToTicks(ctiFrames - fullBefore, frameDuration.seconds);

			if (fullStartTime.seconds < 0) {
				sequence.setPlayerPosition(framesToTicks(fullBefore, frameDuration.seconds));
				cti.seconds = qeSequence.CTI.secs;
				ctiFrames = qeSequence.CTI.frames;
				fullStartTime.seconds = 0;
			}

			const fullEndTime = new Time();
			fullEndTime.ticks = framesToTicks(ctiFrames + fullAfter, frameDuration.seconds);

			const { lower: nestedBefore, upper: nestedAfter } = splitSequenceLength(g.nestedSeqItem);

			const nestedStartTime = new Time();
			nestedStartTime.ticks = framesToTicks(ctiFrames - nestedBefore, frameDuration.seconds);
			const nestedStartTimecode = nestedStartTime.getFormatted(frameDuration, videoDisplayFormat).toString();
			
			const nestedEndTime = new Time();
			nestedEndTime.ticks = framesToTicks(ctiFrames + nestedAfter, frameDuration.seconds);
			const nestedEndTimecode = nestedEndTime.getFormatted(frameDuration, videoDisplayFormat).toString();

			
			const isVideoClashing =
				checkClash(track, fullStartTime, fullEndTime) ||
				checkClash(handlebarsTrack, fullStartTime, fullEndTime);

			if (isVideoClashing) {
				g.nestedBin?.deleteBin();
				deleteAssetBin();
				return 406;
			}

			const isAudioClashing = checkClash(audioTrack, fullStartTime, fullEndTime);

			if (isAudioClashing) {
				g.nestedBin?.deleteBin();
				deleteAssetBin();
				return 421;
			}

			audioTrack.insertClip(g.sfxItem, fullStartTime.seconds);

			const { foundClip: sfxClip, foundQeClip: qeSfxClip } = getClipsByName(
				audioTrack,
				qeAudioTrack,
				`_FF SFX ${uniqueId}`
			);

			if (!sfxClip || !qeSfxClip) {
				g.nestedBin?.deleteBin();
				deleteAssetBin();
				return 407;
			}

			sfxClip.end = fullEndTime;
			const transitionDuration = new Time();
			transitionDuration.ticks = framesToTicks(2, frameDuration.seconds);
			const transitionDurationTimecode = transitionDuration
				.getFormatted(frameDuration, videoDisplayFormat)
				.toString();
			applyConstantPower(qeSfxClip, true, transitionDurationTimecode);
			applyConstantPower(qeSfxClip, false, transitionDurationTimecode);

			deleteItem(g.fullSeqItem.projectItem);

			sfxClip.name = preset.toUpperCase();
			g.sfxItem.name = `${preset.toUpperCase()} ${uniqueId}`;

			const handlebarAdjLayer = g.fullSeqItem.videoTracks[1].clips[0];
			const leftHandlebar = createHandlebar(handlebarAdjLayer, handlebarsTrack, qeHandlebarsTrack, cti, uniqueId);

			if (!leftHandlebar) {
				g.nestedBin?.deleteBin();
				deleteAssetBin();
				return 408;
			}

			leftHandlebar.move(fullStartTime.seconds - cti.seconds);

			const rightHandlebar = createHandlebar(
				handlebarAdjLayer,
				handlebarsTrack,
				qeHandlebarsTrack,
				cti,
				uniqueId
			);

			if (!rightHandlebar) {
				g.nestedBin?.deleteBin();
				deleteAssetBin();
				return 408;
			}

			rightHandlebar.move(fullEndTime.seconds - rightHandlebar.end.seconds);

			leftHandlebar.name = fromId(preset).toUpperCase();
			rightHandlebar.name = fromId(preset).toUpperCase();

			//const scaleFactor = getScaleFactor(1920, 1080, sequenceWidth, sequenceHeight);
			const scaleFactor = getAdjustLayerScaleFactor(1920, 1080, sequenceWidth, sequenceHeight);
			leftHandlebar.components[1].properties[1].setValue(100 * scaleFactor, 1);
			rightHandlebar.components[1].properties[1].setValue(100 * scaleFactor, 1);

			insertVideoClip(sequence, qeSequence, track, g.nestedSeqItem.projectItem, nestedStartTime.seconds);
			
			const nestedSeqClip = getClipByName(track, `_FF Nested Seq ${uniqueId}`);

			if (!nestedSeqClip) {
				g.nestedBin?.deleteBin();
				deleteAssetBin();
				return 409;
			}

			nestedSeqClip.end = nestedEndTime;

			nestedSeqClip.name = fromId(preset).toUpperCase();

			g.adjItem.name = `${fromId(preset).toUpperCase()} ${uniqueId}`;
			g.nestedSeqItem.name = `${fromId(preset).toUpperCase()} ${uniqueId}`;
			qeSelectedTrack.razor(nestedStartTimecode);
			qeSelectedTrack.razor(nestedEndTimecode);
	
			const clipsToNest = getClipsBetweenTimes(selectedTrack, nestedStartTime, nestedEndTime,frameDuration);
			if (!clipsToNest.length) {
				g.nestedBin?.deleteBin();
				deleteAssetBin();
				return 410;
			}

			const nestedTrack = g.nestedSeqItem.videoTracks[0];
			const nestedQeSequence = getQESequence(g.nestedSeqItem);

			forEach(
				clipsToNest,
				(clipToNest) => {
					const clipToNestItem = clipToNest.projectItem;
					clipToNestItem.setInPoint(clipToNest.inPoint.ticks, 4);
					clipToNestItem.setOutPoint(clipToNest.outPoint.ticks, 4);
					insertVideoClip(g.nestedSeqItem!, nestedQeSequence, nestedTrack, clipToNestItem, 0);
					const nestedClip = nestedTrack.clips[0];
					nestedClip.name = clipToNest.name;
					for (let i = 0; i < 2; i++) {
						const sourceComponent: Component = clipToNest.components[i];
						const targetComponent: Component = nestedClip.components[i];
						for (let j = 0; j < sourceComponent.properties.length; j++) {
							const sourceProperty = sourceComponent.properties[j];
							const targetProperty = targetComponent.properties[j];
							if (!sourceProperty.isTimeVarying()) {
								targetProperty.setValue(sourceProperty.getValue(), 1);
							}
						}
					}
				},
				true
			);

			unselectAllClips(sequence);
			nestedSeqClip.setSelected(true, true);
			g.sfxItem.name = `${fromId(preset).toUpperCase()} ${uniqueId}`;
			forEach(g.overlayItems, (item, index) => {
				item.name = `${fromId(preset).toUpperCase()} ${uniqueId} ${index + 1}`;
			});
		} else {
			// FastFX
			let { track, qeTrack } = findFastFXTrack(sequence, qeSequence);

			if (!track || !qeTrack) {
				deleteAssetBin();
				return 411;
			}

			const lastKeySeconds = findLastKeySeconds(fx, fxSpeed);
			if (lastKeySeconds === 0) {
				deleteAssetBin();
				return 417;
			}
			const endTime = new Time();
			endTime.seconds = cti.seconds + lastKeySeconds;
	
			const lastKeyFrames = Math.round(endTime.seconds / frameDuration.seconds);
			const offsetFrames = fx[0].behind
				? lastKeyFrames
				: Math.round((endTime.seconds / frameDuration.seconds - ctiFrames) / 2);
			const startTime = new Time();
			startTime.seconds = framesToSeconds(ctiFrames - offsetFrames, frameRate);

			const isClashing = checkClash(track, startTime, endTime);

			if (isClashing) {
				deleteAssetBin();
				return 406;
			}

			const tempBin = assetBin.createBin('_tmp');
			tempBin.select();
			//const sequenceId = getSequenceID(sequenceWidth, sequenceHeight);
			let { targetWidth,targetHeight,sequenceId } = findSequenceID(sequenceWidth,sequenceHeight);

			if (sequenceId === null) {
				tempBin.deleteBin();
				deleteAssetBin();
				return 423;
			}

			const adjustmentLayerName = `_FF Adjustment Layer_${targetWidth}x${targetHeight}`;
			const adjLayer = searchProjectItemByName(app.project.rootItem,adjustmentLayerName);
			if(adjLayer)
			{
				const delBin = assetBin.createBin('_del');
				adjLayer.moveBin(delBin);
				delBin.deleteBin();
			}

			const fileName = isMac ? 'fastfx_mac.prproj':'fastfx_win.prproj';
			app.project.importFiles([`${systemAssetsFolder.fsName}/${fileName}`], true, tempBin, false);
			//app.project.importSequences(`${systemAssetsFolder.fsName}/${fileName}`, [sequenceId]);
			if (!tempBin.children.numItems) {
				tempBin.deleteBin();
				deleteAssetBin();
				return 405;
			}
			g.adjItem = getItemByName(tempBin, adjustmentLayerName);
			if (!g.adjItem) {
				tempBin.deleteBin();
				deleteAssetBin();
				return 412;
			}

			g.adjItem.moveBin(assetBin);
			tempBin.deleteBin();

			g.adjItem.setOverridePixelAspectRatio(pixelAspectNumerator, pixelAspectDenominator);
			g.adjItem.setScaleToFrameSize();
			
			const adjSequence = getSequenceByName(`_FF Adjustment Seq_${targetWidth}x${targetHeight}`);
			if (adjSequence) app.project.deleteSequence(adjSequence);
			track.insertClip(g.adjItem, cti.seconds);

			const { foundClip: tempAdjLayer, foundQeClip: tempQeAdjLayer } = getClipsByName(
				track,
				qeTrack,
				adjustmentLayerName
			);

			if (!tempAdjLayer || !tempQeAdjLayer) {
				cancelApplyPreset();
				deleteAssetBin();
				return 413;
			}

			if(tempAdjLayer.isAdjustmentLayer())
			{
				const scaleProp = tempAdjLayer.components[1].properties[1];
				const scaleFactor = getAdjustLayerScaleFactor(sequenceWidth, sequenceHeight,targetWidth, targetHeight);
				scaleProp.setValue(100 * scaleFactor, 1);
			}

			g.adjLayer = tempAdjLayer;
			const qeAdjLayer = tempQeAdjLayer;

			g.adjItem.name = `${fromId(preset).toUpperCase()} ${uniqueId}`;
			g.adjLayer.name = `${fromId(preset).toUpperCase()}`;
	
			g.adjLayer.end = endTime;
			
			for (let i = fx.length - 1; i >= 1; i--) {
				const effectMatchName = fx[i].matchName;
				const videoEffect = qe.project.getVideoEffectByName(effectMatchName, true);
				if (!qeAdjLayer.addVideoEffect(videoEffect)) {
					cancelApplyPreset();
					deleteAssetBin();
					return 414;
				}
				let index = 0;
				const keyTime = new Time();

				for (const key in fx[i]) {
					if (Object.prototype.hasOwnProperty.call(fx[i], key) && key !== 'matchName') {
						const effectValue = fx[i][key];
						const effectProperty = g.adjLayer.components[2].properties[index];
						if (typeof effectValue === 'object' && !isArray(effectValue)) {
							if(effectValue.keyTimes===undefined || effectValue.keyValues===undefined)
							{
								alert(JSON.stringify(effectValue));
							}							
							const keyTimes = effectValue.keyTimes;
							const keyValues = effectValue.keyValues;
							effectProperty.setTimeVarying(true);
							for (let k = 0; k < keyTimes.length; k++) {
								if (!fx[0].behind) keyTimes[k] = adjustKeyTime(keyTimes[k], fxSpeed);
								keyTime.seconds = g.adjLayer.inPoint.seconds + keyTimes[k];
								effectProperty.addKey(keyTime.seconds);
								effectProperty.setValueAtKey(keyTime.seconds, keyValues[k], 0);
							}
						} else {
							effectProperty.setValue(effectValue, 1);
						}
						index++;
					}
				}
				if (
					effectMatchName === 'AE.ADBE Motion Blur' &&
					sliders['d. blur'].value !== editSliderDefaults['d. blur']
				) {
					updateDBlur(
						sliders['d. blur'].value,
						editSliderMinMax['d. blur'].min,
						editSliderMinMax['d. blur'].max,
						fx
					);
				}

				if (
					effectMatchName === 'AE.ADBE Geometry2' &&
					sliders.intensity.value !== editSliderDefaults.intensity
				) {
					updateIntensity(
						sliders.intensity.value,
						editSliderMinMax.intensity.min,
						editSliderMinMax.intensity.max,
						fx
					);
				}

				if (
					effectMatchName === 'AE.ADBE Geometry2' &&
					sliders['m. blur'].value !== editSliderDefaults['d. blur']
				) {
					updateMBlur(sliders['m. blur'].value, fx);
				}

				if ( sliders.flash.visible &&
					effectMatchName === 'AE.ADBE Brightness & Contrast 2' &&
					sliders.flash.value !== editSliderDefaults.flash
				) {
					updateFlash(
						sliders.flash.value
					);
				}
			}
		
			trySilently(function () {
				g.adjLayer!.move(-(offsetFrames * frameDuration.seconds));
			});
		}
		return true;
	} catch (error: any) {
		cancelApplyPreset();
		deleteAssetBin();
		alert(
			error.toString() +
				'\nScript file: ' +
				File.decode(error.fileName).replace(/^.*[\|\/]/, '') +
				'\nError on line: ' +
				error.line
		);
		return false;
	}
};

export const updateIntensity = (value: number, min: number, max: number, fx: SettingsType['fx']): boolean => {
	try {
		if (!g.adjLayer || !fx) return false;

		const fxObject = filter(fx, (obj) => obj.matchName === 'AE.ADBE Geometry2')[0];

		let effectParams: ComponentParamCollection | undefined = undefined;
		let foundEffect = false;
		forEachComponent(g.adjLayer, (component) => {
			if (foundEffect) return;
			if (component.matchName === 'AE.ADBE Geometry2') {
				effectParams = component.properties;
				foundEffect = true;
			}
		});

		if (!effectParams) {
			cancelApplyPreset();
			deleteAssetBin();
			return false;
		}

		forEach(effectParams, (effectParam: ComponentParam, index) => {
			if (effectParam.isTimeVarying()) {
				const multiplier = remap(value, min, max, 1, 2);
				const keyTimes = effectParam.getKeys();
				const objKeys = objectKeys(fxObject);
				const keyName = objKeys[index + 1] as keyof typeof fxObject;
				const keyValues = (fxObject[keyName] as { keyValues: any[] }).keyValues;
				forEach(keyTimes, (keyTime: Time, index) => {
					const newKeyValue = isArray(keyValues[index])
						? [keyValues[index][0] * multiplier, keyValues[index][1] * multiplier]
						: keyValues[index] * multiplier;
					effectParam.setValueAtKey(keyTime, newKeyValue, true);
				});
			}
		});

		return true;
	} catch (error: any) {
		cancelApplyPreset();
		deleteAssetBin();
		alert(
			error.toString() +
				'\nScript file: ' +
				File.decode(error.fileName).replace(/^.*[\|\/]/, '') +
				'\nError on line: ' +
				error.line
		);
		return false;
	}
};

export const updateFlash = (value: number): boolean => {
	try {
		if (!g.adjLayer) return false;

		let effectParams: ComponentParamCollection | undefined = undefined;
		let foundEffect = false;
		forEachComponent(g.adjLayer, (component) => {
			if (foundEffect) return;
			if (component.matchName === 'AE.ADBE Brightness & Contrast 2') {
				effectParams = component.properties;
				foundEffect = true;
			}
		});

		if (!effectParams) {
			cancelApplyPreset();
			deleteAssetBin();
			return false;
		}

		const effectParam: ComponentParam = effectParams[0];
		if (effectParam.isTimeVarying()) 
		{
			const keyTimes = effectParam.getKeys();

			forEach(keyTimes, (keyTime: Time, index) => {
				effectParam.setInterpolationTypeAtKey(keyTime, 5, true);
			});
			var middle_index = Math.round(keyTimes.length/2)-1;
			middle_index = Math.max(0,middle_index);
			middle_index = Math.min(keyTimes.length-1,middle_index);
			effectParam.setValueAtKey(keyTimes[middle_index], value, true);
			effectParam.setInterpolationTypeAtKey(keyTimes[middle_index],5,true);
		}
		else effectParam.setValue(value, 1);

		return true;
	} catch (error: any) {
		cancelApplyPreset();
		deleteAssetBin();
		alert(
			error.toString() +
				'\nScript file: ' +
				File.decode(error.fileName).replace(/^.*[\|\/]/, '') +
				'\nError on line: ' +
				error.line
		);
		return false;
	}
};

export const updateDBlur = (value: number, min: number, max: number, fx: SettingsType['fx']): boolean => {
	try {
		if (!g.adjLayer || !fx) return false;

		const fxObject = filter(fx, (obj) => obj.matchName === 'AE.ADBE Motion Blur')[0];

		let effectParams: ComponentParamCollection | undefined = undefined;
		let foundEffect = false;
		forEachComponent(g.adjLayer, (component) => {
			if (foundEffect) return;
			if (component.matchName === 'AE.ADBE Motion Blur') {
				effectParams = component.properties;
				foundEffect = true;
			}
		});

		if (!effectParams) {
			cancelApplyPreset();
			deleteAssetBin();
			return false;
		}

		const effectParam: ComponentParam = effectParams[1];
		if (effectParam.isTimeVarying()) {
			const keyTimes = effectParam.getKeys();
			const keyValues = fxObject['Blur Length'].keyValues;
			const multiplier = remap(value, min, max, 0.6, 1.5);
			forEach(keyTimes, (keyTime: Time, index) => {
				const newKeyValue = keyValues[index] * multiplier;
				effectParam.setValueAtKey(keyTime, newKeyValue, true);
			});
		}

		return true;
	} catch (error: any) {
		cancelApplyPreset();
		deleteAssetBin();
		alert(
			error.toString() +
				'\nScript file: ' +
				File.decode(error.fileName).replace(/^.*[\|\/]/, '') +
				'\nError on line: ' +
				error.line
		);
		return false;
	}
};

export const updateMBlur = (value: number, fx: SettingsType['fx']): boolean => {
	try {
		if (!g.adjLayer || !fx) return false;

		let effectParams: ComponentParamCollection | undefined = undefined;
		let foundEffect = false;
		forEachComponent(g.adjLayer, (component) => {
			if (foundEffect) return;
			if (component.matchName === 'AE.ADBE Geometry2') {
				effectParams = component.properties;
				foundEffect = true;
			}
		});

		if (!effectParams) {
			cancelApplyPreset();
			deleteAssetBin();
			return false;
		}

		(effectParams[10] as ComponentParam).setValue(value, 1);

		return true;
	} catch (error: any) {
		alert(
			error.toString() +
				'\nScript file: ' +
				File.decode(error.fileName).replace(/^.*[\|\/]/, '') +
				'\nError on line: ' +
				error.line
		);
		return false;
	}
};

export const cancel = (isNested: boolean) => {
	cancelApplyPreset(isNested);
	deleteAssetBin();
};

function findLastKeySeconds(fx: SettingsType['fx'], fxSpeed: SettingsType['fxSpeed']): number {
	let lastKeySeconds = 0;
	if (!fx) return lastKeySeconds;
	forEach(fx, (obj) => {
		for (const key in obj) {
			if (obj.hasOwnProperty(key)) {
				const innerObj = obj[key];
				if (typeof innerObj === 'object' && isArray(innerObj?.keyTimes)) {
					forEach(innerObj.keyTimes, (keyTime: number) => {
						if (!fx[0].behind) {
							if (fxSpeed === 'slow') {
								keyTime /= 0.75;
							} else if (fxSpeed === 'fast') {
								keyTime /= 1.5;
							}
						}

						if (keyTime > lastKeySeconds) {
							lastKeySeconds = keyTime;
						}
					});
				}
			}
		}
	});

	return lastKeySeconds;
}

function findNestedTracks(
	sequence: Sequence,
	qeSequence: Sequence,
	clip: TrackItem
): {
	track: Track | null;
	handlebarsTrack: Track | null;
	qeTrack: Track | null;
	qeHandlebarsTrack: Track | null;
	audioTrack: Track | null;
	qeAudioTrack: Track | null;
} {
	let track: Track | null = null;
	let handlebarsTrack: Track | null = null;
	let qeTrack: Track | null = null;
	let qeHandlebarsTrack: Track | null = null;
	let audioTrack: Track | null = null;
	let qeAudioTrack: Track | null = null;

	const trackIndex = getTrackIndexByClip(sequence, clip, true)!;
	const tracksAbove = sequence.videoTracks.numTracks - (trackIndex + 1);

	if (tracksAbove >= 2) {
		track = sequence.videoTracks[trackIndex + 1];
		handlebarsTrack = sequence.videoTracks[trackIndex + 2];

		qeTrack = qeSequence.getVideoTrackAt(trackIndex + 1);
		qeHandlebarsTrack = qeSequence.getVideoTrackAt(trackIndex + 2);

		let foundTrack = false;
		forEachAudioTrack(sequence, (curTrack, index) => {
			if (foundTrack) return;
			if (curTrack.name === 'FastFX') {
				audioTrack = curTrack;
				qeAudioTrack = qeSequence.getAudioTrackAt(index);
				foundTrack = true;
			}
		});

		if (!foundTrack) {
			forEachAudioTrack(sequence, (curTrack, index) => {
				if (foundTrack) return;
				if (curTrack.isTargeted()) {
					audioTrack = curTrack;
					qeAudioTrack = qeSequence.getAudioTrackAt(index);
					foundTrack = true;
					return;
				}
			});
		}
	}

	return { track, handlebarsTrack, qeTrack, qeHandlebarsTrack, audioTrack, qeAudioTrack };
}

function findFastFXTrack(sequence: Sequence, qeSequence: Sequence): { track: Track | null; qeTrack: Track | null } {
	let track: Track | null = null;
	let qeTrack: Track | null = null;
	let foundTrack = false;

	forEachVideoTrack(sequence, (curTrack, index) => {
		if (foundTrack) return;
		if (curTrack.name === 'FastFX') {
			track = curTrack;
			qeTrack = qeSequence.getVideoTrackAt(index);
			foundTrack = true;
		}
	});

	if (!foundTrack) {
		forEachVideoTrack(sequence, (curTrack, index) => {
			if (foundTrack) return;
			if (curTrack.isTargeted()) {
				track = curTrack;
				qeTrack = qeSequence.getVideoTrackAt(index);
				foundTrack = true;
				return;
			}
		});
	}

	return { track, qeTrack };
}

function cancelApplyPreset(isNested: boolean = false) {
	if (isNested) {
		if (g.nestedBin) g.nestedBin.deleteBin();
	}
	if (g.adjLayer) g.adjLayer.remove(false, false);
	if (g.adjItem) deleteItem(g.adjItem);
}

function deleteAssetBin() {
	const assetBin = getChildByName(app.project.rootItem, '_FF', 2);
	if (assetBin && !assetBin.children.numItems) assetBin.deleteBin();
}

function adjustKeyTime(keyTime: number, fxSpeed: string): number {
	if (fxSpeed === 'slow') {
		return keyTime / 0.75;
	} else if (fxSpeed === 'fast') {
		return keyTime / 1.5;
	}
	return keyTime;
}

function generateId(): string {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	for (let i = 0; i < 5; i++) {
		result += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return result;
}

function removeId(name: string): string {
	return name.replace(/\s[\w\d]+$/, '');
}

function getAssetBin() {
	let assetBin = getChildByName(app.project.rootItem, '_FF', 2);
	if (!assetBin) {
		assetBin = app.project.rootItem.createBin('_FF');
	}
	return assetBin;
}

const checkClash = (track: Track, startTime: Time, endTime: Time): boolean => {
	let isClashing = false;

	forEachClip(track, (clip) => {
		if (
			startTime.seconds < clip.end.seconds &&
			endTime.seconds > clip.start.seconds
		) {
			isClashing = true;
			return;
		}
	});
	return isClashing;
};

function setSequenceSettings(
	sequence: Sequence,
	newSettings: { frameRate: number; pixelAspect: string; sequenceHeight: number; sequenceWidth: number }
) {
	const seqSettings = sequence.getSettings();
	const tempFrameRate = seqSettings.videoFrameRate;
	tempFrameRate.seconds = 1 / newSettings.frameRate;
	seqSettings.videoFrameRate = tempFrameRate;
	seqSettings.videoPixelAspectRatio = newSettings.pixelAspect;
	seqSettings.videoFrameHeight = newSettings.sequenceHeight;
	seqSettings.videoFrameWidth = newSettings.sequenceWidth;
	seqSettings.previewFrameHeight = newSettings.sequenceHeight;
	seqSettings.previewFrameWidth = newSettings.sequenceWidth;
	sequence.setSettings(seqSettings);
}

function createHandlebar(
	sourceClip: TrackItem,
	targetTrack: Track,
	targetQeTrack: Track,
	startTime: Time,
	uniqueId: string
): TrackItem | undefined {
	if (!targetTrack.insertClip(sourceClip.projectItem, startTime.seconds)) {
		return;
	}

	let { foundClip: targetClip, foundQeClip: targetQeClip } = getClipsByName(
		targetTrack,
		targetQeTrack,
		`_FF Adjustment Layer ${uniqueId}`
	);

	if (!targetClip || !targetQeClip) {
		return;
	}

	targetClip.name = removeId(targetClip.name);

	for (let i = 2; i < sourceClip.components.length; i++) {
		const component: Component = sourceClip.components[i];
		const effectMatchName = component.matchName;
		targetQeClip.addVideoEffect(qe!.project.getVideoEffectByName(effectMatchName, true));

		const effect = targetClip.components[2];
		if (!effect) {
			targetClip = null;
			return;
		}

		for (let j = 0; j < effect.properties.length; j++) {
			const property: ComponentParam = effect.properties[j];
			const sourceProperty = component.properties[j];
			if (sourceProperty.isTimeVarying()) {
				property.setTimeVarying(true);
				const keyTimes = sourceProperty.getKeys();
				let scaleFactor = 1;
				if (keyTimes[0].seconds < 3600) {
					// adjustment layers are out by 3600 seconds (bug)
					scaleFactor = 3600 / keyTimes[0].seconds;
				}
				for (let k = 0; k < keyTimes.length; k++) {
					const keyTime: Time = keyTimes[k];
					const scaledKeyTime: Time = multiplyTime(keyTime, scaleFactor);
					// normalize all to 0s if the first key is at 0s
					const keyValue = sourceProperty.getValueAtKey(keyTime);
					property.addKey(scaledKeyTime);
					property.setValueAtKey(scaledKeyTime, keyValue);
				}
			} else {
				property.setValue(sourceProperty.getValue(), 1);
			}
		}
	}

	return targetClip;
}

function getScaleFactor(footageWidth: number, footageHeight: number, sequenceWidth: number, sequenceHeight: number) {
	const scaleWidth = sequenceWidth / footageWidth;
	const scaleHeight = sequenceHeight / footageHeight;
	const scaleFactor = Math.max(scaleWidth, scaleHeight);
	return scaleFactor;
}
function getAdjustLayerScaleFactor(footageWidth: number, footageHeight: number, sequenceWidth: number, sequenceHeight: number) {
	
	const scaleWidth = sequenceWidth>footageWidth ? sequenceWidth / footageWidth:footageWidth/sequenceWidth;
	const scaleHeight = sequenceWidth>footageWidth ? sequenceHeight / footageHeight:footageHeight/sequenceHeight;
	const scaleFactor = Math.max(scaleWidth, scaleHeight);

	return scaleFactor;
	//const scaleFactor = (footageWidth*sequenceHeight)/(footageHeight*sequenceWidth);
	//return scaleFactor;
}
function findSequenceID(sequenceWidth: number, sequenceHeight: number):{targetWidth:number,targetHeight:number,sequenceId:string| null}
{	
	let targetWidth = sequenceWidth;
	let targetHeight=sequenceHeight;
	let sequenceId = null;

	const sequenceIDs: { [key: string]: string } = {
		'1080x1080': '8be6f489-f61f-413d-a31d-c1c89d9e9892',
		'1080x1920': '153d9d21-ba25-4e82-bcb2-cefc244a12bf',
		'1280x1280': 'b66556da-6b53-46b5-8344-3c2c2725b6c1',
		'1440x1080': 'e75ad591-44f2-44dc-bfb2-9143c0bdd716',
		'1440x1440': '59ceaf9b-b927-4bb5-a642-e3c4a76a9bfc',
		'1707x1280': 'b48ebe9c-eb61-4b86-809b-4ffadceb1238',
		'1920x1080': 'a43c1e29-861b-42e0-8050-14661c623c21',
		'1920x1440': 'c66db5e0-d0a1-4de8-bf33-11391dd92d07',
		'2160x2160': '5f4bdc4b-d725-4a4d-b3f1-0096e71bb037',
		'2275x1280': '1523c284-d4e9-479a-864f-40201786b331',
		'2520x1080': 'a89ae472-91fd-47f8-af06-92f218417b8e',
		'2560x1440': '99812036-14b8-41df-aae1-ed7757a03e66',
		'2880x2160': 'e2afce-5a11-4595-93d7-b04aa224a9d0',
		'2992x1280': '732cedf7-eb62-44cf-9df0-242184a0a0df',
		'3072x2304': 'af90d2f7-55d1-4be8-b2a2-111c401eaf57',
		'3440x1440': '4ba0a86f-b71e-498a-988f-51428bf46ec5',
		'3840x2160': 'a4f05196-7c85-4a43-90ff-d4bad61131f9',
		'5120x2160': '465b2b36-ae3e-4e5f-b77d-846ffd54d0a2',
	};

	const dimensionArray = [[1080,1080],[1080,1920],[1280,1280],[1440,1080],[1440,1440],
							[1707,1280],[1920,1080],[1920,1440],[2160,2160],[2275,1280],
						    [2520,1080],[2560,1440],[2880,2160],[2992,1280],[3072,2304],
							[3440,1440],[3840,2160],[5120,2160]];
	
	var sequence_squareSize = sequenceWidth*sequenceHeight;
	var i=0;
	var min_distance = Math.abs(sequenceWidth/sequenceHeight-dimensionArray[0][0]/dimensionArray[0][1]);
	var findId=0;
	for(i=1;i<dimensionArray.length;i++)
	{
		var distance = Math.abs(sequenceWidth/sequenceHeight-dimensionArray[i][0]/dimensionArray[i][1]);
		if(distance<min_distance)
		{
			min_distance=distance;
			findId = i;
		}
	}
	targetWidth = dimensionArray[findId][0];
	targetHeight = dimensionArray[findId][1];

	const key = `${targetWidth}x${targetHeight}`;
	sequenceId = sequenceIDs[key];

	if (!sequenceId) sequenceId=null;

	return {targetWidth,targetHeight,sequenceId};
}
function getSequenceID(sequenceWidth: number, sequenceHeight: number): string | null {
	const sequenceIDs: { [key: string]: string } = {
		'1080x1080': '8be6f489-f61f-413d-a31d-c1c89d9e9892',
		'1080x1920': '153d9d21-ba25-4e82-bcb2-cefc244a12bf',
		'1280x1280': 'b66556da-6b53-46b5-8344-3c2c2725b6c1',
		'1440x1080': 'e75ad591-44f2-44dc-bfb2-9143c0bdd716',
		'1440x1440': '59ceaf9b-b927-4bb5-a642-e3c4a76a9bfc',
		'1707x1280': 'b48ebe9c-eb61-4b86-809b-4ffadceb1238',
		'1920x1080': 'a43c1e29-861b-42e0-8050-14661c623c21',
		'1920x1440': 'c66db5e0-d0a1-4de8-bf33-11391dd92d07',
		'2160x2160': '5f4bdc4b-d725-4a4d-b3f1-0096e71bb037',
		'2275x1280': '1523c284-d4e9-479a-864f-40201786b331',
		'2520x1080': 'a89ae472-91fd-47f8-af06-92f218417b8e',
		'2560x1440': '99812036-14b8-41df-aae1-ed7757a03e66',
		'2880x2160': 'e2afce-5a11-4595-93d7-b04aa224a9d0',
		'2992x1280': '732cedf7-eb62-44cf-9df0-242184a0a0df',
		'3072x2304': 'af90d2f7-55d1-4be8-b2a2-111c401eaf57',
		'3440x1440': '4ba0a86f-b71e-498a-988f-51428bf46ec5',
		'3840x2160': 'a4f05196-7c85-4a43-90ff-d4bad61131f9',
		'5120x2160': '465b2b36-ae3e-4e5f-b77d-846ffd54d0a2',
	};

	const key = `${sequenceWidth}x${sequenceHeight}`;
	const sequenceID = sequenceIDs[key];

	if (!sequenceID) return null;

	return sequenceID;
}
