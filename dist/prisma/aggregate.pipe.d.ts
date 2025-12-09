import { PipeTransform } from '@nestjs/common';
import { Pipes } from 'src/pipes.types';
declare function manualAggregateWithRelationships(prismaModel: any, aggregates: Pipes.AggregateSpec[], groupBy: string[], where?: any): Promise<any[]>;
declare function manualAggregateForTimeSeries(prismaModel: any, aggregates: Pipes.AggregateSpec[], groupBy: string[], dateField: string, interval: Pipes.TimeInterval, year: number | undefined, where?: any): Promise<any[]>;
export default class AggregatePipe implements PipeTransform {
    transform(value: string): Pipes.Aggregate | undefined;
    static execute(prismaModel: any, aggregateConfig: Pipes.Aggregate, where?: any): Promise<any>;
    static toChartSeries(data: any[] | any, aggregateConfig: Pipes.Aggregate): Pipes.ChartSeries;
}
export { manualAggregateWithRelationships, manualAggregateForTimeSeries };
