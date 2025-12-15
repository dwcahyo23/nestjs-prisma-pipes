import { Pipes } from "../types/pipes.types";
declare class TimezoneService {
    private static instance;
    private config;
    private constructor();
    static getInstance(): TimezoneService;
    setTimezone(config: Partial<Pipes.TimezoneConfig>): void;
    getTimezone(): Pipes.TimezoneConfig;
    private parseOffsetHours;
    addTimezoneToDateString(dateString: string): string;
    utcToLocal(date: Date): Date;
    localToUtc(date: Date): Date;
}
declare const _default: TimezoneService;
export default _default;
