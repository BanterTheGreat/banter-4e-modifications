// EVERYTHING HERE SHOULD ONLY BE CALLED ON THE GM'S INSTANCE USING SOCKETLIB.
export class SocketHelper {
    lastUpdate = 0;
    triggeringActor = "";
    updateQueue = Promise.resolve();
    

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
    static async updateMessageContentWithDelay(id, textToReplace, replacementText) {
        game.SocketHelper.updateQueue = game.SocketHelper.updateQueue.then(async () => {
            console.error("Executing safely...");
            // Simulate an async operation
            const message = game.messages.get(id);
            if (message) {
                const newMessageContent = message.content.replace(textToReplace, replacementText);
                await message.update({...message, content: newMessageContent});
            } // Simulate delay
            console.error("Execution finished!");
        });
    }
}