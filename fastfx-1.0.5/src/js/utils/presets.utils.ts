import { fs, path } from '../lib/cep/node';
import { csi } from '../lib/utils/bolt';
import { SystemPath } from '../lib/cep/csinterface';
import { version } from '../../../package.json';
import { appData } from '../../shared/shared';

const compareVersions = (v1: string, v2: string): number => {
	const v1Parts = v1.split('.').map(Number);
	const v2Parts = v2.split('.').map(Number);

	for (let i = 0; i < 3; i++) {
		if (v1Parts[i] > v2Parts[i]) return 1;
		if (v1Parts[i] < v2Parts[i]) return -1;
	}
	return 0;
};
const areFileSizesEqual=(path1:string,path2:string): boolean =>{

	try {
		const stats1 = fs.statSync(path1);
		const stats2 = fs.statSync(path2);
	
		return stats1.size === stats2.size;
	  } catch (error) {
		return false;
	  }
	return true;
}
const copyPresets = async () => {
	const { promises: fsPromises } = fs;

	const basePath = csi.getSystemPath(SystemPath.EXTENSION);
	const appDataPath = csi.getSystemPath(SystemPath.USER_DATA);
	const destPath = path.join(appDataPath, appData.productAuthor, appData.productName, 'presets');
	const sourcePath = path.join(basePath, 'static', 'data');

	try {
		await fsPromises.mkdir(destPath, { recursive: true });

		const filesToCopy = (await fsPromises.readdir(sourcePath)).filter((file) => file.endsWith('.json'));

		for (const file of filesToCopy) {
			const sourceFile = path.join(sourcePath, file);
			const baseFileName = file.replace('.json', '');
			const destFile = path.join(destPath, `${baseFileName}_${version}.json`);

			const existingFiles = (await fsPromises.readdir(destPath)).filter(
				(f) => f.startsWith(baseFileName) && f.endsWith('.json')
			);

			let shouldCopyNewFile = true;

			for (const existingFile of existingFiles) {
				const match = existingFile.match(new RegExp(`${baseFileName}_(\\d+\\.\\d+\\.\\d+)\\.json`));
				if (match && match[1]) {
					const existingVersion = match[1];
					const comparison = compareVersions(existingVersion, version);
					if (comparison < 0) {
						const existingFilePath = path.join(destPath, existingFile);
						const newJsonData = JSON.parse(await fsPromises.readFile(sourceFile, 'utf8'));
						const existingJsonData = JSON.parse(await fsPromises.readFile(existingFilePath, 'utf8'));

						let mergedJsonData = { ...newJsonData };

						for (const key in existingJsonData) {
							if (Array.isArray(existingJsonData[key])) {
								const hasCustomEntries = existingJsonData[key].some(
									(item: any) => item.custom === true
								);
								if (hasCustomEntries) {
									let uniqueKey = key;
									if (mergedJsonData[key]) {
										let counter = 2;
										while (mergedJsonData[uniqueKey]) {
											uniqueKey = `${key}-${counter}`;
											counter++;
										}
										mergedJsonData[uniqueKey] = [];
									} else {
										mergedJsonData[key] = [];
									}

									existingJsonData[key].forEach((item: any) => {
										const itemExists = mergedJsonData[uniqueKey].some(
											(newItem: any) => JSON.stringify(newItem) === JSON.stringify(item)
										);
										if (!itemExists) {
											mergedJsonData[uniqueKey].push(item);
										}
									});
								}
							}
						}

						await fsPromises.writeFile(destFile, JSON.stringify(mergedJsonData, null, 2));
						await fsPromises.unlink(existingFilePath);
					} else {
						shouldCopyNewFile = false;
					}
				}
			}
			
			//if (shouldCopyNewFile && existingFiles.length === 0) 
			{
				const newJsonData = JSON.parse(await fsPromises.readFile(sourceFile, 'utf8'));
				await fsPromises.writeFile(destFile, JSON.stringify(newJsonData, null, 2));
			}
		}
	} catch (error) {
		alert('FastFX: Error initializing presets.');
	}
};

export default copyPresets;
