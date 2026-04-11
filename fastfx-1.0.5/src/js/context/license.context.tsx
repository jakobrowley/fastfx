import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

type LicenseContextType = {
	il: boolean;
	sil: Dispatch<SetStateAction<boolean>>;
	lec: number;
	slec: Dispatch<SetStateAction<number>>;
	slk: string;
	sslk: Dispatch<SetStateAction<string>>;
	sa: number | null;
	ssa: Dispatch<SetStateAction<number | null>>;
	e: string;
	se: Dispatch<SetStateAction<string>>;
};

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export const LicenseProvider = ({ children }: { children: ReactNode }) => {
	const [il, sil] = useState(false);
	const [lec, slec] = useState<number>(0);
	const [slk, sslk] = useState('');
	const [sa, ssa] = useState<number | null>(null);
	const [e, se] = useState('');

	const value: LicenseContextType = {
		il, // isLicensed
		sil, // setIsLicensed
		lec, // licenseErrorCode
		slec, // setLicenseErrorCode
		slk, // savedLicenseKey
		sslk, // setSavedLicenseKey
		sa, // savedActivation
		ssa, // setSavedActivation
		e, // email
		se, // setEmail
	};

	return <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>;
};

export const useLicenseContext = () => {
	const context = useContext(LicenseContext);
	if (!context) {
		throw new Error('Context must be used within a Provider');
	}
	return context;
};
