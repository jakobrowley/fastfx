import { useEffect, useState } from 'react';
import { TextInput, Checkbox, Stack, UnstyledButton, Text } from '@mantine/core';
import classes from './scss/PressButton.module.scss';
import '../global.scss';
import { Title } from './Title';
import { useVerifyOnline } from '../hooks/useVerifyOnline';
import { licenseErrors } from '../utils/license.utils';
import { useLicenseContext } from '../context/license.context';
import { appData } from '../../shared/shared';

interface Props {
	slk: string;
}

export const sanitizeLicense = (input:any) => {
	if (!input) return "";
  
	return input
	  .normalize("NFKC") // normalize different Unicode forms
	  .replace(/[\u200B-\u200D\uFEFF]/g, "") // strip zero-width chars
	  .replace(/\s+/g, "") // remove all spaces/newlines
	  .trim()
	  .toUpperCase(); // optional: force uppercase
  };

const LicenseForm = ({ slk }: Props) => {
	const { sil, lec, slec, sslk, sa, ssa, se } = useLicenseContext();
	const [licenseKey, setLicenseKey] = useState('');
	const [isChecked, setIsChecked] = useState(false);

	useEffect(() => {
		setLicenseKey(slk);
	}, [slk]);

	const handlePaste = (e:any) => {
		e.preventDefault(); // optional, if you want to control what gets pasted
		const pastedText = e.clipboardData.getData("text");
		console.log("Pasted:", pastedText);
		setLicenseKey(pastedText); // custom paste logic
	  };

	const handleSubmit = async () => {
		slec(0);

		const cleaned_licenseKey = sanitizeLicense(licenseKey);
		if (cleaned_licenseKey === '') {
			slec(505);
			return;
		}
		const licensePattern = new RegExp(`${appData.licenseKeyParts[0]}[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}${appData.licenseKeyParts[1]}`);
		const licensePattern_old = new RegExp(`${appData.licenseKeyParts[0]}[A-Z0-9]{4}[A-Z0-9]{4}[A-Z0-9]{4}[A-Z0-9]{4}${appData.licenseKeyParts[1]}`);
		if (!(licensePattern.test(cleaned_licenseKey) || licensePattern_old.test(cleaned_licenseKey))) {
			slec(506);
			return;
		}

		if (!isChecked) {
			slec(507);
			return;
		}

		const isValid = await useVerifyOnline(
			cleaned_licenseKey,
			slk === '' || sa === null,
			null,
			null,
			sa,
			ssa,
			slec,
			sslk,
			se
		);

		if (isValid) {
			sil(true);
		} else {
			sil(false);
		}
	};

	return (
		<Stack className='base' justify='space-between' align='center' gap={10}>
			<Title height={12} />
			<Stack p={20} w={285} style={{ border: '1px solid #19203b', borderRadius: '6px' }}>
				<TextInput
					withAsterisk
					label='License Key'
					placeholder={`${appData.licenseKeyParts[0]}XXXXXXXXXXXXXXXX${appData.licenseKeyParts[1]}`}
					value={licenseKey}
					onChange={(event) => setLicenseKey(event.currentTarget.value)}
					onPaste={handlePaste}
				/>
				<Checkbox
					size='xs'
					label={`I have purchased ${appData.productName} or have permission to use this license key.`}
					checked={isChecked}
					onChange={(event) => setIsChecked(event.currentTarget.checked)}
				/>
				<UnstyledButton
					className={classes.button}
					h={30}
					w='100%'
					style={{ borderRadius: '8px' }}
					onClick={handleSubmit}>
					<Text>Submit</Text>
				</UnstyledButton>
			</Stack>
			<Text fz={9} ta='center' c='red' h={15}>
				{licenseErrors[lec]}
			</Text>
		</Stack>
	);
};

export default LicenseForm;
