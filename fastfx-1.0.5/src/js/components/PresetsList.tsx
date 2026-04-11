import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { List, ScrollArea, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import classes from './scss/PresetsList.module.scss';
import { useMainContext } from '../context/main.context';
import { useApply } from '../hooks/useApply';
import EditPopup from './EditPopup';
import ErrorPopup from './ErrorPopup';
import { csi } from '../lib/utils/bolt';
import { SystemPath } from '../lib/cep/csinterface';
import { fs, path } from '../lib/cep/node';
import { appData } from '../../shared/shared';

interface Props {
	name: string;
	selectedPresetItems: Record<string, string>;
	setSelectedPresetItems: Dispatch<SetStateAction<Record<string, string>>>;
	jsonData: Record<string, Record<string, any[]>>;
	setJsonData: Dispatch<SetStateAction<Record<string, Record<string, any[]>>>>;
}

function PresetsList({ name, selectedPresetItems, setSelectedPresetItems, jsonData, setJsonData }: Props) {
	const [items, setItems] = useState<string[]>([]);
	const { settings, setSettings, errorCode, setErrorCode, search, reloadPresets } = useMainContext();

	const [editPopupOpened, { open: openEditPopup, close: closeEditPopup }] = useDisclosure(false);
	const [errorPopupOpened, { open: openErrorPopup, close: closeErrorPopup }] = useDisclosure(false);

	const { apply, offset } = useApply({
		openEditPopup,
		openErrorPopup,
		setErrorCode,
	});

	useEffect(() => {
		const appDataPath = csi.getSystemPath(SystemPath.USER_DATA);
		const destPath = path.join(appDataPath, appData.productAuthor, appData.productName, 'presets');
		const files = name === 'all' ? ['shakes', 'thermal', 'crt', 'b&w', 'night','zoom','film-accent-lines','film-flickers','punch-holes'] : [name];
		const combinedData: Record<string, any> = {};
		files.forEach((file) => {
			const fileRegex = new RegExp(`^${file}_\\d+\\.\\d+\\.\\d+\\.json$`);
			const allFiles = fs.readdirSync(destPath);
			const matchedFiles = allFiles.filter((f) => fileRegex.test(f));

			if (matchedFiles.length > 1 || matchedFiles.length === 0) return;

			const matchedFile = matchedFiles[0];
			const filePath = path.join(destPath, matchedFile);
			const fileContents = fs.readFileSync(filePath, 'utf8');
			const jsonData = JSON.parse(fileContents);
			Object.assign(combinedData, jsonData);
		});

		setJsonData((prev) => ({ ...prev, [name]: combinedData }));
		const sortedNames = Object.keys(combinedData).sort();
		setItems(sortedNames);
		setSelectedPresetItems((prev) => ({
			...prev,
			[name]: sortedNames[0],
		}));
		if (name === settings.category) {
			setSettings((prev) => ({
				...prev,
				preset: sortedNames[0],
				fx: combinedData[sortedNames[0]],
			}));
		}
	}, [name, reloadPresets]);

	const handleItemClick = (item: string) => {
		setSettings((prev) => ({
			...prev,
			preset: item,
			fx: jsonData[name][item],
		}));
		setSelectedPresetItems((prev) => ({ ...prev, [name]: item }));
	};

	const handleItemDoubleClick = (item: string, event: React.MouseEvent<HTMLLIElement>) => {
		handleItemClick(item);
		apply(event);
	};

	return (
		<>
			<ScrollArea h='100%' type='auto' scrollbars='y' scrollbarSize={7}>
				<List listStyleType='none' classNames={classes}>
					{items
						.filter((item) => item.toLowerCase().indexOf(search.phrase.toLowerCase()) > -1)
						.filter((item) => {
							if (settings.category === 'transitions' && settings.subcategory !== 'shakes') return true;

							const firstElement = jsonData[name]?.[item]?.[0];
							if (search.custom) {
								if (!firstElement.custom) return false;
							}

							if (search.flashes) {
								const elements = jsonData[name]?.[item];
								return elements?.some((el) => el.matchName === 'AE.ADBE Brightness & Contrast 2');
							}

							return true;
						})
						.sort()
						.map((item) => (
							<List.Item
								key={item}
								className={selectedPresetItems[name] === item ? classes.selected : ''}
								onClick={() => handleItemClick(item)}
								onDoubleClick={(event) => handleItemDoubleClick(item, event)}
								styles={{ item: { minHeight: 31 } }}>
								<Text>{item.replace(/-/g, ' ')}</Text>
								<i />
							</List.Item>
						))}
				</List>
			</ScrollArea>
			<EditPopup opened={editPopupOpened} closePopup={closeEditPopup} offset={offset} />
			<ErrorPopup opened={errorPopupOpened} closePopup={closeErrorPopup} errorCode={errorCode} />
		</>
	);
}

export default PresetsList;
