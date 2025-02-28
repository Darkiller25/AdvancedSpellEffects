import * as utilFunctions from "../utilityFunctions.js";
// Importing spells
import { animateDead } from "../spells/animateDead.js";
import { darkness } from "../spells/darkness.js";
import { detectMagic } from "../spells/detectMagic.js";
import { callLightning } from "../spells/callLightning.js";
import { fogCloud } from "../spells/fogCloud.js";
import { spiritualWeapon } from "../spells/spiritualWeapon.js";
import { steelWindStrike } from "../spells/steelWindStrike.js";
import { thunderStep } from "../spells/thunderStep.js";
import { summonCreature } from "../spells/summonCreature.js";
import { witchBolt } from "../spells/witchBolt.js";
import { magicMissile } from "../spells/magicMissile.js";
import { scorchingRay } from "../spells/scorchingRay.js";
import { eldritchBlast } from "../spells/eldritchBlast.js";
import { vampiricTouch } from "../spells/vampiricTouch.js";
import { moonBeam } from "../spells/moonBeam.js";

export class ASESettings extends FormApplication {
    constructor() {
        super(...arguments);
        this.flags = this.object.data.flags.advancedspelleffects;
        if (this.flags) {
            if (!this.flags.effectOptions) {
                this.flags.effectOptions = {};
            }
        }
        this.spellList = {
            "Animate Dead": animateDead,
            "Call Lightning": callLightning,
            "Detect Magic": detectMagic,
            "Fog Cloud": fogCloud,
            "Darkness": darkness,
            "Magic Missile": magicMissile,
            "Spiritual Weapon": spiritualWeapon,
            "Steel Wind Strike": steelWindStrike,
            "Thunder Step": thunderStep,
            "Witch Bolt": witchBolt,
            "Scorching Ray": scorchingRay,
            "Eldritch Blast": eldritchBlast,
            "Vampiric Touch": vampiricTouch,
            "Moonbeam": moonBeam
        }
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            template: './modules/advancedspelleffects/scripts/templates/ase-settings-new.html',
            id: 'ase-item-settings',
            title: "Advanced Spell Effects Settings",
            resizable: true,
            width: "auto",
            height: "auto",
            closeOnSubmit: true
        });
    }

    async setItemDetails(item) {
        let data = {
            "activation": { "type": "action", "cost": 1, "condition": "" },
            "duration": { "value": null, "units": "" },
            "target": { "value": null, "width": null, "units": "", "type": "" },
            "range": { "value": null, "long": null, "units": "" },
            "uses": { "value": 0, "max": 0, "per": null },
            "consume": { "type": "", "target": null, "amount": null },
            "ability": null,
            "actionType": "other",
            "attackBonus": 0,
            "critical": null,
            "damage": { "parts": [], "versatile": "" },
            "formula": "",
            "save": { "ability": "", "dc": null, "scaling": "spell" },
            "materials": { "value": "", "consumed": false, "cost": 0, "supply": 0 },
            "scaling": { "mode": "none", "formula": "" }
        };
        switch (item.name) {
            case "Detect Magic":
                data.duration = { "value": 10, "units": "minute" };
                break;
            case "Darkness":
                data.level = 2;
                data.duration = { "value": 10, "units": "minute" };
                break;
            case "Fog Cloud":
                data.level = 1;
                data.duration = { "value": 10, "units": "minute" };
                break;
            case 'Steel Wind Strike':
                data.level = 5;
                break;
            case 'Thunder Step':
                data.level = 3;
                break;
            case 'Spiritual Weapon':
                data.level = 2;
                break;
            case 'Call Lightning':
                data.level = 3;
                data.duration = { "value": 10, "units": "minute" };
                break;
            case 'Witch Bolt':
                data.level = 1;
                data.actionType = "rsak"
                data.damage.parts.push(["1d12", "lightning"])
                data.duration = { "value": 10, "units": "minute" };
                data.scaling.formula = "1d12";
                data.scaling.mode = "level";
                break;
            case 'Vampiric Touch':
                data.level = 3;
                data.actionType = "msak"
                data.damage.parts.push(["3d6", "necrotic"])
                data.duration = { "value": 1, "units": "minute" };
                data.scaling.formula = "1d6";
                data.scaling.mode = "level";
        }
        let updates = { data };
        await item.update(updates);
    }

    async setEffectData(item) {
        //console.log(item);
        let flags = this.object.data.flags;
        let itemName = item.name;
        let returnOBJ = {};
        //console.log("Detected item name: ", itemName);
        await this.setItemDetails(item);
        let requiredSettings;
        console.log("Item name: ", itemName);
        if (itemName.includes(game.i18n.localize("ASE.Summon"))) {
            requiredSettings = await summonCreature.getRequiredSettings(flags.advancedspelleffects.effectOptions);
            //console.log(requiredSettings);
            returnOBJ.requiredSettings = requiredSettings;

            let summonActorsList = game.folders?.getName("ASE-Summons")?.contents ?? [];
            let summonOptions = {};
            let currentSummonTypes = {};

            summonActorsList.forEach((actor) => {
                summonOptions[actor.name] = actor.id;
            });

            currentSummonTypes = flags.advancedspelleffects?.effectOptions?.summons ?? [{ name: "", actor: "", qty: 1 }];
            returnOBJ["itemId"] = item.id;
            if (item.parent) {
                returnOBJ["summonerId"] = item.parent.id;
            }
            else {
                returnOBJ["summonerId"] = "";
            }

            returnOBJ.summons = currentSummonTypes;
            returnOBJ.summonOptions = summonOptions;
            //console.log(returnOBJ);
        }
        else {
            requiredSettings = await this.spellList[game.i18n.localize(itemName)].getRequiredSettings(flags.advancedspelleffects.effectOptions);
            //console.log(requiredSettings);
            returnOBJ.requiredSettings = requiredSettings;
        }
        //console.log(returnOBJ);
        return returnOBJ;
    }

    async getData() {
        let flags = this.object.data.flags;
        let item = this.object;
        let itemName = item.name;
        let content = "";
        let effectData;
        if (flags.advancedspelleffects?.enableASE) {
            effectData = await this.setEffectData(item);
        }
        return {
            flags: this.object.data.flags,
            itemName: itemName,
            effectData: effectData,
            content: content
        };

    }
    activateListeners(html) {
        const body = $("#ase-item-settings");
        const animSettings = $("#ase-anim-settings");
        const animSettingsButton = $(".ase-anim-settingsButton");
        const soundSettings = $("#ase-sound-settings");
        const soundSettingsButton = $(".ase-sound-settingsButton");
        const spellSettings = $("#ase-spell-settings");
        const spellSettingsButton = $(".ase-spell-settingsButton");

        let currentTab = spellSettingsButton;
        let currentBody = spellSettings;


        super.activateListeners(html);
        $(".nav-tab").click(function () {
            currentBody.toggleClass("hide");
            currentTab.toggleClass("selected");
            if ($(this).hasClass("ase-anim-settingsButton")) {
                //console.log("anim");
                animSettings.toggleClass("hide");
                currentBody = animSettings;
                currentTab = animSettingsButton;
            } else if ($(this).hasClass("ase-sound-settingsButton")) {
                //console.log("sound");
                soundSettings.toggleClass("hide");
                currentBody = soundSettings;
                currentTab = soundSettingsButton;
            } else if ($(this).hasClass("ase-spell-settingsButton")) {
                //console.log("spell");
                spellSettings.toggleClass("hide");
                currentBody = spellSettings;
                currentTab = spellSettingsButton;
            }
            currentTab.toggleClass("selected");
            body.height("auto");
            body.width("auto");
        });

        html.find('.ase-enable-checkbox input[type="checkbox"]').click(evt => {
            this.submit({ preventClose: true }).then(() => this.render());
        });
        html.find('.ase-enable-checkbox select').change(evt => {
            //this.submit({ preventClose: true }).then(() => this.render());
        });
        //console.log(this);
        html.find('.addType').click(this._addSummonType.bind(this));
        html.find('.removeType').click(this._removeSummonType.bind(this));
    }

    async _removeSummonType(e) {
        //console.log(e);
        let summonsTable = document.getElementById("summonsTable").getElementsByTagName('tbody')[0];
        let row = summonsTable.rows[summonsTable.rows.length - 1];
        let cells = row.cells;
        //console.log(row, cells);
        let summonTypeIndex = cells[1].children[0].name.match(/\d+/)[0];
        //console.log(summonTypeIndex);
        let itemId = document.getElementById("hdnItemId").value;
        let actorId = document.getElementById("hdnSummonerId").value;
        let item;
        if (actorId != "") {
            let summoner = game.actors.get(actorId);
            item = summoner.items.get(itemId);
            //console.log(summoner, item);
        } else {
            item = game.items.get(itemId);
            //console.log(item);
        }
        summonsTable.rows[summonsTable.rows.length - 1].remove();
        await item.unsetFlag("advancedspelleffects", `effectOptions.summons.${summonTypeIndex}`);
        if (this.flags) {
            delete this.flags.effectOptions.summons[summonTypeIndex];
        }

        //console.log(this.flags);
        this.submit({ preventClose: true }).then(() => this.render());
    }

    async _addSummonType(e) {
        //console.log(e);
        let summonsTable = document.getElementById("summonsTable").getElementsByTagName('tbody')[0];
        //console.log(summonsTable);
        //console.log(this);
        let newSummonRow = summonsTable.insertRow(-1);
        let newLabel1 = newSummonRow.insertCell(0);
        let newTextInput = newSummonRow.insertCell(1);
        let newLabel2 = newSummonRow.insertCell(2);
        let newSelect = newSummonRow.insertCell(3);
        let newLabel3 = newSummonRow.insertCell(4);
        let newQtyInput = newSummonRow.insertCell(5);
        newLabel1.innerHTML = `<label><b>Summon Type Name:</b></label>`;
        newTextInput.innerHTML = `<input type="text"
        name="flags.advancedspelleffects.effectOptions.summons.${summonsTable.rows.length - 1}.name"
        value="">`;
        newLabel2.innerHTML = `<label><b>Associated Actor:</b></label>`;
        newSelect.innerHTML = ` <select name="flags.advancedspelleffects.effectOptions.summons.${summonsTable.rows.length - 1}.actor">
        {{#each ../effectData.summonOptions as |id name|}}
        <option value="">{{name}}</option>
        {{/each}}
    </select>`;
        newLabel3.innerHTML = `<label><b>Summon Quantity:</b></label>`;
        newQtyInput.innerHTML = `<input style='width: 3em;' type="text"
    name="flags.advancedspelleffects.effectOptions.summons.${summonsTable.rows.length - 1}.qty"
    value=1>`;
        this.submit({ preventClose: true }).then(() => this.render());
    }

    async _updateObject(event, formData) {
        //console.log(formData);
        formData = expandObject(formData);
        //console.log(formData);
        if (!formData.changes) formData.changes = [];
        //console.log(formData.changes);
        formData.changes = Object.values(formData.changes);
        for (let c of formData.changes) {
            //@ts-ignore
            if (Number.isNumeric(c.value))
                c.value = parseFloat(c.value);
        }
        return this.object.update(formData);
    }
}
export default ASESettings;

Handlebars.registerHelper('ifCondASE', function (v1, operator, v2, options) {
    switch (operator) {
        case '==':
            return (v1 == v2) ? options.fn(this) : options.inverse(this);
        case '===':
            return (v1 === v2) ? options.fn(this) : options.inverse(this);
        case '!=':
            return (v1 != v2) ? options.fn(this) : options.inverse(this);
        case '!==':
            return (v1 !== v2) ? options.fn(this) : options.inverse(this);
        case '<':
            return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case '<=':
            return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case '>':
            return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case '>=':
            return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        case '&&':
            return (v1 && v2) ? options.fn(this) : options.inverse(this);
        case '||':
            return (v1 || v2) ? options.fn(this) : options.inverse(this);
        case 'includes':
            return (v1.includes(v2)) ? options.fn(this) : options.inverse(this);
        default:
            return options.inverse(this);
    }
});


