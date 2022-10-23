class CVInfo {

    #stringContent = "";
    #formats = undefined;

    constructor(stringContent, ...formats) {
        this.#stringContent = stringContent;
        this.#formats = formats;
    }

    get Content () { return this.#stringContent; }
    get Formattings () { return this.#formats };
}

let CSS = Object.freeze({
    Color: "color:",
    UnderlineDash: "border-bottom: 1px dashed ",
    PaddingBottom: "padding-bottom: ",
    PaddingTop: "padding-top: ",
    MarginBottom: "margin-bottom: ",
    Unit1em: "1em;",
    Unit05em: "0.5em;"
})

let Colors = Object.freeze({
    Snow: "snow;",
    Gold: "gold;",
    Green: "lawngreen;",
    LightBlue: "deepskyblue;"
});

let Consts = Object.freeze({
    ColorSnow: `${CSS.Color}${Colors.Snow}`,
    ColorGolden: `${CSS.Color}${Colors.Gold}`,
    ColorGreen: `${CSS.Color}${Colors.Green}`,
    ColorLightBlue: `${CSS.Color}${Colors.LightBlue}`,
    UnderlineDashGold: `${CSS.UnderlineDash}${Colors.Gold}`,
    PaddingBottom05: `${CSS.PaddingBottom}${CSS.Unit05em}`,
    PaddingTop05: `${CSS.PaddingBottom}${CSS.Unit05em}`,
    PaddingTop1: `${CSS.PaddingTop}${CSS.Unit1em}`,
    PaddingBottom1: `${CSS.PaddingBottom}${CSS.Unit1em}`,
    MarginBottom1: `${CSS.MarginBottom}${CSS.Unit1em}`,
})

let cvInfos = [
    new CVInfo(
        "%c0x %cCV %c(%cTL;DR version%c)",
        Consts.ColorSnow + Consts.PaddingTop1,
        Consts.ColorGolden,
        Consts.ColorSnow,
        Consts.ColorLightBlue + Consts.UnderlineDashGold + Consts.MarginBottom1,
        Consts.ColorSnow
    ),
    new CVInfo(
        `%c* I am working as a %c.NET developer%c since 2010,\r\n` +
        `wrote and maintained various applications ranging from handheld (WM6 - CF)\r\n` +
        `to web (front and backend, business logic and design, database CRUD and more)`
        , Consts.ColorSnow + "padding:1em;padding-left:0;"
        , "border:1px dashed #5b6874;padding-left:1em;padding-right:1em;" + Consts.UnderlineDashGold
        , Consts.ColorSnow
    ),
    new CVInfo(
        `%c*%c I am also an E2 "player" since 11th December 2020, joined E2O (the official discord) 2 days later`
        , "color: #747073;"
        , Consts.ColorSnow
    ),
    new CVInfo(
        `%c* I have started working on helping the users of E2 with %csmall scripts\r\n` +
        `%c during the first big "server drought" %c(when even using the marketplace was difficult)`
        , Consts.ColorSnow
        , Consts.ColorGreen
        , Consts.ColorSnow
        , "border-bottom: 1px solid #3a2f2f;"
    ),
    new CVInfo(
        `%c* %cExamples of my E2 related work%c:`
        , Consts.ColorSnow, Consts.UnderlineDashGold + Consts.PaddingTop1
        , "color: #696d67;"
    ),
    new CVInfo(
        `%c*  transactions/profile/jewel/etc data exports (%cCSV%c, or summaries in console), example on my github`
        , Consts.ColorSnow
        , "color: #75722e;"
        , Consts.ColorSnow
    ),
    new CVInfo(
        `%c*  megacity mapping (%cexample:%c https://tinyurl.com/2p9bfjwe)`
        , Consts.ColorSnow
        , "border-bottom: 1px solid #636f6d;"
        , Consts.ColorSnow
    ),
    new CVInfo(
        `%c*  profile page upgrade (%cold%c example: https://youtu.be/CVPdBmlfzIk)`
        , Consts.ColorSnow
        , "border-bottom: 1px solid #2f6f4a;"
        , Consts.ColorSnow
    ),
    new CVInfo(
        `%c*  the first minigame (demo) over E2's map: %chttps://bit.ly/3grJZnj`
        , Consts.ColorSnow
        , "border-bottom: 1px solid #457155;"
    ),
    new CVInfo(
        `%c[- Color me impressed if you find the %cegg%c ;) -]`
        , Consts.ColorSnow + Consts.PaddingTop1 + Consts.PaddingBottom1
        , "border-bottom: 1px dashed #69535d;"
        , Consts.ColorSnow
    ),
];

for (let i = 0; i < cvInfos.length; i++) {
    let info = cvInfos[i];
    console.log(info.Content, ...info.Formattings);
}
