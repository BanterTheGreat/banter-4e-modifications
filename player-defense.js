export class PlayerDefense {
    lastAttack = {
        item: "",
        targets: [],
        attacker: null,
    }
    
    // So, the idea.
    // Whenever you use the attack option with an ability the first hook triggers and sets the Power.
    // The next message which contains the name of the item in its flavor & has attack rolls, probably is the OG attack roll.
    // We then use the data from the attack we registered, as well as the roll we intercepted to put everything together.
    // DC to block is Modifier + 2.
    static OnPowerChatMessage(message, data, options, userId) {
        // We will not intercept this attack.
        if (game.PlayerDefense.lastAttack === null) {
            return true;
        }

        // We will not intercept this attack.
        if (!message.flavor.includes(game.PlayerDefense.lastAttack.item.name) || message.rolls[0] === undefined) {
            return true;
        }

        const rollFormula = message.rolls[0].formula;
        const rollModifiers = rollFormula.match(/\((\d+)\)/g);
        if (rollModifiers.length === 0) {
            ui.notifications.warn("Couldn't find modifiers of attack roll?");
        }
        
        let totalModifier = rollModifiers.reduce((sum, match) => sum + parseInt(match.replace(/\(|\)/g, ""), 10), 0);
        
        // We add the +2 because of dice math.
        const rollDC = 10 + totalModifier + 2;
        
        const targets = game.PlayerDefense.lastAttack.targets;
        const item = game.PlayerDefense.lastAttack.item;
        const attacker = game.PlayerDefense.lastAttack.attacker;
        
        // We need to wipe the state as we are done with overriding the message.
        game.PlayerDefense.lastAttack = null;
        
        targets.forEach(target => {
           ChatMessage.create({
               flavor: `<b>${attacker.name}</b> uses <b>${item.name}</b> against <b>${target.token.actor.name}</b>!`,
               content: `<button id="rollForDefense">Defend (DC ${rollDC})</button>`,
               flags: {
                   playerDefense: {
                       attackName: item.name,
                       actorId: target.token.actor.id,
                       defenseMod: target.defenseMod,
                       rollDC: rollDC,
                   }
               }
           }); 
        });
        
        // Cancel the OG message & roll from displaying.
        return false;
    }
    
    static OnRollAttack(item, target, speaker) {
        const attacker = game.actors.find(x => x.id === speaker.actor);
        if (attacker === undefined || attacker === null) {
            return;
        }
        
        if (attacker.type !== "NPC") {
            return;
        }
        
        // Contains both the defense Mod + Token
        const targetsData = [];
        for (let i = 0; i < target.targets.length; i++) {
            targetsData.push({
                token: target.targets[i],
                defenseMod: target.targDefValArray[i] - 10,
            });
        }
        
        game.PlayerDefense.lastAttack = {
            item: item,
            targets: targetsData,
            attacker: attacker,
        }
    }

    static async onClickDefendButton(message, html, socket) {
        html.find("button#rollForDefense")
            .on("click", async (evt) => {
                evt.preventDefault();
                console.error("Clicked!");
                await this.defend(message, socket);
            });
        console.error(message);
        console.error(html.find("button#rollForDefense"));
    }
    
    static async defend(message, socket) {
        const flags = message.flags.playerDefense;
        const actor = game.actors.find(x => x.id === flags.actorId);
        const defenseMod = flags.defenseMod;
        const rollDC = flags.rollDC;
        
        const defenseRoll = new Roll(`1d20 + ${defenseMod}`);
        defenseRoll.propagateFlavor("Whacka Whacka");
        
        let roll = await defenseRoll.evaluate();
        const rollHtml = `<hr>
              <pg>${await roll.render()}</pg>
            `;
        
        let newContent = message.content
            .replace(`rollForDefense">`, `rollForDefense" disabled>`);
        
        // Manually call Dice so Nice, as it doesn't trigger the way we edit the message.
        if (game.dice3d) {
            // Immediately disable the button when Dice so Nice starts, to prevent people mashing.
            await socket.executeAsGM("updateMessage", message.id, {...message, content: newContent});
            await game.dice3d.showForRoll(roll, game.user, true);
        }

        newContent = '<button id="rollForDefense">Reroll</button>';
        newContent += rollHtml;
        await socket.executeAsGM("updateMessage", message.id, {...message, content: newContent});
    }
}