// The title, as the genre has it, over the stage before the Archmage's portal (TitleStage.ts):
// the heroes kept, one chosen to play, made anew or deleted; for a new hero, a class from the line,
// then how they look (their body, face and colours, from OSRS's own character creation), their
// name, and whether they've one life only. In the corner, the game's version and what's new.
// Everything it does goes through the Client.
import { Fragment, KeyboardEvent as ReactKeyboardEvent } from "react";

import { HSL_RGB_MAP } from "../../../engine/rs/util/ColorUtil";
import type { Client } from "../client/Client";
import { MAX_HEROES } from "../client/settings";
import type { Creation, HeroCard, UiState } from "../client/Store";
import { CLASSES, LINEUP } from "../content/classes";
import { GEM_BY_ID, GEM_REWARDS } from "../content/gems";
import type { ClassId } from "../content/items";
import { BODY_PARTS, BodyPart, COLOR_COUNT, COLOR_PARTS, ColorPart, Look, NAME_MAX, NATURAL_SKINS, PRESETS, cleanName, colorHsl, kitsFor, switchBody } from "../content/looks";
import { CITY_NAME } from "../content/town";
import { CHANGELOG, GAME_VERSION, formatChangelogDate } from "./changelog";
import { PanelHead, SkillPic } from "./rs";

type Props = { state: UiState; client: Client };

export function Title({ state, client }: Props): JSX.Element {
    return (
        <>
            <CurrentStep state={state} client={client} />
            <div className="title-corner">
                <span className="dim">v{GAME_VERSION}</span>
                <button className="ui-button tiny" onClick={() => client.setChangelog(true)}>
                    What's new
                </button>
            </div>
            {state.changelog && <Changelog client={client} />}
        </>
    );
}

function CurrentStep({ state, client }: Props): JSX.Element {
    if (state.titleStep === "heroes" && state.heroes.length > 0) {
        return <HeroSelect state={state} client={client} />;
    }
    if (state.titleStep === "look" && state.creating) {
        return <LookStep creating={state.creating} state={state} client={client} />;
    }
    return <ClassStep state={state} client={client} />;
}

function Logo({ small }: { small?: boolean }): JSX.Element {
    return (
        <div className={`title-logo ${small ? "small" : ""}`}>
            <div className="title-name">Riftscaper</div>
            {!small && <div className="title-sub">Deeper into the rifts</div>}
        </div>
    );
}

// ---- The heroes kept ----

function HeroSelect({ state, client }: Props): JSX.Element {
    const busy = !!state.generating;
    const card = state.heroes.find((h) => h.slot === state.selected);
    const full = state.heroes.length >= MAX_HEROES;
    return (
        <div className="title-screen">
            <Logo />
            <div className="panel rs-background hero-list ui-modal">
                <div className="panel-title">
                    Your heroes{" "}
                    <span className="dim">
                        {state.heroes.length} of {MAX_HEROES}
                    </span>
                </div>
                <div className="hero-rows">
                    {state.heroes.map((h) => (
                        <button
                            key={h.slot}
                            className={`hero-row ${h.slot === state.selected ? "chosen" : ""} ${h.fallen ? "fallen" : ""}`}
                            onClick={() => client.selectHero(h.slot)}
                            onDoubleClick={() => void client.playHero()}
                        >
                            <span className="hero-row-name">{h.name}</span>
                            <span className="hero-row-sub">
                                Level {h.level} <span style={{ color: CLASSES[h.cls].color }}>{CLASSES[h.cls].name}</span>
                            </span>
                            {h.hardcore && <span className={`hc-badge ${h.fallen ? "fallen" : ""}`}>{h.fallen ? "Fallen" : "Hardcore"}</span>}
                        </button>
                    ))}
                </div>
                <div className="hero-list-buttons">
                    <button className="ui-button" disabled={busy || full} data-tip={full ? "Delete a hero to make another" : undefined} onClick={() => client.createNew()}>
                        Create new hero
                    </button>
                    <button className="ui-button small" disabled={busy || !card} onClick={() => client.askDelete(card?.slot)}>
                        Delete
                    </button>
                </div>
            </div>
            {card && <HeroPlate card={card} busy={busy} client={client} />}
            <div className="drag-hint dim">Drag to turn</div>
            {state.deleting && <ConfirmDelete card={state.heroes.find((h) => h.slot === state.deleting)} client={client} />}
        </div>
    );
}

