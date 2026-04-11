import { SystemPath } from '../lib/cep/csinterface';
import { fs, path } from '../lib/cep/node';
import { csi } from '../lib/utils/bolt';
import { decrypt, findOfflineLicense, isValidDecryptedData } from '../utils/license.utils';
import { useVerifyOnline } from './useVerifyOnline';

export const useVerifyOffline = (
	slec: (value: number) => void,
	sslk: (value: string) => void,
	sa: number | null,
	ssa: (value: number | null) => void,
	se: (value: string) => void
) => {
	const verifyOffline = async (): Promise<boolean> => {

		try {
			
			const licenseFileName = findOfflineLicense();
			const userDataDir = csi.getSystemPath(SystemPath.USER_DATA);
			if (licenseFileName) {
				const licenseFilePath = path.join(userDataDir, licenseFileName);

				const encryptedData = fs.readFileSync(licenseFilePath, 'utf-8');

				const decodedString = decrypt(encryptedData);
				const decodedObject = isValidDecryptedData(decodedString);

				// const decodedObject = isValidDecryptedData(encryptedData); // remove me
				if (!decodedObject) 
				{
					fs.unlinkSync(licenseFilePath);
					slec(508);
					return false;
				}

				const { l: licenseKey, d: date, a: activation, e: email } = decodedObject;
				ssa(activation);
				se(email);

				const isValid = await useVerifyOnline(licenseKey, false, date, activation, sa, ssa, slec, sslk, se);
				return isValid;
			} else {
				return false;
			}
		} catch (error) {
			slec(500);
			return false;
		}
	};

	return verifyOffline;
};
