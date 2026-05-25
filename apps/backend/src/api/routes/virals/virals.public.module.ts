import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ViralsCustomersController } from '@gitroom/backend/api/routes/virals/virals.customers.controller';
import { PublicAuthMiddleware } from '@gitroom/backend/services/auth/public.auth.middleware';
import { ViralsCustomersService } from '@gitroom/backend/api/routes/virals/virals.customers.service';
import { ViralsRedirectController } from '@gitroom/backend/api/routes/virals/virals.redirect.controller';
import { ViralsPublishStatusController } from '@gitroom/backend/api/routes/virals/virals.publish-status.controller';

const authenticatedControllers = [
  ViralsCustomersController,
  ViralsPublishStatusController,
];

@Module({
  controllers: [...authenticatedControllers, ViralsRedirectController],
  providers: [ViralsCustomersService],
})
export class ViralsPublicModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(PublicAuthMiddleware)
      .forRoutes(...authenticatedControllers);
  }
}