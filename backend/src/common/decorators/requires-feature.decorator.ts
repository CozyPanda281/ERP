import { SetMetadata } from '@nestjs/common';

export const FEATURE_KEY = 'requiredFeature';

export const RequiresFeature = (featureCode: string) =>
  SetMetadata(FEATURE_KEY, featureCode);
