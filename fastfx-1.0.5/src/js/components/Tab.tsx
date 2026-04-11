import { Tabs, Text, Tooltip } from '@mantine/core';
import { CustomIcon } from './CustomIcon';

interface Props {
	name: string;
	tooltip?: string;
	width?: string;
	iconOnly?: boolean;
	icon?: string;
	disabled?: boolean;
}

const Tab = ({ name, tooltip, width, iconOnly, icon, disabled = false }: Props) => (
	<Tooltip label={tooltip} withArrow arrowSize={8} openDelay={1000} offset={4}>
		<Tabs.Tab
			h={30}
			w={width}
			key={name}
			value={name}
			disabled={disabled}
			leftSection={icon && !iconOnly ? <CustomIcon icon={icon} size='sm' /> : undefined}>
			{iconOnly ? <CustomIcon icon={icon!} size='sm' /> : <Text>{name}</Text>}
		</Tabs.Tab>
	</Tooltip>
);

export default Tab;
