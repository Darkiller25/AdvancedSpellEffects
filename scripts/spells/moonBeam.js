import { aseSocket } from "../aseSockets.js";
import * as utilFunctions from "../utilityFunctions.js";


export class moonBeam {
    static registerHooks() {
        Hooks.on("updateToken", moonBeam._updateToken);
        Hooks.on("updateCombat", moonBeam._updateCombat);
        Hooks.on("deleteTile", moonBeam._deleteTile);
        return;
    }

    static async _deleteTile(tileD) {
        const isGM = utilFunctions.isFirstGM();
        //console.log("Is first GM: ", isGM);
        if (!isGM) return;
        const attachedSounds = (await Tagger.getByTag([`ase-source-${tileD.id}`]));
        if (!attachedSounds.length > 0) {
            return;
        }
        await canvas.scene.deleteEmbeddedDocuments("AmbientSound", attachedSounds.map(s => s.document.id));
    }

    static async _updateToken(tokenDocument, updateData) {
        const isGM = utilFunctions.isFirstGM();
        //console.log("Is first GM: ", isGM);
        if (!isGM) return;
        if ((!updateData.x && !updateData.y)) return;

        const moonbeamTiles = await Tagger.getByTag(`-moonbeam`);
        if (moonbeamTiles.length == 0) return;

        //console.log('Update Token tokenDocument: ', tokenDocument);
        //console.log('Update Token updateData: ', updateData);

        const token = canvas.tokens.get(tokenDocument.id);
        let newTokenPosition = { x: 0, y: 0 };
        newTokenPosition.x = (updateData.x) ? updateData.x : token.data.x;
        newTokenPosition.y = (updateData.y) ? updateData.y : token.data.y;
        newTokenPosition = utilFunctions.getCenter(newTokenPosition);

        let inTiles = token.document.getFlag("advancedspelleffects", "moonbeam.inTiles") ?? [];
        //iterate over every moonbeam tile
        for (let i = 0; i < moonbeamTiles.length; i++) {
            let moonbeamTile = moonbeamTiles[i];
            //console.log('Moonbeam tile found: ', moonbeamTile);
            //check if token has entered the tile
            if (newTokenPosition.x >= moonbeamTile.x && newTokenPosition.x <= moonbeamTile.x + moonbeamTile.width && newTokenPosition.y >= moonbeamTile.y && newTokenPosition.y <= moonbeamTile.y + moonbeamTile.height) {
                //check if tile exists in inTiles which is an array of tiles
                if (inTiles.includes(moonbeamTile.id)) {

                    console.log(`${token.name} has already entered this tile this turn - ${moonbeamTile.id}`);
                    ui.notifications.info(`${token.name} has already entered this tile this turn - ${moonbeamTile.id}`);
                    //do nothing
                }
                else {
                    console.log(`${token.name} is entering the space of a moonbeam tile - ${moonbeamTile.id}`);
                    ui.notifications.info(`${token.name} is entering the space of a moonbeam tile - ${moonbeamTile.id}`);
                    //add the tile to the inTiles array
                    inTiles.push(moonbeamTile.id);
                    let effectOptions = moonbeamTile.document.getFlag("advancedspelleffects", "effectOptions") ?? {};
                    await moonBeam.activateBeam(token, effectOptions);
                }
            }
            // check if token was previously in the space of a moonbeam tile
            else if (inTiles.includes(moonbeamTile.id)) {
                console.log(`${token.name} is leaving the space of a moonbeam tile - ${moonbeamTile.id}`);
                //remove the tile from the inTiles array
                //inTiles.splice(inTiles.indexOf(moonbeamTile.id), 1);
            }
        }
        await token.document.setFlag("advancedspelleffects", "moonbeam.inTiles", inTiles);
    }

