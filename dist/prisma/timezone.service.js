"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class TimezoneService {
    constructor() {
        this.config = {
            offset: '+00:00',
            name: 'UTC',
            offsetHours: 0,
        };
    }
    static getInstance() {
        if (!TimezoneService.instance) {
            TimezoneService.instance = new TimezoneService();
        }
        return TimezoneService.instance;
    }
    /**
     * Set timezone configuration
     */
    setTimezone(config) {
        if (config.offset) {
            this.config.offset = config.offset;
            // Auto-calculate offsetHours from offset string
            this.config.offsetHours = this.parseOffsetHours(config.offset);
        }
        if (config.name) {
            this.config.name = config.name;
        }
        if (config.offsetHours !== undefined) {
            this.config.offsetHours = config.offsetHours;
        }
    }
    /**
     * Get current timezone configuration
     */
    getTimezone() {
        return { ...this.config };
    }
    /**
     * Parse offset string to hours
     * @example '+07:00' => 7, '-05:30' => -5.5
     */
    parseOffsetHours(offset) {
        const match = /([+-])(\d{2}):(\d{2})/.exec(offset);
        if (!match)
            return 0;
        const [, sign, hours, minutes] = match;
        const totalHours = parseInt(hours, 10) + parseInt(minutes, 10) / 60;
        return sign === '+' ? totalHours : -totalHours;
    }
    /**
     * Add timezone to date string if missing
     */
    addTimezoneToDateString(dateString) {
        // Already has timezone
        if (/[+-]\d{2}:\d{2}|Z/.test(dateString)) {
            return dateString;
        }
        // Date only (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return `${dateString}T00:00:00${this.config.offset}`;
        }
        // Date with time but no timezone (YYYY-MM-DDTHH:mm:ss)
        if (/T\d{2}:\d{2}/.test(dateString)) {
            return `${dateString}${this.config.offset}`;
        }
        return dateString;
    }
    /**
     * Convert UTC date to local timezone
     */
    utcToLocal(date) {
        return new Date(date.getTime() + (this.config.offsetHours * 60 * 60 * 1000));
    }
    /**
     * Convert local date to UTC
     */
    localToUtc(date) {
        return new Date(date.getTime() - (this.config.offsetHours * 60 * 60 * 1000));
    }
}
exports.default = TimezoneService.getInstance();
//# sourceMappingURL=timezone.service.js.map