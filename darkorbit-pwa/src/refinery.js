/*
 * DEEP ORBIT — refining and assembly.
 *
 * Raw ore occupies cargo and sells cheap. Refining three raw units into one
 * refined unit (worth 3×) at the station gives hauling a purpose; assembly
 * spends refined materials on immediate field effects.
 */

import {
    RESOURCES, RESOURCE_IDS, REFINE_RATIO, REFINED_PRICE_MULT,
    CRAFTS, PICKUPS
} from "./config.js";
import { emit } from "./sim.js";

export function refineOre(state, profile, resourceId) {
    if (!state.docked || state.destroyed || !RESOURCE_IDS.includes(resourceId)) return false;
    if ((state.cargo[resourceId] | 0) < REFINE_RATIO) return false;
    state.cargo[resourceId] -= REFINE_RATIO;
    state.cargoUsed = Math.max(0, state.cargoUsed - REFINE_RATIO);
    profile.refined[resourceId] = (profile.refined[resourceId] | 0) + 1;
    emit(state, "message", {
        text: "Refined " + RESOURCES[resourceId].name + " — " + profile.refined[resourceId] + " units"
    });
    return true;
}

export function sellRefined(profile, resourceId) {
    if (!RESOURCE_IDS.includes(resourceId) || !(profile.refined[resourceId] | 0)) return 0;
    const value = RESOURCES[resourceId].price * REFINED_PRICE_MULT;
    profile.refined[resourceId] -= 1;
    profile.credits = (profile.credits | 0) + value;
    profile.totalSales = (profile.totalSales | 0) + value;
    profile.bestSale = Math.max(profile.bestSale | 0, value);
    return value;
}

export function canCraft(profile, recipe) {
    if (!recipe) return false;
    for (const id of Object.keys(recipe.cost)) {
        if ((profile.refined[id] | 0) < recipe.cost[id]) return false;
    }
    return true;
}

export function craftItem(state, profile, craftId) {
    const recipe = CRAFTS.find((c) => c.id === craftId);
    if (!recipe || !state.docked || state.destroyed || !canCraft(profile, recipe)) return false;

    for (const id of Object.keys(recipe.cost)) profile.refined[id] -= recipe.cost[id];

    const p = state.player;
    if (recipe.effect === "repair") p.hp = Math.min(p.hpMax, p.hp + p.hpMax * 0.5);
    else if (recipe.effect === "shield") p.shield = Math.min(p.shieldMax, p.shield + p.shieldMax * 0.6);
    else if (recipe.effect === "magnet") state.magnetTimer = Math.max(state.magnetTimer, PICKUPS.magnet.duration);
    else if (recipe.effect === "overdrive") state.overdriveTimer = Math.max(state.overdriveTimer, PICKUPS.overdrive.duration);

    emit(state, "pickup-effect", { kind: recipe.id, name: recipe.name });
    emit(state, "message", { text: "Assembled: " + recipe.name });
    return true;
}

export function refinedValue(resourceId) {
    return (RESOURCES[resourceId] ? RESOURCES[resourceId].price : 0) * REFINED_PRICE_MULT;
}
