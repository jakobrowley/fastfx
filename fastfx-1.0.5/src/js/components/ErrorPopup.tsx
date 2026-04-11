import classes from './scss/EditPopup.module.scss';
import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import ActionButton from './ActionButton';
import { error } from '../config/error.config';
import { CustomIcon } from './CustomIcon';

interface Props {
	opened: boolean;
	closePopup: () => void;
	errorCode: number;
}

function ErrorPopup({ opened, closePopup, errorCode }: Props) {
	return (
		<Modal
			classNames={classes}
			withCloseButton={false}
			opened={opened}
			onClose={close}
			yOffset={150}
			closeOnEscape={false}
			closeOnClickOutside={false}
			returnFocus={false}
			overlayProps={{
				backgroundOpacity: 0.5,
				blur: 2,
			}}
			transitionProps={{ transition: 'fade', duration: 200 }}
			size={275}>
			<Stack gap={14} align='center'>
				<CustomIcon icon={'triangle-exclamation'} size={'lg'} color='#00bfff' />
				<Text ta='center' fz={12}>
					{error[errorCode].title}
				</Text>
				<Text ta='center' w='75%'>
					{error[errorCode].text}
				</Text>
				<Button.Group w={'100%'}>
					<ActionButton icon={'check'} name={'error'} closePopup={closePopup} />
				</Button.Group>
			</Stack>
		</Modal>
	);
}

export default ErrorPopup;
