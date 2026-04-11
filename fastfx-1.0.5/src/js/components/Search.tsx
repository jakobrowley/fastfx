import { Group, TextInput } from '@mantine/core';
import { CustomIcon } from './CustomIcon';
import { filterButtons } from '../config/button.config';
import { FilterIcon } from './FilterIcon';
import { SearchType, useMainContext } from '../context/main.context';

const Search = () => {
	const { search, setSearch } = useMainContext();

	return (
		<TextInput
			value={search.phrase}
			onChange={(event) => setSearch((prevSearch) => ({ ...prevSearch, phrase: event.currentTarget.value }))}
			leftSectionPointerEvents='none'
			leftSection={<CustomIcon icon={'magnifying-glass'} size='sm' />}
			rightSection={
				<Group wrap='nowrap' gap={9} flex={1} ml={8}>
					{filterButtons.map(({ name, icon }) => (
						<FilterIcon key={name} name={name as keyof SearchType} icon={icon!} size='xs' />
					))}
				</Group>
			}
			rightSectionWidth={55}
		/>
	);
};

export default Search;