    static async _updateCombat(combat) {
        const isGM = utilFunctions.isFirstGM();
        //console.log("Is first GM: ", isGM);
        if (!isGM) return;
        const moonbeamTiles = await Tagger.getByTag(`-moonbeam`);
        if (moonbeamTiles.length == 0) return;

        //console.log("Updating Combat for ASE Moonbeam...");
        //console.log(combat);
        const combatantToken = canvas.tokens.get(combat.current.tokenId);
        const combatantActor = combatantToken.actor;
        const combatantPosition = utilFunctions.getCenter(combatantToken.data);

        let inTiles = [];
        //iterate over every moonbeam tile
        for (let i = 0; i < moonbeamTiles.length; i++) {
            let moonbeamTile = moonbeamTiles[i];
            //console.log('Moonbeam tile found: ', moonbeamTile);
            let effectOptions = moonbeamTile.document.getFlag("advancedspelleffects", "effectOptions") ?? {};
            //check if token has entered the tile
            if (combatantPosition.x >= moonbeamTile.x && combatantPosition.x <= moonbeamTile.x + moonbeamTile.width && combatantPosition.y >= moonbeamTile.y && combatantPosition.y <= moonbeamTile.y + moonbeamTile.height) {
                //check if tile exists in inTiles which is an array of tiles
                console.log(`${combatantToken.name} is starting its turn in the space of a moonbeam tile - ${moonbeamTile.id}`);
                ui.notifications.info(`${combatantToken.name} is starting its turn in the space of a moonbeam tile - ${moonbeamTile.id}`);
                //add the tile to the inTiles array
                await moonBeam.activateBeam(combatantToken, effectOptions);
                inTiles.push(moonbeamTile.id);
            }
        }
        await combatantToken.document.setFlag("advancedspelleffects", "moonbeam.inTiles", inTiles);
    }

    static async handleConcentration(casterActor, casterToken, effectOptions) {
        //console.log("Handling concentration removal for ASE Darknes...");
        let moonbeamTiles = await Tagger.getByTag(`${casterToken.id}-moonbeam`);
        if (moonbeamTiles.length > 0) {
            aseSocket.executeAsGM("deleteTiles", [moonbeamTiles[0].id]);
        }
        await warpgate.revert(casterToken.document, `${casterActor.id}-moonbeam`);
        ui.notifications.info(`Move Moonbeam has been removed from your At-Will spells.`);

        const tokens = canvas.tokens.placeables;
        for await (let token of tokens) {
            if (token.document.getFlag("advancedspelleffects", "moonbeam") != undefined) {
                await token.document.unsetFlag("advancedspelleffects", "moonbeam");
            }
        }

    }

