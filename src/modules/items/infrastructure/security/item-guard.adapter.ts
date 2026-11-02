import { Injectable } from '@nestjs/common';
import { BaseEntityGuard } from '../../../shared/infrastructure/security/base-entity-guard.js';
import type { ItemGuardPort } from '../../application/ports/item-guard.port.js';
import { Item } from '../../domain/aggregates/item.js';

@Injectable()
export class ItemGuardAdapter extends BaseEntityGuard<Item> implements ItemGuardPort {}
