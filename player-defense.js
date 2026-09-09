import { Logger } from "./logger.js";

export class PlayerDefense {
    static BASE_DEFENSE = 10;
    static REVERSED_ROLL_OFFSET = 2;
    static CRITICAL_FAILURE = 1;
    static CRITICAL_SUCCESS = 20;

    lastAttack = {
        item: "",
        targets: [],
        attacker: null,
    }

    static isMatchingAttackMessage(message, attack) {
        return message.flavor.includes(attack.item.name) && message.rolls[0] !== undefined;
    }

    static getAttackRollData(rollFormula) {
        const rollModifiers = rollFormula
            .replace(/\d+d\d+/g, '') // Remove dice rolls like "1d20", "2d6"
            .match(/[-+]?\d+/g) // Match standalone numbers (modifiers)
            ?.map(Number) || []; // Convert to numbers and return an empty array if null

        return {
            rollModifiers,
            totalModifier: rollModifiers.reduce((sum, num) => sum + num, 0),
        };
    }

    static getDefenseDC(totalModifier) {
        return PlayerDefense.BASE_DEFENSE + totalModifier + PlayerDefense.REVERSED_ROLL_OFFSET;
    }

    static buildDefenseButton(actorId, defenseMod, rollDC, disabled = false) {
        if (disabled) {
            return `<button style="margin-bottom:10px;width:100%" id="rollForDefense" data-defense-mod="${defenseMod}" data-roll-dc="${rollDC}" data-actor-id="${actorId}" disabled>Roll! (DC ${rollDC})</button>`;
        }

        return `<button style="margin-bottom:10px; width: 100%;" id="rollForDefense" data-defense-mod="${defenseMod}" data-roll-dc="${rollDC}" data-actor-id="${actorId}">Roll! (DC ${rollDC})</button>`;
    }

    static buildDefenseChatContent(targets, rollDC) {
        let htmlContent = "";

        targets.forEach(target => {
            htmlContent += `<div class="target">`;
            htmlContent += `<span>${target.token.actor.name} (+${target.defenseMod}) defends!</span>`;
            htmlContent += `</div>`;
            htmlContent += PlayerDefense.buildDefenseButton(target.token.actor.id, target.defenseMod, rollDC);
            htmlContent += targets.length > 1 ? `<br />` : ``;
        });

        return htmlContent;
    }

    static createDefenseMessage(attacker, item, htmlContent) {
        ChatMessage.create({
            flavor: `<b>${attacker.name}</b> uses <b>${item.name}</b> VS. <b>${item.attack.def.toUpperCase()}</b>!`,
            content: htmlContent,
            flags: {
                playerDefense: {
                    attackName: item.name,
                }
            }
        });
    }

    static getDefenseResultHtml(diceResult, totalResult, rollDC) {
        if (diceResult === PlayerDefense.CRITICAL_FAILURE) {
            return `<b><a style='color: darkred'>The enemy critically hit! (DC ${rollDC})</a></b>`;
        }

        if (totalResult < rollDC) {
            return `<b><a style='color: red'>The enemy hit! (DC ${rollDC})</a></b`;
        }

        if (diceResult === PlayerDefense.CRITICAL_SUCCESS) {
            return `<b><a style='color: darkgreen'>The enemy critically missed! (DC ${rollDC})</a></b>`;
        }

        return `<b><a style='color: green'>The enemy missed! (DC ${rollDC})</a></b>`;
    }
    
    // So, the idea.
    // Whenever you use the attack option with an ability the first hook triggers and sets the Power.
    // The next message which contains the name of the item in its flavor & has attack rolls, probably is the OG attack roll.
    // We then use the data from the attack we registered, as well as the roll we intercepted to put everything together.
    // DC to block is Modifier + 2.
    static OnPowerChatMessage(message, data, options, userId) {
        const attack = game.PlayerDefense.lastAttack;

        // We will not intercept this attack.
        if (attack === null) {
            return true;
        }

        // We will not intercept this attack.
        if (!PlayerDefense.isMatchingAttackMessage(message, attack)) {
            return true;
        }
        
        const rollFormula = message.rolls[0].formula;
        const {rollModifiers, totalModifier} = PlayerDefense.getAttackRollData(rollFormula);
        
        if (rollModifiers.length === 0) {
            Logger.warn("Attack roll contains no modifiers", {
                messageId: message.id,
                rollFormula,
            });
        }

        if (Number.isNaN(totalModifier)) {
            Logger.error("Attack modifier is not a number; aborting", {
                messageId: message.id,
                rollFormula,
                rollModifiers,
                totalModifier,
            });
            return;
        }
        
        // We add the +2 because of dice math.
        const rollDC = PlayerDefense.getDefenseDC(totalModifier);

        Logger.info("Intercepting NPC attack", {
            messageId: message.id,
            attackerId: attack.attacker.id,
            itemId: attack.item.id,
            targetIds: attack.targets.map(target => target.token.actor.id),
            rollFormula,
            totalModifier,
            rollDC,
        });
        
        const {targets, item, attacker} = attack;
        
        // We need to wipe the state as we are done with overriding the message.
        game.PlayerDefense.lastAttack = null;

        const htmlContent = PlayerDefense.buildDefenseChatContent(targets, rollDC);
        PlayerDefense.createDefenseMessage(attacker, item, htmlContent);

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

        Logger.info("Captured NPC attack", {
            attackerId: attacker.id,
            itemId: item.id,
            targetIds: targetsData.map(targetData => targetData.token.actor.id),
            defenseModifiers: targetsData.map(targetData => targetData.defenseMod),
        });
    }

    static async onClickDefendButton(message, html, socket) {
        const buttons = html.find("button#rollForDefense");
        
        if (buttons.length === 0) {
            return;
        }

        // We wait for other modules to change the HTML first, in order to prevent them from overwriting our changes.
        // Specifically, Fox's 4e Styling.
        setTimeout(() => {
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
        }, 50);
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
        
        const resultHtml = PlayerDefense.getDefenseResultHtml(diceResult, totalResult, rollDC);

        Logger.info("Resolved defense roll", {
            messageId: message.id,
            actorId,
            defenseMod,
            rollDC,
            diceResult,
            totalResult,
        });

        const rollContent = resultHtml + rollHtml;
        const disabledButton = PlayerDefense.buildDefenseButton(actorId, defenseMod, rollDC, true);

        await socket.executeAsGM("updateMessageContentWithDelay", message.id, disabledButton, rollContent);
    }
}
