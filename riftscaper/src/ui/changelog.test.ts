import { CHANGELOG, GAME_VERSION, parseChangelog } from "./changelog";

describe("changelog", () => {
    it("reads versions, their kinds of change and wrapped items", () => {
        const versions = parseChangelog(
            ["# Changelog", "", "An intro that's left out.", "", "## Unreleased", "", "## 0.2.0 - 2026-11-20", "", "### Added", "", "- Riftstones, and one", "  more line.", "- Uniques.", "", "### Fixed", "", "- Loot names."].join(
                "\r\n",
            ),
        );
        expect(versions).toEqual([
            { version: "Unreleased", date: undefined, sections: [] },
            {
                version: "0.2.0",
                date: "2026-11-20",
                sections: [
                    { heading: "Added", items: ["Riftstones, and one more line.", "Uniques."] },
                    { heading: "Fixed", items: ["Loot names."] },
                ],
            },
        ]);
    });

    // A release bumps package.json and moves Unreleased under its version
    it("has the game's version as its newest release", () => {
        expect(CHANGELOG[0].version).toBe("Unreleased");
        const released = CHANGELOG.filter((v) => v.version !== "Unreleased");
        expect(released[0].version).toBe(GAME_VERSION);
        expect(released[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(released[0].sections.length).toBeGreaterThan(0);
    });

    it("has only Added, Changed and Fixed, each with something in it", () => {
        for (const v of CHANGELOG) {
            for (const s of v.sections) {
                expect(["Added", "Changed", "Fixed"]).toContain(s.heading);
                expect(s.items.length).toBeGreaterThan(0);
            }
        }
    });
});
