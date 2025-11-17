export namespace Pipes {
	export type Where = Record<string, number | string>;

	export type Order = Record<string, 'asc' | 'desc'>;

	export type Select = Record<string, boolean>;

	export type Include = Record<string, any>;

	export type Aggregate = Record<string, any>;
}
