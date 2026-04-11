import { createTheme, DEFAULT_THEME, mergeMantineTheme, Tabs } from '@mantine/core';

const themeOverride = createTheme({
	fontFamily: 'SF Pro Text',
	focusRing: 'never',
	cursorType: 'pointer',
	components: {
		Text: {
			defaultProps: {
				size: '11px',
				color: '#63698f',
				tt: 'uppercase',
				lh: '15px',
				style: { userSelect: 'none' },
			},
		},
	},
});

export const theme = mergeMantineTheme(DEFAULT_THEME, themeOverride);