function HeroPlate({ card, busy, client }: { card: HeroCard; busy: boolean; client: Client }): JSX.Element {
    const def = CLASSES[card.cls];
    return (
        <div className="hero-plate">
            <div className="hero-plate-name">{card.name}</div>
            <div className="hero-plate-class">
                Level {card.level} <span style={{ color: def.color }}>{def.name}</span>
                {card.hardcore && <span className={`hc-badge ${card.fallen ? "fallen" : ""}`}>{card.fallen ? "Fallen" : "Hardcore"}</span>}
            </div>
            <div className="dim">{card.fallen ? `Fell in the rifts, having reached rift ${card.maxDepth}` : `Deepest rift ${card.maxDepth}: ${card.zone}`}</div>
            <div className="dim hero-plate-tally">
                {card.kills} slain · {card.deaths} {card.deaths === 1 ? "death" : "deaths"}
            </div>
            <button className="ui-button big ui-main" disabled={busy || card.fallen} onClick={() => void client.playHero()}>
                {busy ? "The gates are opening..." : card.fallen ? "This hero has fallen" : "Play"}
            </button>
        </div>
    );
}

function ConfirmDelete({ card, client }: { card?: HeroCard; client: Client }): JSX.Element | null {
    if (!card) {
        return null;
    }
    return (
        <div className="modal-back">
            <div className="panel rs-background confirm ui-modal">
                <div className="panel-title big">Delete {card.name}?</div>
                <div className="dim">
                    Level {card.level} {CLASSES[card.cls].name}, and everything they carry and keep in the stash. This can't be undone.
                </div>
                <div className="confirm-buttons">
                    <button className="ui-button" onClick={() => client.askDelete(undefined)}>
                        Keep
                    </button>
                    <button className="ui-button danger ui-main" onClick={() => client.confirmDelete()}>
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---- What's new ----

// Each version from CHANGELOG.md, newest first; Unreleased only once something's under it
function Changelog({ client }: { client: Client }): JSX.Element {
    return (
        <div className="modal-back">
            <div className="panel rs-background changelog ui-modal">
                <PanelHead title="What's new" onClose={() => client.setChangelog(false)} />
                <div className="changelog-list">
                    {CHANGELOG.filter((v) => v.sections.length > 0).map((v) => (
                        <section key={v.version}>
                            <div className="changelog-version">
                                <span className="section-title">{v.version}</span>
                                {v.date && <span className="dim">{formatChangelogDate(v.date)}</span>}
                            </div>
                            {v.sections.map((section) => (
                                <Fragment key={section.heading}>
                                    <div className="changelog-heading">{section.heading}</div>
                                    <ul>
                                        {section.items.map((item, i) => (
                                            <li key={i}>{item}</li>
                                        ))}
                                    </ul>
                                </Fragment>
                            ))}
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ---- A class, from the line ----

// What each fights with and wears, as the gear's own classes have it (items.ts)
const GEAR_TEXT: Record<ClassId, string> = {
    warrior: "Scimitars, swords, battleaxes and maces, with a shield. Plate.",
    paladin: "Maces and swords, with a shield or a holy book. Plate, chain, and the Temple Knights' armour.",
    rogue: "Daggers, or a bow in both hands. No shield. The Rogues' Den's own leathers.",
    ranger: "Bows, in both hands. Leather and dragonhide.",
    necromancer: "Staves, with an unholy book. Zamorak's robes, and bone.",
    mage: "Staves, with a shield or a book. Robes.",
};

function ClassStep({ state, client }: Props): JSX.Element {
    const busy = !!state.generating;
    const shown = state.hoverClass ?? state.pick;
    return (
        <div className="title-screen">
            <Logo small />
            <div className="step-head">
                <div className="step-title">Choose a class</div>
                <div className="dim">Click one in the line to call them forward</div>
            </div>
            {shown && <ClassPanel cls={shown} />}
            <div className="class-bar ui-modal">
                {LINEUP.map((id) => (
                    <button
                        key={id}
                        className={`ui-button class-pick ${state.pick === id ? "chosen" : ""} ${state.hoverClass === id ? "hovered" : ""}`}
                        style={state.pick === id ? { color: CLASSES[id].color } : undefined}
                        onClick={() => client.pickClass(id)}
                    >
                        {CLASSES[id].name}
                    </button>
                ))}
            </div>
            <div className="title-nav">
                {state.heroes.length > 0 && (
                    <button className="ui-button" onClick={() => client.titleBack()}>
                        Back
                    </button>
                )}
                <button className="ui-button big ui-main" disabled={!state.pick || busy} onClick={() => client.toLook()}>
                    Next
                </button>
            </div>
        </div>
    );
}

function ClassPanel({ cls }: { cls: ClassId }): JSX.Element {
    const def = CLASSES[cls];
    return (
        <div className="panel rs-background class-panel">
            <div className="class-name" style={{ color: def.color }}>
                {def.name}
            </div>
            <div className="class-role">{def.role}</div>
            <div className="class-blurb">{def.blurb}</div>
            <div className="class-stats">
                <span className="life-text">{def.life[0]} life</span>
                <span className="mana-text">{def.mana[0]} mana</span>
            </div>
            <div className="class-attrs">
                <Attr label="Str" value={def.attributes[0]} />
                <Attr label="Dex" value={def.attributes[1]} />
                <Attr label="Int" value={def.attributes[2]} />
            </div>
            <div className="class-weapons dim">{GEAR_TEXT[cls]}</div>
            <div className="class-skills">
                {def.signature.map((gemId) => {
                    const gem = GEM_BY_ID.get(gemId);
                    const skill = gem?.skill;
                    if (!gem || !skill) {
                        return null;
                    }
                    const at = GEM_REWARDS[cls].find((r) => r.gem === gemId)?.level ?? 1;
                    return (
                        <div key={gemId} className="class-skill" data-tip={skill.description.replace("{damage}", `${Math.round(skill.damage * 100)}`)}>
                            <SkillPic icon={skill.icon} size={26} />
                            <span>
                                {gem.name}
                                {at > 1 && <span className="dim"> level {at}</span>}
                            </span>
                        </div>
                    );
                })}
            </div>
            <div className="class-note dim">Skills come as gems, set in your gear. More with every level.</div>
        </div>
    );
}

function Attr({ label, value }: { label: string; value: number }): JSX.Element {
    return (
        <div className="class-attr">
            <span className="dim">{label}</span>
            <div className="attr-bar">
                <div style={{ width: `${Math.min(100, (value / 30) * 100)}%` }} />
            </div>
            <span>{value}</span>
        </div>
    );
}

// ---- How they look, and their name ----

const PART_NAMES: Record<BodyPart, string> = { hair: "Hair", jaw: "Beard", torso: "Tunic", arms: "Sleeves", hands: "Hands", legs: "Trousers", feet: "Feet" };
const COLOR_NAMES: Record<ColorPart, string> = { hair: "Hair colour", skin: "Skin", torso: "Tunic colour", legs: "Trouser colour", feet: "Boot colour" };
// The colours in the order they're offered, the skin's after the hair's
const COLOR_ORDER: ColorPart[] = ["hair", "skin", "torso", "legs", "feet"];

function swatch(part: ColorPart, index: number): string {
    return `#${(HSL_RGB_MAP[colorHsl(part, index)] & 0xffffff).toString(16).padStart(6, "0")}`;
}

function LookStep({ creating, state, client }: { creating: Creation; state: UiState; client: Client }): JSX.Element {
    const busy = !!state.generating;
    const look = creating.look;
    const def = CLASSES[creating.cls];
    const setLook = (next: Look) => client.setCreation({ look: next });
    const stepKit = (part: BodyPart, d: number) => {
        const i = BODY_PARTS.indexOf(part);
        const list = kitsFor(look.female)[part];
        const at = Math.max(0, list.indexOf(look.kits[i]));
        const kits = [...look.kits];
        kits[i] = list[(at + d + list.length) % list.length];
        setLook({ ...look, kits });
    };
    const setColor = (part: ColorPart, index: number) => {
        const colors = [...look.colors];
        colors[COLOR_PARTS.indexOf(part)] = index;
        setLook({ ...look, colors });
    };
    const onNameKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            void client.createHero();
        }
    };
    return (
        <div className="title-screen">
            <Logo small />
            <div className="step-head">
                <div className="step-title">
                    A new <span style={{ color: def.color }}>{def.name}</span>
                </div>
            </div>
            <div className="panel rs-background look-panel left ui-modal">
                <div className="panel-title">Appearance</div>
                <div className="look-presets">
                    {PRESETS.map((p) => (
                        <button key={p.name} className="ui-button tiny" onClick={() => setLook({ ...p.look, hideHelm: look.hideHelm })}>
                            {p.name}
                        </button>
                    ))}
                </div>
                <div className="look-row">
                    <span className="look-label">Body</span>
                    <div className="look-toggle">
                        <button className={`ui-button tiny ${!look.female ? "chosen" : ""}`} onClick={() => look.female && setLook(switchBody(look))}>
                            Type A
                        </button>
                        <button className={`ui-button tiny ${look.female ? "chosen" : ""}`} onClick={() => !look.female && setLook(switchBody(look))}>
                            Type B
                        </button>
                    </div>
                </div>
                {BODY_PARTS.map((part, i) => {
                    const list = kitsFor(look.female)[part];
                    const at = list.indexOf(look.kits[i]);
                    // A beard's list starts with none, the chin alone
                    const value = part === "jaw" ? (at === 0 ? "None" : `${at} of ${list.length - 1}`) : `${at + 1} of ${list.length}`;
                    return (
                        <div key={part} className="look-row">
                            <span className="look-label">{PART_NAMES[part]}</span>
                            <button className="ui-button arrow left" onClick={() => stepKit(part, -1)} aria-label={`Previous ${PART_NAMES[part]}`} />
                            <span className="look-value">{value}</span>
                            <button className="ui-button arrow right" onClick={() => stepKit(part, 1)} aria-label={`Next ${PART_NAMES[part]}`} />
                        </div>
                    );
                })}
                <div className="look-buttons">
                    <button className="ui-button small" onClick={() => client.randomiseLook()}>
                        Randomise
                    </button>
                    <button className={`ui-button small ${creating.showGear ? "chosen" : ""}`} onClick={() => client.setCreation({ showGear: !creating.showGear })}>
                        {creating.showGear ? "In their gear" : "Without gear"}
                    </button>
                </div>
            </div>
            <div className="panel rs-background look-panel right ui-modal">
                <div className="panel-title">Colours</div>
                {COLOR_ORDER.map((part) => {
                    const chosen = look.colors[COLOR_PARTS.indexOf(part)];
                    return (
                        <div key={part} className="look-colors">
                            <span className="look-label">{COLOR_NAMES[part]}</span>
                            <div className="swatches">
                                {Array.from({ length: COLOR_COUNT[part] }, (_, index) => (
                                    <button
                                        key={index}
                                        className={`swatch ${index === chosen ? "chosen" : ""} ${part === "skin" && index >= NATURAL_SKINS ? "otherworldly" : ""}`}
                                        style={{ background: swatch(part, index) }}
                                        data-tip={part === "skin" && index >= NATURAL_SKINS ? "Otherworldly" : undefined}
                                        onClick={() => setColor(part, index)}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
                <div className="panel-title name-title">Name</div>
                <div className="name-row">
                    <input
                        className="name-input"
                        value={creating.name}
                        maxLength={NAME_MAX}
                        placeholder="Your hero's name"
                        spellCheck={false}
                        onChange={(e) => client.setCreation({ name: cleanName(e.target.value) })}
                        onKeyDown={onNameKey}
                    />
                    <button className="ui-button tiny" data-tip="A name from the dice" onClick={() => client.randomName()}>
                        Roll
                    </button>
                </div>
                {creating.problem && <div className="name-problem">{creating.problem}</div>}
                <button className={`hc-toggle ${creating.hardcore ? "on" : ""}`} onClick={() => client.setCreation({ hardcore: !creating.hardcore })}>
                    <span className={`hc-box ${creating.hardcore ? "on" : ""}`} />
                    <span>
                        <span className="hc-name">Hardcore</span>
                        <span className="dim hc-text"> One life. A hardcore hero who dies is gone for good.</span>
                    </span>
                </button>
            </div>
            <div className="drag-hint high dim">Drag to turn</div>
            <div className="title-nav">
                <button className="ui-button" onClick={() => client.titleBack()}>
                    Back
                </button>
                <button className="ui-button big ui-main" disabled={busy} onClick={() => void client.createHero()}>
                    {busy ? "The gates are opening..." : `Enter ${CITY_NAME}`}
                </button>
            </div>
        </div>
    );
}
