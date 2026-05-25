import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';

@ApiTags('Public API')
@Controller('/public/v1/posts')
export class ViralsPublishStatusController {
  constructor(private _postsService: PostsService) {}

  @Get('/:id/publish-status')
  async getPublishStatus(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
  ) {
    return this._postsService.resolvePublishStatus(org.id, id);
  }
}