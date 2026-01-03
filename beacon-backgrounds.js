import {BACKGROUNDS, MODULE_NAME} from "./globals.js";

export class BeaconBackgrounds {
     static async replaceSkillsWithBackgrounds(sheet, html, data) {
        if (data.actor.type !== "Player Character") {
            return;
        }

        // Get the current flags.
         const narrativeFlags = data.actor.getFlag(MODULE_NAME, BACKGROUNDS);

         if (narrativeFlags === undefined || narrativeFlags === null) {
            ui.notifications.error("Couldn't find flags for sheet.")
            return;
        }

        // Sort them alphabatically - TODO: Sort from value.
        narrativeFlags.backgrounds = narrativeFlags.backgrounds.sort((x, y) => x.name.localeCompare(y.name));

        // Get the section.
         const skillsSection = html.find("section.section.skills");

         // Parse the html & handlebars.
         const iconActions = await renderTemplate("modules/banter-4e-modifications/templates/background-skills/background-skills.html", narrativeFlags);

         // Delete the normal skill rows and replace with our own.
        skillsSection.empty();
        skillsSection.append(iconActions);

        // Kill unused button.
        html.find(".custom-roll-descriptions").remove();

         skillsSection.find(".title-edit").on("click", async function(e) {
             e.preventDefault();
             await game.BeaconBackgrounds.showTitleDialog(data.actor);
         });

        skillsSection.find(".background-add").on("click", async function(e) {
            e.preventDefault();
            await game.BeaconBackgrounds.showBackgroundDialog(data.actor);
        });

        skillsSection.find(".background-remove").on("click", function(e) {
            e.preventDefault();
            game.BeaconBackgrounds.removeBackground(e, data);
        });

        skillsSection.find(".narrative-resources-effort").on("click contextmenu", function(e) {
            e.preventDefault();

            const valueToEdit = e.target.attributes.getNamedItem("data-resource").value;
            const flags = data.actor.getFlag(MODULE_NAME, BACKGROUNDS);

            if (e.type === "click") {
                if (valueToEdit === "value") {
                    // Can't have higher than maximum.
                    if (flags.effort.value === flags.effort.max) {
                        return;
                    }

                    flags.effort.value = flags.effort.value + 1;
                } else {
                    flags.effort.max = flags.effort.max + 1;
                }
            } else if (e.type === "contextmenu") {
                if (valueToEdit === "value") {
                    // Can't have lower than 0.
                    if (flags.effort.value === 0) {
                        return;
                    }
                    flags.effort.value = flags.effort.value - 1;
                } else {

                    // Can't have lower than 0.
                    if (flags.effort.max === 0) {
                        return;
                    }
                    flags.effort.max = flags.effort.max - 1;
                }
            }

            data.actor.setFlag(MODULE_NAME, BACKGROUNDS, flags);

            // @ts-ignore;
            sheet._onSubmit(e);
        });

        skillsSection.find(".narrative-resources-strain").on("click contextmenu", function(e) {
            e.preventDefault();

            const valueToEdit = e.target.attributes.getNamedItem("data-resource").value;
            const flags = data.actor.getFlag(MODULE_NAME, BACKGROUNDS);

            if (e.type === "click") {
                if (valueToEdit === "value") {
                    // Can't have higher than maximum.
                    if (flags.strain.value === flags.strain.max) {
                        return;
                    }

                    flags.strain.value = flags.strain.value + 1;
                } else {
                    flags.strain.max = flags.strain.max + 1;
                }
            } else if (e.type === "contextmenu") {
                if (valueToEdit === "value") {
                    // Can't have lower than 0.
                    if (flags.strain.value === 0) {
                        return;
                    }
                    flags.strain.value = flags.strain.value - 1;
                } else {

                    // Can't have lower than 0.
                    if (flags.strain.max === 0) {
                        return;
                    }
                    flags.strain.max = flags.strain.max - 1;
                }
            }

            data.actor.setFlag(MODULE_NAME, BACKGROUNDS, flags);

            // @ts-ignore;
            sheet._onSubmit(e);
        });
    }
    
