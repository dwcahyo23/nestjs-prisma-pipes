export interface TimezoneConfig {
    offset: string;
    name: string;
    offsetHours: number;
}
declare class TimezoneService {
    private static instance;
    private config;
    private constructor();
    static getInstance(): TimezoneService;
    setTimezone(config: Partial<TimezoneConfig>): void;
    getTimezone(): TimezoneConfig;
    private parseOffsetHours;
    addTimezoneToDateString(dateString: string): string;
    utcToLocal(date: Date): Date;
    localToUtc(date: Date): Date;
}
declare const _default: TimezoneService;
export default _default;
