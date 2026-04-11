import { Group, Text, Tooltip } from '@mantine/core';
import { CustomIcon } from './CustomIcon';
import { version } from '../../../package.json';
import { appData } from '../../shared/shared';
import { useLicenseContext } from '../context/license.context';

interface Props {
	height: number;
}

export const Title = ({ height }: Props) => {
	const { e } = useLicenseContext();
	return (
		<Group justify='space-between' h={height} w='100%'>
			<Tooltip label={`Licensed to: ${e}`} withArrow arrowSize={8} openDelay={1000} offset={4}>
				<Group gap={3}>
					<Text>{appData.productName}</Text>
					<CustomIcon icon='forward' size={'2xs'}></CustomIcon>
				</Group>
			</Tooltip>
			<Text>{version}</Text>
		</Group>
	);
};