    static async setInitialFlagsOnPlayerCharacters(){
         let toSetupCharacters = [];
         
         if (false) {
             // Development setting. Resets all flags.
             ui.notifications.error("Flag Reset is enabled!");
             toSetupCharacters = game.actors.filter(actor => actor.type === "Player Character");
         }
         else {
             toSetupCharacters = game.actors.filter(actor => actor.type === "Player Character" && actor.getFlag(MODULE_NAME, BACKGROUNDS) === undefined);
         }
         

        // Initial Setup.
        console.log("Executing initial setup");
        toSetupCharacters.forEach(character => {
            const defaultValues = {
                version: 1,
                backgrounds: [],
                title: "No Title",
            }

            character.setFlag(MODULE_NAME, BACKGROUNDS, defaultValues);
        });
    }
    
    static async overwriteAbilityDialog(dialog, html, data) {
         const titles = ["Strength Check", "Constitution Check", "Dexterity Check", "Intelligence Check", "Wisdom Check", "Charisma Check"];
         if (!titles.includes(dialog.title)) {
            return;
        }

        const formula = html.find("[name='formula']");
        const d20Amount = html.find("#d20");
        const situationalBonus  = html.find("[name='bonus']");
        const flavorText = html.find("[name='flavor']");

        const characterName = flavorText.attr('placeholder').split(' uses')[0];
        const abilityName = flavorText.attr('placeholder').split(' uses')[1].split('.')[0].replace(" ", "");

        let actor;

        // First we check the token, then the game character and then all characters.
        if (_token?.actor?.name === characterName) {
            actor = _token.actor;
        } else if (game.user.character?.name === characterName) {
            actor = game.user.character;
        } else if (game.actors.find(x => x.name === characterName) !== undefined) {
            actor = game.actors.find(x => x.name === characterName);
        } else {
            return;
        }
        
        if (actor.type !== 'Player Character') {
            return;
        }
        
        let abilityMod = 0;
        
        switch (abilityName) {
            case "Strength":
                abilityMod = actor.system.abilities.str.mod;
                break;
            case "Constitution":
                abilityMod = actor.system.abilities.con.mod;
                break;
            case "Dexterity":
                abilityMod = actor.system.abilities.dex.mod;
                break;
            case "Intelligence":
                abilityMod = actor.system.abilities.int.mod;
                break;
            case "Wisdom":
                abilityMod = actor.system.abilities.wis.mod;
                break;
            case "Charisma":
                abilityMod = actor.system.abilities.cha.mod;
                break;
        }

        const flags = actor.getFlag(MODULE_NAME, BACKGROUNDS);

        situationalBonus.parent().hide();
        d20Amount.parent().hide();
        flavorText.parent().hide();
        formula.parent().hide();

        const form = situationalBonus.parent().parent();
        form.append(await renderTemplate("modules/banter-4e-modifications/templates/background-skills/ability-roll-dialog.html", flags));

        const backgroundInput = form.find('#background');
        let selectedBackgroundId;
        
        backgroundInput.on("change", function(e) {
            e.preventDefault();
            selectedBackgroundId = Number($(e.currentTarget).val());
        });

        const titleInput = form.find('#titleSelect');
        let hasTitle;

        titleInput.on("change", function(e) {
            e.preventDefault();
            hasTitle = $(e.currentTarget).val();
        });

        console.log(actor);
        
        const CreateBonusFormula = () => {
            const backgroundMod = flags.backgrounds.find(x => x.id === selectedBackgroundId) != undefined ? 2 : 0;
            const finalFormula = `${backgroundMod} + ${actor.system.lvhalf}`;
            return finalFormula;
        };

        const CreateFlavorText = () => {
            const backgroundName = flags.backgrounds.find(x => x.id === selectedBackgroundId)?.name;
            const backgroundFlavorText = backgroundName !== undefined ? ` using their experience as a ${backgroundName}` : '';
            const titleFlavorText = hasTitle ? ` furthering their title as ${hasTitle}` : "";
            let flavorString = "";
            flavorString = `${actor.name} rolls ${abilityName}` + backgroundFlavorText + titleFlavorText;

            return flavorString + '!';
        };

        html.find(".dialog-button").off("click").on("click", async function(event) {
            event.preventDefault(); // Prevents any default action
            const formula = `1d20 + ${abilityMod} + ${CreateBonusFormula()}`;
            const roll = await new Roll(formula).evaluate({ async: true });
            roll.toMessage({
                flavor: CreateFlavorText(),
                speaker: {
                    alias: actor.name,
                    actor: actor,
                },
            })
            dialog.close();
            // Add your custom logic here
        });
    }

