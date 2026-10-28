/**
 * Deletes the games of a deleted realm. A system command (spec 016, decision 7): it has no user, because it comes from
 * the realm.deleted event and not from a request, so it does not go through the game guard.
 */
export class DeleteGamesByRealmCommand {
  constructor(public readonly realmId: string) {}
}
