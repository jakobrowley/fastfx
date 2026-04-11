import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction, useEffect } from 'react';
import { editSliderDefaults, SettingsType, SlidersType } from '../../shared/shared';
import { csi } from '../lib/utils/bolt';
import { SystemPath } from '../lib/cep/csinterface';
import { fs, path } from '../lib/cep/node';

export type SearchType = {
	phrase: string;
	flashes: boolean;
	custom: boolean;
};

type MainContextType = {
	settings: SettingsType;
	setSettings: Dispatch<SetStateAction<SettingsType>>;
	errorCode: number;
	setErrorCode: Dispatch<SetStateAction<number>>;
	search: SearchType;
	setSearch: Dispatch<SetStateAction<SearchType>>;
	sliders: SlidersType;
	setSliders: Dispatch<SetStateAction<SlidersType>>;
	reloadPresets: boolean;
	setReloadPresets: Dispatch<SetStateAction<boolean>>;
};

const MainContext = createContext<MainContextType | undefined>(undefined);

export const MainProvider = ({ children }: { children: ReactNode }) => {
	const [settings, setSettings] = useState<SettingsType>({
		category: 'hits',
		subcategory: 'all',
		fxSpeed: 'medium',
		speed: '200%',
		preset: 'hit-wipe',
		fx: [],
		preview: '', // Initialize preview in settings state
	});

	const [errorCode, setErrorCode] = useState(0);
	const [search, setSearch] = useState<SearchType>({
		phrase: '',
		flashes: false,
		custom: false,
	});

	const [sliders, setSliders] = useState<SlidersType>({
		'intensity': { value: editSliderDefaults.intensity, visible: true },
		'd. blur': { value: editSliderDefaults['d. blur'], visible: true },
		'flash': { value: 0, visible: true },
		'm. blur': { value: editSliderDefaults['m. blur'], visible: true },
	});

	const [reloadPresets, setReloadPresets] = useState(false);

	useEffect(() => {
		if (settings.category) {
			const basePath = csi.getSystemPath(SystemPath.EXTENSION);
			const sourcePath = path.join(basePath, 'static', 'previews');
			let previewPath = path.join(sourcePath, settings.category, `${settings.preset}.mp4`);

			if (!fs.existsSync(previewPath)) {
				previewPath = path.join(sourcePath, 'default.mp4');
			}

			setSettings((prevSettings) => ({
				...prevSettings,
				preview: previewPath,
			}));
		}
	}, [settings.preset]);

	const value: MainContextType = {
		settings,
		setSettings,
		errorCode,
		setErrorCode,
		search,
		setSearch,
		sliders,
		setSliders,
		reloadPresets,
		setReloadPresets,
	};

	return <MainContext.Provider value={value}>{children}</MainContext.Provider>;
};

export const useMainContext = () => {
	const context = useContext(MainContext);
	if (!context) {
		throw new Error('Context must be used within a Provider');
	}
	return context;
};
