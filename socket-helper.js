export class SocketHelper {
    lastUpdate = 0;

    // SocketLib helpscripts. Only used by GMs
    static async deleteMessage(id) {
        const message = game.messages.get(id);
        if(message) {
            await message.delete();
        }
    }

    static async updateMessage(id, newMessage) {
        const message = game.messages.get(id);
        if (message) {
            await message.update({...newMessage});
        }
    }

    // Delayed to make sure we don't overwrite changes if we back to back update a message through multiple clients.
    static async updateMessageContentWithDelay(id, newMessage) {
        if (Date.now() < game.SocketHelper.lastUpdate + 250) {
            const differenceInTime = Date.now() - game.PlayerDefense.lastUpdate + 250;
            await new Promise(resolve => setTimeout(resolve, differenceInTime)); // Small delay to avoid race conditions
        }

        const message = game.messages.get(id);
        if (message) {
            game.SocketHelper.lastUpdate = Date.now();
            await message.update({...newMessage});
        }
    }
}