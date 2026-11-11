/** The chapters of the chronicle of a game, without their content; `rsql` must hold `gameId==<id>`. */
export class GetChronicleChaptersQuery {
  constructor(
    public readonly gameId: string,
    public readonly rsql: string | undefined,
    public readonly page: number,
    public readonly size: number,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}

export class GetChronicleChapterQuery {
  constructor(
    public readonly chapterId: string,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
