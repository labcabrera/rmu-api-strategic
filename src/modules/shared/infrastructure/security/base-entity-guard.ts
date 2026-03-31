import { ForbiddenError } from '../../domain/errors/errors';
import { RMU_ADMIN, RMU_USER } from '../../domain/entities/user-roles';
import { RbacEntity } from '../../domain/entities/has-owner';
import { FilterQuery } from 'mongoose';

export abstract class BaseEntityGuard<E extends RbacEntity> implements BaseEntityGuard<E> {
  checkRead(entity: E, userId: string, roles: string[]) {
    if (entity.accessType === 'public') return;
    if (roles.includes(RMU_ADMIN)) return;
    if (entity.owner === userId) return;
    throw new ForbiddenError('You do not have permission to read this entity');
  }

  checkCreate(roles: string[]) {
    if (roles.includes(RMU_ADMIN)) return;
    if (roles.includes(RMU_USER)) return;
    throw new ForbiddenError('You do not have permission to create this entity');
  }

  checkUpdate(entity: E, userId: string, roles: string[]) {
    if (roles.includes(RMU_ADMIN)) return;
    if (entity.owner === userId) return;
    throw new ForbiddenError('You do not have permission to update this entity');
  }

  checkDelete(entity: E, userId: string, roles: string[]) {
    if (roles.includes(RMU_ADMIN)) return;
    if (entity.owner === userId) return;
    throw new ForbiddenError('You do not have permission to delete this entity');
  }

  buildQueryPredicate(userId: string, roles: string[]): FilterQuery<any> {
    if (roles.includes(RMU_ADMIN)) return {};
    return { $or: [{ accessType: 'public' }, { owner: userId }] };
  }
}
