// The screens over the world: loading, the title (Title.tsx: the heroes kept, and making a new
// one), and the game's own: life and mana, the flasks, the skill bar, experience and the side
// tabs along the bottom, where the hero is and the rift's guardian along the top, what's under the
// mouse, the game's messages, the pack with what's worn, the city's shops and the Archmage's
// rifts, the teleport home, dying and the menu. They're dressed as the OSRS client is (rs.tsx):
// its stone, its sprites and its fonts at their own size. Everything it does goes through the
// Client.
import { HIRELING, HIRELING_SLOTS, HirelingSlot } from "../content/hirelings";
import { PRAYER, PRAYERS, PRAYER_IDS } from "../content/prayers";
import { CSSProperties, Fragment, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode, RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";

import { ItemIcon } from "../../../engine/components/rs/icon/ItemIcon";
import type { Client } from "../client/Client";
import { UI_SIZE_RANGE } from "../client/settings";
import type { ApothecaryView, ArchmageView, BeltSlot, CavesView, GloryView, Hud, ItemView, JewellerView, LogView, OrreryView, Pack, Panel, RiftModView, RiftRewardView, RuneView, ShopView, SkillRow, SocketView, QuestLogView, Store, TaskDialogView, TaskView, UiState } from "../client/Store";
import { rewardText, useStore } from "../client/Store";
import { CONTROLS, ControlId, KEYS_PER_CONTROL, RESERVED_KEYS, controlLabel, keyLabel } from "../client/controls";
import { uiScale } from "../client/uiScale";
import { SKILL_KEYS } from "../content/classes";
import { COLLECTION_LOG } from "../content/achievements";
import { FORGED_COLOR, TRAIT_COLOR } from "../content/forge";
import { RARITY_COLOR, RIFT_COLOR, RUNEWORD_COLOR, SET_COLOR, SLOT_NAMES, SOCKET_COLOR, Slot } from "../content/items";
import { HERO, STASH } from "../content/rules";
import type { RuneId } from "../content/runes";
import { VIAL } from "../content/potions";
import { GOODS } from "../content/goods";
import { ARCHMAGE, BANKER, CITY_LORE, CITY_NAME } from "../content/town";
import { ENCHANTABLE, PASSIVES } from "../content/passives";
import { enchantCost } from "../sim/enchant";
import { SOCKET_WORK, SocketWork } from "../sim/gems";
import { nodeLines } from "../sim/loot";
import { PassiveTree } from "./PassiveTree";
import { Orb, PanelHead, SLOT_SPRITE, SLOT_TILE, SPRITE, SkillPic, Sprite, stackText, useSprite } from "./rs";
import { Title } from "./Title";

type Props = { store: Store; client?: Client };

// The pack's pages
type PackTab = "gear" | "gems" | "stats" | "pouch";

const COINS = 995;

export function Ui({ store, client }: Props): JSX.Element {
    const state = useStore(store);
    const [scale, setScale] = useState(() => uiScale(state.uiSize));
    useEffect(() => {
        setScale(uiScale(state.uiSize));
        const onResize = () => setScale(uiScale(state.uiSize));
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [state.uiSize]);

    // In the game, the messages run up the left like the client's chat; on the title they're
    // over the middle
    const chat = state.screen === "play" && !!state.hud;
    return (
        <div className="ui-contents" style={{ "--ui-scale": scale } as CSSProperties}>
            <Screens state={state} client={client} />
            <HoverTip />
            <div className={chat ? "chat" : "toasts"}>
                {state.toasts.map((t) => (
                    <div key={t.id} className={`toast ${t.tone ?? ""}`} style={t.color ? { color: t.color } : undefined}>
                        {t.text}
                    </div>
                ))}
            </div>
        </div>
    );
}

function Screens({ state, client }: { state: UiState; client?: Client }): JSX.Element | null {
    // The stash's tab and the pack's page, kept while they're shut so they open where they were left
    const [stashTab, setStashTab] = useState(0);
    const [packTab, setPackTab] = useState<PackTab>("gear");
    if (state.error) {
        return (
            <div className="game-status">
                <div className="panel rs-background status-box">
                    <div className="panel-title">Something went wrong</div>
                    <p>{state.error}</p>
                </div>
            </div>
        );
    }
    if (state.screen === "loading" || !client) {
        return (
            <div className="game-status">
                <div className="loading">
                    <div className="loading-title">Riftscaper</div>
                    <div className="loading-bar">
                        <div className="loading-fill" style={{ width: `${state.loadingProgress}%` }} />
                        <div className="loading-text">
                            {state.loadingText} - {state.loadingProgress}%
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    if (state.screen === "title") {
        return <Title state={state} client={client} />;
    }
    const hud = state.hud;
    if (!hud) {
        return state.generating ? <Entering text={state.generating} /> : null;
    }
    const hiring = state.panel === "hireling" || state.panel === "captain";
    const packOpen = state.panel === "inventory" || state.panel === "shop" || state.panel === "stash" || hiring;
    return (
        <>
            <div className="minimap-frame" />
            <TopLeft hud={hud} panel={state.panel} client={client} />
            <BossBar hud={hud} />
            {state.hover && <HoverInfo hover={state.hover} />}
            <ActionBar hud={hud} state={state} client={client} packOpen={packOpen} packTab={packTab} setPackTab={setPackTab} />
            {hud.channel !== undefined && <Channel share={hud.channel} />}
            {state.panel === "shop" && state.shop && state.pack && <Shop shop={state.shop} pack={state.pack} hud={hud} client={client} />}
            {state.panel === "stash" && state.pack?.stash && <Stash pack={state.pack} tab={stashTab} setTab={setStashTab} client={client} />}
            {state.panel === "archmage" && state.archmage && <Archmage view={state.archmage} client={client} />}
            {state.panel === "task" && state.task && <TaskPanel view={state.task} client={client} />}
            {state.panel === "quests" && state.quests && <QuestPanel view={state.quests} client={client} />}
            {state.panel === "caves" && state.caves && <CavesPanel view={state.caves} client={client} />}
            {state.panel === "glory" && state.glory && <GloryPanel view={state.glory} client={client} />}
            {state.panel === "prayer" && <PrayerPanel hud={hud} client={client} />}
            {state.panel === "log" && state.log && <LogPanel view={state.log} client={client} />}
            {state.panel === "orrery" && state.orrery && <OrreryPanel view={state.orrery} client={client} />}
            {hiring && state.pack && <HirelingPanel pack={state.pack} atCaptain={state.panel === "captain"} client={client} />}
            {packOpen && state.pack && (
                <Inventory
                    pack={state.pack}
                    hud={hud}
                    mode={state.panel === "shop" ? "trading" : state.panel === "stash" ? "stashing" : hiring && state.pack.hireling ? "hiring" : undefined}
                    stashTab={stashTab}
                    tab={packTab}
                    setTab={setPackTab}
                    client={client}
                />
            )}
            {hud.dead && <Death hud={hud} wait={state.deathWait} client={client} />}
            {state.tree && <PassiveTree tree={state.tree} client={client} />}
            {state.help && <Help client={client} />}
            {state.menu && <Menu state={state} client={client} />}
            {(state.generating || state.transition) && <Entering text={state.generating ?? state.transition!} />}
        </>
    );
}

function Entering({ text }: { text: string }): JSX.Element {
    return (
        <div className="entering">
            <div className="entering-box">{text}...</div>
        </div>
    );
}

// ---- Playing ----

function TopLeft({ hud, panel, client }: { hud: Hud; panel: Panel | undefined; client: Client }): JSX.Element {
    return (
        <div className="top-left">
            <ZoneInfo hud={hud} />
            {hud.hireling && <HirelingPortrait hire={hud.hireling} open={panel === "hireling"} client={client} />}
            {(hud.tasks.length > 0 || hud.quest) && <TaskTracker tasks={hud.tasks} quest={hud.quest} />}
        </div>
    );
}

// The hireling's box under the rift's, as Diablo II's portrait: its name, its life, and its panel
// a click away
function HirelingPortrait({ hire, open, client }: { hire: NonNullable<Hud["hireling"]>; open: boolean; client: Client }): JSX.Element {
    return (
        <button
            className="hire-portrait info-box"
            data-tip={`${hire.name}, your ${hire.title.toLowerCase()}${hire.dead ? ", has fallen. The Mercenary Captain can raise them." : ""}\nClick for their gear.`}
            onClick={() => client.setPanel(open ? undefined : "hireling")}
        >
            <span className="zone-name">{hire.name}</span>
            <span className="hire-bar">
                <span className="hire-fill" style={{ width: `${Math.round(hire.life * 100)}%` }} />
                {hire.dead && <span className="hire-dead">Fallen</span>}
            </span>
        </button>
    );
}

// Whether the tracker's folded to its heading, kept while the game's open
let trackerFolded = false;

// The quest and the tasks the hero's doing, as far as they've got: a line each, cut short to fit
// with the whole of it on hover, under a heading that folds them away
function TaskTracker({ tasks, quest }: { tasks: TaskView[]; quest: Hud["quest"] }): JSX.Element {
    const [folded, setFolded] = useState(trackerFolded);
    const fold = () => {
        trackerFolded = !folded;
        setFolded(!folded);
    };
    const count = tasks.length + (quest ? 1 : 0);
    const done = tasks.filter((t) => t.done).length + (quest?.ready ? 1 : 0);
    return (
        <div className="task-tracker info-box">
            <button className="tracker-head" data-tip={folded ? "Show them" : "Fold them away"} onClick={fold}>
                <span className="zone-name">{quest ? (tasks.length > 0 ? "Quest and tasks" : "Quest") : "Tasks"}</span>
                <span className="tracker-count">{done > 0 ? `${done} of ${count} done` : count}</span>
                <span className="tracker-fold">{folded ? "+" : "-"}</span>
            </button>
            {!folded && quest && (
                <div className={`task-line ${quest.ready ? "done" : ""}`} data-tip={`${quest.name}\n${quest.ask}. Reldo, the chronicler, has its reward.${quest.ready ? "\nDone: see Reldo." : ""}`}>
                    <span className="task-text">
                        <span className="task-from">Quest: </span>
                        {quest.ask}
                    </span>
                    {quest.ready && <span className="task-count">Done</span>}
                </div>
            )}
            {!folded &&
                tasks.map((t) => (
                    <div key={t.uid} className={`task-line ${t.done ? "done" : ""}`} data-tip={`${t.objective}\n${t.where}. Set by ${t.giver}, who pays when it's done.${t.done ? `\nDone: see ${t.giver}.` : ""}`}>
                        <span className="task-text">{t.objective}</span>
                        {t.done ? (
                            <span className="task-count">Done</span>
                        ) : (
                            t.count > 1 && (
                                <span className="task-count">
                                    {t.progress}/{t.count}
                                </span>
                            )
                        )}
                    </div>
                ))}
        </div>
    );
}

// Where the hero is: the city, and the rift that's open from it; or the rift, its depth, what's
// left of it and its time, its modifiers in a line, and the encounter under way
function ZoneInfo({ hud }: { hud: Hud }): JSX.Element {
    if (hud.town) {
        return (
            <div className="zone-info info-box">
                <div className="zone-name">{hud.zone}</div>
                {hud.riftOpen ? (
                    <>
                        <div className="zone-portal">A rift to {hud.riftOpen} is open</div>
                        <RiftMods mods={hud.mods} reward={hud.reward} />
                    </>
                ) : (
                    <div className="zone-sub">{ARCHMAGE.name} opens the rifts</div>
                )}
            </div>
        );
    }
    return (
        <div className="zone-info info-box">
            <div className="zone-head">
                <span className="zone-name">{hud.zone}</span>
                <span className="zone-label">Rift {hud.depth}</span>
            </div>
            <div className="zone-line">
                <span className="zone-label">Level</span> <span className="zone-value">{hud.areaLevel}</span>
                <span className="zone-label"> · Slain</span>{" "}
                <span className="zone-value">
                    {hud.killed}/{hud.total}
                </span>
                {hud.timeLeft !== undefined && (
                    <span className="zone-time" data-tip={"Time left\nWhen it runs out the rift collapses and you're pulled home, alive but with the rift lost. Slay the guardian to stop the clock; it waits while you're in the city."}>
                        <span className="zone-label"> · </span>
                        <span className={`zone-value ${hud.timeLeft <= 60 ? "zone-time-short" : ""}`}>
                            {Math.floor(hud.timeLeft / 60)}:{String(hud.timeLeft % 60).padStart(2, "0")}
                        </span>
                    </span>
                )}
            </div>
            <RiftMods mods={hud.mods} reward={hud.reward} />
            {hud.portalOpen && <div className="zone-portal">The portal home is open</div>}
            {hud.encounter && (
                <div className="zone-encounter">
                    <div className="zone-encounter-name" style={{ color: hud.encounter.color }}>
                        {hud.encounter.name}
                    </div>
                    {hud.encounter.lines.map((line, i) => (
                        <div key={i} className="zone-line">
                            {line}
                        </div>
                    ))}
                    {hud.encounter.share !== undefined && (
                        <div className="hp-bar">
                            <div className="hp-fill" style={{ width: `${Math.max(0, Math.min(1, hud.encounter.share)) * 100}%` }} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// A rift's modifiers in a line under its name, and on hover what each does and what they pay
function RiftMods({ mods, reward }: { mods: RiftModView[]; reward: RiftRewardView }): JSX.Element | null {
    if (mods.length === 0) {
        return null;
    }
    const tip = [`${mods.length} ${mods.length === 1 ? "modifier" : "modifiers"}`, ...mods.map((m) => `${m.name}: ${m.text}`), rewardText(reward)].join("\n");
    return (
        <div className="zone-mods" data-tip={tip}>
            {mods.map((m) => m.name).join(", ")}
        </div>
    );
}

// The guardian's life along the top, green on red as the client's boss bars are
function BossBar({ hud }: { hud: Hud }): JSX.Element | null {
    const boss = hud.boss;
    if (!boss || !boss.awake || boss.dead) {
        return null;
    }
    const share = Math.max(0, boss.life);
    return (
        <div className="boss-bar">
            <div className="boss-name">
                {boss.name}, <span className="boss-title">{boss.title}</span>
            </div>
            <div className="hp-bar big">
                <div className="hp-fill" style={{ width: `${share * 100}%` }} />
                <div className="hp-text">{Math.ceil(share * 100)}%</div>
            </div>
        </div>
    );
}

// What's under the mouse, in a box like the client's opponent information
function HoverInfo({ hover }: { hover: NonNullable<UiState["hover"]> }): JSX.Element {
    return (
        <div className="hover-info info-box">
            <div className="hover-name" style={{ color: hover.color }}>
                {hover.name}
            </div>
            {hover.life !== undefined && (
                <div className="hp-bar">
                    <div className="hp-fill" style={{ width: `${Math.max(0, hover.life) * 100}%` }} />
                </div>
            )}
            {hover.sub && <div className="hover-sub">{hover.sub}</div>}
        </div>
    );
}

type BarProps = {
    hud: Hud;
    state: UiState;
    client: Client;
    packOpen: boolean;
    packTab: PackTab;
    setPackTab: (tab: PackTab) => void;
};

function ActionBar({ hud, state, client, packOpen, packTab, setPackTab }: BarProps): JSX.Element {
    // Full at 99, where there's no more to have
    const xpShare = hud.xpNext > 0 ? Math.max(0, Math.min(1, hud.xp / hud.xpNext)) : 1;
    const picker = state.picker;
    const gold = stackText(hud.gold);
    // The pack's tab shuts it if it's showing; the gems' tab shuts it if it's on its gems
    const showPack = (tab: PackTab) => {
        if (packOpen && (tab === "gems") === (packTab === "gems")) {
            client.setPanel(undefined);
            return;
        }
        setPackTab(tab === "gems" ? "gems" : packTab === "gems" ? "gear" : packTab);
        if (!packOpen) {
            client.setPanel("inventory");
        }
    };
    return (
        <div className="action-bar">
            <Orb kind="life" value={hud.life} max={hud.maxLife} ward={hud.ward} />
            <div className="bar-middle panel rs-background">
                {picker && <SkillPicker picker={picker} client={client} />}
                {hud.buffs.length > 0 && (
                    <div className="buffs">
                        {hud.buffs.map((b) => (
                            <span key={b.name} className={b.ailment ? "buff buff-ailment" : "buff"}>
                                {b.icon && <SkillPic icon={b.icon} size={20} />}
                                {b.name} <span className="buff-time">{Math.ceil(b.seconds)}s</span>
                            </span>
                        ))}
                    </div>
                )}
                <div className="xp-row">
                    <span className="xp-level">Level {hud.level}</span>
                    <div className="xp-bar" data-tip={hud.xpNext > 0 ? `${hud.xp} / ${hud.xpNext} experience` : "The last level"}>
                        <div className="xp-fill" style={{ width: `${xpShare * 100}%` }} />
                        <div className="xp-text">{Math.floor(xpShare * 100)}%</div>
                    </div>
                    <span className="hud-gold" data-tip={`${hud.gold} gold`}>
                        <ItemIcon objId={COINS} count={Math.max(1, hud.gold)} size={24} />
                        <span style={{ color: gold.color }}>{gold.text}</span>
                    </span>
                </div>
                <div className="bar-row">
                    <div className="belt">
                        {hud.potions.map((p, i) => (
                            <BeltPotion key={i} slot={p} place={i} />
                        ))}
                        {hud.elixir && (
                            <div className="belt-elixir" data-tip={`${hud.elixir.name}: ${Math.ceil(hud.elixir.seconds / 60)} minutes left in the rifts`}>
                                <ItemIcon objId={hud.elixir.objId} size={24} />
                            </div>
                        )}
                    </div>
                    {/* The mouse's two buttons apart from the keys, as Path of Exile's bar has them */}
                    {[
                        { group: "mouse", from: 0, to: MOUSE_SLOTS },
                        { group: "keys", from: MOUSE_SLOTS, to: hud.skills.length },
                    ].map(({ group, from, to }) => (
                        <div key={group} className={`skills ${group} ${hud.town ? "resting" : ""}`}>
                            {hud.skills.slice(from, to).map((s, n) => {
                                const i = from + n;
                                return (
                                    <div
                                        key={i}
                                        className={`skill ${s.ref === null ? "empty" : ""} ${s.why ? "locked" : ""} ${!s.why && !s.affordable ? "dry" : ""} ${picker?.button === i ? "picking" : ""}`}
                                        data-tip={skillTitle(s, hud.town)}
                                        onClick={() => client.openPicker(i)}
                                    >
                                        {s.ref !== null && s.icon && <SkillPic icon={s.icon} size={32} />}
                                        {s.cooldown > 0 && <div className="skill-cool" style={{ height: `${s.cooldown * 100}%` }} />}
                                        {s.why && <div className="skill-lock">!</div>}
                                        {s.ref === null && <div className="skill-lock">+</div>}
                                        {i < MOUSE_SLOTS ? <MouseButton right={i === 1} /> : <div className="skill-key">{s.key}</div>}
                                        {s.life > 0 ? <div className="skill-mana life">{s.life}</div> : s.mana > 0 && !s.why && <div className="skill-mana">{s.mana}</div>}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
                <div className="hud-tabs">
                    <HudTab sprite={SPRITE.tabPack} label="Pack" title={`Your pack (${controlLabel(state.keys, "pack")})`} active={packOpen && packTab !== "gems"} onClick={() => showPack("gear")} />
                    <HudTab sprite={SPRITE.tabMagic} label="Gems" title="Your gems and sockets" active={packOpen && packTab === "gems"} onClick={() => showPack("gems")} />
                    <HudTab
                        sprite={PRAYER.tab}
                        label="Prayer"
                        title={hud.prayers.length > 0 ? `Prayer: ${hud.prayers.map((id) => PRAYERS[id].name).join(" and ")} on` : "Prayer"}
                        active={state.panel === "prayer"}
                        onClick={() => client.setPanel(state.panel === "prayer" ? undefined : "prayer")}
                    />
                    <HudTab
                        sprite={SPRITE.tabQuests}
                        objId={LOG_OBJ}
                        label="Log"
                        title="Collection log and combat achievements"
                        active={state.panel === "log"}
                        onClick={() => client.setPanel(state.panel === "log" ? undefined : "log")}
                    />
                    <HudTab
                        sprite={SPRITE.tabStats}
                        label="Tree"
                        title={hud.points > 0 ? `Passive tree (${controlLabel(state.keys, "tree")}): ${hud.points} ${hud.points === 1 ? "point" : "points"} to spend` : `Passive tree (${controlLabel(state.keys, "tree")})`}
                        glow={hud.points > 0}
                        badge={hud.points > 0 ? hud.points : undefined}
                        onClick={() => client.setTree(true)}
                    />
                    <HudTab
                        sprite={SPRITE.tabHome}
                        label="Home"
                        title={hud.town ? `You're in ${CITY_NAME}` : `Teleport to ${CITY_NAME} (${controlLabel(state.keys, "teleport")}): stand still for ${HERO.teleportSeconds} seconds`}
                        disabled={hud.town}
                        onClick={() => client.startTeleport()}
                    />
                    <HudTab sprite={SPRITE.tabQuests} label="Help" title="How to play" active={state.help} onClick={() => client.store.set({ help: true })} />
                    <HudTab sprite={SPRITE.tabSettings} label="Menu" title="Menu (Esc)" active={state.menu} onClick={() => client.setMenu(true)} />
                </div>
            </div>
            <Orb kind="mana" value={hud.mana} max={hud.maxMana} />
        </div>
    );
}

// The buttons' names where they're written out
const SKILL_KEY_NAMES = ["the left mouse button", "the right mouse button"];

// The bar's first two buttons are the mouse's
const MOUSE_SLOTS = 2;

// A mouse, its left or right button lit: which button a skill's on
function MouseButton({ right }: { right: boolean }): JSX.Element {
    return (
        <div className={`skill-mouse ${right ? "right" : "left"}`} aria-label={right ? "Right mouse button" : "Left mouse button"}>
            <span className="mouse-button" />
            <span className="mouse-button" />
        </div>
    );
}

type HudTabProps = {
    sprite: number;
    // An item's icon instead of the sprite (the collection log's book)
    objId?: number;
    label: string;
    title: string;
    active?: boolean;
    glow?: boolean;
    badge?: number;
    disabled?: boolean;
    onClick: () => void;
};

// A side panel tab of the client's: its icon on a grey stone cut from the client's row of them,
// on the red stone while it's open
function HudTab({ sprite, objId, label, title, active, glow, badge, disabled, onClick }: HudTabProps): JSX.Element {
    const red = useSprite(SPRITE.tabSelected);
    const grey = useSprite(SPRITE.tabStones);
    const stone = active ? red : grey;
    return (
        <button
            className={`hud-tab ${active ? "active" : ""} ${glow ? "glow" : ""} ${stone ? "stoned" : ""}`}
            style={stone ? { backgroundImage: `url(${stone})` } : undefined}
            data-tip={title}
            aria-label={title}
            disabled={disabled}
            onClick={onClick}
        >
            {objId !== undefined ? <ItemIcon objId={objId} size={26} /> : <Sprite id={sprite} fallback={<span className="hud-tab-label">{label}</span>} />}
            {badge !== undefined && <span className="hud-tab-badge">{badge}</span>}
        </button>
    );
}

function skillTitle(s: SkillRow, town: boolean): string {
    if (s.ref === null) {
        return `${s.key}: empty\nClick to put a skill here.`;
    }
    const lines = [`${s.name} (${s.key})`, s.description, ...s.lines];
    if (s.supports.length > 0) {
        lines.push(`Supported by ${s.supports.join(", ")}`);
    }
    if (s.why) {
        lines.push(s.why);
    }
    if (town) {
        lines.push("No fighting in the city.");
    }
    lines.push("Click to change it.");
    return lines.join("\n");
}

// A button's choice of skill: every skill gem worn, and the weapon's own attack
function SkillPicker({ picker, client }: { picker: NonNullable<UiState["picker"]>; client: Client }): JSX.Element {
    const key = SKILL_KEY_NAMES[picker.button] ?? SKILL_KEYS[picker.button];
    return (
        <div className="skill-picker panel rs-background ui-modal">
            <PanelHead title={`Skill on ${key}`} onClose={() => client.store.set({ picker: undefined })} />
            <div className="picker-list">
                {picker.choices.map((c) => (
                    <button key={c.ref} className={`picker-choice ${c.why ? "unusable" : ""}`} onClick={() => client.bindButton(picker.button, c.ref)}>
                        <span className="picker-icon">
                            <SkillPic icon={c.icon} size={32} />
                        </span>
                        <span className="picker-text">
                            <span className="picker-name">
                                {c.name}
                                {c.ref >= 0 && <span className="picker-level"> level {c.level}</span>}
                            </span>
                            {c.on && <span className="picker-on">Now on {c.on}</span>}
                            {c.supports.length > 0 && <span className="picker-sub">+ {c.supports.join(", ")}</span>}
                            {c.why && <span className="picker-sub bad">{c.why}</span>}
                        </span>
                    </button>
                ))}
                {picker.button > 0 && (
                    <button className="picker-choice" onClick={() => client.bindButton(picker.button, null)}>
                        <span className="picker-icon" />
                        <span className="picker-text dim">Nothing</span>
                    </button>
                )}
            </div>
            {picker.choices.length <= 1 && <div className="dim note">Set skill gems in your gear (the pack's Gems) to have more to choose from.</div>}
        </div>
    );
}

// The teleport home gathering, over the action bar
function Channel({ share }: { share: number }): JSX.Element {
    return (
        <div className="channel info-box">
            <div className="channel-text">Teleporting to {CITY_NAME}</div>
            <div className="channel-bar">
                <div className="channel-fill" style={{ width: `${share * 100}%` }} />
            </div>
        </div>
    );
}

// A place in the belt on the bar: its potion as the cache draws it for the doses left, how many,
// the next one filling along its foot, and its key
function BeltPotion({ slot, place }: { slot: BeltSlot; place: number }): JSX.Element {
    const what = place === 0 ? "a life potion" : place === 1 ? "a mana potion" : "any potion";
    const tip = slot.empty ? `Belt ${place + 1} (${slot.key}): empty. It takes ${what}; put one in from your pack.` : `${slot.name} (${slot.key}): ${slot.doses} of ${slot.most} ${slot.most === 1 ? "dose" : "doses"}. Kills fill it.`;
    return (
        <div className={`belt-potion ${slot.empty ? "empty" : slot.rarity} ${!slot.empty && slot.doses < 1 ? "dry" : ""}`} data-tip={tip}>
            <ItemIcon objId={slot.objId ?? VIAL} size={32} />
            {!slot.empty && <div className="belt-count">{slot.doses}</div>}
            {!slot.empty && slot.doses < slot.most && (slot.share ?? 0) > 0 && (
                <div className="belt-fill">
                    <div style={{ width: `${(slot.share ?? 0) * 100}%` }} />
                </div>
            )}
            <div className="belt-key">{slot.key}</div>
        </div>
    );
}

// ---- The pack ----

// The worn equipment tab's own layout
const PAPER_DOLL: (Slot | undefined)[][] = [
    [undefined, "head", undefined],
    ["cape", "amulet", undefined],
    ["weapon", "body", "offhand"],
    [undefined, "legs", undefined],
    ["hands", "feet", "ring"],
];

type Tip = { item: ItemView; x: number; y: number; compare?: ItemView; hint?: string; side?: "left" | "right" };

// An item being dragged: from a place in the pack, a worn slot or a place in the belt, and where
// the pointer is. It's a drag once the pointer's moved a few pixels; till then it's a press.
type DragFrom = { index: number } | { slot: Slot } | { belt: number };
type Drag = { from: DragFrom; item: ItemView; startX: number; startY: number; x: number; y: number; on: boolean };
const DRAG_START = 4;

// What the Gems page shows, in this order
const SOCKET_SLOTS: Slot[] = ["weapon", "offhand", "head", "body", "legs", "hands", "feet", "cape"];

// An item's picture: its own, and a skill gem's skill small in its corner, so a gem is always a
// gem (of its socket's colour) and still says which skill it gives
function ItemPic({ item, size }: { item: ItemView; size: number }): JSX.Element {
    return (
        <>
            <ItemIcon objId={item.info.objId} size={size} />
            {item.info.skillIcon && (
                <span className="gem-skill">
                    <SkillPic icon={item.info.skillIcon} size={Math.round(size * 0.62)} />
                </span>
            )}
        </>
    );
}

type InventoryProps = {
    pack: Pack;
    hud: Hud;
    mode?: "trading" | "stashing" | "hiring";
    stashTab: number;
    tab: PackTab;
    setTab: (tab: PackTab) => void;
    client: Client;
};

function Inventory({ pack, hud, mode, stashTab, tab, setTab, client }: InventoryProps): JSX.Element {
    const trading = mode === "trading";
    const [tip, setTip] = useState<Tip>();
    const [runeTip, setRuneTip] = useState<{ rune: RuneView; x: number; y: number }>();
    // A gem in the pack chosen to go in a socket, by its place there
    const [chosen, setChosen] = useState<number>();
    // A rune taken from the pouch, to use on the next item clicked
    const [held, setHeld] = useState<RuneId>();
    const show = (e: ReactMouseEvent, item: ItemView, compare?: ItemView, hint?: string) => setTip({ item, x: e.clientX, y: e.clientY, compare, hint });
    const hide = () => {
        setTip(undefined);
        setRuneTip(undefined);
    };
    useEffect(() => hide(), [pack]);
    useEffect(() => {
        if (chosen !== undefined && !pack.inventory[chosen]?.gem) {
            setChosen(undefined);
        }
    }, [pack, chosen]);
    useEffect(() => {
        if (held && (pack.runes.find((r) => r.id === held)?.count ?? 0) < 1) {
            setHeld(undefined);
        }
    }, [pack, held]);
    useEffect(() => setChosen(undefined), [tab]);
    // Gear's dragged to be worn or taken off, as Path of Exile's is: onto its slot on the paper
    // doll, or back into the pack. What's under the pointer when it's let go says where it went.
    const [drag, setDrag] = useState<Drag>();
    const dragRef = useRef<Drag | undefined>(undefined);
    dragRef.current = drag;
    const dragging = drag !== undefined;
    useEffect(() => {
        if (!dragging) {
            return;
        }
        const onMove = (e: PointerEvent) =>
            setDrag((d) => d && { ...d, x: e.clientX, y: e.clientY, on: d.on || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > DRAG_START });
        const onUp = (e: PointerEvent) => {
            const d = dragRef.current;
            setDrag(undefined);
            if (!d?.on) {
                return;
            }
            const target = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>("[data-drop]")?.dataset.drop;
            const [kind, at] = target?.split(":") ?? [];
            if ("index" in d.from) {
                if (kind === "slot") {
                    client.equipInto(d.from.index, at as Slot);
                } else if (kind === "belt") {
                    client.beltInto(d.from.index, Number(at));
                } else if (kind === "pack") {
                    client.movePack(d.from.index, Number(at));
                } else if (kind === "hire") {
                    client.giveHireling(d.from.index);
                }
            } else if ("belt" in d.from) {
                if (kind === "pack") {
                    client.beltTo(d.from.belt, Number(at));
                }
            } else if (kind === "pack") {
                client.unequipTo(d.from.slot, Number(at));
            }
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
        return () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onUp);
        };
    }, [dragging, client]);
    const startDrag = (e: ReactPointerEvent, from: DragFrom, item: ItemView) => {
        if (e.button !== 0 || held) {
            return;
        }
        e.preventDefault();
        setDrag({ from, item, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, on: false });
    };
    const dragOn = drag?.on ? drag : undefined;
    const chosenGem = chosen !== undefined ? pack.inventory[chosen] ?? undefined : undefined;
    const heldRune = held ? pack.runes.find((r) => r.id === held) : undefined;
    // The held rune on something, kept in hand with Shift
    const applyHeld = (e: ReactMouseEvent, target: { index: number } | { slot: Slot } | { belt: number }) => {
        client.useRune(held!, target);
        if (!e.shiftKey) {
            setHeld(undefined);
        }
    };
    // How an item's slot looks with a rune held: lit if the rune works on it, dim if not
    const runeClass = (item: ItemView | null | undefined) => (held && item ? (item.runeWhy[held] ? "rune-no" : "rune-fits") : "");
    const runeHint = (item: ItemView) => (held ? (item.runeWhy[held] ?? `Click to use your ${heldRune?.name} on it · Shift-click to keep it in hand`) : undefined);
    const gold = stackText(hud.gold);
    const carried = pack.inventory.filter((x) => x).length;
    // The worn equipment tab's stone square, under each slot
    const tile = useSprite(SLOT_TILE);
    const tileStyle = tile ? { backgroundImage: `url(${tile})` } : undefined;
    return (
        <div className={`panel rs-background inventory ui-modal ${held ? "holding-rune" : ""}`} onMouseLeave={hide}>
            <PanelHead title="Your pack" onClose={() => client.setPanel(undefined)} />
            <div className="tabs">
                <StoneTab on={tab === "gear"} onClick={() => setTab("gear")}>
                    Gear
                </StoneTab>
                <StoneTab on={tab === "gems"} onClick={() => setTab("gems")}>
                    Gems
                </StoneTab>
                <StoneTab on={tab === "stats"} onClick={() => setTab("stats")}>
                    Character
                </StoneTab>
                <StoneTab on={tab === "pouch"} onClick={() => setTab("pouch")} title="Your pouch: runes, herbs and spoils">
                    Pouch
                </StoneTab>
                <span className="gold" data-tip={`${hud.gold} gold`}>
                    <ItemIcon objId={COINS} count={Math.max(1, hud.gold)} size={24} />
                    <span style={{ color: gold.color }}>{gold.text}</span>
                </span>
            </div>
            <div className="pack-page">
                {tab === "gear" && (
                    <div className="paper-doll">
                        {PAPER_DOLL.map((row, r) => (
                            <div key={r} className="doll-row">
                                {row.map((slot, c) => {
                                    if (!slot) {
                                        return <div key={c} className="doll-gap" />;
                                    }
                                    const item = pack.equipment[slot];
                                    const hint = item ? (runeHint(item) ?? "Drag it into your pack to take it off") : "";
                                    // While gear's dragged, the slot it goes in is lit
                                    const drop = dragOn && "index" in dragOn.from && dragOn.item.info.slot !== "potion" ? (!dragOn.item.info.key && dragOn.item.info.slot === slot ? "drop-ok" : "drop-no") : "";
                                    const lifted = dragOn && "slot" in dragOn.from && dragOn.from.slot === slot ? "lifted" : "";
                                    return (
                                        <div
                                            key={c}
                                            data-drop={`slot:${slot}`}
                                            className={`slot doll ${tile ? "tiled" : ""} ${item ? item.rarity : "empty"} ${runeClass(item)} ${drop} ${lifted}`}
                                            style={tileStyle}
                                            data-tip={item ? undefined : SLOT_NAMES[slot]}
                                            onMouseEnter={(e) => item && !dragOn && show(e, item, undefined, hint)}
                                            onMouseMove={(e) => item && !dragOn && show(e, item, undefined, hint)}
                                            onMouseLeave={hide}
                                            onPointerDown={(e) => {
                                                if (item) {
                                                    hide();
                                                    startDrag(e, { slot }, item);
                                                }
                                            }}
                                            onClick={(e) => {
                                                if (item && held) {
                                                    applyHeld(e, { slot });
                                                }
                                            }}
                                            onContextMenu={(e) => {
                                                e.preventDefault();
                                                setHeld(undefined);
                                            }}
                                        >
                                            {item ? (
                                                <ItemIcon objId={item.info.objId} size={32} />
                                            ) : (
                                                <Sprite id={SLOT_SPRITE[slot]} className="slot-shape" fallback={<span className="slot-name">{SLOT_NAMES[slot]}</span>} />
                                            )}
                                            {item?.sockets && <SocketDots sockets={item.sockets} />}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                        <div className="doll-row belt-row">
                            {pack.potions.map((item, i) => {
                                // A place not open yet: dark, with what opens it
                                const shut = pack.beltShut[i];
                                const fits =
                                    dragOn && "index" in dragOn.from && dragOn.item.info.slot === "potion"
                                        ? !shut && (i === 0 ? dragOn.item.info.potion?.family === "life" : i === 1 ? dragOn.item.info.potion?.family === "mana" : true)
                                        : undefined;
                                const drop = fits === undefined ? "" : fits ? "drop-ok" : "drop-no";
                                const lifted = dragOn && "belt" in dragOn.from && dragOn.from.belt === i ? "lifted" : "";
                                const hint = item ? (runeHint(item) ?? (shut ? `${shut} · Drag it into your pack to take it out` : `Drunk with ${hud.potions[i]?.key ?? i + 1} · Drag it into your pack to take it out`)) : "";
                                return (
                                    <div
                                        key={i}
                                        data-drop={`belt:${i}`}
                                        className={`slot doll belt-place ${item ? item.rarity : "empty"} ${shut ? "shut" : ""} ${runeClass(item)} ${drop} ${lifted}`}
                                        data-tip={item ? undefined : shut ? `Belt ${i + 1}: not open yet\n${shut}` : `Belt ${i + 1}: ${i === 0 ? "a life potion" : i === 1 ? "a mana potion" : "any potion"}`}
                                        onMouseEnter={(e) => item && !dragOn && show(e, item, undefined, hint)}
                                        onMouseMove={(e) => item && !dragOn && show(e, item, undefined, hint)}
                                        onMouseLeave={hide}
                                        onPointerDown={(e) => {
                                            if (item) {
                                                hide();
                                                startDrag(e, { belt: i }, item);
                                            }
                                        }}
                                        onClick={(e) => {
                                            if (item && held) {
                                                applyHeld(e, { belt: i });
                                            }
                                        }}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            setHeld(undefined);
                                        }}
                                    >
                                        {(item || !shut) && (
                                            <span className={item ? "" : "belt-vial"}>
                                                <ItemIcon objId={item ? item.info.objId : VIAL} size={32} />
                                            </span>
                                        )}
                                        <span className="belt-number">{i + 1}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                {tab === "gems" && (
                    <div className="gem-page">
                        {SOCKET_SLOTS.map((slot) => {
                            const item = pack.equipment[slot];
                            if (!item?.sockets || item.sockets.length === 0) {
                                return null;
                            }
                            return (
                                <div key={slot} className="socket-row">
                                    <div
                                        className={`slot small ${item.tone ?? item.rarity}`}
                                        onMouseEnter={(e) => show(e, item)}
                                        onMouseMove={(e) => show(e, item)}
                                        onMouseLeave={hide}
                                    >
                                        <ItemIcon objId={item.info.objId} size={24} />
                                    </div>
                                    <div className="socket-list">
                                        {item.sockets.map((socket, i) => {
                                            const fits = !!chosenGem?.gem && (socket.color === "white" || socket.color === chosenGem.gem.color);
                                            const hint = chosenGem ? (fits ? `Click to set ${chosenGem.info.name} here` : "Not this colour") : "Click to take it out";
                                            return (
                                                <Fragment key={i}>
                                                    <div
                                                        className={`socket ${socket.gem ? "full" : ""} ${chosenGem ? (fits ? "fits" : "no") : ""}`}
                                                        style={{ borderColor: SOCKET_COLOR[socket.color], background: socket.gem ? undefined : `${SOCKET_COLOR[socket.color]}22` }}
                                                        onMouseEnter={(e) => socket.gem && show(e, socket.gem, undefined, hint)}
                                                        onMouseMove={(e) => socket.gem && show(e, socket.gem, undefined, hint)}
                                                        onMouseLeave={hide}
                                                        onClick={() => {
                                                            if (chosen !== undefined && chosenGem) {
                                                                client.socketInto(chosen, slot, i);
                                                                setChosen(undefined);
                                                            } else if (socket.gem) {
                                                                client.unsocket(slot, i);
                                                            }
                                                        }}
                                                    >
                                                        {socket.gem && <ItemPic item={socket.gem} size={24} />}
                                                        {socket.gem?.gem && <span className="gem-level">{socket.gem.gem.level}</span>}
                                                        {socket.gem?.gem?.why && <span className="gem-warn">!</span>}
                                                    </div>
                                                    {i < item.sockets!.length - 1 && <div className={`socket-link ${socket.linked ? "on" : ""}`} />}
                                                </Fragment>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                        <div className="gem-help">
                            {chosenGem
                                ? `Click a ${chosenGem.gem?.color} or white socket for ${chosenGem.info.name}, or the gem again to set it where it fits best.`
                                : "Click a gem in your pack, then a socket. Supports work on the skills they're linked to. Click a gem in a socket to take it out."}
                        </div>
                    </div>
                )}
                {tab === "stats" && (
                    <div className="stats">
                        {pack.stats.map((s) => (
                            <div key={s.label} className="stat-row">
                                <span>{s.label}</span>
                                <span className="stat-value">{s.value}</span>
                            </div>
                        ))}
                    </div>
                )}
                {tab === "pouch" && (
                    <div className="pouch">
                        <div className="section-title">Runes</div>
                        <div className="pouch-grid">
                            {pack.runes.map((r) => (
                                <div
                                    key={r.id}
                                    className={`slot rune ${r.count < 1 ? "none" : ""} ${held === r.id ? "held" : ""}`}
                                    onMouseEnter={(e) => setRuneTip({ rune: r, x: e.clientX, y: e.clientY })}
                                    onMouseMove={(e) => setRuneTip({ rune: r, x: e.clientX, y: e.clientY })}
                                    onMouseLeave={hide}
                                    onClick={() => {
                                        if (r.count > 0) {
                                            setChosen(undefined);
                                            setHeld(held === r.id ? undefined : r.id);
                                        }
                                    }}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        setHeld(undefined);
                                    }}
                                >
                                    <ItemIcon objId={r.objId} size={32} />
                                    <StackCount n={r.count} />
                                </div>
                            ))}
                        </div>
                        {/* The herbs, had or not, and the encounters' money and the late game's parts once there are any */}
                        {[
                            { title: "Herbs", goods: pack.goods.filter((g) => !GOODS[g.id].currency) },
                            { title: "Spoils", goods: pack.goods.filter((g) => GOODS[g.id].currency && g.count > 0) },
                        ]
                            .filter(({ goods }) => goods.length > 0)
                            .map(({ title, goods }) => (
                                <Fragment key={title}>
                                    <div className="section-title">{title}</div>
                                    <div className="pouch-grid">
                                        {goods.map((g) => (
                                            <div key={g.id} className={`slot rune ${g.count < 1 ? "none" : ""}`} data-tip={`${g.name}: ${g.count}\n${g.blurb}`}>
                                                <ItemIcon objId={g.objId} size={32} />
                                                <StackCount n={g.count} />
                                            </div>
                                        ))}
                                    </div>
                                </Fragment>
                            ))}
                    </div>
                )}
            </div>
            <div className="grid">
                {pack.inventory.map((item, i) => {
                    const worn = item && !item.gem ? pack.equipment[item.info.slot] : undefined;
                    let hint: string;
                    if (item?.gem && tab === "gems") {
                        hint = chosen === i ? "Click again to set it where it fits best" : "Click to choose it, then click a socket";
                    } else if (item?.gem) {
                        hint = "Click to set it in a socket";
                    } else if (item?.info.key) {
                        hint = item.info.key.kind === "riftstone" ? "Give it to the Archmage to open its rift" : "Bring all four to the Archmage";
                    } else if (item?.info.slot === "talisman") {
                        hint = "Click a socket you've taken on the passive tree to set it there";
                    } else if (item?.info.slot === "potion") {
                        hint = "Drag it onto a place in your belt to carry it";
                    } else {
                        hint = `Drag it onto your ${item ? SLOT_NAMES[item.info.slot].toLowerCase() : ""} slot to wear it`;
                    }
                    hint += trading
                        ? ` · Right-click to sell for ${item?.sell} gold`
                        : mode === "stashing"
                          ? " · Right-click to put it in your stash"
                          : mode === "hiring"
                            ? ` · Right-click to give it ${pack.hireling?.name}`
                            : " · Right-click to drop";
                    if (item && held) {
                        hint = runeHint(item)!;
                    }
                    return (
                        <div
                            key={i}
                            data-drop={`pack:${i}`}
                            className={`slot ${item ? (item.tone ?? item.rarity) : "empty"} ${item?.why ? "unusable" : ""} ${chosen === i ? "chosen-gem" : ""} ${runeClass(item)} ${dragOn && "index" in dragOn.from && dragOn.from.index === i ? "lifted" : ""}`}
                            onMouseEnter={(e) => item && !dragOn && show(e, item, worn, hint)}
                            onMouseMove={(e) => item && !dragOn && show(e, item, worn, hint)}
                            onMouseLeave={hide}
                            onPointerDown={(e) => {
                                // Gear's dragged; a gem's clicked into a socket, as it always was
                                if (item && !item.gem) {
                                    hide();
                                    setChosen(undefined);
                                    startDrag(e, { index: i }, item);
                                }
                            }}
                            onClick={(e) => {
                                if (!item) {
                                    return;
                                }
                                if (held) {
                                    applyHeld(e, { index: i });
                                    return;
                                }
                                if (!item.gem) {
                                    return;
                                }
                                if (tab === "gems" && chosen !== i) {
                                    setChosen(i);
                                    return;
                                }
                                setChosen(undefined);
                                client.equip(i);
                            }}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                if (held) {
                                    setHeld(undefined);
                                    return;
                                }
                                if (!item) {
                                    return;
                                }
                                if (trading) {
                                    client.sell(i);
                                } else if (mode === "stashing") {
                                    client.stash(i, stashTab);
                                } else if (mode === "hiring") {
                                    client.giveHireling(i);
                                } else {
                                    client.discard(i);
                                }
                            }}
                        >
                            {item && <ItemPic item={item} size={32} />}
                            {item?.gem && <span className="gem-level">{item.gem.level}</span>}
                            {item?.sockets && !item.gem && <SocketDots sockets={item.sockets} />}
                        </div>
                    );
                })}
            </div>
            <div className="pack-foot">
                {heldRune ? (
                    <span className="rune-help" style={{ color: heldRune.color }}>
                        {heldRune.name} in hand: click an item to use it. Right-click to put it back.
                    </span>
                ) : (
                    <span className="rune-help">
                        {trading
                            ? "Right-click to sell."
                            : mode === "stashing"
                              ? "Right-click to stash."
                              : mode === "hiring"
                                ? `Right-click to give it ${pack.hireling?.name}.`
                                : tab === "pouch"
                                  ? "Click a rune, then an item."
                                  : "Runes are in the Pouch."}
                    </span>
                )}
                <span className={carried >= HERO.inventorySize ? "bad" : ""}>
                    {carried} / {HERO.inventorySize}
                </span>
            </div>
            {tip && !dragOn && <Tooltip tip={tip} />}
            {runeTip && !tip && <RuneTooltip rune={runeTip.rune} x={runeTip.x} y={runeTip.y} held={held === runeTip.rune.id} />}
            {dragOn && <DragGhost drag={dragOn} />}
        </div>
    );
}

// A stack's number at a slot's top left, as the client writes and colours it
function StackCount({ n }: { n: number }): JSX.Element {
    const { text, color } = stackText(n);
    return (
        <span className="stack-count" style={{ color }}>
            {text}
        </span>
    );
}

// What's being dragged, under the pointer
function DragGhost({ drag }: { drag: Drag }): JSX.Element {
    const scale = currentScale();
    return (
        <div className={`drag-ghost slot ${drag.item.tone ?? drag.item.rarity}`} style={{ left: drag.x / scale - 19, top: drag.y / scale - 18 }}>
            <ItemPic item={drag.item} size={32} />
        </div>
    );
}

// A tab along a panel's top, on red stone when it's the one showing
function StoneTab({ on, onClick, title, children }: { on: boolean; onClick: () => void; title?: string; children: ReactNode }): JSX.Element {
    return (
        <button className={`stone-tab ${on ? "on" : ""}`} data-tip={title} onClick={onClick}>
            {children}
        </button>
    );
}

// What the UI's zoomed by, to place what's under the mouse
// The game's own tooltip for whatever has a data-tip under the mouse, never the browser's: the
// OSRS client's dark box beside the pointer, its first line a heading. Read from the element
// under the mouse, so a disabled button (which gets no events of its own) still shows its why.
function HoverTip(): JSX.Element | null {
    const [tip, setTip] = useState<{ text: string; x: number; y: number }>();
    useEffect(() => {
        let last: { text: string; x: number; y: number } | undefined;
        const set = (next: typeof last) => {
            if (next?.text !== last?.text || next?.x !== last?.x || next?.y !== last?.y) {
                last = next;
                setTip(next);
            }
        };
        // Where the pointer is, and what's under it there
        let at: { x: number; y: number } | undefined;
        const look = () => {
            const under = at && document.elementFromPoint(at.x, at.y);
            const text = under?.closest("[data-tip]")?.getAttribute("data-tip");
            set(text && at ? { text, x: at.x, y: at.y } : undefined);
        };
        const move = (e: PointerEvent) => {
            if (e.pointerType === "touch") {
                return;
            }
            at = { x: e.clientX, y: e.clientY };
            look();
        };
        const hide = () => {
            at = undefined;
            set(undefined);
        };
        // And again now and then with the pointer still: a panel opened over the thing, or its
        // words changed (a key set again), shows at once
        const again = window.setInterval(() => last && look(), 250);
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerdown", hide);
        window.addEventListener("blur", hide);
        document.addEventListener("pointerleave", hide);
        return () => {
            window.clearInterval(again);
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerdown", hide);
            window.removeEventListener("blur", hide);
            document.removeEventListener("pointerleave", hide);
        };
    }, []);
    if (!tip) {
        return null;
    }
    const [head, ...rest] = tip.text.split("\n");
    return (
        <Floating x={tip.x} y={tip.y + 24} side="right" className="hover-tip">
            <div className="hover-tip-box">
                <div className={rest.length > 0 ? "hover-tip-head" : "hover-tip-line"}>{head}</div>
                {rest.map((line, i) => (
                    <div key={i} className="hover-tip-line">
                        {line}
                    </div>
                ))}
            </div>
        </Floating>
    );
}

function currentScale(): number {
    const contents = document.querySelector(".ui-contents");
    return (contents && parseFloat(getComputedStyle(contents).getPropertyValue("--ui-scale"))) || 1;
}

// Something shown beside the mouse, on the side it's asked for if it fits there, else the other,
// and kept on the screen
function Floating({ x, y, side, className, children }: { x: number; y: number; side?: "left" | "right"; className?: string; children: ReactNode }): JSX.Element {
    const ref = useRef<HTMLDivElement>(null);
    const [box, setBox] = useState({ w: 0, h: 0 });
    useLayoutEffect(() => {
        const el = ref.current;
        if (el && (el.offsetWidth !== box.w || el.offsetHeight !== box.h)) {
            setBox({ w: el.offsetWidth, h: el.offsetHeight });
        }
    });
    const scale = currentScale();
    const mx = x / scale;
    const my = y / scale;
    const screenW = window.innerWidth / scale;
    const screenH = window.innerHeight / scale;
    const rightOf = mx + 16;
    const leftOf = mx - 16 - box.w;
    let left = side === "right" ? rightOf : leftOf;
    if (left + box.w > screenW - 8) {
        left = leftOf;
    }
    if (left < 8) {
        left = rightOf + box.w <= screenW - 8 ? rightOf : 8;
    }
    const top = Math.max(8, Math.min(my - 40, screenH - box.h - 8));
    const leftward = left < mx;
    return (
        <div ref={ref} className={`tooltip ${leftward ? "leftward" : ""} ${className ?? ""}`} style={{ position: "fixed", left, top }}>
            {children}
        </div>
    );
}

// A rune's card: what it does, and how many are in the pouch
// A rune in the pouch or the shop, or a task's reward (`reward`: so many, and nothing to click)
function RuneTooltip({ rune, x, y, held, side, reward }: { rune: RuneView; x: number; y: number; held: boolean; side?: "right"; reward?: boolean }): JSX.Element {
    return (
        <Floating x={x} y={y} side={side ?? "left"}>
            <div className="tooltip-main">
                <div className="item-card">
                    <div className="card-name" style={{ color: rune.color }}>
                        {rune.name}
                    </div>
                    <div className="card-line dim">
                        {reward ? `Rune · ${rune.count} of them, as your reward` : `Rune · ${rune.count} in your pouch${rune.price !== undefined ? ` · ${rune.price} gold each` : ""}`}
                    </div>
                    <div className="card-sep" />
                    <div className="card-line mod">{rune.blurb}</div>
                    <div className="card-line dim">Rolls use the item's own level. Uniques and gems can't be changed.</div>
                </div>
                {!reward && (
                    <div className="card-hint">
                        {rune.price !== undefined
                            ? "Click to buy one"
                            : rune.count < 1
                              ? "None in your pouch. They drop in the rifts."
                              : held
                                ? "Click to put it back"
                                : "Click to take it, then click an item"}
                    </div>
                )}
            </div>
        </Floating>
    );
}

// The banker's stash, beside the pack: tabs the pack's size. Click to take something out;
// right-click in the pack to put something in the tab that's showing.
function Stash({ pack, tab, setTab, client }: { pack: Pack; tab: number; setTab: (tab: number) => void; client: Client }): JSX.Element {
    const [tip, setTip] = useState<Tip>();
    const hide = () => setTip(undefined);
    useEffect(() => hide(), [pack]);
    const stash = pack.stash ?? [];
    const start = tab * STASH.tabSize;
    const shown = stash.slice(start, start + STASH.tabSize);
    return (
        <div className="panel rs-background trader stash ui-modal" onMouseLeave={hide}>
            <PanelHead title="Your stash" onClose={() => client.setPanel(undefined)} />
            <Dialogue speaker={BANKER.name} text={BANKER.greeting} />
            <div className="tabs">
                {Array.from({ length: STASH.tabs }, (_, t) => {
                    const used = stash.slice(t * STASH.tabSize, (t + 1) * STASH.tabSize).filter((x) => x).length;
                    return (
                        <StoneTab key={t} on={tab === t} title={`${used} / ${STASH.tabSize}`} onClick={() => setTab(t)}>
                            Tab {t + 1}
                        </StoneTab>
                    );
                })}
            </div>
            <div className="grid">
                {shown.map((item, i) => {
                    const worn = item && !item.gem ? pack.equipment[item.info.slot] : undefined;
                    const at = start + i;
                    const show = (e: ReactMouseEvent) => item && setTip({ item, x: e.clientX, y: e.clientY, compare: worn, hint: "Click to take it out", side: "right" });
                    return (
                        <div
                            key={at}
                            className={`slot ${item ? (item.tone ?? item.rarity) : "empty"} ${item?.why ? "unusable" : ""}`}
                            onMouseEnter={show}
                            onMouseMove={show}
                            onMouseLeave={hide}
                            onClick={() => item && client.unstash(at)}
                        >
                            {item && <ItemPic item={item} size={32} />}
                            {item?.gem && <span className="gem-level">{item.gem.level}</span>}
                            {item?.sockets && !item.gem && <SocketDots sockets={item.sockets} />}
                        </div>
                    );
                })}
            </div>
            <div className="pack-foot">
                <span className="rune-help">Right-click in your pack to put things here.</span>
                <span>
                    {shown.filter((x) => x).length} / {STASH.tabSize}
                </span>
            </div>
            {tip && <Tooltip tip={tip} />}
        </div>
    );
}

// The hireling's panel, beside the pack (content/hirelings.ts): who it is, its numbers, and what it
// wears, given by dragging or right-clicking in the pack and taken back with a click. Spoken to, the
// Captain's besides: the kinds for hire, a fallen one raised, and sending one away.
const HIRE_SLOT_NAMES: Record<HirelingSlot, string> = { weapon: "Weapon", head: "Helm", body: "Body" };

function HirelingPanel({ pack, atCaptain, client }: { pack: Pack; atCaptain: boolean; client: Client }): JSX.Element {
    const [tip, setTip] = useState<Tip>();
    const hide = () => setTip(undefined);
    useEffect(() => hide(), [pack]);
    const hire = pack.hireling;
    const captain = atCaptain ? pack.captain : undefined;
    return (
        <div className="panel rs-background trader hireling-panel ui-modal" onMouseLeave={hide}>
            <PanelHead title={atCaptain ? HIRELING.captain.name : (hire?.name ?? "Hireling")} onClose={() => client.setPanel(undefined)} />
            {atCaptain && <Dialogue speaker={HIRELING.captain.name} text={hire?.dead ? HIRELING.captain.raise : HIRELING.captain.greeting} />}
            {hire ? (
                <>
                    <div className="hire-head">
                        <span className="zone-name">
                            {hire.name}, {hire.title}
                        </span>
                        <span className="dim">
                            Level {hire.level}. {hire.text}.
                        </span>
                    </div>
                    {hire.dead && <div className="bad">Fallen. {atCaptain ? "" : "The Mercenary Captain, at the barracks by the south gate, can raise them."}</div>}
                    {hire.own && <div className="dim">With no weapon given them, they fight with their own: {hire.own.toLowerCase()}.</div>}
                    <div className="hire-gear">
                        {HIRELING_SLOTS.map((slot) => {
                            const item = hire.equipment[slot];
                            const show = (e: ReactMouseEvent) => item && setTip({ item, x: e.clientX, y: e.clientY, hint: "Click to take it back", side: "right" });
                            return (
                                <div key={slot} className="hire-slot">
                                    <div
                                        data-drop={`hire:${slot}`}
                                        className={`slot ${item ? (item.tone ?? item.rarity) : "empty"}`}
                                        onMouseEnter={show}
                                        onMouseMove={show}
                                        onMouseLeave={hide}
                                        onClick={() => item && client.takeFromHireling(slot)}
                                    >
                                        {item && <ItemPic item={item} size={32} />}
                                    </div>
                                    <span className="dim">{HIRE_SLOT_NAMES[slot]}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="stats">
                        {[
                            { label: "Life", value: hire.dead ? `0 / ${hire.maxLife}` : `${hire.life} / ${hire.maxLife}` },
                            { label: "Armour", value: `${hire.armour}` },
                            { label: "Damage", value: hire.damage },
                            { label: "Blows a second", value: hire.blows },
                            { label: "Damage a second", value: `${hire.dps}` },
                        ].map((s) => (
                            <div key={s.label} className="stat-row">
                                <span>{s.label}</span>
                                <span className="stat-value">{s.value}</span>
                            </div>
                        ))}
                    </div>
                    {captain && (
                        <div className="hire-actions">
                            {hire.dead && (
                                <button className="ui-button ui-main" onClick={() => client.raiseHireling()}>
                                    Raise for {captain.raiseCost} coins
                                </button>
                            )}
                            <button className="ui-button" onClick={() => client.dismissHireling()}>
                                Send {hire.name} away
                            </button>
                        </div>
                    )}
                </>
            ) : (
                !atCaptain && <div className="dim">You have no hireling. The Mercenary Captain, at the barracks by the south gate, has some for hire.</div>
            )}
            {captain && (
                <>
                    <div className="zone-name">For hire, at your level</div>
                    {captain.offers.map((o) => (
                        <div key={o.kind} className="hire-offer">
                            <div className="hire-offer-text">
                                <span className="zone-name">{o.name}</span>
                                <span>{o.text}.</span>
                                <span className="dim">
                                    {o.life} life. Fights with {o.weapon.toLowerCase()}.
                                </span>
                            </div>
                            <button className="ui-button" onClick={() => client.hireHireling(o.kind)}>
                                Hire for {captain.hireCost}
                            </button>
                        </div>
                    ))}
                    {hire && <div className="dim">Hiring another sends {hire.name} away, and what they wear comes back to you.</div>}
                </>
            )}
            {hire && <div className="dim">Drag gear onto a slot, or right-click it in your pack, to give it them: a weapon of their kind, a helm and a body. Their looks stay their own.</div>}
            {tip && <Tooltip tip={tip} />}
        </div>
    );
}

// Someone speaking, as the client's chatbox has it: their name in red over their words, on parchment
function Dialogue({ speaker, text }: { speaker: string; text: ReactNode }): JSX.Element {
    return (
        <div className="dialogue">
            <div className="dialogue-name">{speaker}</div>
            <div className="dialogue-text">{text}</div>
        </div>
    );
}

// An item's sockets small, along its slot's foot: a dot each, joined where linked
function SocketDots({ sockets }: { sockets: SocketView[] }): JSX.Element {
    return (
        <div className="socket-dots">
            {sockets.map((s, i) => (
                <Fragment key={i}>
                    <span className={`dot ${s.gem ? "full" : ""}`} style={{ background: SOCKET_COLOR[s.color] }} />
                    {s.linked && i < sockets.length - 1 && <span className="dot-link" />}
                </Fragment>
            ))}
        </div>
    );
}

function ItemCard({ item, label }: { item: ItemView; label?: string }): JSX.Element {
    if (item.gem) {
        return <GemCard item={item} label={label} />;
    }
    const info = item.info;
    const w = info.weapon;
    return (
        <div className={`item-card ${item.tone ?? item.rarity}`}>
            {label && <div className="card-label">{label}</div>}
            <div className="card-name" style={{ color: item.color }}>
                {info.name}
            </div>
            {(item.rarity === "rare" || item.rarity === "unique" || info.runeword || info.key?.kind === "riftstone") && info.key?.kind !== "shard" && (
                <div className="card-base" style={{ color: item.color }}>
                    {info.baseName}
                </div>
            )}
            <div className="card-line dim">
                {info.key ? (info.key.kind === "riftstone" ? `Riftstone · rift ${info.key.depth}` : "Key to the Heart of the Rift") : `${SLOT_NAMES[info.slot]} · item level ${item.itemLevel}`}
            </div>
            {(w || (info.armour !== undefined && info.armour > 0) || (item.sockets && item.sockets.length > 0)) && <div className="card-sep" />}
            {w && (
                <div className="card-line">
                    {w.damage[0]}-{w.damage[1]} damage · {w.speed.toFixed(2)} attacks a second
                </div>
            )}
            {info.armour !== undefined && info.armour > 0 && <div className="card-line">{info.armour} armour</div>}
            {item.sockets && item.sockets.length > 0 && (
                <div className="card-sockets">
                    <SocketDots sockets={item.sockets} />
                    <span className="dim">
                        {" "}
                        {item.sockets.filter((s) => s.gem).length}/{item.sockets.length} gems
                    </span>
                </div>
            )}
            {item.implicit.length > 0 && <div className="card-sep" />}
            {item.implicit.map((line, i) => (
                <div key={`i${i}`} className="card-line implicit">
                    {line}
                </div>
            ))}
            {item.lines.length > 0 && <div className="card-sep" />}
            {item.lines.map((line, i) =>
                item.rift.includes(line) ? (
                    <div key={i} className="card-line mod rift" style={{ color: RIFT_COLOR }} data-tip="Rift-touched: a seventh tier, only from the ladder">
                        {line} ✦
                    </div>
                ) : (
                    <div key={i} className="card-line mod">
                        {line}
                    </div>
                ),
            )}
            {info.powers && info.powers.length > 0 && <div className="card-sep" />}
            {info.powers?.map((line, i) => (
                <div key={`p${i}`} className="card-line trait" style={{ color: TRAIT_COLOR }}>
                    {line}
                </div>
            ))}
            {info.enchant && (
                <>
                    <div className="card-sep" />
                    <div className="card-line enchant">Enchanted: {info.enchant.name}</div>
                    {info.enchant.lines.map((line, i) => (
                        <div key={`e${i}`} className="card-line enchant">
                            {line}
                        </div>
                    ))}
                </>
            )}
            {item.set && (
                <>
                    <div className="card-sep" />
                    <div className="card-line set-name" style={{ color: SET_COLOR }}>
                        {item.set.name}
                    </div>
                    {item.set.pieces.map((p, i) => (
                        <div key={`s${i}`} className={`card-line set-piece ${p.worn ? "" : "dim"}`} style={p.worn ? { color: SET_COLOR } : undefined}>
                            {p.name}
                        </div>
                    ))}
                    {item.set.bonuses.map((b, i) =>
                        b.lines.map((line, j) => (
                            <div key={`b${i}:${j}`} className={`card-line set-bonus ${b.active ? "" : "dim"}`} style={b.active ? { color: SET_COLOR } : undefined}>
                                ({b.pieces}) {line}
                            </div>
                        )),
                    )}
                </>
            )}
            {info.lore && <div className="card-lore">{info.lore}</div>}
            {info.slot === "talisman" && <div className="card-line dim">Set it in a socket on your passive tree.</div>}
            {info.slot === "potion" && <div className="card-line dim">Carry it in your belt, and drink it with 1 to 4.</div>}
            {(info.level > 1 || item.why) && <div className="card-sep" />}
            {info.level > 1 && <div className={`card-line ${item.why ? "bad" : "dim"}`}>Requires level {info.level}</div>}
            {item.why && <div className="card-line bad">{item.why}</div>}
        </div>
    );
}

// A gem: what kind, its level and how far to the next, what it does as the hero has it
function GemCard({ item, label }: { item: ItemView; label?: string }): JSX.Element {
    const g = item.gem!;
    return (
        <div className="item-card gem">
            {label && <div className="card-label">{label}</div>}
            <div className="card-name" style={{ color: g.forged ? FORGED_COLOR : RARITY_COLOR.gem }}>
                {item.info.name}
            </div>
            <div className="card-line dim">
                <span className="gem-colour" style={{ background: SOCKET_COLOR[g.color] }} /> {g.support ? "Support gem" : g.forged ? "Forged skill gem" : "Skill gem"} · level{" "}
                {g.level}/{g.maxLevel}
            </div>
            <div className="card-line tags">{g.tags.join(", ")}</div>
            {g.description && <div className="card-line">{g.description}</div>}
            {g.traits.length > 0 && <div className="card-sep" />}
            {g.traits.map((line, i) => (
                <div key={`t${i}`} className="card-line trait" style={{ color: TRAIT_COLOR }}>
                    {line}
                </div>
            ))}
            {g.lines.length > 0 && <div className="card-sep" />}
            {g.lines.map((line, i) => (
                <div key={i} className="card-line mod">
                    {line}
                </div>
            ))}
            {g.links?.map((line, i) => (
                <div key={`l${i}`} className="card-line implicit">
                    {line}
                </div>
            ))}
            <div className="card-sep" />
            {g.xpNext > 0 ? (
                <div className="card-line dim">
                    Experience {g.xp} / {g.xpNext} · next level needs hero level {g.nextRequires}
                </div>
            ) : (
                <div className="card-line dim">Its highest level</div>
            )}
            {g.requires > 1 && <div className={`card-line ${g.why ? "bad" : "dim"}`}>Requires level {g.requires}</div>}
            {g.why && g.requires <= 1 && <div className="card-line bad">{g.why}</div>}
            {g.blurb && <div className="card-lore">{g.blurb}</div>}
            <div className="card-line dim">Gems in what you wear learn from every kill.</div>
        </div>
    );
}

// An item's card beside the mouse, with what's worn in its slot beside it to compare
function Tooltip({ tip }: { tip: Tip }): JSX.Element {
    return (
        <Floating x={tip.x} y={tip.y} side={tip.side ?? "left"}>
            <div className="tooltip-main">
                <ItemCard item={tip.item} />
                {tip.hint && <div className="card-hint">{tip.hint}</div>}
            </div>
            {tip.compare && tip.compare.uid !== tip.item.uid && <ItemCard item={tip.compare} label="Wearing now" />}
        </Floating>
    );
}

// ---- The city: its shops and the Archmage ----

const GAMBLE_SLOTS: Slot[] = ["weapon", "offhand", "head", "body", "legs", "hands", "feet", "cape", "amulet", "ring"];

function Shop({ shop, pack, hud, client }: { shop: ShopView; pack: Pack; hud: Hud; client: Client }): JSX.Element {
    const [tip, setTip] = useState<Tip>();
    const [runeTip, setRuneTip] = useState<{ rune: RuneView; x: number; y: number }>();
    const hide = () => {
        setTip(undefined);
        setRuneTip(undefined);
    };
    useEffect(() => hide(), [shop]);
    const afford = hud.gold >= pack.gambleCost;
    return (
        <div className={`panel rs-background trader ui-modal ${shop.gems ? "gem-trader" : ""}`} onMouseLeave={hide}>
            <PanelHead title={shop.name} onClose={() => client.setPanel(undefined)} />
            <Dialogue speaker={shop.keeper} text={shop.greeting} />
            {shop.gamble ? (
                <>
                    <div className="section-title">
                        Gamble <span className="dim">· {pack.gambleCost} gold each</span>
                    </div>
                    <div className="dim note">Always magic or better, for your level.</div>
                    <div className="gamble-grid">
                        {GAMBLE_SLOTS.map((slot) => (
                            <button key={slot} className="ui-button small" disabled={!afford} onClick={() => client.gamble(slot)}>
                                {SLOT_NAMES[slot]}
                            </button>
                        ))}
                    </div>
                    {shop.eliteGamble && (
                        <>
                            <div className="section-title">
                                Elite <span className="dim">· level {shop.eliteGamble.level}, {shop.eliteGamble.cost.toLocaleString("en-GB")} gold each</span>
                            </div>
                            <div className="dim note">From past the campaign: at the deepest level you've reached, elite bases where they're made.</div>
                            <div className="gamble-grid">
                                {GAMBLE_SLOTS.map((slot) => (
                                    <button key={slot} className="ui-button small" disabled={hud.gold < shop.eliteGamble!.cost} onClick={() => client.gamble(slot, true)}>
                                        {SLOT_NAMES[slot]}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </>
            ) : shop.stall && shop.stock.length === 0 ? null : (
                <>
                    <div className="section-title">For sale</div>
                    {shop.stock.length === 0 && <div className="dim note">Sold out. New stock comes in while you're in the rifts.</div>}
                    <div className="shop-grid">
                        {shop.stock.map((offer, i) => {
                            const worn = offer.item.gem ? undefined : pack.equipment[offer.item.info.slot];
                            const dear = offer.price > hud.gold;
                            const hint = dear ? `${offer.price} gold · You can't afford it` : `Click to buy for ${offer.price} gold`;
                            const show = (e: ReactMouseEvent) => setTip({ item: offer.item, x: e.clientX, y: e.clientY, compare: worn, hint, side: "right" });
                            return (
                                <div
                                    key={offer.item.uid}
                                    className={`shop-item slot ${offer.item.tone ?? offer.item.rarity} ${offer.item.why ? "unusable" : ""}`}
                                    onMouseEnter={show}
                                    onMouseMove={show}
                                    onMouseLeave={hide}
                                    onClick={() => client.buy(i)}
                                >
                                    <ItemPic item={offer.item} size={32} />
                                    <div className={`price ${dear ? "dear" : ""}`}>{offer.price}</div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
            {shop.runes.length > 0 && (
                <>
                    <div className="section-title">Runes, behind the counter</div>
                    <div className="shop-grid">
                        {shop.runes.map((r) => {
                            const owned = pack.runes.find((p) => p.id === r.id)?.count ?? 0;
                            const view = { ...r, count: owned };
                            const dear = (r.price ?? 0) > hud.gold;
                            const showRune = (e: ReactMouseEvent) => setRuneTip({ rune: view, x: e.clientX, y: e.clientY });
                            return (
                                <div key={r.id} className="shop-item slot rune" onMouseEnter={showRune} onMouseMove={showRune} onMouseLeave={hide} onClick={() => client.buyRune(r.id)}>
                                    <ItemIcon objId={r.objId} size={32} />
                                    <div className={`price ${dear ? "dear" : ""}`}>{r.price}</div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
            {shop.stall && (
                <>
                    <div className="section-title">
                        {shop.stall.title} <span className="dim">· you have {shop.stall.held}</span>
                    </div>
                    <div className="dim note">{shop.stall.text}</div>
                    <div className="shop-grid">
                        {shop.stall.offers.map((offer) => {
                            const worn = pack.equipment[offer.item.info.slot];
                            const dear = offer.price > (shop.stall?.held ?? 0);
                            const hint = dear ? `${offer.price} ${shop.stall?.money} · You haven't enough` : `Click to buy for ${offer.price} ${shop.stall?.money}`;
                            const show = (e: ReactMouseEvent) => setTip({ item: offer.item, x: e.clientX, y: e.clientY, compare: worn, hint, side: "right" });
                            return (
                                <div
                                    key={offer.item.uid}
                                    className={`shop-item slot ${offer.item.tone ?? offer.item.rarity} ${offer.item.why ? "unusable" : ""}`}
                                    onMouseEnter={show}
                                    onMouseMove={show}
                                    onMouseLeave={hide}
                                    onClick={() => client.buySetPiece(offer.id)}
                                >
                                    <ItemPic item={offer.item} size={32} />
                                    <div className={`price ${dear ? "dear" : ""}`}>{offer.price}</div>
                                </div>
                            );
                        })}
                    </div>
                    {shop.stall.upgrades.length > 0 && (
                        <>
                            <div className="section-title">
                                Made elite <span className="dim">· from the piece, and {shop.stall.money}</span>
                            </div>
                            <div className="shop-grid">
                                {shop.stall.upgrades.map((up) => {
                                    const worn = pack.equipment[up.item.info.slot];
                                    const hint = up.why ?? `Click to have your ${up.from} made into it, for ${up.price} ${shop.stall?.money}`;
                                    const show = (e: ReactMouseEvent) => setTip({ item: up.item, x: e.clientX, y: e.clientY, compare: worn, hint, side: "right" });
                                    return (
                                        <div
                                            key={up.to}
                                            className={`shop-item slot ${up.item.tone ?? up.item.rarity} ${up.why ? "unusable" : ""}`}
                                            onMouseEnter={show}
                                            onMouseMove={show}
                                            onMouseLeave={hide}
                                            onClick={() => client.stallUpgrade(up.to)}
                                        >
                                            <ItemPic item={up.item} size={32} />
                                            <div className={`price ${up.why ? "dear" : ""}`}>{up.price}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                    {shop.stall.wares.length > 0 && (
                        <>
                            <div className="section-title">Wares</div>
                            <div className="shop-grid">
                                {shop.stall.wares.map((w) => {
                                    const dear = w.price > (shop.stall?.held ?? 0);
                                    return (
                                        <div
                                            key={w.good}
                                            className="shop-item slot"
                                            data-tip={`${w.name}\n${w.blurb}\n${dear ? `${w.price.toLocaleString("en-GB")} ${shop.stall?.money} · You haven't enough` : `Click to buy for ${w.price.toLocaleString("en-GB")} ${shop.stall?.money}`}`}
                                            onClick={() => client.buyWare(w.good)}
                                        >
                                            <ItemIcon objId={w.objId} size={32} />
                                            <div className={`price ${dear ? "dear" : ""}`}>{w.price >= 1000 ? `${Math.round(w.price / 1000)}k` : w.price}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                    {shop.stall.talismans && (
                        <>
                            <div className="section-title">
                                Talismans <span className="dim">· {shop.stall.talismans.price} {shop.stall.money} each</span>
                            </div>
                            <div className="dim note">{shop.stall.talismans.text}</div>
                            <div className="shop-grid">
                                {shop.stall.talismans.bases.map((b) => {
                                    const dear = shop.stall!.talismans!.price > (shop.stall?.held ?? 0);
                                    return (
                                        <div
                                            key={b.id}
                                            className="shop-item slot"
                                            data-tip={`${b.name}\n${dear ? "You haven't enough" : `Click to buy one, rare, for ${shop.stall?.talismans?.price} ${shop.stall?.money}`}`}
                                            onClick={() => client.buyTalisman(b.id)}
                                        >
                                            <ItemIcon objId={b.objId} size={32} />
                                            <div className={`price ${dear ? "dear" : ""}`}>{shop.stall?.talismans?.price}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </>
            )}
            {shop.apothecary && <BrewingBench bench={shop.apothecary} pack={pack} client={client} />}
            {shop.gems && <SocketBench pack={pack} hud={hud} client={client} />}
            {shop.jeweller ? <JewellerBench bench={shop.jeweller} pack={pack} hud={hud} client={client} /> : shop.enchants && <EnchantBench pack={pack} hud={hud} client={client} />}
            <div className="dim note foot-note">Right-click anything in your pack to sell it. Stock changes each time you come home.</div>
            {tip && <Tooltip tip={tip} />}
            {runeTip && <RuneTooltip rune={runeTip.rune} x={runeTip.x} y={runeTip.y} held={false} side="right" />}
        </div>
    );
}

// The Apothecary's brewing (sim/potions.ts): potions brewed up a grade with herbs, or instilled to
// drink themselves; elixirs to drink before a rift; and the herbs in the pouch, to see what's had
function BrewingBench({ bench, pack, client }: { bench: ApothecaryView; pack: Pack; client: Client }): JSX.Element {
    const herbs = pack.goods.filter((g) => g.count > 0);
    const belt = bench.belt;
    return (
        <>
            {/* Her errand for the belt's next place: what it wants, had or not, and the stitching */}
            <div className="section-title">
                Your belt <span className="dim">· {bench.beltPlaces} of 4 places</span>
            </div>
            {belt ? (
                <>
                    <div className="note">
                        {`"Bring me the ${belt.good.name}, and I'll stitch a ${belt.name} place onto your belt." `}
                        <span className="dim">{belt.good.from}.</span>
                    </div>
                    <div className="bench-row belt-errand">
                        <div className={`slot small ${belt.good.have ? "" : "missing"}`} data-tip={`${belt.good.name}\n${belt.good.have ? "You have it." : `${belt.good.from}.`}`}>
                            <ItemIcon objId={belt.good.objId} size={24} />
                        </div>
                        <div className={`slot small ${belt.herb.have >= belt.herb.count ? "" : "missing"}`} data-tip={`${belt.herb.count} × ${belt.herb.name}\nYou have ${belt.herb.have}.`}>
                            <ItemIcon objId={belt.herb.objId} size={24} />
                            <span className="stack-count">{belt.herb.count}</span>
                        </div>
                        <div className="bench-name" style={{ color: belt.good.color }}>
                            {belt.good.name}
                        </div>
                        <div className="bench-buttons">
                            <button
                                className="ui-button small"
                                disabled={!!belt.why}
                                data-tip={`Stitch a ${belt.name} place onto your belt, for any potion: the ${belt.good.name}, ${belt.herb.count} × ${belt.herb.name} and ${belt.gold} gold.${belt.why ? `\n${belt.why}` : ""}`}
                                onClick={() => client.stitchBelt()}
                            >
                                Stitch it on <span className="bench-cost">{belt.gold}</span>
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <div className="note good">Your belt has all four places.</div>
            )}
            <div className="section-title">Brewing</div>
            <div className="herb-pouch bench-herbs">
                {herbs.length === 0 && <span className="dim note">No herbs yet. They grow in the rifts: pick them up as you go.</span>}
                {herbs.map((g) => (
                    <div key={g.id} className="slot rune herb" data-tip={`${g.name}: ${g.count}\n${g.blurb}`}>
                        <ItemIcon objId={g.objId} size={28} />
                        <span className="stack-count">{g.count}</span>
                    </div>
                ))}
            </div>
            {bench.potions.length === 0 && <div className="dim note">Bring potions in your belt or your pack to brew them.</div>}
            <div className="bench">
                {bench.potions.map((p) => (
                    <div key={"belt" in p.target ? `b${p.target.belt}` : `i${p.target.index}`} className="bench-row">
                        <div className={`slot small ${p.item.tone ?? p.item.rarity}`} data-tip={`${p.item.info.name} · ${p.where}`}>
                            <ItemIcon objId={p.item.info.objId} size={24} />
                        </div>
                        <div className="bench-name" style={{ color: p.item.color }}>
                            {p.item.info.name}
                            {p.instil.now && <span className="dim"> · {p.instil.now}</span>}
                        </div>
                        <div className="bench-buttons">
                            {p.brew.to && (
                                <button
                                    className="ui-button small"
                                    disabled={!!p.brew.why}
                                    data-tip={`Brew it up to ${p.brew.to}, its affixes kept: ${p.brew.count} × ${p.brew.herb} and ${p.brew.gold} gold.${p.brew.why ? `\n${p.brew.why}` : ""}`}
                                    onClick={() => client.brewPotion(p.target)}
                                >
                                    Brew up <span className="bench-cost">{p.brew.gold}</span>
                                </button>
                            )}
                            <button
                                className="ui-button small"
                                disabled={!!p.instil.why}
                                data-tip={`Instil it to drink itself for you when something happens: low life, being hindered, a rare's death or a guardian waking, one at random (another, if it's instilled already). ${p.instil.count} × ${p.instil.herb} and ${p.instil.gold} gold.${p.instil.why ? `\n${p.instil.why}` : ""}`}
                                onClick={() => client.instilPotion(p.target)}
                            >
                                Instil <span className="bench-cost">{p.instil.gold}</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="section-title">
                Elixirs <span className="dim">· one at a time, for {bench.minutes} minutes in the rifts</span>
            </div>
            {bench.elixir && <div className="note good">You've drunk a {bench.elixir.name}: {bench.elixir.minutes} minutes left. Another takes its place.</div>}
            <div className="shop-grid">
                {bench.elixirs.map((e) => (
                    <div
                        key={e.id}
                        className={`shop-item slot ${e.why ? "unusable" : ""}`}
                        data-tip={`${e.name}\n${e.text}\n${e.count} × ${e.herb} and ${e.gold} gold${e.why ? `\n${e.why}` : "\nClick to have it made, and drink it"}`}
                        onClick={() => client.drinkElixir(e.id)}
                    >
                        <ItemIcon objId={e.objId} size={32} />
                        <div className={`price ${e.why ? "dear" : ""}`}>{e.gold}</div>
                    </div>
                ))}
            </div>
        </>
    );
}

// The gem trader's work on the sockets of what's worn: their colours, links and how many
function SocketBench({ pack, hud, client }: { pack: Pack; hud: Hud; client: Client }): JSX.Element {
    const rows = SOCKET_SLOTS.filter((slot) => pack.equipment[slot] && Object.keys(pack.socketWork[slot] ?? {}).length > 0);
    return (
        <>
            <div className="section-title">Socket work, on what you wear</div>
            {rows.length === 0 && <div className="dim note">Nothing you wear can be worked on.</div>}
            <div className="bench">
                {rows.map((slot) => {
                    const item = pack.equipment[slot]!;
                    const costs = pack.socketWork[slot]!;
                    return (
                        <div key={slot} className="bench-row">
                            <div className={`slot small ${item.tone ?? item.rarity}`} data-tip={item.info.name}>
                                <ItemIcon objId={item.info.objId} size={24} />
                            </div>
                            <div className="bench-sockets">{item.sockets ? <SocketDots sockets={item.sockets} /> : <span className="dim">none</span>}</div>
                            <div className="bench-buttons">
                                {(Object.keys(SOCKET_WORK) as SocketWork[]).map((work) => {
                                    const cost = costs[work];
                                    if (cost === undefined) {
                                        return null;
                                    }
                                    return (
                                        <button
                                            key={work}
                                            className="ui-button small"
                                            disabled={hud.gold < cost}
                                            data-tip={`${SOCKET_WORK[work].blurb} ${cost === 0 ? "Free, Reldo's favour." : `${cost} gold.`}`}
                                            onClick={() => client.socketWork(slot, work)}
                                        >
                                            {SOCKET_WORK[work].name} <span className="bench-cost">{cost === 0 ? "free" : cost}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}

// Aubury's enchanting (sim/enchant.ts): a ring or an amulet, worn or in the pack, given one of the
// tree's notables, which it gives as if it were taken
type EnchantTarget = { index: number } | { slot: Slot };

type JewellerTab = "enchant" | "runewords" | "circle";

// Aubury's bench: enchanting (enchant.ts), runewords (runewords.ts) and the transmuting circle
// (circle.ts), a tab each
function JewellerBench({ bench, pack, hud, client }: { bench: JewellerView; pack: Pack; hud: Hud; client: Client }): JSX.Element {
    const [tab, setTab] = useState<JewellerTab>("enchant");
    const tabs: [JewellerTab, string][] = [
        ["enchant", "Enchanting"],
        ["runewords", "Runewords"],
        ["circle", "Transmuting circle"],
    ];
    return (
        <>
            <div className="bench-tabs">
                {tabs.map(([id, name]) => (
                    <button key={id} className={`ui-button small ${tab === id ? "chosen" : ""}`} onClick={() => setTab(id)}>
                        {name}
                    </button>
                ))}
            </div>
            {tab === "enchant" && <EnchantBench pack={pack} hud={hud} client={client} />}
            {tab === "runewords" && <RunewordBench bench={bench} client={client} />}
            {tab === "circle" && <CircleBench bench={bench} client={client} />}
        </>
    );
}

// Runewords: a normal item with the right sockets chosen, and every word, with its runes and
// what it gives; those it can take, and the runes for, can be inscribed
function RunewordBench({ bench, client }: { bench: JewellerView; client: Client }): JSX.Element {
    const [chosen, setChosen] = useState<string>();
    const pick = bench.bases.find((b) => b.key === chosen) ?? bench.bases[0];
    return (
        <>
            <div className="dim note">A normal item with exactly a word's number of sockets takes it, and its runes are spent. It keeps its sockets for gems. The high runes are found on the ladder.</div>
            {bench.bases.length === 0 ? (
                <div className="dim note">You have no normal item with two or more sockets. The gem trader recuts sockets.</div>
            ) : (
                <div className="enchant-items">
                    {bench.bases.map((b) => (
                        <div key={b.key} className={`slot small ${b.item.tone ?? b.item.rarity} ${pick === b ? "chosen-gem" : ""}`} data-tip={`${b.item.info.name} (${b.where.toLowerCase()}) · ${b.item.sockets?.length ?? 0} sockets`} onClick={() => setChosen(b.key)}>
                            <ItemIcon objId={b.item.info.objId} size={24} />
                        </div>
                    ))}
                </div>
            )}
            {pick && (
                <div className="enchant-now">
                    <span style={{ color: pick.item.color }}>{pick.item.info.name}</span>
                    <span className="dim"> · {pick.item.sockets?.length ?? 0} sockets</span>
                </div>
            )}
            <div className="picker-list enchant-list">
                {bench.words.map((w) => {
                    const why = pick ? (pick.why[w.id] ?? w.short) : "Choose a normal item with sockets.";
                    return (
                        <button key={w.id} className={`picker-choice ${why ? "unusable" : ""}`} data-tip={why ?? `Click to inscribe ${w.name}`} onClick={() => pick && client.inscribe(pick.target, w.id)}>
                            <span className="picker-text">
                                <span className="picker-name" style={{ color: RUNEWORD_COLOR }}>
                                    {w.name} <span className="dim">· {w.fits} · level {w.level}</span>
                                </span>
                                <span className="runeword-runes">
                                    {w.runes.map((r, i) => (
                                        <span key={i} className={`runeword-rune ${r.have ? "" : "dim"}`} style={r.have ? { color: r.color } : undefined}>
                                            <ItemIcon objId={r.objId} size={18} />
                                            {r.name}
                                        </span>
                                    ))}
                                </span>
                                {[...w.lines, ...w.powers].map((line, i) => (
                                    <span key={i} className="picker-line">
                                        {line}
                                    </span>
                                ))}
                            </span>
                        </button>
                    );
                })}
            </div>
        </>
    );
}

// The transmuting circle: each recipe the pouch and the pack can make now, a button each
function CircleBench({ bench, client }: { bench: JewellerView; client: Client }): JSX.Element {
    const c = bench.circle;
    const [chosen, setChosen] = useState<string>();
    const pick = c.elite.find((e) => e.key === chosen) ?? c.elite[0];
    const none = c.runes.length === 0 && c.herbs.length === 0 && c.riftstones.length === 0;
    return (
        <>
            <div className="dim note">{c.texts.join(". ")}.</div>
            <div className="circle-list">
                {c.runes.map((r) => (
                    <button key={r.id} className={`picker-choice circle-choice ${r.count < 3 ? "unusable" : ""}`} data-tip={r.count < 3 ? `It takes 3 ${r.name}s: you have ${r.count}` : `3 ${r.name}s into a ${r.to}`} onClick={() => client.transmute({ kind: "runes", id: r.id })}>
                        <ItemIcon objId={r.objId} size={22} /> 3 × {r.name} <span className="dim">({r.count})</span> → <ItemIcon objId={r.toObjId} size={22} /> {r.to}
                    </button>
                ))}
                {c.herbs.map((h) => (
                    <button key={h.id} className={`picker-choice circle-choice ${h.count < 3 ? "unusable" : ""}`} data-tip={h.count < 3 ? `It takes 3 ${h.name}: you have ${h.count}` : `3 ${h.name} into ${h.to}`} onClick={() => client.transmute({ kind: "herbs", id: h.id })}>
                        <ItemIcon objId={h.objId} size={22} /> 3 × {h.name} <span className="dim">({h.count})</span> → <ItemIcon objId={h.toObjId} size={22} /> {h.to}
                    </button>
                ))}
                {c.riftstones.map((d) => (
                    <button key={`r${d}`} className="picker-choice circle-choice" data-tip={`3 riftstones of depth ${d} into a riftstone of depth ${d + 1}`} onClick={() => client.transmute({ kind: "riftstones", depth: d })}>
                        3 riftstones of depth {d} → a riftstone of depth {d + 1}
                    </button>
                ))}
                <button className={`picker-choice circle-choice ${c.rejuv ? "unusable" : ""}`} data-tip={c.rejuv ?? "A life potion, a mana potion and a herb into a rejuvenation potion"} onClick={() => client.transmute({ kind: "rejuv" })}>
                    A life potion, a mana potion and a herb → a rejuvenation potion
                </button>
                {c.chicken && (
                    <button
                        className={`picker-choice circle-choice ${c.chicken.why ? "unusable" : ""}`}
                        data-tip={c.chicken.why ?? "Three eggs, a raw chicken and a Law rune. Something will answer."}
                        onClick={() => client.transmute({ kind: "chicken" })}
                    >
                        Three eggs, a raw chicken and a Law rune → ?
                    </button>
                )}
                {none && <div className="dim note">Runes and herbs you have three of show here, and riftstones three of a depth.</div>}
            </div>
            <div className="section-title">Elite versions</div>
            {c.elite.length === 0 ? (
                <div className="dim note">You have no normal item with an elite version. A Law rune and a Cosmic rune make one.</div>
            ) : (
                <>
                    <div className="enchant-items">
                        {c.elite.map((e) => (
                            <div key={e.key} className={`slot small ${e.item.tone ?? e.item.rarity} ${pick === e ? "chosen-gem" : ""}`} data-tip={`${e.item.info.name} (${e.where.toLowerCase()}) → ${e.to}`} onClick={() => setChosen(e.key)}>
                                <ItemIcon objId={e.item.info.objId} size={24} />
                            </div>
                        ))}
                    </div>
                    {pick && (
                        <button className={`picker-choice circle-choice ${pick.why ? "unusable" : ""}`} data-tip={pick.why ?? `Make it a ${pick.to}`} onClick={() => client.transmute({ kind: "elite", target: pick.target })}>
                            {pick.item.info.name}, a Law rune and a Cosmic rune → {pick.to}
                        </button>
                    )}
                </>
            )}
            {(c.upgrades.length > 0 || c.makes.length > 0) && (
                <>
                    <div className="section-title">Upgrades</div>
                    <div className="circle-list">
                        {c.upgrades.map((u) => (
                            <button key={u.key} className={`picker-choice circle-choice ${u.why ? "unusable" : ""}`} data-tip={u.why ?? `${u.item.info.name} (${u.where.toLowerCase()}) into ${u.to}, its sockets and gems kept`} onClick={() => client.transmute({ kind: "upgrade", target: u.target, up: u.up })}>
                                <ItemIcon objId={u.item.info.objId} size={22} /> {u.item.info.name}, {u.takes} → <ItemIcon objId={u.toObjId} size={22} /> {u.to}
                            </button>
                        ))}
                        {c.makes.map((m) => (
                            <button key={`m${m.make}`} className={`picker-choice circle-choice ${m.why ? "unusable" : ""}`} data-tip={m.why ?? `Make ${m.name}`} onClick={() => client.transmute({ kind: "make", make: m.make })}>
                                {m.takes} → <ItemIcon objId={m.objId} size={22} /> {m.name}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </>
    );
}

function EnchantBench({ pack, hud, client }: { pack: Pack; hud: Hud; client: Client }): JSX.Element {
    const [chosen, setChosen] = useState<string>();
    const [search, setSearch] = useState("");
    const items: { key: string; target: EnchantTarget; item: ItemView; where: string }[] = [];
    for (const slot of ["amulet", "ring"] as Slot[]) {
        const item = pack.equipment[slot];
        if (item) {
            items.push({ key: `slot:${slot}`, target: { slot }, item, where: "Worn" });
        }
    }
    pack.inventory.forEach((item, index) => {
        if (item && (item.info.slot === "ring" || item.info.slot === "amulet")) {
            items.push({ key: `index:${index}`, target: { index }, item, where: "In your pack" });
        }
    });
    const pick = items.find((i) => i.key === chosen) ?? items[0];
    const cost = pick ? enchantCost(pick.item.itemLevel) : undefined;
    const cosmic = pack.runes.find((r) => r.id === "cosmic")?.count ?? 0;
    const short = cost ? (cosmic < cost.cosmic ? `It takes ${cost.cosmic} Cosmic runes.` : hud.gold < cost.gold ? `It costs ${cost.gold} gold.` : undefined) : undefined;
    const q = search.trim().toLowerCase();
    const notables = ENCHANTABLE.filter((id) => q.length < 2 || PASSIVES[id].name.toLowerCase().includes(q) || nodeLines(id).some((l) => l.toLowerCase().includes(q)));
    return (
        <>
            <div className="section-title">
                Enchanting{" "}
                {cost && (
                    <span className="dim">
                        · {cost.cosmic} Cosmic runes and {cost.gold} gold
                    </span>
                )}
            </div>
            <div className="dim note">A ring or an amulet gives the notable passive it's enchanted with as if you'd taken it. A new enchantment takes the old one's place.</div>
            {items.length === 0 ? (
                <div className="dim note">You have no ring or amulet with you.</div>
            ) : (
                <>
                    <div className="enchant-items">
                        {items.map((i) => (
                            <div
                                key={i.key}
                                className={`slot small ${i.item.tone ?? i.item.rarity} ${pick === i ? "chosen-gem" : ""}`}
                                data-tip={`${i.item.info.name} (${i.where.toLowerCase()})${i.item.info.enchant ? `\nEnchanted: ${i.item.info.enchant.name}` : ""}`}
                                onClick={() => setChosen(i.key)}
                            >
                                <ItemIcon objId={i.item.info.objId} size={24} />
                            </div>
                        ))}
                    </div>
                    {pick && (
                        <div className="enchant-now">
                            <span style={{ color: pick.item.color }}>{pick.item.info.name}</span>
                            <span className="dim"> · {pick.item.info.enchant ? `enchanted with ${pick.item.info.enchant.name}` : "not enchanted"}</span>
                        </div>
                    )}
                    <input className="tree-search enchant-search" placeholder="Search notables" value={search} spellCheck={false} onChange={(e) => setSearch(e.target.value)} />
                    <div className="picker-list enchant-list">
                        {notables.map((id) => {
                            const now = pick?.item.info.enchant?.name === PASSIVES[id].name;
                            return (
                                <button
                                    key={id}
                                    className={`picker-choice ${short || now ? "unusable" : ""}`}
                                    data-tip={now ? "It's enchanted with this already" : short ?? `Click to enchant it with ${PASSIVES[id].name}`}
                                    onClick={() => pick && client.enchant(pick.target, id)}
                                >
                                    <span className="picker-text">
                                        <span className="picker-name">{PASSIVES[id].name}</span>
                                        {nodeLines(id).map((line, i) => (
                                            <span key={i} className="picker-line">
                                                {line}
                                            </span>
                                        ))}
                                    </span>
                                </button>
                            );
                        })}
                        {notables.length === 0 && <div className="dim note">None found.</div>}
                    </div>
                </>
            )}
        </>
    );
}

function Archmage({ view, client }: { view: ArchmageView; client: Client }): JSX.Element {
    const chosen = view.tiers.find((t) => t.depth === view.chosen);
    const keys = view.stones.length > 0 || view.heart !== undefined || view.pinnacles.length > 0;
    return (
        <div className={`panel rs-background archmage ui-modal ${keys ? "with-keys" : ""}`}>
            <PanelHead title="The Wizards' Tower" onClose={() => client.setPanel(undefined)} />
            <Dialogue
                speaker={ARCHMAGE.name}
                text="I can open a rift to any depth you've reached, and weave it as you choose: the more I bind into it, the harder it fights, and the richer it pays. Clear a rift's guardian and I can send you a step deeper. Die out there, and the tower's ward pulls you home, but the rift is lost."
            />
            {view.open && (
                <div className="archmage-open">
                    A rift to {view.open.zone}
                    {view.open.mods.length > 0 ? ` (${view.open.mods.map((m) => m.name).join(", ")})` : ""} is open. Opening another closes it.
                </div>
            )}
            <div className="archmage-columns">
                <div className="archmage-column">
                    <div className="section-title">Choose a depth</div>
                    <div className="tiers">
                        {[...view.tiers].reverse().map((t) => (
                            <button
                                key={t.depth}
                                className={`list-button tier ${t.depth === view.chosen ? "chosen" : ""} ${t.depth === view.maxDepth ? "ui-main" : ""}`}
                                onClick={() => client.chooseRift(t.depth)}
                            >
                                <span className="tier-depth">{t.depth}</span>
                                <span className="tier-text">
                                    <span className="tier-zone">{t.zone}</span>
                                    <span className="tier-level">
                                        Level {t.areaLevel} · {t.boss}
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
                {chosen && (
                    <div className="archmage-column rift-offers">
                        <div className="section-title">
                            Open rift {chosen.depth}, {chosen.zone}
                        </div>
                        {view.web && <RiftWeb web={view.web} />}
                        {view.offers.map((offer, i) => (
                            <button key={i} className={`list-button rift-offer ${offer.mods.length === 0 ? "plain" : ""}`} onClick={() => client.openRift(chosen.depth, i)}>
                                {offer.land && (
                                    <span className="offer-land">
                                        <span className="offer-land-name">{offer.land.name}</span>, held by {offer.land.host}
                                        <span className="offer-land-more">
                                            {offer.land.land} · {offer.land.guardian}
                                        </span>
                                        <span className="offer-land-more offer-encounter">
                                            {offer.land.encounter}
                                            {offer.land.roamer && ` · ${offer.land.roamer}`}
                                        </span>
                                    </span>
                                )}
                                <span className="offer-name">{offer.mods.length === 0 ? "As it is" : offer.mods.map((m) => m.name).join(", ")}</span>
                                {offer.mods.map((m) => (
                                    <span key={m.id} className="offer-mod">
                                        {m.text}
                                    </span>
                                ))}
                                {offer.bounty && <span className="offer-bounty">Bounty: {offer.bounty}</span>}
                                <span className="offer-reward">{offer.mods.length === 0 ? "No modifiers, no bonus" : rewardText(offer.reward)}</span>
                            </button>
                        ))}
                    </div>
                )}
                {keys && <RiftKeys view={view} client={client} />}
            </div>
        </div>
    );
}

// The web round the deepest rift (content/web.ts): the lane the hero stands on, this depth's places,
// those open from it lit, and the bounties a depth on, each joined to the places it can be reached
// from. The versions below it are the lit places, in order.
function RiftWeb({ web }: { web: NonNullable<ArchmageView["web"]> }): JSX.Element {
    const rowY = (lane: number) => 12 + lane * 22;
    const x = [14, 120, 226];
    const reach = (a: number, b: number) => Math.abs(a - b) <= 1;
    return (
        <svg className="rift-web" viewBox="0 0 300 108" role="img" aria-label={`The rift web: you stand on lane ${web.lane + 1}`}>
            {web.open.map((lane) => (
                <line key={`h${lane}`} className="web-line lit" x1={x[0]} y1={rowY(web.lane)} x2={x[1]} y2={rowY(lane)} />
            ))}
            {web.here.flatMap((h) =>
                web.ahead
                    .filter((a) => reach(h.lane, a.lane))
                    .map((a) => <line key={`a${h.lane}-${a.lane}`} className={`web-line ${h.lit ? "next" : ""}`} x1={x[1]} y1={rowY(h.lane)} x2={x[2]} y2={rowY(a.lane)} />),
            )}
            <g data-tip={`Rift ${web.depth - 1}: the last you cleared here`}>
                <circle className="web-node done" cx={x[0]} cy={rowY(web.lane)} r={5} />
            </g>
            {web.here.map((h) => (
                <g key={`n${h.lane}`} data-tip={`Rift ${web.depth}: ${h.text}${h.lit ? "" : ". Not open from your lane."}`}>
                    <circle className={`web-node ${h.lit ? "open" : "shut"}`} cx={x[1]} cy={rowY(h.lane)} r={5} />
                    <text className={`web-text ${h.lit ? "open" : "shut"}`} x={x[1] + 9} y={rowY(h.lane) + 4}>
                        {h.bounty}
                    </text>
                </g>
            ))}
            {web.ahead.map((a) => (
                <g key={`f${a.lane}`} data-tip={`Rift ${web.depth + 1}: ${a.text}${a.lit ? "" : ". Out of reach from the rifts open to you."}`}>
                    <circle className={`web-node ${a.lit ? "ahead" : "shut"}`} cx={x[2]} cy={rowY(a.lane)} r={4} />
                    <text className={`web-text ${a.lit ? "ahead" : "shut"}`} x={x[2] + 8} y={rowY(a.lane) + 4}>
                        {a.bounty}
                    </text>
                </g>
            ))}
        </svg>
    );
}

// The keys to rifts the Archmage doesn't offer: the riftstones in the pack, each opened as it's
// woven, and the Heartstone's four shards, which open the way to the Heart of the Rift
// One of the folk speaking of a task (sim/tasks.ts): one to take, one under way, or one done and
// paid for here, with what it pays
// The Fight Caves, a wave beaten: take what's held, or the next wave for twice as much
function CavesPanel({ view, client }: { view: CavesView; client: Client }): JSX.Element {
    const close = () => client.setPanel(undefined);
    return (
        <div className="panel rs-background task-panel ui-modal">
            <PanelHead title="The Fight Caves" onClose={close} />
            <Dialogue
                speaker="TzHaar-Mej-Jal"
                text={`Wave ${view.wave} of ${view.waves} is beaten, JalYt. ${view.tokkul} tokkul is yours if you leave now. Face the next, and it is ${view.next}; fall, and it is nothing.`}
            />
            <div className="task-buttons">
                <button className="ui-button ui-main" onClick={() => client.cavesChoice(true)}>
                    Face wave {view.wave + 1}
                </button>
                <button className="ui-button" onClick={() => client.cavesChoice(false)}>
                    Take {view.tokkul} tokkul
                </button>
            </div>
        </div>
    );
}

// The prayer book (content/prayers.ts): each prayer lit once the hero's the level for it, and
// bright while it's on; one protection and one other at once, each keeping a share of the mana
function PrayerPanel({ hud, client }: { hud: Hud; client: Client }): JSX.Element {
    const on = new Set(hud.prayers);
    const lighter = PRAYER.lighter.includes(hud.cls) ? 1 - PRAYER.lighterBy : 1;
    const pool = hud.reserved.life > 0 ? "life" : "mana";
    const kept = hud.reserved.mana + hud.reserved.life;
    return (
        <div className="panel rs-background prayer-panel ui-modal">
            <PanelHead title="Prayer" onClose={() => client.setPanel(undefined)} />
            <div className="prayer-grid">
                {PRAYER_IDS.map((id) => {
                    const p = PRAYERS[id];
                    const locked = hud.level < p.level;
                    const lines = [
                        `${p.name} (level ${p.level})`,
                        p.text,
                        `Keeps ${Math.round(p.reserve * lighter * 100)}% of your most mana while it's on${p.protect ? ". A protection: one at once." : ", beside a protection."}`,
                        locked ? `Needs level ${p.level}.` : on.has(id) ? "Click to put it out." : "Click to say it.",
                    ];
                    return (
                        <button key={id} className={`prayer ${on.has(id) ? "on" : ""} ${locked ? "locked" : ""}`} data-tip={lines.join("\n")} aria-label={p.name} onClick={() => client.togglePrayer(id)}>
                            <Sprite id={locked ? p.dim : p.sprite} fallback={<span className="hud-tab-label">{p.name}</span>} />
                        </button>
                    );
                })}
            </div>
            <div className="dim note">
                {kept > 0 ? `Your prayers keep ${kept} of your ${pool}.` : "Say one protection and one other. Each keeps a share of your most mana while it's on, as an aura does."}
            </div>
        </div>
    );
}

// Minimus's offer after a Colosseum wave: one of three glories, each a harder rule that pays the
// better; closed, Minimus offers it again when spoken to
function GloryPanel({ view, client }: { view: GloryView; client: Client }): JSX.Element {
    const close = () => client.setPanel(undefined);
    return (
        <div className="panel rs-background task-panel ui-modal">
            <PanelHead title="The Fortis Colosseum" onClose={close} />
            <Dialogue
                speaker="Minimus"
                text={`Wave ${view.wave} of ${view.waves} is beaten! Take a glory for the next, and the crowd pays the better for it. You have ${view.glory} glory.`}
            />
            <div className="glory-offers">
                {view.offers.map((g) => (
                    <button key={g.id} className="ui-button glory-offer" onClick={() => client.chooseGlory(g.id)}>
                        <div className="glory-name">
                            {g.name}
                            {g.taken > 0 ? ` ${"I".repeat(g.taken + 1)}` : ""}
                        </div>
                        <div className="glory-text">{g.text}</div>
                        <div className="glory-worth">+{g.glory} glory</div>
                    </button>
                ))}
            </div>
        </div>
    );
}

// Reldo's quest log (content/quests.ts): each of the first lap's zones' quest, where it's done,
// what it leaves for good and how it stands, a done one claimed with a click
const QUEST_STATE_TEXT = { unseen: "Not yet reached", open: "Under way", ready: "Done", claimed: "Finished" } as const;

function QuestPanel({ view, client }: { view: QuestLogView; client: Client }): JSX.Element {
    return (
        <div className="panel rs-background task-panel quest-panel ui-modal">
            <PanelHead title="Reldo's quests" onClose={() => client.setPanel(undefined)} />
            <Dialogue speaker="Reldo" text={view.says} />
            <div className="quest-list">
                {view.quests.map((q) => (
                    <div key={q.id} className={`quest-row ${q.state}`} data-tip={q.state === "unseen" ? "Reach its zone to begin it." : q.tale}>
                        <div className="quest-head">
                            <span className="quest-name">{q.name}</span>
                            <span className="quest-state">{QUEST_STATE_TEXT[q.state]}</span>
                        </div>
                        {q.state !== "unseen" && (
                            <>
                                <div className="quest-ask">
                                    {q.ask}. <span className="dim">{q.where}.</span>
                                </div>
                                {q.progress && <div className="dim">{q.progress}.</div>}
                                <div className="quest-gives">{q.gives}.</div>
                            </>
                        )}
                        {q.state === "ready" && (
                            <button className="ui-button ui-main" onClick={() => client.claimQuest(q.id)}>
                                Take your reward
                            </button>
                        )}
                    </div>
                ))}
            </div>
            {view.favours.map((f) => (
                <div key={f} className="quest-favour">
                    Waiting for you: {f}
                </div>
            ))}
            {view.maxCape && (
                <div className="task-buttons">
                    <button className={`ui-button ${view.maxCape.why ? "unusable" : "ui-main"}`} data-tip={view.maxCape.why ?? "A cape with something of everything, for a hero of level 99"} onClick={() => client.buyMaxCape()}>
                        The Max cape, {view.maxCape.price.toLocaleString("en-GB")} gold
                    </button>
                </div>
            )}
            {view.task && (
                <div className="task-buttons">
                    <button className="ui-button" onClick={() => client.setPanel("task")}>
                        Reldo's task
                    </button>
                </div>
            )}
        </div>
    );
}

// The collection log's book (22711), the Log tab's icon
const LOG_OBJ = COLLECTION_LOG.objId;

// Where each panel that moves was left, by its name, while the game's open: it opens there again
const LEFT_AT = new Map<string, { x: number; y: number }>();

// A panel that floats over the game and is moved by its title, as a window is: it opens in the
// middle of the screen, or where it was last left, and is kept whole on the screen however it's
// dragged or the window's sized. Its place is in the interface's own pixels, as it's zoomed.
function useMovable(name: string): { ref: RefObject<HTMLDivElement | null>; style: CSSProperties; grab: (e: ReactPointerEvent) => void } {
    const ref = useRef<HTMLDivElement>(null);
    const [at, setAt] = useState(() => LEFT_AT.get(name));
    // The room it has, and its size, in the interface's pixels
    const measure = () => {
        const el = ref.current;
        const area = el?.parentElement;
        if (!el || !area) {
            return undefined;
        }
        const scale = currentScale();
        const box = el.getBoundingClientRect();
        const room = area.getBoundingClientRect();
        return { w: box.width / scale, h: box.height / scale, roomW: room.width / scale, roomH: room.height / scale, scale };
    };
    const keep = (x: number, y: number) => {
        const m = measure();
        if (!m) {
            return { x, y };
        }
        const p = { x: Math.round(Math.max(0, Math.min(m.roomW - m.w, x))), y: Math.round(Math.max(0, Math.min(m.roomH - m.h, y))) };
        LEFT_AT.set(name, p);
        return p;
    };
    // Placed before it's first painted, and kept on the screen when the window's made smaller
    useLayoutEffect(() => {
        const m = measure();
        if (m) {
            const was = LEFT_AT.get(name);
            setAt(keep(was?.x ?? (m.roomW - m.w) / 2, was?.y ?? Math.max(8, (m.roomH - m.h) / 2 - 40)));
        }
        const onResize = () => setAt((p) => (p ? keep(p.x, p.y) : p));
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [name]);
    const grab = (e: ReactPointerEvent) => {
        if (e.button !== 0 || (e.target as HTMLElement).closest("button")) {
            return;
        }
        const from = at ?? LEFT_AT.get(name);
        const m = measure();
        if (!from || !m) {
            return;
        }
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const move = (ev: PointerEvent) => setAt(keep(from.x + (ev.clientX - startX) / m.scale, from.y + (ev.clientY - startY) / m.scale));
        // Where it's let go, too, should the last move not have come (a cancel has nowhere)
        const up = (ev: PointerEvent) => {
            if (ev.type === "pointerup") {
                move(ev);
            }
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            window.removeEventListener("pointercancel", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", up);
    };
    // Unseen till it's placed, so it never shows where it isn't
    return { ref, style: at ? { left: at.x, top: at.y } : { visibility: "hidden" }, grab };
}

// The record (sim/log.ts): the collection log, a page of slots at a time, lit for what's been had;
// its pets page, where a pet won is chosen to follow; and the combat achievements, by tier, with
// Ghommal's hilts their points open
function LogPanel({ view, client }: { view: LogView; client: Client }): JSX.Element {
    const [tab, setTab] = useState<"log" | "tasks">("log");
    const [page, setPage] = useState<string>();
    const [tier, setTier] = useState<string>("all");
    const open = view.pages.find((p) => p.id === page) ?? view.pages[0];
    const tasks = view.achievements.filter((a) => tier === "all" || a.tier === tier);
    const tiers = ["all", "easy", "medium", "hard", "elite", "master", "grandmaster"];
    const { ref, style, grab } = useMovable("log");
    return (
        <div ref={ref} className="panel rs-background log-panel movable ui-modal" style={style}>
            <PanelHead title={tab === "log" ? `Collection log: ${view.have} of ${view.total}` : `Combat achievements: ${view.points} of ${view.totalPoints}`} onClose={() => client.setPanel(undefined)} onGrab={grab} />
            <div className="tabs log-tabs">
                <StoneTab on={tab === "log"} onClick={() => setTab("log")}>
                    Collection log
                </StoneTab>
                <StoneTab on={tab === "tasks"} onClick={() => setTab("tasks")} title={`Combat achievements: ${view.points} of ${view.totalPoints} points`}>
                    Combat achievements
                </StoneTab>
            </div>
            {tab === "log" ? (
                <div className="log-body">
                    <div className="log-pages">
                        {view.pages.map((p) => (
                            <button key={p.id} className={`log-page ${p.id === open?.id ? "chosen" : ""} ${p.have === p.entries.length ? "complete" : ""}`} onClick={() => setPage(p.id)}>
                                <span>{p.name}</span>
                                <span className="dim">
                                    {p.have}/{p.entries.length}
                                </span>
                            </button>
                        ))}
                    </div>
                    {open && (
                        <div className="log-entries">
                            <div className="section-title">
                                {open.name} <span className="dim">· {open.have} of {open.entries.length}</span>
                            </div>
                            {open.id === "pets" ? (
                                <>
                                    <div className="log-grid">
                                        {view.pets.map((p) => (
                                            <div
                                                key={p.id}
                                                className={`slot small log-slot ${p.have ? "have" : "lack"} ${p.following ? "chosen-gem" : ""}`}
                                                data-tip={p.have ? `${p.name}${p.following ? ": following you (click to send home)" : ": click to have it follow you"}` : p.name}
                                                onClick={() => p.have && client.choosePet(p.id)}
                                            >
                                                <ItemIcon objId={p.objId} size={28} />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="dim note">A guardian drops its pet one time in 250, one in 50 awakened. One follows you, and fights for no one.</div>
                                </>
                            ) : (
                                <div className="log-grid">
                                    {open.entries.map((e) => (
                                        <div key={e.key} className={`slot small log-slot ${e.have ? "have" : "lack"}`} data-tip={e.name}>
                                            <ItemIcon objId={e.objId} size={28} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="log-tasks">
                    <div className="log-hilts">
                        {view.hilts.map((h) => (
                            <div key={h.name} className={`slot small log-slot ${h.have ? "have" : "lack"}`} data-tip={`${h.name} (${h.points} points): ${h.text}${h.have ? "" : ", once you have them"}`}>
                                <ItemIcon objId={h.objId} size={28} />
                            </div>
                        ))}
                    </div>
                    <div className="log-tiers">
                        {tiers.map((t) => (
                            <button key={t} className={`ui-button small ${tier === t ? "ui-main" : ""}`} onClick={() => setTier(t)}>
                                {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                        ))}
                    </div>
                    <div className="log-task-list">
                        {tasks.map((a) => (
                            <div key={a.id} className={`log-task ${a.done ? "done" : ""}`}>
                                <span className={`log-tier ${a.tier}`}>{a.points}</span>
                                <span className="log-task-name">{a.name}</span>
                                <span className="dim">{a.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// The orrery (sim/orrery.ts): five arms of nodes, each taken after the one before it with a
// sphere's point, and given back for gold; and the favoured hosts, once their nodes are taken
function OrreryPanel({ view, client }: { view: OrreryView; client: Client }): JSX.Element {
    const refund = view.refund.toLocaleString("en-GB");
    const { ref, style, grab } = useMovable("orrery");
    return (
        <div ref={ref} className="panel rs-background orrery-panel movable ui-modal" style={style}>
            <PanelHead title={`Orrery: ${view.points} of ${view.spheres.length} point${view.spheres.length === 1 ? "" : "s"} to spend`} onClose={() => client.setPanel(undefined)} onGrab={grab} />
            <div className="dim note">
                A sphere lights for each host's guardian slain in each band of eight rifts from 17, each pinnacle cleared, and each awakened: each is a point, and each point takes a node, after the one before it. A node given back costs {refund} gold. The nodes work on the ladder.
            </div>
            <div className="orrery-arms">
                {view.arms.map((arm) => (
                    <div key={arm.id} className="orrery-arm">
                        <div className="section-title">{arm.name}</div>
                        {arm.nodes.map((n) => (
                            <button
                                key={n.id}
                                className={`orrery-node ${n.taken ? "taken" : n.why ? "shut" : "open"} ${n.notable ? "notable" : ""}`}
                                data-tip={n.taken ? (n.refundWhy ?? `Click to give it back, for ${refund} gold.`) : (n.why ?? "Click to take it.")}
                                onClick={() => (n.taken ? client.refundOrrery(n.id) : client.takeOrrery(n.id))}
                            >
                                <span className="orrery-name">{n.name}</span>
                                <span className="orrery-text">{n.text}</span>
                            </button>
                        ))}
                    </div>
                ))}
            </div>
            {view.places > 0 && (
                <div className="orrery-favour">
                    {Array.from({ length: view.places }, (_, slot) => (
                        <div key={slot} className="orrery-favour-row">
                            <span className="section-title">{slot === 0 ? "Favoured host" : "Second favoured host"}</span>
                            {view.hosts.map((h) => (
                                <button key={h.id} className={`ui-button small ${view.favour[slot] === h.id ? "ui-main" : ""}`} onClick={() => client.favourOrrery(slot, h.id)}>
                                    {h.name}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            )}
            {view.spheres.length > 0 && (
                <div className="orrery-spheres dim" data-tip={view.spheres.map((s) => s.name).join("\n")}>
                    Spheres lit: {view.spheres.length}. Hover for which.
                </div>
            )}
        </div>
    );
}

function TaskPanel({ view, client }: { view: TaskDialogView; client: Client }): JSX.Element {
    const [tip, setTip] = useState<Tip>();
    const [runeTip, setRuneTip] = useState<{ rune: RuneView; x: number; y: number }>();
    const hide = () => {
        setTip(undefined);
        setRuneTip(undefined);
    };
    useEffect(() => hide(), [view]);
    const { task, reward } = view;
    const item = reward.item;
    const runes = reward.runes;
    const goods = reward.goods;
    const showItem = (e: ReactMouseEvent) => item && setTip({ item, x: e.clientX, y: e.clientY, side: "left" });
    const showRunes = (e: ReactMouseEvent) => runes && setRuneTip({ rune: runes, x: e.clientX, y: e.clientY });
    const close = () => client.setPanel(undefined);
    return (
        <div className="panel rs-background task-panel ui-modal" onMouseLeave={hide}>
            <PanelHead title={view.state === "offer" ? "A task" : `${view.giver}'s task`} onClose={close} />
            <Dialogue speaker={view.giver} text={view.says} />
            <div className="task-box">
                <div className="task-objective">{task.objective}</div>
                <div className="task-where">{task.where}</div>
                {view.state !== "offer" && (
                    <div className={`task-progress ${task.done ? "done" : ""}`}>{task.done ? "Done" : `${task.progress} of ${task.count} so far`}</div>
                )}
            </div>
            <div className="section-title">Reward</div>
            <div className="task-reward">
                <div className="task-pay">
                    <span className="task-gold">{reward.gold.toLocaleString("en-GB")} gold</span>
                    {reward.xp > 0 && <span className="task-xp">{reward.xp.toLocaleString("en-GB")} experience</span>}
                </div>
                {item && (
                    <div className={`shop-item slot ${item.tone ?? item.rarity} ${item.why ? "unusable" : ""}`} onMouseEnter={showItem} onMouseMove={showItem} onMouseLeave={hide}>
                        <ItemPic item={item} size={32} />
                    </div>
                )}
                {runes && (
                    <div className="shop-item slot rune" onMouseEnter={showRunes} onMouseMove={showRunes} onMouseLeave={hide}>
                        <ItemIcon objId={runes.objId} size={32} />
                        <span className="stack-count">{runes.count}</span>
                    </div>
                )}
                {goods && (
                    <div className="shop-item slot" data-tip={`${goods.count} × ${goods.name}`}>
                        <ItemIcon objId={goods.objId} size={32} />
                        <span className="stack-count">{goods.count}</span>
                    </div>
                )}
            </div>
            {view.why && <div className="offer-why task-why">{view.why}</div>}
            <div className="task-buttons">
                {view.state === "offer" && (
                    <>
                        <button className="ui-button ui-main" disabled={view.why !== undefined} onClick={() => client.takeTask()}>
                            Take the task
                        </button>
                        <button className="ui-button" onClick={close}>
                            Not now
                        </button>
                    </>
                )}
                {view.state === "held" && (
                    <>
                        <button className="ui-button ui-main" onClick={close}>
                            Keep at it
                        </button>
                        <button className="ui-button" onClick={() => client.giveUpTask()}>
                            Give it up
                        </button>
                    </>
                )}
                {view.state === "done" && (
                    <button className="ui-button ui-main" disabled={view.why !== undefined} onClick={() => client.claimTask()}>
                        Take your reward
                    </button>
                )}
            </div>
            {tip && <Tooltip tip={tip} />}
            {runeTip && <RuneTooltip rune={runeTip.rune} x={runeTip.x} y={runeTip.y} held={false} reward />}
        </div>
    );
}

// A pinnacle awakened: its key and an Awakener's orb, for a harder fight and drops of its own
function AwakenedButton({ name, why, onClick }: { name?: string; why?: string; onClick: () => void }): JSX.Element {
    return (
        <button className={`list-button rift-offer pinnacle awakened ${why ? "" : "ui-main"}`} disabled={why !== undefined} onClick={onClick} data-tip={why}>
            <span className="offer-name awakened-name">Awakened {name ?? "Heart of the Rift"}</span>
            <span className="offer-mod">Its key and an Awakener's orb. Twice the life, a second phase, and drops of its own.</span>
        </button>
    );
}

// The Tombs' invocations for the next raid, each chosen or not with a click, and what they come to
function Invocations({ view, client }: { view: NonNullable<ArchmageView["invocations"]>; client: Client }): JSX.Element {
    return (
        <>
            <div className="section-title">The Tombs' invocations: raid level {view.level}</div>
            <div className="invocations">
                {view.list.map((inv) => (
                    <button key={inv.id} className={`list-button invocation ${inv.on ? "on" : ""}`} aria-pressed={inv.on} onClick={() => client.toggleInvocation(inv.id)}>
                        <span className="invocation-head">
                            <span className="invocation-name">{inv.name}</span>
                            <span className="invocation-level">{inv.level}</span>
                        </span>
                        <span className="invocation-text">{inv.text}</span>
                    </button>
                ))}
            </div>
            <div className="offer-reward invocation-pay">{view.pay}</div>
        </>
    );
}

function RiftKeys({ view, client }: { view: ArchmageView; client: Client }): JSX.Element {
    const heart = view.heart;
    return (
        <div className="archmage-column rift-keys">
            {heart && (
                <>
                    <div className="section-title">The Heart of the Rift</div>
                    <button className={`list-button rift-offer heart ${heart.ready ? "ui-main" : ""}`} disabled={!heart.ready} onClick={() => client.openHeart()}>
                        <span className="heart-shards">
                            {heart.shards.map((s) => (
                                <span key={s.name} className={`heart-shard ${s.have ? "have" : "lack"}`} data-tip={`${s.name}${s.have ? "" : s.stashed ? ": in your bank" : ": not found"}`}>
                                    <ItemIcon objId={s.objId} size={32} />
                                </span>
                            ))}
                        </span>
                        <span className="offer-name">{heart.ready ? "Open the way to the Heart" : "Bring all four shards in your pack"}</span>
                        <span className="offer-mod">
                            Area level {heart.areaLevel}. Its guardian is the hardest there is, and the only one that drops the Heart's uniques.
                        </span>
                    </button>
                    {heart.awakened && <AwakenedButton why={heart.awakened.why} onClick={() => client.openPinnacle("heart", true)} />}
                </>
            )}
            {view.pinnacles.length > 0 && <div className="section-title">The pinnacles</div>}
            {view.pinnacles.map((p) => (
                <button key={p.id} className={`list-button rift-offer pinnacle ${p.why ? "" : "ui-main"}`} disabled={p.why !== undefined} onClick={() => client.openPinnacle(p.id)} data-tip={p.why}>
                    <span className="offer-name" style={{ color: p.color }}>
                        {p.name}
                    </span>
                    <span className="offer-mod">
                        {p.guardian} · area level {p.areaLevel}
                    </span>
                    <span className="offer-mod">
                        {p.key}: {Math.min(p.have, p.need)} of {p.need}
                    </span>
                </button>
            ))}
            {view.invocations && view.pinnacles.some((p) => p.id === "tombs") && <Invocations view={view.invocations} client={client} />}
            {view.pinnacles.some((p) => p.awakened) && <div className="section-title">Awakened</div>}
            {view.pinnacles.map((p) => p.awakened && <AwakenedButton key={`a${p.id}`} name={p.name} why={p.awakened.why} onClick={() => client.openPinnacle(p.id, true)} />)}
            {view.stones.length > 0 && <div className="section-title">Your riftstones</div>}
            {view.stones.map((stone) => (
                <button key={stone.uid} className={`list-button rift-offer stone ${stone.mods.length === 0 ? "plain" : ""}`} disabled={stone.why !== undefined} onClick={() => client.openRiftstone(stone.uid)}>
                    <span className="offer-name" style={{ color: RARITY_COLOR[stone.rarity] }}>
                        {stone.name}
                    </span>
                    <span className="offer-mod">
                        Rift {stone.depth}, {stone.zone} · level {stone.areaLevel} · {stone.boss}
                    </span>
                    {stone.mods.map((m) => (
                        <span key={m.id} className="offer-mod">
                            {m.text}
                        </span>
                    ))}
                    <span className={stone.why ? "offer-why" : "offer-reward"}>{stone.why ?? (stone.mods.length === 0 ? "No modifiers, no bonus" : rewardText(stone.reward))}</span>
                </button>
            ))}
        </div>
    );
}

// ---- Dying, help and the menu ----

function Death({ hud, wait, client }: { hud: Hud; wait: number; client: Client }): JSX.Element {
    if (hud.hardcore) {
        return (
            <div className="death hardcore ui-modal">
                <div className="death-title">{hud.name} has fallen</div>
                <div className="death-text">A hardcore hero has one life, and theirs is spent. They stay among your heroes, to be remembered, but never play again.</div>
                <button className="ui-button big ui-main" disabled={wait > 0} onClick={() => client.toTitle()}>
                    {wait > 0 ? `Leave (${Math.ceil(wait)})` : "Leave"}
                </button>
            </div>
        );
    }
    return (
        <div className="death ui-modal">
            <div className="death-title">Oh dear, you are dead!</div>
            <div className="death-text">The tower's ward pulls you home, but the rift collapses. Some of this level's experience is lost.</div>
            <button className="ui-button big ui-main" disabled={wait > 0} onClick={() => client.returnHome()}>
                {wait > 0 ? `Return to ${CITY_NAME} (${Math.ceil(wait)})` : `Return to ${CITY_NAME}`}
            </button>
        </div>
    );
}

function Help({ client }: { client: Client }): JSX.Element {
    return (
        <div className="modal-back">
            <div className="panel rs-background help ui-modal">
                <PanelHead title="How to play" onClose={() => client.closeHelp()} />
                <div className="help-columns">
                    <div className="help-column">
                        <div className="help-section">
                            <div className="section-title">Moving and fighting</div>
                            <p>
                                <b>Left click</b> the ground to walk, a monster to attack it with your first skill. Hold it to keep going: from a monster, on to the
                                next one under the mouse when it falls.
                            </p>
                            <p>
                                <b>Right click</b>, <b>Q</b>, <b>E</b>, <b>R</b> and <b>F</b> use your other skills where the mouse is, or on the monster under it. A
                                skill pressed mid-swing comes next. You can keep moving while you swing or cast. Hold <b>Shift</b> to attack without
                                moving. Click a skill on the bar to change it.
                            </p>
                            <p>
                                <b>WASD</b> walks too. <b>1</b> to <b>4</b> drink the potions in your belt; kills fill them, and the city fills them
                                to the brim. The belt starts with a life and a mana potion's places; the <b>Apothecary</b> stitches on a third and a fourth, for what the guardians of rifts 8 and 16 drop.{" "}
                                <b>Tab</b> lays the map over the world.
                            </p>
                        </div>
                        <div className="help-section">
                            <div className="section-title">Skills and passives</div>
                            <p>
                                Skills come from <b>gems</b> set in the sockets of your gear: a skill gem gives a skill, and support gems <b>linked</b> to it make it
                                better. Gems socket by colour, and learn from every kill. A skill is its class's own: only a class of its colour can use it. Your class gives you gems as you level; more drop, and the gem trader sells
                                them.
                            </p>
                            <p>
                                <b>P</b> opens the <b>passive tree</b>: a point every level and for every rift's guardian, two past depth 16. Take nodes out from your start to make the
                                hero your own; keystones at the rim change the rules, and past it each class's wing has more. Talismans from the rifts go in its sockets.
                            </p>
                        </div>
                    </div>
                    <div className="help-column">
                        <div className="help-section">
                            <div className="section-title">Loot and runes</div>
                            <p>
                                Click loot to pick it up (<b>Space</b> takes the nearest). Gold and runes are picked up as you walk over them. <b>Z</b> hides loot's
                                names.
                            </p>
                            <p>
                                <b>Runes</b> change your gear. Click one in your pack's pouch, then an item: an Air rune makes a normal item magic, a Nature rune makes it
                                rare, a Chaos rune rolls a rare again, and rarer runes add, take away or reroll affixes. Hold <b>Shift</b> to keep using it.
                            </p>
                        </div>
                        <div className="help-section">
                            <div className="section-title">{CITY_NAME} and the rifts</div>
                            <p>{CITY_LORE.join(" ")}</p>
                            <p>
                                <b>I</b> opens your pack. Drag an item onto its slot to wear it, and back into the pack to take it off; its <b>Gems</b> page
                                sets gems in sockets. In {CITY_NAME}, click a shopkeeper to
                                buy; right-click in your pack to sell. The <b>banker</b> on the square keeps a stash: right-click in your pack to put things in it.
                            </p>
                            <p>
                                {ARCHMAGE.name}, by the tear in the middle of the square, opens rifts: the tear becomes their portal. Step into it. To get home,
                                click the blue{" "}
                                <b>waystone</b> by the camp, or press <b>T</b> and stand still. Either keeps the rift open to go back to.
                            </p>
                            <p>
                                Magic monsters are blue, rares are yellow and lead their pack. Kill the guardian at the far end of a rift and its portal takes you
                                home, with a deeper rift open to you. Die, and you're home too, but the rift is lost.
                            </p>
                            <p>
                                Click a <b>chest</b> to open it (some are trapped), a god's <b>altar</b> for its blessing, and a <b>hoard</b> by a ruin once its
                                guards are dead. From rift 9 on, guardians and rares drop <b>riftstones</b>: give one to {ARCHMAGE.name} and he opens its rift, with
                                its modifiers. Past rift 16, guardians drop shards of the Heartstone; bring all four, and he opens the <b>Heart of the Rift</b>.
                            </p>
                            <p>
                                Each time you come home a few of the townsfolk have a <b>task</b>, marked over their heads: click one to hear it. Take up to three at
                                once; they count in the rifts, and whoever set one pays you when it's done.
                            </p>
                        </div>
                    </div>
                </div>
                <button className="ui-button ui-main" onClick={() => client.closeHelp()}>
                    Got it
                </button>
            </div>
        </div>
    );
}

function Menu({ state, client }: { state: UiState; client: Client }): JSX.Element {
    const [page, setPage] = useState<"main" | "sound" | "controls">("main");
    const size = state.uiSize;
    const step = (d: number) => client.setSettings({ uiSize: Math.round(Math.min(UI_SIZE_RANGE.max, Math.max(UI_SIZE_RANGE.min, size + d)) * 20) / 20 });
    if (page === "sound") {
        return <SoundMenu state={state} client={client} back={() => setPage("main")} />;
    }
    if (page === "controls") {
        return <ControlsMenu state={state} client={client} back={() => setPage("main")} />;
    }
    return (
        <div className="modal-back">
            <div className="panel rs-background menu ui-modal">
                <PanelHead title="Paused" onClose={() => client.setMenu(false)} />
                <button className="ui-button ui-main" onClick={() => client.setMenu(false)}>
                    Resume
                </button>
                <div className="menu-pair">
                    <button className="ui-button" onClick={() => setPage("sound")}>
                        Sound
                    </button>
                    <button className="ui-button" onClick={() => setPage("controls")}>
                        Controls
                    </button>
                </div>
                <div className="menu-row">
                    <span className="menu-label">Screen shake</span>
                    <button className={`ui-button small toggle ${state.shake ? "chosen" : ""}`} onClick={() => client.setSettings({ shake: !state.shake })}>
                        {state.shake ? "On" : "Off"}
                    </button>
                </div>
                <div className="menu-row" data-tip="Animations drawn between their frames. Uses more memory; a rift's monsters change from the next rift.">
                    <span className="menu-label">Smooth animation</span>
                    <button className={`ui-button small toggle ${state.smoothing ? "chosen" : ""}`} onClick={() => client.setSettings({ smoothing: !state.smoothing })}>
                        {state.smoothing ? "On" : "Off"}
                    </button>
                </div>
                {state.hud && (
                    <div className="menu-row">
                        <span className="menu-label">Helm</span>
                        <button className={`ui-button small toggle ${state.hud.hideHelm ? "" : "chosen"}`} onClick={() => client.setHideHelm(!state.hud!.hideHelm)}>
                            {state.hud.hideHelm ? "Hidden" : "Shown"}
                        </button>
                    </div>
                )}
                <div className="menu-row">
                    <span className="menu-label">Interface size</span>
                    <span className="stepper">
                        <button className="ui-button small step" aria-label="Smaller" onClick={() => step(-0.1)}>
                            -
                        </button>
                        <span className="stepper-value">{Math.round(size * 100)}%</span>
                        <button className="ui-button small step" aria-label="Bigger" onClick={() => step(0.1)}>
                            +
                        </button>
                    </span>
                </div>
                <div className="menu-sep" />
                <button
                    className="ui-button"
                    onClick={() => {
                        client.setMenu(false);
                        client.store.set({ help: true });
                    }}
                >
                    How to play
                </button>
                <button className="ui-button" onClick={() => client.toTitle()}>
                    Save and change hero
                </button>
            </div>
        </div>
    );
}

// A volume as a slider of the client's colours, 0 to 100%
function VolumeRow({ label, tip, value, onChange }: { label: string; tip: string; value: number; onChange: (v: number) => void }): JSX.Element {
    return (
        <div className="menu-row volume-row" data-tip={tip}>
            <span className="menu-label">{label}</span>
            <span className="volume">
                <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(value * 100)}
                    onChange={(e) => onChange(Number(e.currentTarget.value) / 100)}
                    style={{ "--fill": `${Math.round(value * 100)}%` } as CSSProperties}
                />
                <span className="volume-value">{Math.round(value * 100)}%</span>
            </span>
        </div>
    );
}

function SoundMenu({ state, client, back }: { state: UiState; client: Client; back: () => void }): JSX.Element {
    return (
        <div className="modal-back">
            <div className="panel rs-background menu ui-modal">
                <PanelHead title="Sound" onClose={back} />
                <div className="menu-row">
                    <span className="menu-label">Sound</span>
                    <button className={`ui-button small toggle ${state.muted ? "" : "chosen"}`} onClick={() => client.setMuted(!state.muted)}>
                        {state.muted ? "Off" : "On"}
                    </button>
                </div>
                <VolumeRow label="Volume" tip="Everything's loudness" value={state.volume} onChange={(v) => client.setVolume(v)} />
                <VolumeRow
                    label="Fighting"
                    tip="Blows, spells, arrows and monsters, on top of the volume"
                    value={state.combatVolume}
                    onChange={(v) => client.setVolumes({ combatVolume: v })}
                />
                <VolumeRow
                    label="Interface"
                    tip="Clicks, coins, picking up and the portal, on top of the volume"
                    value={state.interfaceVolume}
                    onChange={(v) => client.setVolumes({ interfaceVolume: v })}
                />
                <div className="menu-sep" />
                <button className="ui-button ui-main" onClick={back}>
                    Back
                </button>
            </div>
        </div>
    );
}

// Every control with its two keys: a key clicked waits for the next key pressed (Escape to leave
// it, Backspace to clear it); a key already on another control moves here
function ControlsMenu({ state, client, back }: { state: UiState; client: Client; back: () => void }): JSX.Element {
    const [waiting, setWaiting] = useState<{ id: ControlId; place: number }>();
    useEffect(() => {
        if (!waiting) {
            return;
        }
        // Before the game's own listener, which is on the window too, so the key does nothing else
        const onKey = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (e.code === "Escape") {
                setWaiting(undefined);
            } else if (e.code === "Backspace" || e.code === "Delete") {
                client.setKey(waiting.id, waiting.place, "");
                setWaiting(undefined);
            } else if (!RESERVED_KEYS.has(e.code) && e.code) {
                client.setKey(waiting.id, waiting.place, e.code);
                setWaiting(undefined);
            }
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [waiting, client]);
    const groups = [...new Set(CONTROLS.map((c) => c.group))];
    return (
        <div className="modal-back">
            <div className="panel rs-background menu controls-menu ui-modal">
                <PanelHead title="Controls" onClose={back} />
                <div className="controls-list">
                    {groups.map((group) => (
                        <Fragment key={group}>
                            <div className="controls-group">{group}</div>
                            {CONTROLS.filter((c) => c.group === group).map((c) => (
                                <div key={c.id} className="controls-row">
                                    <span className="controls-name">{c.name}</span>
                                    {Array.from({ length: KEYS_PER_CONTROL }, (_, place) => {
                                        const on = waiting?.id === c.id && waiting.place === place;
                                        const code = state.keys[c.id][place];
                                        return (
                                            <button
                                                key={place}
                                                className={`ui-button small key-button ${on ? "waiting" : ""} ${code ? "" : "unset"}`}
                                                data-tip={on ? "Press a key: Escape leaves it, Backspace clears it" : "Click, then press the key you want"}
                                                onClick={() => setWaiting(on ? undefined : { id: c.id, place })}
                                            >
                                                {on ? "Press a key" : keyLabel(code) || "-"}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </Fragment>
                    ))}
                </div>
                <div className="controls-note">The mouse's left and right buttons are always the bar's first two skills, and Escape always the menu.</div>
                <div className="menu-pair">
                    <button className="ui-button" onClick={() => client.resetKeys()}>
                        Reset all
                    </button>
                    <button className="ui-button ui-main" onClick={back}>
                        Back
                    </button>
                </div>
            </div>
        </div>
    );
}
