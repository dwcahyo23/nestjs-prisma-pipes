import { PipeTransform } from '@nestjs/common';
export declare namespace IncludePipe {
    type Include = Record<string, any>;
}
export declare class IncludePipe implements PipeTransform {
    transform(value?: string): IncludePipe.Include | undefined;
    private assignNestedInclude;
    private splitTopLevel;
}
