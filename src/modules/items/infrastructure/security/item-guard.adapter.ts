import { Injectable } from '@nestjs/common';
import { BaseEntityGuard } from '../../../shared/infrastructure/security/base-entity-guard';
import { ItemGuardPort } from '../../application/ports/item-guard.port';
import { Item } from '../../domain/aggregates/item';

@Injectable()
export class ItemGuardAdapter extends BaseEntityGuard<Item> implements ItemGuardPort {}
