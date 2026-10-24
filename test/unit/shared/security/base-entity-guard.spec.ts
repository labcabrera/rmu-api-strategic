import { BaseEntityGuard } from '../../../../src/modules/shared/infrastructure/security/base-entity-guard.js';
import type { RbacEntity } from '../../../../src/modules/shared/domain/entities/rbac-entity.js';

class Guard extends BaseEntityGuard<RbacEntity> {}

describe('BaseEntityGuard', () => {
  const guard = new Guard();
  const privateOf = (owner: string): RbacEntity => ({ owner, accessType: 'private' });

  it('reads a public entity, its owner or an admin', () => {
    expect(() => guard.checkRead({ owner: 'a', accessType: 'public' }, 'b', [])).not.toThrow();
    expect(() => guard.checkRead(privateOf('a'), 'a', [])).not.toThrow();
    expect(() => guard.checkRead(privateOf('a'), 'b', ['rmu-admin'])).not.toThrow();
    expect(() => guard.checkRead(privateOf('a'), 'b', ['rmu-user'])).toThrow(expect.objectContaining({ statusCode: 403 }));
  });

  it('creates with rmu-user or rmu-admin, and changes or deletes the owner or an admin', () => {
    expect(() => guard.checkCreate(['rmu-user'])).not.toThrow();
    expect(() => guard.checkCreate(['rmu-admin'])).not.toThrow();
    expect(() => guard.checkCreate([])).toThrow(expect.objectContaining({ statusCode: 403 }));
    expect(() => guard.checkUpdate(privateOf('a'), 'a', [])).not.toThrow();
    expect(() => guard.checkUpdate(privateOf('a'), 'b', ['rmu-user'])).toThrow(expect.objectContaining({ statusCode: 403 }));
    expect(() => guard.checkDelete(privateOf('a'), 'b', ['rmu-admin'])).not.toThrow();
    expect(() => guard.checkDelete(privateOf('a'), 'b', [])).toThrow(expect.objectContaining({ statusCode: 403 }));
  });

  it('lists what is public or owned, and everything for an admin', () => {
    expect(guard.buildQueryPredicate('a', ['rmu-admin'])).toEqual({ type: 'empty' });
    expect(guard.buildQueryPredicate('a', [])).toEqual({
      type: 'anyOf',
      criteria: [
        { type: 'eq', field: 'accessType', value: 'public' },
        { type: 'eq', field: 'owner', value: 'a' },
      ],
    });
  });
});
