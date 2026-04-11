interface Props {
	adjLayer: TrackItem | undefined;
	adjItem: ProjectItem | undefined;
	nestedBin: ProjectItem | undefined;
	nestedSeqItem: Sequence | undefined;
	fullSeqItem: Sequence | undefined;
	sfxItem: ProjectItem | undefined;
	overlayItems: ProjectItem[];
}

export const g: Props = {
	adjLayer: undefined,
	adjItem: undefined,
	nestedBin: undefined,
	nestedSeqItem: undefined,
	fullSeqItem: undefined,
	sfxItem: undefined,
	overlayItems: [],
};
