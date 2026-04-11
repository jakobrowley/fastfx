import { Tooltip, UnstyledButton } from '@mantine/core';
import classes from './scss/PressButton.module.scss';
import { CustomIcon } from './CustomIcon';
import { csi, evalTS } from '../lib/utils/bolt';
import EditPopup from './EditPopup';
import ErrorPopup from './ErrorPopup';
import { useDisclosure } from '@mantine/hooks';
import { useMainContext } from '../context/main.context';
import { MouseEvent } from 'react';
import { useApply } from '../hooks/useApply';
import { fs, path } from '../lib/cep/node';
import { SystemPath } from '../lib/cep/csinterface';
import { appData } from '../../shared/shared';

interface Props {
	icon: string;
	name: string;
	tooltip?: string;
	shortcut?: string;
	closePopup?: () => void;
	width?: string;
	customName?: string;
}

function ActionButton({ icon, name, tooltip, shortcut, closePopup, width = '100%', customName }: Props) {
	const { settings, errorCode, setErrorCode, reloadPresets, setReloadPresets, sliders, setSettings } =
		useMainContext();
	const [editPopupOpened, { open: openEditPopup, close: closeEditPopup }] = useDisclosure(false);
	const [errorPopupOpened, { open: openErrorPopup, close: closeErrorPopup }] = useDisclosure(false);

	const { apply, offset } = useApply({
		openEditPopup,
		openErrorPopup,
		setErrorCode,
	});

	const saveOrRemovePreset = (save: boolean, customName?: string) => {
		try {
			const appDataPath = csi.getSystemPath(SystemPath.USER_DATA);
			const destPath = path.join(appDataPath, appData.productAuthor, appData.productName, 'presets');

			const fileRegex = new RegExp(`^${settings.fx![0].subcategory}_\\d+\\.\\d+\\.\\d+\\.json$`);
			const allFiles = fs.readdirSync(destPath);

			for (let i = 0; i < allFiles.length; i++) {
				const filePath = path.join(destPath, allFiles[i]);
				const fileContents = fs.readFileSync(filePath, 'utf8');
				const jsonData = JSON.parse(fileContents);
				if (jsonData[customName!]) {
					return false;
				}
			}

			const matchedFiles = allFiles.filter((f) => fileRegex.test(f));

			if (matchedFiles.length > 1 || matchedFiles.length === 0) return false;

			const matchedFile = matchedFiles[0];
			const filePath = path.join(destPath, matchedFile);
			const fileContents = fs.readFileSync(filePath, 'utf8');
			const jsonData = JSON.parse(fileContents);

			if (save) {
				const newPreset = (jsonData[customName!] = JSON.parse(JSON.stringify(jsonData[settings.preset!])));
				newPreset[0].custom = true;
				newPreset[0].sliders.intensity = sliders.intensity.value;
				newPreset[0].sliders['d. blur'] = sliders['d. blur'].value;
				newPreset[0].sliders.flash = sliders.flash.value;
				newPreset[0].sliders['m. blur'] = sliders['m. blur'].value;
			} else {
				delete jsonData[settings.preset!];
			}

			fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
			setReloadPresets(!reloadPresets);
			return true;
		} catch (error) {
			alert(`FastFX: An error occurred: ${error}`);
			return false;
		}
	};

	const handleClick = async (event: MouseEvent<HTMLElement>) => {
		const isMac = csi.getOSInformation().toLowerCase().includes('mac');
		switch (name) {
			case 'apply':
				apply(event);
				break;
			case 'cancel':
				evalTS('cancel', 'sequenceId' in settings.fx![0]).then(() => {
					closePopup && closePopup();
				});
				break;
			case 'ok':
				closePopup && closePopup();
				break;
			case 'delete':
				evalTS('deleteFx').then((res) => {
					if (res !== true) {
						setErrorCode(res as number);
						openErrorPopup();
					}
				});
				break;
			case 'error':
				closePopup && closePopup();
				setTimeout(() => setErrorCode(0), 500);
				break;
			case 'target':
				evalTS('target', event.metaKey || event.ctrlKey).then((res) => {
					if (res !== true) {
						setErrorCode(res as number);
						openErrorPopup();
					}
				});
				break;
			case 'zoom in':
				
				evalTS('zoom', 'in',isMac).then((res) => {
					if (res !== true) {
						setErrorCode(res as number);
						openErrorPopup();
					}
				});
				break;
			case 'zoom out':
				evalTS('zoom', 'out',isMac).then((res) => {
					if (res !== true) {
						setErrorCode(res as number);
						openErrorPopup();
					}
				});
				break;
			case 'speed':
				// evalTS('getActiveSequenceId'); // helper function to get active sequence id
				evalTS('replaceSource');
				// evalTS('speed', false, settings.speed!).then((res) => {
				// 	if (res !== true) {
				// 		setErrorCode(res as number);
				// 		openErrorPopup();
				// 	}
				// });
				break;
			case 'cut':
				evalTS('speed', true, settings.speed!).then((res) => {
					if (res !== true) {
						setErrorCode(res as number);
						openErrorPopup();
					}
				});
				break;
			case 'deletePreset':
				if (settings.fx![0].custom) saveOrRemovePreset(false);
				break;
			case 'save':
				if (!customName) return;
				if (saveOrRemovePreset(true, customName)) {
					closePopup && closePopup();
				}
				break;
		}
	};

	return (
		<>
			<EditPopup opened={editPopupOpened} closePopup={closeEditPopup} offset={offset} />
			<ErrorPopup opened={errorPopupOpened} closePopup={closeErrorPopup} errorCode={errorCode} />
			{tooltip ? (
				<Tooltip
					label={`${tooltip}${shortcut ? ` [${shortcut.toUpperCase()}]` : ''}`}
					withArrow
					arrowSize={8}
					openDelay={1000}
					offset={4}>
					<UnstyledButton className={classes.button} h={30} w={width} onClick={handleClick}>
						<CustomIcon icon={icon} size='xs' />
					</UnstyledButton>
				</Tooltip>
			) : (
				<UnstyledButton className={classes.button} h={30} w={width} onClick={handleClick}>
					<CustomIcon icon={icon} size='xs' />
				</UnstyledButton>
			)}
		</>
	);
}

export default ActionButton;
