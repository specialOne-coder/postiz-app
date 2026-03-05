import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { IntegrationManager } from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { Organization } from '@prisma/client';

@Injectable()
export class ViralsCustomersService {
  constructor(
    private _prisma: PrismaService,
    private _organizationService: OrganizationService,
    private _integrationManager: IntegrationManager,
    private _integrationService: IntegrationService
  ) {}

  private async _ensureApiToken(orgId: string, apiKey?: string | null) {
    if (apiKey) {
      return apiKey;
    }

    const updated = await this._organizationService.updateApiKey(orgId);
    if (!updated?.apiKey) {
      throw new HttpException({ msg: 'Failed to generate customer API token' }, 500);
    }

    return updated.apiKey;
  }

  async createCustomer(masterOrgId: string, externalId: string) {
    const normalizedExternalId = externalId.trim();
    if (!normalizedExternalId) {
      throw new HttpException({ msg: 'externalId is required' }, 400);
    }

    const existingCustomer = await this._prisma.customer.findFirst({
      where: {
        orgId: masterOrgId,
        name: normalizedExternalId,
        deletedAt: null,
      },
    });

    if (existingCustomer) {
      const customerOrg = await this._organizationService.getOrgById(
        existingCustomer.id
      );

      if (!customerOrg) {
        throw new HttpException({ msg: 'Customer organization not found' }, 404);
      }

      return {
        customerId: customerOrg.id,
        apiToken: await this._ensureApiToken(customerOrg.id, customerOrg.apiKey),
      };
    }

    const createdCustomerOrg = await this._organizationService.createMaxUser(
      normalizedExternalId,
      normalizedExternalId,
      'virals',
      ''
    );

    try {
      await this._prisma.customer.create({
        data: {
          id: createdCustomerOrg.id,
          name: normalizedExternalId,
          orgId: masterOrgId,
        },
      });
    } catch (err) {
      const existingAfterRace = await this._prisma.customer.findFirst({
        where: {
          orgId: masterOrgId,
          name: normalizedExternalId,
          deletedAt: null,
        },
      });

      if (existingAfterRace) {
        const customerOrg = await this._organizationService.getOrgById(
          existingAfterRace.id
        );

        if (!customerOrg) {
          throw new HttpException({ msg: 'Customer organization not found' }, 404);
        }

        return {
          customerId: customerOrg.id,
          apiToken: await this._ensureApiToken(customerOrg.id, customerOrg.apiKey),
        };
      }

      throw new HttpException({ msg: 'Failed to create customer' }, 500);
    }

    return {
      customerId: createdCustomerOrg.id,
      apiToken: await this._ensureApiToken(
        createdCustomerOrg.id,
        createdCustomerOrg.apiKey
      ),
    };
  }

  private async _loadCustomerOrg(masterOrgId: string, customerId: string) {
    const customer = await this._prisma.customer.findFirst({
      where: {
        orgId: masterOrgId,
        id: customerId,
        deletedAt: null,
      },
    });

    if (!customer) {
      throw new HttpException({ msg: 'Customer not found' }, 404);
    }

    const customerOrg = await this._organizationService.getOrgById(customer.id);
    if (!customerOrg) {
      throw new HttpException({ msg: 'Customer organization not found' }, 404);
    }

    return customerOrg;
  }

  async generateOAuthUrl(
    masterOrg: Organization,
    customerId: string,
    provider: string,
    refresh?: string,
    externalUrl?: string
  ) {
    const customerOrg = await this._loadCustomerOrg(masterOrg.id, customerId);

    if (
      !this._integrationManager.getAllowedSocialsIntegrations().includes(provider)
    ) {
      throw new HttpException({ msg: 'Integration not allowed' }, 400);
    }

    const integrationProvider = this._integrationManager.getSocialIntegration(
      provider
    );

    if (integrationProvider.externalUrl && !externalUrl) {
      throw new HttpException({ msg: 'Missing external url' }, 400);
    }

    const getExternalUrl = integrationProvider.externalUrl
      ? {
          ...(await integrationProvider.externalUrl(externalUrl!)),
          instanceUrl: externalUrl!,
        }
      : undefined;

    try {
      const { codeVerifier, state, url } =
        await integrationProvider.generateAuthUrl(getExternalUrl);

      if (refresh) {
        await ioRedis.set(`refresh:${state}`, refresh, 'EX', 3600);
      }

      await ioRedis.set(`organization:${state}`, customerOrg.id, 'EX', 3600);
      await ioRedis.set(`login:${state}`, codeVerifier, 'EX', 3600);

      if (getExternalUrl) {
        await ioRedis.set(
          `external:${state}`,
          JSON.stringify(getExternalUrl),
          'EX',
          3600
        );
      }

      return { url };
    } catch (err) {
      throw new HttpException({ msg: 'Failed to generate auth URL' }, 500);
    }
  }

  async listIntegrations(masterOrgId: string, customerId: string) {
    const customerOrg = await this._loadCustomerOrg(masterOrgId, customerId);
    const integrations = await this._integrationService.getIntegrationsList(
      customerOrg.id
    );

    return {
      integrations: integrations.map((integration) => ({
        id: integration.id,
        platform: integration.providerIdentifier,
        name: integration.name,
        picture: integration.picture,
        connected:
          !integration.disabled &&
          !integration.refreshNeeded &&
          !integration.inBetweenSteps,
      })),
    };
  }
}