    static async callBeam(data) {
        const casterActor = data.actor;
        const casterToken = canvas.tokens.get(data.tokenId);
        const itemCardId = data.itemCardId;
        const spellItem = data.item;
        const spellLevel = data.itemLevel;
        const aseEffectOptions = spellItem?.getFlag("advancedspelleffects", "effectOptions");
        //console.log(aseEffectOptions);
        const beamIntro = `jb2a.moonbeam.01.intro.${aseEffectOptions.moonbeamColor}`;
        const beamOutro = `jb2a.moonbeam.01.outro.${aseEffectOptions.moonbeamColor}`;
        const beamLoop = `jb2a.moonbeam.01.no_pulse.${aseEffectOptions.moonbeamColor}`;
        const damageColor = aseEffectOptions.moonbeamDmgColor;
        const beamInitialSound = aseEffectOptions.moonbeamSound ?? "";
        const beamLoopSound = aseEffectOptions.moonbeamLoopSound ?? "";
        const beamInitialSoundDelay = Number(aseEffectOptions.moonbeamSoundDelay) ?? 0;
        const beamLoopSoundDelay = Number(aseEffectOptions.moonbeamLoopSoundDelay) ?? 0;
        const beamInitialSoundVolume = aseEffectOptions.moonbeamVolume ?? 1;
        const beamLoopSoundVolume = aseEffectOptions.moonbeamLoopVolume ?? 1;
        const beamLoopSoundEasing = aseEffectOptions.moonbeamLoopEasing ?? true;
        const beamLoopSoundRadius = aseEffectOptions.moonbeamLoopRadius ?? 20;

        const levelScaling = aseEffectOptions.levelScaling ?? true;
        const damageDie = aseEffectOptions.dmgDie ?? 'd10';
        const damageDieCount = levelScaling ? spellLevel : aseEffectOptions.dmgDieCount ?? 2;
        const damageDieBonus = aseEffectOptions.dmgMod ?? 0;
        let damageFormula = `${damageDieCount}${damageDie}+${damageDieBonus}`;

        aseEffectOptions["rollInfo"] = {
            casterTokenId: casterToken.id,
            itemUUID: data.item.uuid,
            itemCardId: data.itemCardId,
            spellSaveDc: casterActor.data.data.attributes.spelldc,
            damageFormula: damageFormula,
        };

        const updates = {
            embedded: {
                Item: {
                    "Move Moonbeam": {
                        "type": "spell",
                        "img": spellItem.img,
                        "data": {
                            "ability": "",
                            "actionType": "other",
                            "activation": { "type": 'action', "cost": 1 },
                            "damage": { "parts": [], "versatile": "" },
                            "level": data.itemLevel,
                            "preparation": { "mode": 'atwill', "prepared": true },
                            "range": { "value": null, "long": null, "units": "" },
                            "school": "evo",
                            "target": { "value": null, "width": null, "units": "", "type": "" },
                            "description": {
                                "value": "Command your Moonbeam to move up to 60 feet in any direction."
                            }
                        },
                        "flags": {
                            "advancedspelleffects": {
                                "enableASE": true,
                                'effectOptions': aseEffectOptions
                            }
                        }
                    }
                }
            }
        }

        let moonbeamLoc = await moonBeam.chooseBeamLocation(beamLoop);

        await warpgate.mutate(casterToken.document, updates, {}, { name: `${casterActor.id}-moonbeam` });
        ui.notifications.info(`Move Moonbeam has been added to your At-Will spells.`);

        const moonbeamTile = await placeBeam(moonbeamLoc, casterToken.id, beamLoop, aseEffectOptions);
        //console.log(moonbeamTile);
        const moonbeamTileId = moonbeamTile.id ?? moonbeamTile._id;
        let beamSeq = new Sequence("Advanced Spell Effects")
            .sound()
            .file(beamInitialSound)
            .delay(beamInitialSoundDelay)
            .volume(beamInitialSoundVolume)
            .playIf(beamInitialSound != "")
            .effect()
            .file(beamIntro)
            .atLocation(moonbeamLoc)
            .endTimePerc(0.50)
            .scale(0.5)
            .waitUntilFinished(-500)
            .thenDo(async () => {
                await aseSocket.executeAsGM("fadeTile", { type: "fadeIn", duration: 500 }, moonbeamTileId);
            })
        await beamSeq.play();
        const soundOptions = {
            volume: beamLoopSoundVolume,
            delay: beamLoopSoundDelay,
            sound: beamLoopSound,
            easing: beamLoopSoundEasing,
            radius: beamLoopSoundRadius,
        };
        if (beamLoopSound != "") {
            const sourceSound = await placeSound(moonbeamLoc, soundOptions, moonbeamTileId);
            console.log('Sound Created...', sourceSound);
        }

        async function placeBeam(templateData, tokenId, beamAnim, effectOptions) {
            let tileWidth;
            let tileHeight;
            let tileX;
            let tileY;

            tileWidth = (templateData.width * canvas.grid.size);
            tileHeight = (templateData.width * canvas.grid.size);

            tileX = templateData.x - (tileWidth / 2);
            tileY = templateData.y - (tileHeight / 2);

            const animPath = Sequencer.Database.getEntry(beamAnim).file;

            let data = [{
                alpha: 0,
                width: tileWidth,
                height: tileHeight,
                img: animPath,
                overhead: true,
                occlusion: {
                    alpha: 0,
                    mode: 0,
                },
                video: {
                    autoplay: true,
                    loop: true,
                    volume: 0,
                },
                x: tileX,
                y: tileY,
                z: 100,
                flags: {
                    tagger: {
                        tags: [`${tokenId}-moonbeam`]
                    },
                    advancedspelleffects: {
                        effectOptions: effectOptions
                    }
                }
            }]
            //console.log("Placing as tile: ", data);
            let createdTiles = await aseSocket.executeAsGM("placeTiles", data);
            //console.log("ASE MOONBEAM: Moonbeam Tile Created: ", createdTiles);
            return createdTiles[0];

        }

        async function placeSound(location, options, sourceId) {
            const soundData = [{
                easing: options.easing,
                path: options.sound,
                radius: options.radius,
                type: "1",
                volume: options.volume,
                x: location.x,
                y: location.y,
                flags: {
                    tagger: {
                        tags: [`ase-source-${sourceId}`]
                    },
                    advancedspelleffects: {
                        sourceId: sourceId
                    }
                }
            }];
            return (await aseSocket.executeAsGM("placeSounds", soundData, options.delay));
        }

    }

