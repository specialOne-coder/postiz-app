import { Controller, Get, Query } from '@nestjs/common';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';

@Controller('/public/v1')
export class ViralsRedirectController {
  @Get('/redirect-url')
  async getRedirectUrl(@Query('state') state: string) {
    if (!state) return { redirectUrl: null };
    const redirectUrl = await ioRedis.get(`redirect:${state}`);
    return { redirectUrl: redirectUrl ?? null };
  }
}
