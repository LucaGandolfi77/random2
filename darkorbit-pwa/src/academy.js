/*
 * DEEP ORBIT — Training Academy.
 *
 * A short chain of scripted lessons with live objective checks. Progress is
 * stored on the profile and reported through ordinary gameplay events.
 */

import { ACADEMY_LESSONS } from "./config.js";

export function currentLesson(profile) {
    const index = profile.academy.index | 0;
    return index < ACADEMY_LESSONS.length ? ACADEMY_LESSONS[index] : null;
}

function lessonMatches(lesson, type, meta) {
    if (lesson.type === "ammo") return type === "ammo" && meta === lesson.ammoId;
    if (lesson.type === "abilities") return type === "ability";
    return lesson.type === type;
}

export function academyProgress(profile, type, amount, meta) {
    const lesson = currentLesson(profile);
    if (!lesson || !lessonMatches(lesson, type, meta) || !amount) return null;

    const a = profile.academy;
    if (!a.flags) a.flags = [];

    // Abilities must be three distinct systems, not three repeats.
    if (lesson.type === "abilities") {
        const flag = "ability:" + meta;
        if (a.flags.includes(flag)) return null;
        a.flags.push(flag);
        a.progress = a.flags.filter((f) => f.startsWith("ability:")).length;
    } else {
        a.progress = (a.progress | 0) + amount;
    }

    if (a.progress < lesson.target) return null;

    profile.credits = (profile.credits | 0) + lesson.reward.credits;
    profile.urium = (profile.urium | 0) + lesson.reward.urium;
    a.done.push(lesson.id);
    a.index += 1;
    a.progress = 0;
    return { lesson, reward: lesson.reward };
}

export function academyList(profile) {
    return ACADEMY_LESSONS.map((lesson, i) => ({
        ...lesson,
        state: profile.academy.done.includes(lesson.id)
            ? "completed"
            : i === (profile.academy.index | 0) ? "active" : "locked"
    }));
}

export function academyDone(profile) {
    return (profile.academy.done || []).length;
}

export function academyTotal() {
    return ACADEMY_LESSONS.length;
}