    static async activateBeam(token, effectOptions) {

        function addTokenToText(token, saveTotal, saveResult, damageTotal) {

            return `<div class="midi-qol-flex-container">
      <div class="midi-qol-target-npc-GM midi-qol-target-name" id="${token.id}"> <b>${token.name}</b></div>
      <div class="midi-qol-target-npc-Player midi-qol-target-name" id="${token.id}" style="display: none;"> <b>${token.name}</b></div>
      <div>
      <b>${saveResult}</b> with 
      <b>${saveTotal}</b> and takes <b>${damageTotal}</b> damage.
        
      </div>
      <div><img src="${token?.data?.img}" height="30" style="border:0px"></div>
    </div>`;

        }

        function customHalfRollChatCard(roll) {
            //console.log(roll);
            const formula = roll.formula;
            const dieFaces = roll.terms[0].faces;
            const partTotal = roll.terms[0].total;
            const diceResults = roll.terms[0].results;
            let colorMod = "";
            let toolTipHTML = "";

            toolTipHTML += `<section class="tooltip-part"> <div class="dice">`;
            toolTipHTML += `<header class="part-header flexrow">
                        <span class="part-formula">${formula}</span>
                        <span class="part-total">${partTotal}</span>
                    </header>`;
            toolTipHTML += `<ol class="dice-rolls">`;

            for (let dieResult of diceResults) {
                if (dieFaces == dieResult.result) {
                    colorMod = "max";
                }
                else if (dieResult.result == 1) {
                    colorMod = "min";
                }
                else {
                    colorMod = "";
                }
                toolTipHTML += `<li class="roll die d${dieFaces} ${colorMod}">${dieResult.result}</li>`;
            }
            toolTipHTML += `</ol>
                </div>
            </section>`;

            return toolTipHTML;
        }

        const rollInfo = effectOptions.rollInfo;
        //console.log('ROLL INFO: ', rollInfo);
        const spellItem = await fromUuid(rollInfo.itemUUID);
        const casterToken = canvas.tokens.get(rollInfo.casterTokenId);
        const casterActor = casterToken.actor;
        const spellSaveDC = rollInfo.spellSaveDc;

        let itemData = spellItem.data;
        itemData.data.components.concentration = false;

        if (game.modules.get("midi-qol")?.active) {
            const fullDamageRoll = await new Roll(rollInfo.damageFormula).evaluate({ async: true });
            const halfdamageroll = await new Roll(`${Math.floor(fullDamageRoll.total / 2)}`).evaluate({ async: true });
            const saveRoll = await new Roll(`1d20+@mod`, { mod: token.actor.data.data.abilities.con.save }).evaluate({ async: true });
            console.log('Rolls: ');
            console.log(fullDamageRoll);
            //console.log(halfdamageroll);
            console.log(saveRoll);
            if (game.modules.get("dice-so-nice")?.active) {
                game.dice3d?.showForRoll(damageRoll);
                game.dice3d?.showForRoll(saveRoll);
            }
            const saveTotal = saveRoll.total;
            const passedSave = saveTotal >= spellSaveDC;
            let saveResult;
            let damageTotal;
            let midiData;
            if (passedSave) {
                saveResult = "succeeds";
                damageTotal = halfdamageroll.total;
                midiData = await new MidiQOL.DamageOnlyWorkflow(casterActor, casterToken.document, halfdamageroll.total, "radiant", [token],
                    halfdamageroll, {
                    flavor: `Moonbeam - Damage Roll (${rollInfo.damageFormula} Radiant)`,
                    itemCardId: "new",
                    itemData: spellItem.data
                });
            }
            else {
                saveResult = "fails";
                damageTotal = fullDamageRoll.total;
                midiData = await new MidiQOL.DamageOnlyWorkflow(casterActor, casterToken.document, fullDamageRoll.total, "radiant", [token],
                    fullDamageRoll, {
                    flavor: `Moonbeam - Damage Roll (${rollInfo.damageFormula} Radiant)`,
                    itemCardId: "new",
                    itemData: spellItem.data
                });
            }
            const chatMessage = await game.messages.get(midiData.itemCardId);
            let chatMessageContent = await duplicate(chatMessage.data.content);
            let newChatmessageContent = $(chatMessageContent);

            newChatmessageContent.find(".midi-qol-hits-display").empty();
            newChatmessageContent.find(".midi-qol-hits-display").append(
                $(addTokenToText(token, saveTotal, saveResult, damageTotal))
            );
            if (passedSave) {
                newChatmessageContent.find(".midi-qol-other-roll .dice-tooltip").empty();
                newChatmessageContent.find(".midi-qol-other-roll .dice-tooltip").append(
                    $(customHalfRollChatCard(fullDamageRoll))
                );
                newChatmessageContent.find(".midi-qol-other-roll .dice-formula").empty();
                newChatmessageContent.find(".midi-qol-other-roll .dice-formula").append(fullDamageRoll.formula);

                newChatmessageContent.find(".midi-qol-other-roll .dice-total").empty();
                newChatmessageContent.find(".midi-qol-other-roll .dice-total").append(fullDamageRoll.total);
            }
            await chatMessage.update({ content: newChatmessageContent.prop('outerHTML') });
            await ui.chat.scrollBottom();
        }


        new Sequence("Advanced Spell Effects")
            .sound()
            .file(effectOptions.moonbeamDmgSound)
            .delay(Number(effectOptions.moonbeamDmgDelay) ?? 0)
            .volume(effectOptions.moonbeamDmgVolume ?? 1)
            .playIf(effectOptions.moonbeamDmgSound && effectOptions.moonbeamDmgSound != "")
            .effect()
            .file(`jb2a.impact.004.${effectOptions.moonbeamDmgColor}`)
            .attachTo(token)
            .JB2A()
            .randomRotation()
            .scaleIn(0.5, 200)
            .animateProperty("sprite", "rotation", { duration: 1000, from: 0, to: 45 })
            .randomOffset(0.5)
            .repeats(4, 100, 250)
            .play()
    }

