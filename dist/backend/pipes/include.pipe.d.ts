import { PipeTransform } from '@nestjs/common';
export declare namespace IncludePipe {
    type Include = Record<string, any>;
}
export declare class IncludePipe implements PipeTransform {
    transform(value?: string): IncludePipe.Include | undefined;
    private parseIncludePart;
    private parseFields;
    private assignNestedInclude;
    private splitTopLevel;
}
//# sourceMappingURL=include.pipe.d.ts.map