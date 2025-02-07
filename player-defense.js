export class PlayerDefense {
    lastAttack = {
        item: "",
        targets: [],
        attacker: null,
    }
    
    lastUpdate = 0;
    
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

        let htmlContent = "<hr>";
        targets.forEach(target => {
            htmlContent += `<b>${target.token.actor.name} (+${target.defenseMod}) defends!</b>`
            htmlContent += `<button id="rollForDefense" data-defense-mod="${target.defenseMod}" data-roll-dc="${rollDC}" data-actor-id="${target.token.actor.id}">Roll! (DC ${rollDC})</button>`;
            htmlContent += `<hr>`;
        });
        
       ChatMessage.create({
           flavor: `<b>${attacker.name}</b> uses <b>${item.name}</b>!`,
           content: htmlContent,
           flags: {
               playerDefense: {
                   attackName: item.name,
               }
           }
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
        const buttons = html.find("button#rollForDefense");
        buttons.each((index, button) => {
            button.addEventListener('click', async () => {
                const actorId = button.dataset.actorId; // Use dataset instead of jQuery .data()
                const defenseMod = button.dataset.defenseMod; // Use dataset instead of jQuery .data()
                const rollDc = button.dataset.rollDc; // Use dataset instead of jQuery .data()
                
                await this.defend(
                    message,
                    actorId,
                    defenseMod,
                    rollDc,
                    socket);
            });
        });
    }
    
    static async defend(message, actorId, defenseMod, rollDC, socket) {
        const flags = message.flags.playerDefense;
        const actor = game.actors.find(x => x.id === actorId);

        if (!game.user.isGM && !actor.isOwner) {
            ui.notifications.warn("Can't roll for someone you dont control!")
            return;
        }
        
        const defenseRoll = new Roll(`1d20 + ${defenseMod}`);
        defenseRoll.propagateFlavor(`DC ${rollDC}`);

        let roll = await defenseRoll.evaluate();
        const diceResult = roll.terms[0].total;
        const totalResult = roll.total;
        const rollHtml = `
              <pg>${await roll.render()}</pg>
            `;
        
        let contentWithDisabledButton = message.content
            .replace(`data-actor-id="${actorId}">`, `data-actor-id="${actorId}" disabled>`);
        
        // Manually call Dice so Nice, as it doesn't trigger the way we edit the message.
        if (game.dice3d) {
            // Immediately disable the button when Dice so Nice starts, to prevent people mashing.
            await socket.executeAsGM("updateMessage", message.id, {...message, content: contentWithDisabledButton});
            await game.dice3d.showForRoll(roll, game.user, true);
        }
        
        let resultHtml = "<hr>";
        
        if (diceResult === 1) {
            resultHtml += "<b><a style='color: darkred'>The enemy critically hit!</a></b>"
        } else if (totalResult < rollDC) {
            resultHtml += "<b><a style='color: red'>The enemy hit!</a></b"
        } else if (diceResult === 20) {
            resultHtml += "<b><a style='color: darkgreen'>The enemy critically missed!</a></b"
        } else {
            resultHtml += "<b><a style='color: green'>The enemy missed!</a></b";
        }

        let rollContent = resultHtml + rollHtml;
        console.error(message.content);
        await socket.executeAsGM("updateMessageContentWithDelay", message.id, `<button id="rollForDefense" data-defense-mod="${defenseMod}" data-roll-dc="${rollDC}" data-actor-id="${actorId}" disabled>Roll! (DC ${rollDC})</button>`, rollContent);
    }
}