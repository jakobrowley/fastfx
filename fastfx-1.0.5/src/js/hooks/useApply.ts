import { useState } from 'react';
import { evalTS } from '../lib/utils/bolt';
import { useMainContext } from '../context/main.context';
import { useVerifyOffline } from '../hooks/useVerifyOffline';
import { useLicenseContext } from '../context/license.context';
import { csi } from '../lib/utils/bolt';
interface Props {
	openEditPopup: () => void;
	openErrorPopup: () => void;
	setErrorCode: (errorCode: number) => void;
}

export const useApply = ({ openEditPopup, openErrorPopup, setErrorCode }: Props) => {
	const { settings, sliders, setSliders } = useMainContext();

	const { slec, sslk, sa, ssa, sil, se } = useLicenseContext();

	const [offset, setOffset] = useState(0);

	const verifyOffline = useVerifyOffline(slec, sslk, sa, ssa, se);

	const setSlidersAndOffset = () => {
		const matchMap: Record<string, number[]> = {
			'AE.ADBE Brightness & Contrast 2': [2],
			'AE.ADBE Geometry2': [0, 3],
			'AE.ADBE Motion Blur': [1],
		};

		const resultSet = new Set<number>();

		settings.fx?.forEach((obj: { [key: string]: any }) => {
			if (obj.matchName && typeof obj.matchName === 'string') {
				const matches = matchMap[obj.matchName];
				if (matches) matches.forEach((num) => resultSet.add(num));
			}
		});

		const newSliders = { ...sliders };

		if (settings.fx && settings.fx[0] && settings.fx[0].sliders) {
			const sliderValues = settings.fx[0].sliders;
			Object.keys(newSliders).forEach((key) => {
				if (sliderValues.hasOwnProperty(key)) newSliders[key].value = sliderValues[key];
			});
		}

		Object.keys(newSliders).forEach((key, index) => {
			newSliders[key].visible = resultSet.has(index);
		});

		const newVisibleCount = Object.values(newSliders).filter((slider) => slider.visible).length;
		const offset: number = 165 - (newVisibleCount - 1) * 15;

		setSliders(newSliders);
		setOffset(offset);
	};

	const apply = async <T extends HTMLElement>(event: React.MouseEvent<T>) => {
		const isNested = 'sequenceId' in settings.fx![0];

		const licensed = await verifyOffline();
		if (!licensed) {
			slec(510);
			sil(false);
			return;
		}

		if (!isNested) setSlidersAndOffset();
		const isMac = csi.getOSInformation().toLowerCase().includes('mac');	
		evalTS('apply', settings, sliders,isMac).then((res) => {
			if (res === true) {
				if (!(event.metaKey || event.ctrlKey) && !isNested) {
					openEditPopup();
				}
			} else if (typeof res === 'number') {
				setErrorCode(res);
				openErrorPopup();
			}
		});
	};

	return { apply, offset };
};
