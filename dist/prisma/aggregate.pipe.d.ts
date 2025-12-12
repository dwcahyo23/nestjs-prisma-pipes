import { PipeTransform } from '@nestjs/common';
import { Pipes } from 'src/pipes.types';
/**
 * Enhanced manual aggregate with array relationship support
 */
declare function manualAggregateWithRelationships(prismaModel: any, aggregates: Pipes.AggregateSpec[], groupBy: string[], where?: any): Promise<any[]>;
/**
 * Enhanced manual aggregate for time series with array relationship support
 */
declare function manualAggregateForTimeSeries(prismaModel: any, aggregates: Pipes.AggregateSpec[], groupBy: string[], dateField: string, interval: Pipes.TimeInterval, year: number | undefined, where?: any): Promise<any[]>;
/**
 * Aggregate Pipe
 */
export default class AggregatePipe implements PipeTransform {
    transform(value: string): Pipes.Aggregate | undefined;
    /**
     * Execute aggregate query
     */
    static execute(prismaModel: any, aggregateConfig: Pipes.Aggregate, where?: any): Promise<any>;
    /**
     * Transform to chart series - sama seperti sebelumnya
     */
    static toChartSeries(data: any[] | any, aggregateConfig: Pipes.Aggregate): Pipes.ChartSeries;
}
export { manualAggregateWithRelationships, manualAggregateForTimeSeries };
//# sourceMappingURL=aggregate.pipe.d.ts.map