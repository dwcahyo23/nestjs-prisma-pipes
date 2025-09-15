function deepMerge(target: any, source: any): any {
	if (typeof target !== 'object' || target === null) return source;
	if (typeof source !== 'object' || source === null) return source;

	const merged = { ...target };

	for (const key of Object.keys(source)) {
		if (key in target) {
			merged[key] = deepMerge(target[key], source[key]);
		} else {
			merged[key] = source[key];
		}
	}

	return merged;
}



export default deepMerge