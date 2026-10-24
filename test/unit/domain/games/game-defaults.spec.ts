import { resolveOptions } from '../../../../src/modules/games/domain/value-objects/game-options.vo';
import { resolvePowerLevel } from '../../../../src/modules/games/domain/value-objects/game-power-level.vo';
import { GameOptionsDto } from '../../../../src/modules/games/interfaces/http/dto/game-options.dto';
import { GamePowerLevelDto } from '../../../../src/modules/games/interfaces/http/dto/game-power-level.dto';

const legacyPowerLevel = {
  baseDevPoints: 60,
  statRandomMin: 11,
  statBoostPotential: 78,
  statBoostTemporary: 56,
  statCreationBoost: 2,
  statCreationSwap: 2,
};
const legacyOptions = { experienceMultiplier: 1, fatigueMultiplier: 1, boardScaleMultiplier: 1, letality: 0 };

describe('Game defaults', () => {
  it('fills the new power level values of old games with the Superior defaults', () => {
    expect(resolvePowerLevel(legacyPowerLevel)).toMatchObject({
      maxTraitCost: 20,
      raceDevPointsPerLevel: 25,
      creationBonusDevPoints: 0,
      statPoints: 15,
      knackCount: 2,
      knackBonus: 5,
    });
    expect(GamePowerLevelDto.fromEntity(legacyPowerLevel)).toMatchObject({ baseDevPoints: 60, raceDevPointsPerLevel: 25, knackBonus: 5 });
  });

  it('keeps the values a game defines', () => {
    expect(resolvePowerLevel({ ...legacyPowerLevel, raceDevPointsPerLevel: 0, creationBonusDevPoints: 10 })).toMatchObject({
      raceDevPointsPerLevel: 0,
      creationBonusDevPoints: 10,
    });
  });

  it('fills the new options of old games', () => {
    expect(resolveOptions(legacyOptions)).toMatchObject({
      allowThirdRank: false,
      talentPolicy: 'free',
      bonusDevPointsCapAtCreation: false,
      statGeneration: 'roll',
      openRounds: true,
    });
    expect(GameOptionsDto.fromEntity(legacyOptions)).toMatchObject({ talentPolicy: 'free', statGeneration: 'roll', openRounds: true });
  });

  it('keeps open rounds disabled when a game turns them off', () => {
    expect(resolveOptions({ ...legacyOptions, openRounds: false }).openRounds).toBe(false);
    expect(GameOptionsDto.fromEntity({ ...legacyOptions, openRounds: false }).openRounds).toBe(false);
  });

  it('accepts a missing power level or options', () => {
    expect(resolvePowerLevel(undefined).baseDevPoints).toBe(60);
    expect(resolveOptions(null).allowThirdRank).toBe(false);
    expect(resolveOptions(undefined).openRounds).toBe(true);
  });
});
