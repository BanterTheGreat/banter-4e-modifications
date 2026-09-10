import { MARKER_CHANGE_KEY } from "./constants.js";

/**
 * Presents the applying user with the token-combatant that owns a Mark.
 */
export class MarkOwnerDialog {
  /**
   * Opens the owner picker and resolves once the user applies or dismisses it.
   * The existing DnD4e marker change is used only to preselect a candidate.
   *
   * @param {ActiveEffect} effect
   *   Mark effect whose parent actor is named in the dialog.
   * @param {Token[]} candidates
   *   Other token-combatants eligible to own the Mark.
   * @returns {Promise<object|null>}
   *   Selected owner references, or null when the dialog is cancelled.
   */
  static choose(effect, candidates) {
    const inferredOwner = effect.changes.find(change => change.key === MARKER_CHANGE_KEY)?.value;
    const options = candidates.map(token => {
      const selected = token.actor.uuid === inferredOwner ? " selected" : "";
      return `<option value="${token.id}"${selected}>${foundry.utils.escapeHTML(token.name)}</option>`;
    }).join("");
    const content = `<form><div class="form-group"><label>Mark owner</label><div class="form-fields"><select name="ownerTokenId">${options}</select></div></div></form>`;

    return new Promise(resolve => {
      let resolved = false;
      const finish = value => {
        if (!resolved) {
          resolved = true;
          resolve(value);
        }
      };
      new Dialog({
        title: `Choose Mark owner for ${effect.parent.name}`,
        content,
        buttons: {
          apply: {
            icon: '<i class="fas fa-check"></i>',
            label: "Apply",
            callback: html => {
              const tokenId = html.find('[name="ownerTokenId"]').val();
              const token = candidates.find(candidate => candidate.id === tokenId);
              finish(token ? MarkOwnerDialog.#ownershipData(token) : null);
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => finish(null),
          },
        },
        default: "apply",
        close: () => finish(null),
      }).render(true);
    });
  }

  /**
   * Converts the chosen canvas token into serializable ownership references.
   * Target references are added later by the GM-authoritative store.
   *
   * @param {Token} owner
   *   Token selected as the Mark owner.
   * @returns {object}
   *   Actor, token, scene, and combat identifiers safe to send via SocketLib.
   */
  static #ownershipData(owner) {
    return {
      actorUuid: owner.actor.uuid,
      ownerSceneId: owner.scene.id,
      ownerTokenId: owner.id,
      combatId: game.combat.id,
    };
  }
}
