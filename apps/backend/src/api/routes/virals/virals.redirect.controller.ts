import { Controller, Get, Query } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Controller('/public/v1')
export class ViralsRedirectController {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  @Get('/redirect-url')
  async getRedirectUrl(@Query('state') state: string) {
    if (!state) return { redirectUrl: null };
    const redirectUrl = await this.redis.get(`redirect:${state}`);
    return { redirectUrl: redirectUrl ?? null };
  }
}