    static async moveBeam(data) {
        const casterActor = data.actor;
        const casterToken = canvas.tokens.get(data.tokenId);
        const spellItem = data.item;
        const aseEffectOptions = spellItem?.getFlag("advancedspelleffects", "effectOptions");
        //console.log(aseEffectOptions);
        const beamLoop = `jb2a.moonbeam.01.loop.${aseEffectOptions.moonbeamColor}`;

        let moonbeamTiles = await Tagger.getByTag(`${casterToken.id}-moonbeam`);
        if (moonbeamTiles?.length == 0) {
            console.log("Moonbeam not found");
            ui.notifications.error(`Moonbeam not found.`);
            return;
        }
        let moonbeamTile = moonbeamTiles[0];

        let moonbeamLoc = await moonBeam.chooseBeamLocation(beamLoop);
        //console.log(moonbeamLoc);
        //console.log(moonbeamTile);
        //console.log("ASE EFFECT OPTIONS: ", aseEffectOptions);
        await aseSocket.executeAsGM("moveTile", moonbeamLoc, moonbeamTile.id);
        if (aseEffectOptions.moonbeamLoopSound && aseEffectOptions.moonbeamLoopSound != "") {
            await aseSocket.executeAsGM("moveSound", moonbeamTile.id, moonbeamLoc);
        }

    }

    static async chooseBeamLocation(beamAnim) {
        const displayCrosshairs = async (crosshairs) => {
            new Sequence("Advanced Spell Effects")
                .effect()
                .file(beamAnim)
                .attachTo(crosshairs)
                .persist()
                .scale(0.5)
                .opacity(0.5)
                .play()

        }
        let crosshairsConfig = {
            size: 2,
            label: 'Moonbeam',
            tag: 'moonbeam-crosshairs',
            drawIcon: false,
            drawOutline: false,
            interval: 1
        }
        let placedLoc = await warpgate.crosshairs.show(crosshairsConfig, { show: displayCrosshairs });
        return placedLoc;
    }

