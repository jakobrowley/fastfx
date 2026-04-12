import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { csi, initBolt } from '../lib/utils/bolt';
import { initSentry, setSentryUser, setSentryHostContext, Sentry } from '../lib/sentry';
import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import Main from './main';
import { theme } from './theme';
import { MainProvider } from '../context/main.context';
import { LicenseProvider, useLicenseContext } from '../context/license.context';
import LicenseForm from '../components/LicenseForm';
import { useVerifyOffline } from '../hooks/useVerifyOffline';
import copyPresets from '../utils/presets.utils';

// Initialize Sentry as early as possible so we capture errors from initBolt and
// all subsequent startup code. Safe to call before React mounts.
initSentry();

initBolt();

// Tag every Sentry event with the customer's Premiere version and OS so Claud
// can filter by "customers on Premiere X" when investigating widespread issues.
try {
	const env = csi.getHostEnvironment();
	setSentryHostContext(env?.appVersion || 'unknown', navigator.platform || 'unknown');
} catch {
	// Non-fatal — if host context fails we just skip the tags.
}

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
	const { il, sil, slec, slk, sslk, sa, ssa, e, se } = useLicenseContext();
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

	// Once we know the customer's email from the verified license, tell Sentry
	// so errors can be searched by customer email from the dashboard / MCP.
	useEffect(() => {
		if (il && e) {
			setSentryUser(e, slk);
		}
	}, [il, e, slk]);

	if (loading) return null;

	return (
		<MantineProvider theme={theme}>
			<React.StrictMode>{il ? <Main /> : <LicenseForm slk={slk} />}</React.StrictMode>
		</MantineProvider>
	);
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<Sentry.ErrorBoundary
		fallback={
			<div style={{ padding: 16, color: '#fff', fontFamily: 'sans-serif' }}>
				<h3 style={{ margin: '0 0 8px' }}>FastFX ran into an error</h3>
				<p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>
					We've been notified automatically. Please reload the panel or restart Premiere to continue.
				</p>
			</div>
		}
	>
		<MainProvider>
			<LicenseProvider>
				<Index />
			</LicenseProvider>
		</MainProvider>
	</Sentry.ErrorBoundary>
);
