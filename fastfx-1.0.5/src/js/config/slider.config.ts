import { editSliderMinMax, editSliderDefaults } from '../../shared/shared';

export interface EditProps {
	name: string;
	icon: string;
	min: number;
	max: number;
	value: number;
	tooltip: string;
	prefix?: string;
}

type SliderName = 'intensity' | 'd. blur' | 'flash' | 'm. blur';

const sliderConfigs: { name: SliderName; icon: string; tooltip: string; prefix?: string }[] = [
	{ name: 'intensity', icon: 'signal', tooltip: 'FastFX intensity' },
	{ name: 'd. blur', icon: 'arrow-right-long', tooltip: 'Directional blur' },
	{ name: 'flash', icon: 'flashlight', tooltip: 'Flash brightness' },
	{ name: 'm. blur', icon: 'diagram-venn', tooltip: 'Motion blur', prefix: 'far' },
];

export const editSliders: EditProps[] = sliderConfigs.map(({ name, icon, tooltip, prefix }) => ({
	name,
	icon,
	min: editSliderMinMax[name].min,
	max: editSliderMinMax[name].max,
	value: editSliderDefaults[name],
	tooltip,
	...(prefix && { prefix }),
}));
