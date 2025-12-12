import { Pipes } from 'src/pipes.types';
declare class TimezoneService {
    private static instance;
    private config;
    private constructor();
    static getInstance(): TimezoneService;
    /**
     * Set timezone configuration
     */
    setTimezone(config: Partial<Pipes.TimezoneConfig>): void;
    /**
     * Get current timezone configuration
     */
    getTimezone(): Pipes.TimezoneConfig;
    /**
     * Parse offset string to hours
     * @example '+07:00' => 7, '-05:30' => -5.5
     */
    private parseOffsetHours;
    /**
     * Add timezone to date string if missing
     */
    addTimezoneToDateString(dateString: string): string;
    /**
     * Convert UTC date to local timezone
     */
    utcToLocal(date: Date): Date;
    /**
     * Convert local date to UTC
     */
    localToUtc(date: Date): Date;
}
declare const _default: TimezoneService;
export default _default;
//# sourceMappingURL=timezone.service.d.ts.map