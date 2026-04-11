import { Tabs, TabsPanel, TabsList } from '@mantine/core';
import CategoryTab from './CategoryTab';
import PresetsList from '../components/PresetsList';
import { CategoryProps } from '../config/categories.config';
import classes from './scss/Tabs.module.scss';
import { useMainContext } from '../context/main.context';
import { Dispatch, SetStateAction } from 'react';

interface Props {
	name: string;
	subcategories?: CategoryProps[];
	selectedPresetItems: Record<string, string>;
	setSelectedPresetItems: Dispatch<SetStateAction<Record<string, string>>>;
	jsonData: Record<string, Record<string, any[]>>;
	setJsonData: Dispatch<SetStateAction<Record<string, Record<string, any[]>>>>;
}

const CategoryPanel = ({
	name,
	subcategories,
	selectedPresetItems,
	setSelectedPresetItems,
	jsonData,
	setJsonData,
}: Props) => {
	const { settings, setSettings } = useMainContext();

	const handleSubcategoryChange = (newSubcategory: string | null) => {
		setSettings((prevSettings) => ({
			...prevSettings,
			subcategory: newSubcategory,
			preset: newSubcategory ? selectedPresetItems[newSubcategory] : null,
			fx: newSubcategory ? jsonData[newSubcategory][selectedPresetItems[newSubcategory]] : null,
		}));
	};

	return (
		<TabsPanel key={name} value={name} h={330}>
			{subcategories ? (
				<Tabs
					variant='subcategory'
					value={settings.subcategory}
					onChange={handleSubcategoryChange}
					inverted
					classNames={classes}>
					{subcategories.map(({ name }) => (
						<TabsPanel key={name} value={name} h={231}>
							<PresetsList
								name={name}
								selectedPresetItems={selectedPresetItems}
								setSelectedPresetItems={setSelectedPresetItems}
								jsonData={jsonData}
								setJsonData={setJsonData}
							/>
						</TabsPanel>
					))}
					<TabsList mt={9} grow>
						{subcategories.map(({ name, icon }) => (
							<CategoryTab key={name} name={name} icon={icon} isSubcategory={true} />
						))}
					</TabsList>
				</Tabs>
			) : (
				<PresetsList
					name={name}
					selectedPresetItems={selectedPresetItems}
					setSelectedPresetItems={setSelectedPresetItems}
					jsonData={jsonData}
					setJsonData={setJsonData}
				/>
			)}
		</TabsPanel>
	);
};

export default CategoryPanel;
