export interface CategoryProps {
	name: string;
	icon: string;
	subcategories?: CategoryProps[];
}

export type SpeedCategories = 'hits' | 'flashes' | 'wipes' | 'shakes';

export const categories: CategoryProps[] = [
	{ name: 'hits', icon: 'burst' },
	{
		name: 'transitions',
		icon: 'arrow-right-arrow-left',
		subcategories: [
			{ name: 'all', icon: 'infinity' },
			{ name: 'b&w', icon: 'circle-half-stroke' },
			{ name: 'crt', icon: 'tv-retro' },
			{ name: 'night', icon: 'moon' },
			{ name: 'shakes', icon: 'bolt' },
			{ name: 'thermal', icon: 'fire' },
		],
	},
	{ name: 'flashes', icon: 'lightbulb-on' },
	{ name: 'wipes', icon: 'rectangle-vertical-history' },
];
