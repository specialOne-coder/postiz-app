import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import * as Sentry from '@sentry/nestjs';
import { CreateViralsCustomerDto } from '@gitroom/backend/api/routes/virals/dto/create-virals-customer.dto';
import { ViralsCustomersService } from '@gitroom/backend/api/routes/virals/virals.customers.service';

@ApiTags('Public API')
@Controller('/public/v1/customers')
export class ViralsCustomersController {
  constructor(private _viralsCustomersService: ViralsCustomersService) {}

  @Post('/create')
  async createCustomer(
    @GetOrgFromRequest() org: Organization,
    @Body() body: CreateViralsCustomerDto
  ) {
    Sentry.metrics.count('public_api-request', 1);
    return this._viralsCustomersService.createCustomer(org.id, body.externalId);
  }

  @Get('/:customerId/oauth-url/:provider')
  async getOAuthUrl(
    @GetOrgFromRequest() org: Organization,
    @Param('customerId') customerId: string,
    @Param('provider') provider: string,
    @Query('refresh') refresh?: string,
    @Query('externalUrl') externalUrl?: string,
    @Query('redirectUrl') redirectUrl?: string
  ) {
    return this._viralsCustomersService.generateOAuthUrl(
      org,
      customerId,
      provider,
      refresh,
      externalUrl,
      redirectUrl
    );
  }

  @Get('/:customerId/integrations')
  async listIntegrations(
    @GetOrgFromRequest() org: Organization,
    @Param('customerId') customerId: string
  ) {
    Sentry.metrics.count('public_api-request', 1);
    return this._viralsCustomersService.listIntegrations(org.id, customerId);
  }
}
