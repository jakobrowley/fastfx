import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { byPrefixAndName } from '@awesome.me/kit-1b7c0ec936/icons';
import { SizeProp } from '@fortawesome/fontawesome-svg-core';
import classes from './scss/FilterIcon.module.scss';
import { useMainContext } from '../context/main.context';
import { SearchType } from '../context/main.context';
import { useState, useEffect } from 'react';

interface Props {
	name: keyof SearchType;
	icon: string;
	size: SizeProp;
	prefix?: string;
	color?: string;
}

export function FilterIcon({ name, icon, size, prefix, color }: Props) {
	const { setSearch, settings } = useMainContext();
	const [isActive, setIsActive] = useState(false);

	const isDisabled = settings.category === 'transitions' && settings.subcategory !== 'shakes';

	const handleClick = () => {
		setSearch((prevSearch) => ({
			...prevSearch,
			[name]: !prevSearch[name],
		}));
		setIsActive(!isActive);
	};

	return (
		<FontAwesomeIcon
			className={`${classes.icon} ${isDisabled ? classes.disabled : isActive ? classes.active : ''}`}
			icon={byPrefixAndName[prefix || 'fas'][icon]}
			size={size}
			color={color || '#63698f'}
			style={{ marginRight: '-8px' }}
			onClick={!isDisabled ? handleClick : undefined}
		/>
	);
}
