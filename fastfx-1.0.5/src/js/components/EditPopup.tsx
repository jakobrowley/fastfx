import { useEffect, useState } from 'react';
import { editButtons } from '../config/button.config';
import { editSliders } from '../config/slider.config';
import { CustomIcon } from './CustomIcon';
import classes from './scss/EditPopup.module.scss';
import { Button, Group, Modal, Slider, Stack, Text, TextInput, Tooltip } from '@mantine/core';
import { evalTS } from '../lib/utils/bolt';
import { useMainContext } from '../context/main.context';
import ActionButton from './ActionButton';

interface Props {
	opened: boolean;
	closePopup: () => void;
	offset: number;
}

function EditPopup({ opened, closePopup, offset }: Props) {
	const { sliders, setSliders, settings } = useMainContext();
	const [customName, setCustomName] = useState('');

	useEffect(() => {
		if (opened) {
			setCustomName('');
			setSliders((prev) => {
				const updatedSliders = { ...prev };
				const slidersFromSettings = settings.fx![0].sliders;

				if (slidersFromSettings) {
					for (const key in updatedSliders) {
						if (slidersFromSettings.hasOwnProperty(key)) {
							updatedSliders[key].value = slidersFromSettings[key];
						}
					}
				}
				return updatedSliders;
			});
		}
	}, [opened, setSliders]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (opened) {
				if (event.key === 'Escape') {
					evalTS('cancel', 'sequenceId' in settings.fx![0]).then(() => {
						closePopup && closePopup();
					});
				} else if (event.key === ' ' && event.shiftKey) {
					closePopup();
				}
				event.stopImmediatePropagation();
			}
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [opened]);

	const handleSliderChange = (sliderName: string, value: number, min: number, max: number) => {
		setSliders((prev) => ({
			...prev,
			[sliderName]: {
				...prev[sliderName],
				value: value,
			},
		}));

		switch (sliderName) {
			case 'intensity':
				evalTS('updateIntensity', value, min, max, settings.fx).then((res) => {
					if (!res) closePopup();
				});
				break;
			case 'd. blur':
				evalTS('updateDBlur', value, min, max, settings.fx).then((res) => {
					if (!res) closePopup();
				});
				break;
			case 'flash':
				evalTS('updateFlash', value).then((res) => {
					if (!res) closePopup();
				});
				break;
			case 'm. blur':
				evalTS('updateMBlur', value, settings.fx).then((res) => {
					if (!res) closePopup();
				});
				break;
		}
	};

	const handleSetCustomName = (event: React.ChangeEvent<HTMLInputElement>) => {
		const sanitizedValue = event.currentTarget.value.replace(/[^a-zA-Z0-9 -]/g, '').replace(/ /g, '-');
		setCustomName(sanitizedValue.toLowerCase());
	};

	return (
		<Modal
			classNames={classes}
			withCloseButton={false}
			opened={opened}
			onClose={closePopup}
			xOffset={0}
			yOffset={offset}
			closeOnEscape={false}
			closeOnClickOutside={false}
			returnFocus={false}
			overlayProps={{
				backgroundOpacity: 0.5,
				blur: 2,
			}}
			transitionProps={{ transition: 'fade', duration: 200 }}
			size={400}>
			<Stack gap={20}>
				{Object.entries(sliders)
					.filter(([, slider]) => slider.visible)
					.map(([name, slider]) => {
						const config = editSliders.find((s) => s.name === name);
						if (!config) return null;

						const { icon, min, max, tooltip, prefix } = config;

						return (
							<Group key={`slider-${name}`}>
								<Tooltip
									label={tooltip}
									withArrow
									arrowSize={8}
									openDelay={1000}
									offset={4}
									position='left'>
									<Group gap={7} w={95}>
										<CustomIcon icon={icon} prefix={prefix} size={'xs'} />
										<Text>{name}</Text>
									</Group>
								</Tooltip>
								<Slider
									classNames={classes}
									flex={1}
									thumbChildren={<Text>{slider.value}</Text>}
									label={null}
									min={min}
									max={max}
									value={slider.value}
									onChange={(value) => handleSliderChange(name, value, min, max)}
								/>
							</Group>
						);
					})}
				<TextInput
					mb={-8}
					value={customName}
					leftSectionPointerEvents='none'
					leftSection={<CustomIcon icon={'text-size'} size='xs' />}
					onChange={(event) => handleSetCustomName(event)}></TextInput>
				<Button.Group>
					{editButtons.map(({ name, icon, shortcut, tooltip }) => (
						<ActionButton
							key={name}
							icon={icon!}
							name={name}
							shortcut={shortcut}
							tooltip={tooltip}
							customName={customName}
							closePopup={closePopup}
						/>
					))}
				</Button.Group>
			</Stack>
		</Modal>
	);
}

export default EditPopup;
