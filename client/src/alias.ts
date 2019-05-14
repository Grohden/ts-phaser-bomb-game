import Phaser from "phaser";
import { Omit, TPowerUpType } from "commons/index";

export type SpriteGroup =  Phaser.GameObjects.Group;
export type GameObject = Phaser.GameObjects.GameObject;
export type GameSprite = Phaser.GameObjects.Sprite;
export type GamePhysicsSprite = Phaser.Physics.Arcade.Sprite;
export type GameScene = Phaser.Scene;
export type PhaserSet<T> = Phaser.Structs.Set<T>;

export type TypedSpriteGroup<T> = Omit<SpriteGroup, 'children'> & {
  children: PhaserSet<T>;
};

export type TPlayerGameObject = GameObject & { id?: string }
export type TPowerUpGameObject = GameObject & { powerUpType?: TPowerUpType }
