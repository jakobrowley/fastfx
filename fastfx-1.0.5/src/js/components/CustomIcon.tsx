import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { byPrefixAndName } from '@awesome.me/kit-1b7c0ec936/icons';
import { SizeProp } from '@fortawesome/fontawesome-svg-core';

interface Props {
	icon: string;
	size: SizeProp;
	prefix?: string;
	color?: string;
}

export function CustomIcon({ icon, size, prefix, color }: Props) {
	return <FontAwesomeIcon icon={byPrefixAndName[prefix || 'fas'][icon]} size={size} color={color || '#63698f'} />;
}
