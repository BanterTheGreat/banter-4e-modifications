import { Logger } from "./logger.js";

// EVERYTHING HERE SHOULD ONLY BE CALLED ON THE GM'S INSTANCE USING SOCKETLIB.
/**
 * Performs GM-authoritative chat-message mutations requested through SocketLib.
 */
export class SocketHelper {
    updateQueue = Promise.resolve();

    /**
     * @param {string} id
     */
    static async deleteMessage(id) {
        const message = game.messages.get(id);
        if (message) {
            await message.delete();
        }
    }

    /**
     * @param {string} id
     * @param {object} newMessage
     */
    static async updateMessage(id, newMessage) {
        const message = game.messages.get(id);
        if (message) {
            await message.update({ ...newMessage });
        }
    }

    /**
     * Serializes message mutations to prevent concurrent updates from overwriting each other.
     *
     * @param {() => Promise<unknown>} update
     * @returns {Promise<unknown>}
     */
    static #queueUpdate(update) {
        const queuedUpdate = game.SocketHelper.updateQueue.then(update);
        game.SocketHelper.updateQueue = queuedUpdate.catch(error => Logger.error("Queued chat-message update failed", { error }));
        return queuedUpdate;
    }

    /**
     * Marks a target's one allowed dialog attempt.
     *
     * @param {string} messageId
     * @param {string} targetId
     * @returns {Promise<boolean>}
     */
    static async attemptDefenseDialog(messageId, targetId) {
        return SocketHelper.#queueUpdate(async () => {
            const message = game.messages.get(messageId);
            const defense = message?.flags?.playerDefense;
            const targets = defense?.targets;
            const target = targets?.find(entry => entry.id === targetId);

            if (!target || target.dialogAttempted) {
                return false;
            }

            target.dialogAttempted = true;
            await message.update({ flags: { ...message.flags, playerDefense: { ...defense, targets } } });
            Logger.info("Attempted defense dialog", { messageId, targetId });
            return true;
        });
    }

    /**
     * Replaces a target's awaiting placeholder with its defense result.
     *
     * @param {string} messageId
     * @param {string} targetId
     * @param {string} resultHtml
     * @returns {Promise<boolean>}
     */
    static async resolveDefenseTarget(messageId, targetId, resultHtml) {
        return SocketHelper.#queueUpdate(async () => {
            const message = game.messages.get(messageId);
            const defense = message?.flags?.playerDefense;
            const targets = defense?.targets;
            const target = targets?.find(entry => entry.id === targetId);

            if (!target) {
                return false;
            }

            const marker = `<span data-player-defense-result="${targetId}"><em>Awaiting defense...</em></span>`;
            const content = message.content.replace(marker, resultHtml);
            await message.update({ content });
            Logger.info("Resolved defense target", { messageId, targetId });
            return true;
        });
    }
}
