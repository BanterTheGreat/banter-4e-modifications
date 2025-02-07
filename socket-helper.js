// EVERYTHING HERE SHOULD ONLY BE CALLED ON THE GM'S COMPUTER TO KEEP STATES IN SYNC.
export class SocketHelper {
    lastUpdate = 0;
    triggeringActor = "";

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
    static async updateMessageContentWithDelay(id, actorId, messageContentUpdate) {
        game.SocketHelper.triggeringActor = actorId;
        game.SocketHelper.lastUpdate = Date.now();
        
        await game.SocketHelper.DelayIfNeccessary(actorId);

        game.SocketHelper.triggeringActor = actorId;
        game.SocketHelper.lastUpdate = Date.now();

        console.error(`Updated Time: ${Date.now()}`);
        console.error(`Updated Actor: ${actorId}`);

        const message = game.messages.get(id);
        if (message) {
            const newMessage = messageContentUpdate(message);
            await message.update({...message, content: newMessage});
        }
    }
    
    async DelayIfNeccessary(actorId) {
        if (game.SocketHelper.triggeringActor !== actorId) {
            console.error("We arrived here real quick after last time. Lets wait a bit.")
            const differenceInTime = game.SocketHelper.lastUpdate + 500 - Date.now();
            console.error(differenceInTime);
            await new Promise(resolve => setTimeout(resolve, differenceInTime)); // Small delay to avoid race conditions
            console.error("We have waited!")
            await game.SocketHelper.DelayIfNeccessary();
        }
    }
}