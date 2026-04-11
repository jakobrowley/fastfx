import { useEffect, useRef, useState } from 'react';
import './scss/Preview.module.scss';
import { csi } from '../lib/utils/bolt';
import { path } from '../lib/cep/node';
import { SystemPath } from '../lib/cep/csinterface';

interface Props {
	src: string;
}

function Preview({ src }: Props) {
	const basePath = csi.getSystemPath(SystemPath.EXTENSION);
	const sourcePath = path.join(basePath, 'static', 'previews');
	const defaultSrc = path.join(sourcePath, 'default.mp4');
	const [currentSrc, setCurrentSrc] = useState(src);
	const [loopCount, setLoopCount] = useState(0);
	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		setCurrentSrc(src);
		setLoopCount(0);
	}, [src]);

	const handleVideoEnd = () => {
		if (loopCount < 2) {
			setLoopCount((prevCount) => prevCount + 1);
			if (videoRef.current) {
				videoRef.current.play();
			}
		} else if (currentSrc !== defaultSrc) {
			setCurrentSrc(defaultSrc);
			setLoopCount(0);
		} else {
			if (videoRef.current) {
				videoRef.current.play();
			}
		}
	};

	return (
		<video
			ref={videoRef}
			src={currentSrc}
			autoPlay
			loop={false}
			muted
			width='100%'
			height='178px'
			onEnded={handleVideoEnd}
		/>
	);
}

export default Preview;