    static async getRequiredSettings(currFlags) {
        if (!currFlags) currFlags = {};
        const beamColorOptions = utilFunctions.getDBOptions('jb2a.moonbeam.01.no_pulse');
        const beamDamageOptions = utilFunctions.getDBOptions('jb2a.impact.004');

        let spellOptions = [];
        let animOptions = [];
        let soundOptions = [];

        const dieOptions = {
            'd4': 'd4',
            'd6': 'd6',
            'd8': 'd8',
            'd10': 'd10',
            'd12': 'd12',
            'd20': 'd20',
        };

        spellOptions.push({
            label: 'Scale with spellLevel: ',
            type: 'checkbox',
            name: 'flags.advancedspelleffects.effectOptions.levelScaling',
            flagName: 'levelScaling',
            flagValue: currFlags.levelScaling ?? true,
        });

        spellOptions.push({
            label: 'Damage Die Count: ',
            type: 'numberInput',
            name: 'flags.advancedspelleffects.effectOptions.dmgDieCount',
            flagName: 'dmgDieCount',
            flagValue: currFlags.dmgDieCount ?? 1,
        });

        spellOptions.push({
            label: 'Damage Die: ',
            type: 'dropdown',
            options: dieOptions,
            name: 'flags.advancedspelleffects.effectOptions.dmgDie',
            flagName: 'dmgDie',
            flagValue: currFlags.dmgDie ?? 'd10',
        });

        spellOptions.push({
            label: 'Damage Modifier: ',
            type: 'numberInput',
            name: 'flags.advancedspelleffects.effectOptions.dmgMod',
            flagName: 'dmgMod',
            flagValue: currFlags.dmgMod ?? 0,
        });

        animOptions.push({
            label: 'Beam Color: ',
            type: 'dropdown',
            options: beamColorOptions,
            name: 'flags.advancedspelleffects.effectOptions.moonbeamColor',
            flagName: 'moonbeamColor',
            flagValue: currFlags.moonbeamColor,
        });
        soundOptions.push({
            label: 'Moonbeam Initial Sound: ',
            type: 'fileInput',
            name: 'flags.advancedspelleffects.effectOptions.moonbeamSound',
            flagName: 'moonbeamSound',
            flagValue: currFlags.moonbeamSound ?? '',
        });
        soundOptions.push({
            label: 'Moonbeam Initial Sound Delay: ',
            type: 'numberInput',
            name: 'flags.advancedspelleffects.effectOptions.moonbeamSoundDelay',
            flagName: 'moonbeamSoundDelay',
            flagValue: currFlags.moonbeamSoundDelay ?? 0,
        });
        soundOptions.push({
            label: 'Moonbeam Initial Volume: ',
            type: 'rangeInput',
            name: 'flags.advancedspelleffects.effectOptions.moonbeamVolume',
            flagName: 'moonbeamVolume',
            flagValue: currFlags.moonbeamVolume ?? 1,
        });

        soundOptions.push({
            label: 'Moonbeam Loop Sound: ',
            type: 'fileInput',
            name: 'flags.advancedspelleffects.effectOptions.moonbeamLoopSound',
            flagName: 'moonbeamLoopSound',
            flagValue: currFlags.moonbeamLoopSound ?? '',
        });
        soundOptions.push({
            label: 'Moonbeam Loop Sound Delay: ',
            type: 'numberInput',
            name: 'flags.advancedspelleffects.effectOptions.moonbeamLoopSoundDelay',
            flagName: 'moonbeamLoopSoundDelay',
            flagValue: currFlags.moonbeamLoopSoundDelay ?? 0,
        });
        soundOptions.push({
            label: 'Moonbeam Loop Volume: ',
            type: 'rangeInput',
            name: 'flags.advancedspelleffects.effectOptions.moonbeamLoopVolume',
            flagName: 'moonbeamLoopVolume',
            flagValue: currFlags.moonbeamLoopVolume ?? 1,
        });
        soundOptions.push({
            label: 'Moonbeam Loop Volume Easing: ',
            type: 'checkbox',
            name: 'flags.advancedspelleffects.effectOptions.moonbeamLoopEasing',
            flagName: 'moonbeamLoopEasing',
            flagValue: currFlags.moonbeamLoopEasing ?? true,
        });
        soundOptions.push({
            label: 'Moonbeam Loop Volume Radius: ',
            type: 'numberInput',
            name: 'flags.advancedspelleffects.effectOptions.moonbeamLoopRadius',
            flagName: 'moonbeamLoopRadius',
            flagValue: currFlags.moonbeamLoopRadius ?? 20,
        });
        animOptions.push({
            label: 'Damage Effect Color: ',
            type: 'dropdown',
            options: beamDamageOptions,
            name: 'flags.advancedspelleffects.effectOptions.moonbeamDmgColor',
            flagName: 'moonbeamDmgColor',
            flagValue: currFlags.moonbeamDmgColor,
        });
        soundOptions.push({
            label: 'Damage Effect Sound: ',
            type: 'fileInput',
            name: 'flags.advancedspelleffects.effectOptions.moonbeamDmgSound',
            flagName: 'moonbeamDmgSound',
            flagValue: currFlags.moonbeamDmgSound ?? '',
        });
        soundOptions.push({
            label: 'Damage Effect Sound Delay: ',
            type: 'numberInput',
            name: 'flags.advancedspelleffects.effectOptions.moonbeamDmgSoundDelay',
            flagName: 'moonbeamDmgSoundDelay',
            flagValue: currFlags.moonbeamDmgSoundDelay ?? 0,
        });
        soundOptions.push({
            label: 'Damage Effect Volume: ',
            type: 'rangeInput',
            name: 'flags.advancedspelleffects.effectOptions.moonbeamDmgVolume',
            flagName: 'moonbeamDmgVolume',
            flagValue: currFlags.moonbeamDmgVolume ?? 1,
        });
        return {
            spellOptions: spellOptions,
            animOptions: animOptions,
            soundOptions: soundOptions
        }

    }
}