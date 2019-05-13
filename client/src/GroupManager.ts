import { GameObject, GamePhysicsSprite, GameScene, GameSprite, SpriteGroup } from "./alias";
import { TPowerUpType } from "commons";


type PlayerGameObject = GameObject & { id?: string }

export class GroupManager {
  private readonly players: SpriteGroup & {
    children: Phaser.Structs.Set<PlayerGameObject>;
  };
  private readonly explosions: SpriteGroup;
  private readonly bombs: SpriteGroup;
  private readonly provider: () => GameScene;
  private readonly powerUps: {
    bombCount: SpriteGroup
    bombRange: SpriteGroup
  };

  constructor(sceneProvider: () => GameScene) {
    this.provider = sceneProvider;

    const scene = this.provider();
    this.players = scene.add.group();
    this.explosions = scene.add.group();
    this.bombs = scene.add.group();
    this.powerUps = {
      bombCount: scene.add.group(),
      bombRange: scene.add.group()
    };
  }

  onPlayerExploded(onCollision: (id: string) => unknown) {
    const { players, explosions } = this;

    this.provider().physics.add.collider(
      players,
      explosions,
      (player) => onCollision(
        (player as PlayerGameObject).id!
      )
    );

    return this;
  }

  onPlayerPowerUpCatch(
    onCollision: (
      id: string,
      type: TPowerUpType
    ) => unknown
  ) {
    const { players, powerUps } = this;

    const list: [SpriteGroup, TPowerUpType][] = [
      [powerUps.bombRange, "BombRange"],
      [powerUps.bombCount, "BombCount"]
    ];

    list.forEach(([group, type]) => {
      this.provider().physics.add.collider(
        players,
        group,
        (player) => onCollision(
          (player as PlayerGameObject).id!,
          type
        )
      )
    });

    return this;
  }

  registerBombCollider() {
    const { players, bombs } = this;

    this.provider().physics.add.collider(players, bombs);

    return this;
  }

  addPlayer(
    playerSprite: PlayerGameObject,
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

  addPowerUp(powerUpSprite: GameObject, type: TPowerUpType) {
    const { powerUps } = this;

    if (type === 'BombRange') {
      powerUps.bombRange.add(powerUpSprite);

    } else if (type === 'BombCount') {
      powerUps.bombCount.add(powerUpSprite);

    } else {
      console.log(type, " not recognized!")
    }
  }

  playAnimations() {
    const { powerUps } = this;

    for (const child of this.bombs.children.entries) {
      (child as GameSprite).anims.play("bomb-animation", true);
    }

    for (const child of powerUps.bombRange.children.entries) {
      (child as GameSprite).anims.play("bomb-range-animation", true);
    }

    for (const child of powerUps.bombCount.children.entries) {
      (child as GameSprite).anims.play("bomb-count-animation", true);
    }
  }

}