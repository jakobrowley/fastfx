import type { EventTS } from '../../shared/universals';
import { ns } from '../../shared/shared';

/**
 * @function dispatchTS Displatches an event to the CEP panel with Type-Safety
 * See listenTS() in the CEP panel for more info
 * @param event The event name to listen for (defined in EventTS in shared/universals.ts)
 * @param callback The callback function to be executed when the event is triggered
 */
export const dispatchTS = <Key extends string & keyof EventTS>(event: Key, data: EventTS[Key]) => {
	if (new ExternalObject('lib:PlugPlugExternalObject')) {
		var eventObj = new CSXSEvent();
		eventObj.type = `${ns}.${event}`;
		eventObj.data = JSON.stringify(data);
		eventObj.dispatch();
	}
};

export const forEach = <T>(arr: T[], callback: (item: T, i: number) => void, reverse?: boolean): void => {
	if (reverse) {
		for (let i = arr.length - 1; i > -1; i--) {
			callback(arr[i], i);
		}
	} else {
		for (let i = 0; i < arr.length; i++) {
			callback(arr[i], i);
		}
	}
};

export const map = <T>(arr: T[], callback: (item: T, i: number) => any): T[] => {
	let res = [];
	for (let i = 0; i < arr.length; i++) {
		res.push(callback(arr[i], i));
	}
	return res;
};

export const filter = <T>(arr: T[], func: (item: T, i: number) => boolean): T[] => {
	let res = [];
	for (let i = 0; i < arr.length; i++) {
		if (func(arr[i], i)) {
			res.push(arr[i]);
		}
	}
	return res;
};

export const includes = <T>(arr: T[], value: string | number) => {
	for (let i = 0; i < arr.length; i++) {
		const element = arr[i];
		if (element === value) {
			return true;
		}
	}
	return false;
};

export const indexOf = <T>(arr: T[], value: string | number) => {
	for (let i = 0; i < arr.length; i++) {
		const element = arr[i];
		if (element === value) {
			return i;
		}
	}
	return -1;
};

export const lastIndexOf = <T>(arr: T[], value: string | number) => {
	for (let i = arr.length - 1; i >= 0; i--) {
		const element = arr[i];
		if (element === value) {
			return i;
		}
	}
	return -1;
};

export const objectKeys = <T extends object>(obj: T): string[] => {
	const keys: string[] = [];
	for (let key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			keys.push(key);
		}
	}
	return keys;
};

export const join = (...args: string[]) => {
	const sep = $.os === 'Windows' ? '\\' : '/';
	const len = args.length;
	let res = args[0];
	for (let i = 1; i < len; i++) {
		res = res + sep + args[i];
	}
	return res;
};

export const trySilently = (callback: () => void) => {
	try {
		callback();
	} catch (err) {}
};

export const isArray = (value: any) => {
	return Object.prototype.toString.call(value) === '[object Array]';
};

export const remap = (value: number, fromMin: number, fromMax: number, toMin: number, toMax: number) => {
	return toMin + ((value - fromMin) * (toMax - toMin)) / (fromMax - fromMin);
};

export const divideNumberByTwo = (number: number) => {
	const lower = Math.floor(number / 2);
	const upper = number - lower;
	return { lower, upper };
};

export const roundToNearest = (value: number, nearest: number) => {
	return Math.round(value / nearest) * nearest;
};
