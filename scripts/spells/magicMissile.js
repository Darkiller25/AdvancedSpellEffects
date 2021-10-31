// Magic Missile spell
import {MissileDialog} from "../apps/missile-dialog.js";

export class magicMissile {
    static async registerHooks() {
        return;
    }
    static async selectTargets(midiData){
        const casterActor = midiData.actor;
        const casterToken = canvas.tokens.get(midiData.tokenId);
        const numMissiles = midiData.itemLevel + 2;
        const itemCardId = midiData.itemCardId;
        const spellItem = midiData.item;
        const  aseEffectOptions = spellItem?.getFlag("advancedspelleffects", "effectOptions");
        aseEffectOptions['targetMarkerType'] = 'jb2a.moonbeam.01.loop';
        aseEffectOptions['missileType'] = 'dart';
        aseEffectOptions['missileAnim'] = 'jb2a.magic_missile';
        aseEffectOptions['baseScale'] = 0.05;
        aseEffectOptions['dmgDie'] = 'd4';
        aseEffectOptions['dmgDieCount'] = 1;
        aseEffectOptions['dmgType'] = 'force';
        aseEffectOptions['dmgMod'] = 1;
        new MissileDialog({casterId: casterToken.id, numMissiles: numMissiles, itemCardId: itemCardId, effectOptions: aseEffectOptions}).render(true);
    }
}