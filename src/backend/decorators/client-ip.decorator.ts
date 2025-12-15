import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ClientIp = createParamDecorator(
	(data: unknown, ctx: ExecutionContext): string | undefined => {
		const request = ctx.switchToHttp().getRequest();

		const forwardedFor = request.headers['x-forwarded-for'];
		if (forwardedFor) {
			return forwardedFor.split(',')[0].trim();
		}

		const realIp = request.headers['x-real-ip'];
		if (realIp) {
			return realIp;
		}

		return request.ip || request.connection?.remoteAddress;
	},
);