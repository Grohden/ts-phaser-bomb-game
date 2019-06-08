import {
  GameObject,
  GameScene,
  GameSprite,
  SpriteGroup,
  TPlayerGameObject,
  TPowerUpGameObject,
  TypedSpriteGroup
} from '../alias'
import { TPowerUpType } from 'commons'
import { ANIMATIONS } from './assets'

export class GroupManager {
  private readonly provider: () => GameScene;
  private readonly players: TypedSpriteGroup<TPlayerGameObject>;
  private readonly powerUps: TypedSpriteGroup<TPowerUpGameObject>;
  private readonly explosions: SpriteGroup;
  private readonly bombs: SpriteGroup;

  constructor(sceneProvider: () => GameScene) {
    this.provider = sceneProvider;

    const scene = this.provider();

    this.players = scene.add.group();
    this.explosions = scene.add.group();
    this.bombs = scene.add.group();
    this.powerUps = scene.add.group();
  }

  onPlayerExploded(onCollision: (id: string) => unknown) {
    const { players, explosions } = this;

    this.provider().physics.add.collider(
      players,
      explosions,
      (player) => onCollision(
        (player as TPlayerGameObject).id!
      )
    );

    return this;
  }

  onPlayerPowerUpCatch(
    onCollision: (
      player: TPlayerGameObject,
      powerUp: TPowerUpGameObject,
    ) => unknown
  ) {
    const { players, powerUps } = this;

    this.provider().physics.add.collider(
      players, powerUps,
      (player, powerUp) => onCollision(
        (player as TPlayerGameObject),
        (powerUp as TPowerUpGameObject)
      )
    );

    return this;
  }

  registerBombCollider() {
    const { players, bombs } = this;

    this.provider().physics.add.collider(players, bombs);

    return this;
  }

  addPlayer(
    playerSprite: TPlayerGameObject,
    id: string
  ) {
    playerSprite.id = id;
    this.players.add(playerSprite);
  }

  addExplosion(explosionSprite: GameObject) {
    this.explosions.add(explosionSprite);
  }

  addBomb(bombSprite: GameObject) {
    this.bombs.add(bombSprite);
  }

  addPowerUp(
    powerUpSprite: TPowerUpGameObject,
    type: TPowerUpType
  ) {
    powerUpSprite.powerUpType = type;
    this.powerUps.add(powerUpSprite);
  }

  private getAnimationKey(type: TPowerUpType): string {
    switch (type) {
      case "BombCount":
        return ANIMATIONS.BOMB_COUNT;
      case "BombRange":
        return ANIMATIONS.BOMB_RANGE;
    }
  }

  playAnimations() {
    for (const child of this.bombs.children.entries) {
      (child as GameSprite).anims.play(ANIMATIONS.BOMB_PULSE, true);
    }

    for (const child of this.powerUps.children.entries) {
      const key = this.getAnimationKey(child.powerUpType!);
      (child as GameSprite).anims.play(key, true);
    }
  }

}