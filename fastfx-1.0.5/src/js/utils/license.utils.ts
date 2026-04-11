import { fs } from '../lib/cep/node';
import { csi } from '../lib/utils/bolt';
import CryptoJS from 'crypto-js';
import { appData } from '../../shared/shared';
import { SystemPath } from '../lib/cep/csinterface';

interface DecryptedData {
	d: string;
	l: string;
	a: number;
	e: string;
}

export const isValidDecryptedData = (data: string): DecryptedData | false => {
	try {
		const parsedData: DecryptedData = JSON.parse(data);

		if (
			typeof parsedData === 'object' &&
			parsedData !== null &&
			'd' in parsedData &&
			'l' in parsedData &&
			'a' in parsedData &&
			'e' in parsedData &&
			typeof parsedData.d === 'string' &&
			isValidISO8601(parsedData.d) &&
			typeof parsedData.l === 'string' &&
			isValidLicenseKey(parsedData.l) &&
			Number.isInteger(parsedData.a) &&
			parsedData.a >= 0 &&
			typeof parsedData.e === 'string' &&
			isValidEmail(parsedData.e)
		) {
			return parsedData;
		} else {
			return false;
		}
	} catch (error) {
		return false;
	}
};

const isValidEmail = (email: string): boolean => {
	const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return pattern.test(email);
};

const isValidISO8601 = (dateString: string): boolean => {
	const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
	return pattern.test(dateString);
};

//export const licensePattern = new RegExp(`^${appData.licenseKeyParts[0]}[A-Z0-9-]{19}${appData.licenseKeyParts[1]}$`);

const isValidLicenseKey = (licenseKey: string): boolean => {
	return true;
	const licensePattern = new RegExp(`${appData.licenseKeyParts[0]}[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}${appData.licenseKeyParts[1]}`);
	return licensePattern.test(licenseKey);
};

export const findOfflineLicense = (): string | undefined => {
	const userDataDir = csi.getSystemPath(SystemPath.USER_DATA);
	const isMac = csi.getOSInformation().toLowerCase().includes('mac');
	const files = fs.readdirSync(userDataDir);
	const prefix = isMac ? '\\.' : '';
	const licenseFilePattern = new RegExp(
		`${prefix}[A-Z]{2}${appData.licenseFileParts[0]}[0-9]{2}${appData.licenseFileParts[1]}[a-z]{2}${appData.licenseFileParts[2]}[A-Z]{2}`
	);

	return files.find((file: string) => licenseFilePattern.test(file));
};

const getRandomChars = (length: number, isUppercase: boolean): string => {
	const chars = isUppercase ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : 'abcdefghijklmnopqrstuvwxyz';
	return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
};

export const createRandomFilename = (): string => {
	const randomUppercase = getRandomChars(2, true);
	const randomDigits = `${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`;
	const randomLowercase = getRandomChars(2, false);
	const randomUppercaseEnd = getRandomChars(2, true);

	return `${randomUppercase}${appData.licenseFileParts[0]}${randomDigits}${appData.licenseFileParts[1]}${randomLowercase}${appData.licenseFileParts[2]}${randomUppercaseEnd}`;
};

export const decode = (str: string): string => {
	return Buffer.from(str, 'base64').toString('utf-8');
};

const licenseErrorMessages: { [key: number]: string } = {
	0: '',
	500: 'RXJyb3IgdmVyaWZ5aW5nIG9mZmxpbmUgbGljZW5zZS4gUGxlYXNlIGNvbnRhY3Qgc3VwcG9ydC4=', // Error verifying offline license. Please contact support.
	501: 'TGljZW5zZSBrZXkgaXMgZm91bmQsIGJ1dCBub3QgdmFsaWQu', // License key is found, but not valid.
	502: 'TGljZW5zZSBrZXkgbm90IGZvdW5kLg==', // License key not found.
	503: 'TmV0d29yayBlcnJvci4gQ2hlY2sgeW91ciBpbnRlcm5ldCBjb25uZWN0aW9uLg==', // Network error. Check your internet connection.
	504: 'T2ZmbGluZSBwZXJpb2QgZXhjZWVkZWQuIENvbm5lY3QgdG8gdGhlIGludGVybmV0IHRvIHZlcmlmeSB5b3VyIGxpY2Vuc2Uu', // Offline period exceeded. Connect to the internet to verify your license.
	505: 'RW50ZXIgbGljZW5zZSBrZXku', // Enter license key.
	506: 'SW52YWxpZCBsaWNlbnNlIGtleSBmb3JtYXQu', // Invalid license key format.
	507: 'WW91IG11c3QgY29uZmlybSB5b3VyIHB1cmNoYXNlIGJ5IGNoZWNraW5nIHRoZSBib3gu', // You must confirm your purchase by checking the box.
	508: 'TGljZW5zZSBmaWxlIGhhcyBiZWVuIHRhbXBlcmVkIHdpdGguIFBsZWFzZSB2ZXJpZnkgYWdhaW4u', // License file has been tampered with. Please verify again.
	509: 'TWF4aW11bSBudW1iZXIgb2YgYWN0aXZhdGlvbnMgcmVhY2hlZC4gUHJlc3Npbmcgc3VibWl0IHdpbGwgcmVwbGFjZSBhIHByZXZpb3VzIGFjdGl2YXRpb24u', // Maximum number of activations reached. Pressing submit will replace a previous activation.
	510: 'aXMgdW5saWNlbnNlZC4gUGxlYXNlIHZlcmlmeSBhZ2Fpbi4=', // [plugin] is unlicensed. Please verify again.
	511: 'VW5rbm93biBlcnJvciB2ZXJpZnlpbmcgbGljZW5zZS4gUGxlYXNlIGNvbnRhY3Qgc3VwcG9ydC4=', // Unknown error verifying license. Please contact support.
};

export const licenseErrors = new Proxy(licenseErrorMessages, {
	get(target, prop) {
		const code = prop as unknown as number;
		const message = target[code];
		if (code.toString() === '510') {
			return message ? `${appData.productName} ${decode(message)}` : '';
		} else {
			return message ? decode(message) : '';
		}
	},
});

const key = CryptoJS.SHA256(appData.productAuthor).toString(CryptoJS.enc.Hex);
const iv = CryptoJS.lib.WordArray.random(16);

export const encrypt = (data: any): string => {
	const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key, { iv });
	return encrypted.toString();
};

export const decrypt = (encryptedData: string): any => {
	const decrypted = CryptoJS.AES.decrypt(encryptedData, key, { iv });
	return decrypted.toString(CryptoJS.enc.Utf8);
};