     async showBackgroundDialog(character) {
        return new Dialog(
            {
                title: "Add a background",
                content: await renderTemplate("modules/banter-4e-modifications/templates/background-skills/background-dialog.html"),
                buttons: {
                    create: {
                        icon: "<i class='fas fa-check'></i>",
                        label: "Create",
                        callback: (html) => {
                            const flags = character.getFlag(MODULE_NAME, BACKGROUNDS);
                            const name = html.find("[name=Name]").val();

                            // Guard: Double check if actions were chosen.
                            if (name === undefined || name === ""){
                                throw "Name can't be empty.";
                            }

                            const ids = flags.backgrounds.map(x => x.id);
                            let lowestId;
                            if (ids.length === 0) {
                                lowestId = 1;
                            } else {
                                lowestId = Math.max(...ids) + 1;
                            }

                            const background = {
                                name: name,
                                value: 0,
                                id: lowestId,
                            };

                            flags.backgrounds.push(background);

                            character.setFlag(MODULE_NAME, BACKGROUNDS, flags);
                        },
                    },
                    cancel: {
                        icon: "<i class='fas fa-times'></i>",
                        label: "Cancel",
                    },
                },
                default: "create",
                render: (html) => {
                },
            },
            {
                id: "background-dialog",
            },
        ).render(true);
    }

    async showTitleDialog(character) {
        const flags = character.getFlag(MODULE_NAME, BACKGROUNDS);
        
        return new Dialog(
            {
                title: "Edit Title",
                content: `
                    <form>
                      <div style="width: 100%; max-width: 800px;">
                        <label for="titleInput" style="display: inline-block; width: 60px;">Title:</label>
                        <input type="text" id="titleInput" style="width: calc(100% - 70px);" placeholder="${flags.title}">
                      </div>
                    </form>
                `,
                buttons: {
                    create: {
                        icon: "<i class='fas fa-check'></i>",
                        label: "Create",
                        callback: (html) => {
                            const flags = character.getFlag(MODULE_NAME, BACKGROUNDS);
                            const title = html.find("#titleInput").val();
                            
                            if (title === undefined || title === "") {
                                ui.notifications.error("Title can't be empty.");
                                return;
                            }
                            
                            flags.title = title;
                            character.setFlag(MODULE_NAME, BACKGROUNDS, flags);
                        },
                    },
                    cancel: {
                        icon: "<i class='fas fa-times'></i>",
                        label: "Cancel",
                    },
                },
                default: "create",
                render: (html) => {
                },
            },
            {
                id: "background-dialog",
            },
        ).render(true);
    }

    removeBackground(e, data) {
        const backgroundId = Number(e.currentTarget.parentElement.attributes.getNamedItem("data-background").value);

        if (backgroundId === null || Number.isNaN(backgroundId)) {
            return;
        }

        const flags = data.actor.getFlag(MODULE_NAME, BACKGROUNDS);
        const indexToRemove = flags.backgrounds.findIndex(x => x.id === backgroundId);
        flags.backgrounds.splice(indexToRemove, 1);

        data.actor.setFlag(MODULE_NAME, BACKGROUNDS, flags);

        // Triggered when clicking on the add burden button.
        // Open a model here to configure burden.
        console.log("Removed Background?");
    }
}