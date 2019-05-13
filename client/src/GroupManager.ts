import { GameObject, GamePhysicsSprite, GameScene, GameSprite } from "./alias";


type CollisionCb = (
  first: GameObject,
  second: GameObject
) => unknown

export class GroupManager {
  private readonly players: Phaser.GameObjects.Group;
  private readonly explosions: Phaser.GameObjects.Group;
  private readonly bombs: Phaser.GameObjects.Group;
  private readonly powerUps: Phaser.GameObjects.Group;
  private provider: () => GameScene;

  constructor(sceneProvider: () => GameScene) {
    this.provider = sceneProvider;

    const scene = this.provider();
    this.players = scene.add.group();
    this.explosions = scene.add.group();
    this.bombs = scene.add.group();
    this.powerUps = scene.add.group();
  }

  addPlayer(playerSprite: GamePhysicsSprite) {
    this.players.add(playerSprite);
  }

  addExplosion(explosionSprite: GameObject) {
    this.explosions.add(explosionSprite);
  }

  addBomb(bombSprite: GameObject) {
    this.bombs.add(bombSprite);
  }


  onPlayerExploded(cb: CollisionCb) {
    const { players, explosions } = this;

    this.provider().physics.add.collider(players, explosions, cb);

    return this;
  }

  onPlayerPowerUp(cb: CollisionCb) {
    const { players, powerUps } = this;

    this.provider().physics.add.collider(players, powerUps, cb);

    return this;
  }

  registerBombCollider() {
    const { players, bombs } = this;

    this.provider().physics.add.collider(players, bombs);

    return this;
  }

  playAnimations() {
    const scene = this.provider();

    for (const child of this.bombs.children.entries) {
      (child as GameSprite).anims.play("bomb-animation", true);
    }

    for (const child of this.powerUps.children.entries) {
      (child as GameSprite).anims.play("bomb-count-animation", true);
    }
  }

}