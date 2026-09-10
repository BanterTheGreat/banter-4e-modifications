import { MODULE_NAME } from "../../shared/globals.js";
import { OWNERSHIP_FLAG } from "./constants.js";
import { MarkOwnershipStore } from "./mark-ownership-store.js";

/**
 * Renders visibility-safe Mark relationships on the canvas.
 */
export class MarkOwnershipRenderer {
  /**
   * Creates a renderer without attaching it to a canvas. The graphics layer is
   * initialized separately because Foundry may replace the canvas between scenes.
   */
  constructor() {
    this.lines = null;
  }

  /**
   * Replaces any stale graphics layer with one attached to the active canvas.
   * Applies the supported PIXI blur-filter form for Foundry v12 or v13.
   */
  initialize() {
    this.destroy();
    if (!canvas?.ready || !canvas.interface) {
      return;
    }
    this.lines = canvas.interface.addChild(new PIXI.Graphics());
    const BlurFilter = PIXI.BlurFilter ?? PIXI.filters?.BlurFilter;
    if (BlurFilter) {
      const pixiMajorVersion = Number.parseInt(PIXI.VERSION, 10);
      this.lines.filters = [pixiMajorVersion >= 8 ? new BlurFilter({ strength: 3, quality: 2 }) : new BlurFilter(3, 2)];
    }
  }

  /**
   * Releases the scene-specific graphics layer and its PIXI resources.
   */
  destroy() {
    this.lines?.destroy({ children: true });
    this.lines = null;
  }

  /**
   * Clears and redraws eligible relationships for the current scene. A line is
   * drawn only when both endpoints are visible and either endpoint is hovered,
   * controlled, or targeted.
   */
  draw() {
    if (!this.lines || !canvas?.ready) {
      return;
    }

    this.lines.clear();
    for (const effect of MarkOwnershipStore.currentSceneEffects()) {
      const ownership = effect.getFlag(MODULE_NAME, OWNERSHIP_FLAG);
      if (ownership?.targetSceneId !== canvas.scene.id || ownership.ownerSceneId !== canvas.scene.id) {
        continue;
      }

      const owner = canvas.tokens.get(ownership.ownerTokenId);
      const target = canvas.tokens.get(ownership.targetTokenId);
      if (!owner || !target || !MarkOwnershipRenderer.#canSee(owner) || !MarkOwnershipRenderer.#canSee(target)) {
        continue;
      }
      if (!MarkOwnershipRenderer.#isInteractive(owner) && !MarkOwnershipRenderer.#isInteractive(target)) {
        continue;
      }
      this.#drawLine(owner.center, target.center);
    }
  }

  /**
   * Prevents a relationship line from revealing a hidden or unseen endpoint.
   * GMs retain visibility because Foundry exposes hidden tactical information to
   * them already.
   *
   * @param {Token} token
   *   Endpoint whose visibility should be checked for the current user.
   * @returns {boolean}
   *   Whether drawing the endpoint can safely reveal its position.
   */
  static #canSee(token) {
    return game.user.isGM || (!token.document.hidden && token.visible);
  }

  /**
   * Determines whether a token currently requests its relationship lines.
   *
   * @param {Token} token
   *   Owner or marked token being inspected.
   * @returns {boolean}
   *   Whether the token is hovered, controlled, or targeted.
   */
  static #isInteractive(token) {
    return token.hover || token.controlled || token.isTargeted;
  }

  /**
   * Adds one red ownership line to the shared graphics layer. PIXI v8 strokes
   * completed paths, while the v7-compatible branch sets line style first.
   *
   * @param {{x: number, y: number}} from
   *   Canvas center of the owner token.
   * @param {{x: number, y: number}} to
   *   Canvas center of the marked token.
   */
  #drawLine(from, to) {
    if (this.lines.stroke) {
      this.lines.moveTo(from.x, from.y).lineTo(to.x, to.y);
      this.lines.stroke({ color: 0xff2222, width: 4, alpha: 0.75 });
    } else {
      this.lines.lineStyle(4, 0xff2222, 0.75);
      this.lines.moveTo(from.x, from.y).lineTo(to.x, to.y);
    }
  }
}
