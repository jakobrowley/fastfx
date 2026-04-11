import { Button, Group, Stack, Tabs } from '@mantine/core';
import { useMainContext } from '../context/main.context';
import CategoryTab from '../components/CategoryTab';
import CategoryPanel from '../components/CategoryPanel';
import Preview from '../components/Preview';
import { categories } from '../config/categories.config';
import { actionButtons, fxSpeedTabs, speedTabs, zoomButtons } from '../config/button.config';
import classes from '../components/scss/Tabs.module.scss';
import '../global.scss';
import Tab from '../components/Tab';
import ActionButton from '../components/ActionButton';
import Search from '../components/Search';
import { useEffect, useState } from 'react';
import { Title } from '../components/Title';

const Main = () => {
	const { settings, setSettings } = useMainContext();
	const [selectedPresetItems, setSelectedPresetItems] = useState<Record<string, string>>({});
	const [jsonData, setJsonData] = useState<Record<string, Record<string, any[]>>>({});
	const [disableSpeedTabs, setDisableSpeedTabs] = useState(false);

	const handleCategoryChange = (newCategory: string | null) => {
		const isTransitions = newCategory === 'transitions';
		const category = isTransitions ? settings.subcategory : newCategory;
		const newPreset = category ? selectedPresetItems[category] : null;

		if (category && newPreset && jsonData[category]) {
			setSettings((prevSettings) => ({
				...prevSettings,
				category: newCategory,
				preset: newPreset,
				fx: jsonData[category][newPreset],
			}));
		}
	};

	const handleFxSpeedChange = (newFxSpeed: string | null) => {
		setSettings((prevSettings) => ({ ...prevSettings, fxSpeed: newFxSpeed }));
	};

	const handleSpeedChange = (newSpeed: string | null) => {
		setSettings((prevSettings) => ({ ...prevSettings, speed: newSpeed }));
	};

	useEffect(() => {
		if (
			(settings.fx &&
				settings.fx[0]?.subcategory !== 'hits' &&
				settings.fx[0]?.subcategory !== 'flashes' &&
				settings.fx[0]?.subcategory !== 'wipes' &&
				settings.fx[0]?.subcategory !== 'shakes') ||
			(settings.fx && settings.fx[0]?.behind)
		) {
			setDisableSpeedTabs(true);
		} else {
			setDisableSpeedTabs(false);
			handleFxSpeedChange(settings.fx?.[0]?.speed);
		}
	}, [settings.fx]);

	return (
		<Stack className='base'>
			<Tabs value={settings.category} onChange={handleCategoryChange} variant='category' classNames={classes}>
				<Tabs.List mb={9} grow>
					{categories.map(({ name, icon }) => (
						<CategoryTab key={name} name={name} icon={icon} />
					))}
				</Tabs.List>
				<Group align='flex-start' wrap='nowrap' grow gap={9}>
					<Stack w={'100%'}>
						{categories.map(({ name, subcategories }) => (
							<CategoryPanel
								key={name}
								name={name}
								subcategories={subcategories}
								selectedPresetItems={selectedPresetItems}
								setSelectedPresetItems={setSelectedPresetItems}
								jsonData={jsonData}
								setJsonData={setJsonData}
							/>
						))}
					</Stack>
					<Stack w='100%' gap={9}>
						<Title height={26} />
						<Preview src={settings.preview} />
						<Search />
						<Tabs
							value={settings.fxSpeed}
							onChange={handleFxSpeedChange}
							variant='category'
							classNames={classes}
							allowTabDeactivation>
							<Tabs.List grow>
								{fxSpeedTabs.map(({ name, icon, tooltip }) => (
									<Tab
										key={name}
										name={name}
										icon={icon}
										tooltip={tooltip!}
										disabled={disableSpeedTabs}
									/>
								))}
							</Tabs.List>
						</Tabs>
						<Group gap={9}>
							<Tabs
								value={settings.speed}
								onChange={handleSpeedChange}
								variant='category'
								classNames={classes}>
								<Tabs.List grow style={{ flexWrap: 'nowrap' }}>
									{speedTabs.map(({ name, icon, tooltip }) => (
										<Tab key={name} name={name} icon={icon} tooltip={tooltip!} width='49px' />
									))}
								</Tabs.List>
							</Tabs>
							<Button.Group>
								{zoomButtons.map(({ name, icon, tooltip }) => (
									<ActionButton key={name} icon={icon!} name={name} tooltip={tooltip!} width='37px' />
								))}
							</Button.Group>
						</Group>
					</Stack>
				</Group>
			</Tabs>
			<Button.Group>
				{actionButtons.map(({ name, icon, tooltip }) => (
					<ActionButton key={name} icon={icon!} name={name} tooltip={tooltip!} />
				))}
			</Button.Group>
		</Stack>
	);
};

export default Main;
