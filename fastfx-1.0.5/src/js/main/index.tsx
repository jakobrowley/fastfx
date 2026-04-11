import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { csi, initBolt } from '../lib/utils/bolt';
import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import Main from './main';
import { theme } from './theme';
import { MainProvider } from '../context/main.context';
import { LicenseProvider, useLicenseContext } from '../context/license.context';
import LicenseForm from '../components/LicenseForm';
import { useVerifyOffline } from '../hooks/useVerifyOffline';
import copyPresets from '../utils/presets.utils';

initBolt();

document.addEventListener('contextmenu', (event) => {
	event.preventDefault();
});

csi.registerKeyEventsInterest(
	JSON.stringify([
		{ keyCode: 27 }, // [esc] Windows
		{ keyCode: 53 }, // [esc] macOS
		// { keyCode: 40 }, // [down] Windows
		// { keyCode: 125 }, // [down] macOS
		// { keyCode: 38 }, // [up] Windows
		// { keyCode: 126 }, // [up] macOS
		{ keyCode: 49, shiftKey: true }, // [shift+space] macOS
		{ keyCode: 32, shiftKey: true }, // [shift+space] Windows
	])
);

const Index = () => {
	const { il, sil, slec, slk, sslk, sa, ssa, se } = useLicenseContext();
	const verifyOffline = useVerifyOffline(slec, sslk, sa, ssa, se);

	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const initialize = async () => {
			if (loading) await copyPresets();
			const licensed = await verifyOffline();
			sil(licensed);
			setLoading(false);
		};
		initialize();
	}, [sil]);

	if (loading) return null;

	return (
		<MantineProvider theme={theme}>
			<React.StrictMode>{il ? <Main /> : <LicenseForm slk={slk} />}</React.StrictMode>
		</MantineProvider>
	);
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<MainProvider>
		<LicenseProvider>
			<Index />
		</LicenseProvider>
	</MainProvider>
);
