import axios from 'axios';
import { decode, findOfflineLicense, encrypt, createRandomFilename } from '../utils/license.utils';
import { SystemPath } from '../lib/cep/csinterface';
import { csi } from '../lib/utils/bolt';
import { fs, path } from '../lib/cep/node';
import { appData } from '../../shared/shared';

export const useVerifyOnline = async (
	licenseKey: string,
	increment: boolean,
	d: string | null,
	a: number | null,
	sa: number | null,
	ssa: (value: number | null) => void,
	slec: (value: number) => void,
	sslk: (value: string) => void,
	se: (value: string) => void
): Promise<boolean> => {
	const userDataDir = csi.getSystemPath(SystemPath.USER_DATA);
	const isMac = csi.getOSInformation().toLowerCase().includes('mac');

	const username = 'ck_60bbfd050bb532fc54354a7cd5104f09a203b2d0';
	const password = 'cs_8ea328e5927e16aab8472579b122491cf4defcff';
	const credentials = btoa(`${username}:${password}`); // browser-safe base64

	var url ='https://tinytapes.com/wp-json/lmfwc/v2/licenses/activate/';
	if(increment==false)
	{
		url ='https://tinytapes.com/wp-json/lmfwc/v2/licenses/validate/';
	}

	url += licenseKey;

	try
	{
		const response = await axios.get(url, {
		headers: {
			'Authorization': `Basic ${credentials}`,
			'Accept': 'application/json'
		}
		});

		if (response.status === 200)
		{		
			var data = response.data.data;
			if (data.errors !==undefined && data.errors.lmfwc_rest_data_error !==undefined)
			{
				if(data.errors.lmfwc_rest_data_error.length>0)
				{
					if(data.errors.lmfwc_rest_data_error[0].includes("reached maximum activation count."))
					{
						slec(509);
						ssa(null);
						return false;
					}
					if(data.errors.lmfwc_rest_data_error[0].includes("could not be found."))
					{
						slec(502);
						ssa(null);
						return false;
					}
				}
			}
			if (data.timesActivated !==undefined && data.timesActivatedMax !==undefined)
			{
				if(data.timesActivated<=data.timesActivatedMax)
				{
					const licenseFileName = findOfflineLicense();
					let licenseFilePath: string;
					if (licenseFileName)
					{
						licenseFilePath = path.join(userDataDir, licenseFileName);
					}
					else {
						const randomFilename = createRandomFilename();
						licenseFilePath = path.join(userDataDir, isMac ? `.${randomFilename}` : `${randomFilename}`);
					}

					const offlineLicenseData = {
						d: new Date().toISOString(),
						l: licenseKey,
						a: data.timesActivated,
						e: "test@gmail.com",
					};
					se("test@gmail.com");
					const encryptedData = encrypt(offlineLicenseData);
					fs.writeFileSync(licenseFilePath, encryptedData);

					return true;
				}
				slec(509);
				ssa(null);
				return false;
			}

			slec(502);
			ssa(null);
			return false;
		}
		else
		{
			return false;
		}
	} catch(error: any){
		
		if (error.message && error.message === 'Network Error')
		{
			if (!d) {
				slec(503);
				return false;
			} else {
				const currentDate = new Date();
				const daysDifference = (currentDate.getTime() - Date.parse(d)) / (1000 * 60 * 60 * 24);
				if (daysDifference >= 3) {
					slec(504);
					sslk(licenseKey);
					return false;
				} else {
					return true;
				}
			}
		} else {
			alert(error.message);
			slec(511);
			return false;
		}		
	}
};
