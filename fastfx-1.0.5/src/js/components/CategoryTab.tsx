import { Tabs, Text } from '@mantine/core';
import { CustomIcon } from './CustomIcon';

interface Props {
	name: string;
	icon: string;
	isSubcategory?: boolean;
}

const CategoryTab = ({ name, icon, isSubcategory = false }: Props) => {
	return (
		<Tabs.Tab
			h={30}
			key={name}
			value={name}
			leftSection={<CustomIcon icon={icon} size={'sm'} />}
			w={isSubcategory ? '50%' : undefined}>
			<Text>{name}</Text>
		</Tabs.Tab>
	);
};

export default CategoryTab;
