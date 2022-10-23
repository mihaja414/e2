// instructions:
// * Load e2 map (incognito mode if you are afraid) -> wait until grid (and properties if any) loads
// * Paste script into dev.console and press enter
// Notes:
// * it is at "demo" level, so lot of bugs can appear -> if you encounter one let me or Wasp know
// * button: "lessGo" starts the "game", navigation with arrow keys
// * button: "Iz 'Nuff" will send results to Wasp, and resets your "snake"and score
// * button: "Going Places" goes to a random location on map (I got mostly water, which is not surprising 😄 ) and resets your snake and score
// * button: "Color me" changes the color of the next step polygons (random)
// * Score: your "snake" length
// * Sheggs: you have (100-69) % chance to get a shegg if it is not already present on map at a random (visible) place. If you don't see it try to zoom out and back (until you see the grid)
// * if you try to move to a place where you have already been -> snake dies, score resets
// * anything unclear -> ask me :)

(() => {

    window.isDebug = false;
    window.showRocket = true;

    let DIRECTIONS = Object.freeze({
        UP: "up",
        DOWN: "down",
        LEFT: "left",
        RIGHT: "right"
    });

    let CONSTS = Object.freeze({
        Version: "0.1.0",
        DefaultTilePolygonColor: '#0080ff',
        TilePolysId: "tile-poly-snakey",
        SnakeHeadId: "snakey-kissy",
        SheggId: "random-shegg",

    });

    let MessageSeverity = Object.freeze({
        SUCCESS: "success",
        WARNING: "warning",
        ERROR: "error",
    });

    let currentTileColor = CONSTS.DefaultTilePolygonColor;

    let greetings = () => {
        let version = "0.1.0";

        console.log(`%c GO! (` + `%cv${CONSTS.Version}` + `%c) `, "color:snow", "color:red", "color:snow");

        console.log(`%c we all hope Earth2 will be a platform`, `color: white`);
        console.log(`%c so let's use it as a platform :D`, `color: goldenrod`);
        console.log(`%c go catch 'em Sheggs!`, "color: red");
        console.log(`(this "game" is more like a demo, errors and issues can of course occur, if you encounter something bad -> notify us on discord ;) )`)

        console.log(
            `%c created by:`
            + `%c mihaj (` + `%cmihaj#5170` + `%c) and Wasp (` + `%cwasp#1975` + `%c)`
            ,
            "background: black;color: white",
            "background: black;color: snow",
            "background: black;color: green",
            "background: black;color: snow",
            "background: black;color: green",
            "background: black;color: snow"
        )

        console.log(`%c *** special thanks to: *** `, `background:black; color: red;`);

        //`%c`
        console.log(
            `%c Ronald (Ronald.#2817) `
            + `%c for his excellent findings and artistic skills`,
            'background: black; color: green', 'background: black; color: white'
        );
        console.log(
            `%c and our !GO beta testers`,
            'background: black; color: goldenrod'
        );

    }

    let userCheck = () => {
        let msg = "";
        let goaway = "go away";
        let tisCheat = "scripting is cheating";
        if (window.auth0user !== undefined) {
            switch (window.auth0user.id) {
                // case "1a1a4362-99de-4b30-9366-7c1f8e6f2f7a": //me
                //     //msg = goaway;
                //     break;
                case "b34e3f33-7593-4f57-b9f9-c337af53196c": //Nameless
                    msg = goaway;
                    break;
                case "9bac4008-a3f2-4674-a93e-c177b329ff57": //NizzaGameZ
                    msg = tisCheat
                    break;
                default:
                    msg = window.auth0user.username;
            }
            if (msg === goaway) {
                console.warn("no, you don't");
                throw new Error(goaway);
            }
            if (msg === tisCheat) {
                console.warn("no, you don't");
                console.warn(msg);
                throw new Error(goaway);
            }

            console.log(`hello [${msg}] happy playing :) `);
        }
    };

    userCheck();

    class MapHandler {
        constructor() {
            let reactProperty = "_reactFiber";
            let allElements = Array.from(document.querySelectorAll("*"));

            let fiberElements = [];
            for (let i = 0; i < allElements.length; i++) {
                let el = allElements[i];
                let objectKeys = Object.keys(el);
                for (let j = 0; j < objectKeys.length; j++) {
                    if (objectKeys[j].includes(reactProperty)) {
                        fiberElements.push({ key: objectKeys[j], el: el });
                        break;
                    }
                }
            }
            //console.log(fiberElements);

            let reactElements = fiberElements.map(m => m.el[m.key]);
            //console.log(reactElements);

            let context = null;
            for (let i = 0; i < reactElements.length; i++) {
                let reactElement = reactElements[i];
                if (reactElement.return && reactElement.return.dependencies && reactElement.return.dependencies.firstContext && reactElement.return.dependencies.firstContext.context) {
                    //console.log("e", reactElement);
                    context = reactElement.return.dependencies.firstContext.context._currentValue;
                    break;
                }
            }

            if (!context) {
                throw new Error("No context! Contact dev");
            } else {
                this.reactContext = context;
                this.mapgl = this.reactContext.mapStore.map;

                //window.reactContext = this.reactContext;
                //window.mapgl = this.mapgl;
            }
        }
    }

    let mapHandler = new MapHandler();




    class TilePolygonHelper {
        constructor(options) {
            this.cache = {}
            this.D2R = Math.PI / 180;
            this.R2D = 180 / Math.PI;
            this.A = 6378137.0;
            this.MAXEXTENT = 20037508.342789244;

            options = options || {}
            this.size = options.size || 256

            if (!this.cache[this.size]) {
                let { size } = this
                // eslint-disable-next-line no-multi-assign
                const c = (this.cache[this.size] = {})
                c.Bc = []
                c.Cc = []
                c.zc = []
                c.Ac = []

                for (let d = 0; d < 30; d++) {
                    c.Bc.push(size / 360)
                    c.Cc.push(size / (2 * Math.PI))
                    c.zc.push(size / 2)
                    c.Ac.push(size)
                    size *= 2
                }
            }

            this.Bc = this.cache[this.size].Bc
            this.Cc = this.cache[this.size].Cc
            this.zc = this.cache[this.size].zc
            this.Ac = this.cache[this.size].Ac
        }

        toRad (num) {
            return (num * Math.PI) / 180;
        }

        isFloat (n) {
            return Number(n) === n && n % 1 !== 0;
        }

        // Convert lon lat to screen pixel value
        //
        // - `ll` {Array} `[lon, lat]` array of geographic coordinates.
        // - `zoom` {Number} zoom level.
        px (ll, zoom) {
            if (isFloat(zoom)) {
                const size = this.size * Math.pow(2, zoom)
                const d = size / 2
                const bc = size / 360
                const cc = size / (2 * Math.PI)
                const ac = size
                const f = Math.min(Math.max(Math.sin(this.D2R * ll[1]), -0.9999), 0.9999)
                let x = d + ll[0] * bc
                let y = d + 0.5 * Math.log((1 + f) / (1 - f)) * -cc
                x > ac && (x = ac)
                y > ac && (y = ac)

                // (x < 0) && (x = 0);
                // (y < 0) && (y = 0);
                return [x, y]
            }

            const d = this.zc[zoom]
            const f = Math.min(Math.max(Math.sin(this.D2R * ll[1]), -0.9999), 0.9999)
            let x = Math.round(d + ll[0] * this.Bc[zoom])
            let y = Math.round(d + 0.5 * Math.log((1 + f) / (1 - f)) * -this.Cc[zoom])
            x > this.Ac[zoom] && (x = this.Ac[zoom])
            y > this.Ac[zoom] && (y = this.Ac[zoom])

            // (x < 0) && (x = 0);
            // (y < 0) && (y = 0);
            return [x, y]
        }

        // Convert screen pixel value to lon lat
        //
        // - `px` {Array} `[x, y]` array of geographic coordinates.
        // - `zoom` {Number} zoom level.
        ll (px, zoom) {
            if (this.isFloat(zoom)) {
                const size = this.size * Math.pow(2, zoom)
                const bc = size / 360
                const cc = size / (2 * Math.PI)
                const zc = size / 2
                const g = (px[1] - zc) / -cc
                const lon = (px[0] - zc) / bc
                const lat = this.R2D * (2 * Math.atan(Math.exp(g)) - 0.5 * Math.PI)

                return [lon, lat]
            }

            const g = (px[1] - this.zc[zoom]) / -this.Cc[zoom]
            const lon = (px[0] - this.zc[zoom]) / this.Bc[zoom]
            const lat = this.R2D * (2 * Math.atan(Math.exp(g)) - 0.5 * Math.PI)

            return [lon, lat]
        }

        // Convert tile xyz value to bbox of the form `[w, s, e, n]`
        //
        // - `x` {Number} x (longitude) number.
        // - `y` {Number} y (latitude) number.
        // - `zoom` {Number} zoom.
        // - `tms_style` {Boolean} whether to compute using tms-style.
        // - `srs` {String} projection for resulting bbox (WGS84|900913).
        // - `return` {Array} bbox array of values in form `[w, s, e, n]`.
        bbox (x, y, zoom, tmsStyle, srs) {
            if (tmsStyle) {
                y = Math.pow(2, zoom) - 1 - y
            }

            // Use +y to make sure it's a number to avoid inadvertent concatenation.
            const ll = [x * this.size, (+y + 1) * this.size] // lower left
            // Use +x to make sure it's a number to avoid inadvertent concatenation.
            const ur = [(+x + 1) * this.size, y * this.size] // upper right
            const bbox = this.ll(ll, zoom).concat(this.ll(ur, zoom))

            // If web mercator requested reproject to 900913.
            if (srs === '900913') {
                return this.convert(bbox, '900913')
            }

            return bbox
        }

        // Convert bbox to xyx bounds
        //
        // - `bbox` {Number} bbox in the form `[w, s, e, n]`.
        // - `zoom` {Number} zoom.
        // - `tms_style` {Boolean} whether to compute using tms-style.
        // - `srs` {String} projection of input bbox (WGS84|900913).
        // - `@return` {Object} XYZ bounds containing minX, maxX, minY, maxY properties.

        xyz (bbox, zoom, tmsStyle, srs) {
            // If web mercator provided reproject to WGS84.
            if (srs === '900913') {
                bbox = this.convert(bbox, 'WGS84')
            }

            const ll = [bbox[0], bbox[1]] // lower left
            const ur = [bbox[2], bbox[3]] // upper right
            const pxLl = this.px(ll, zoom)
            const pxUr = this.px(ur, zoom)
            // Y = 0 for XYZ is the top hence minY uses pxUr[1].
            const x = [Math.floor(pxLl[0] / this.size), Math.floor((pxUr[0] - 1) / this.size)]
            const y = [Math.floor(pxUr[1] / this.size), Math.floor((pxLl[1] - 1) / this.size)]

            const minX = Math.min(...x)
            const minY = Math.min(...y)

            const bounds = {
                maxX: Math.max(...x),
                maxY: Math.max(...y),
                minX: minX < 0 ? 0 : minX,
                minY: minY < 0 ? 0 : minY,
            }

            if (tmsStyle) {
                const tms = {
                    maxY: Math.pow(2, zoom) - 1 - bounds.minY,
                    minY: Math.pow(2, zoom) - 1 - bounds.maxY,
                }

                bounds.minY = tms.minY
                bounds.maxY = tms.maxY
            }

            return bounds
        }

        // Convert projection of given bbox.
        //
        // - `bbox` {Number} bbox in the form `[w, s, e, n]`.
        // - `to` {String} projection of output bbox (WGS84|900913). Input bbox
        //   assumed to be the "other" projection.
        // - `@return` {Object} bbox with reprojected coordinates.
        convert (bbox, to) {
            if (to === '900913') {
                return this.forward(bbox.slice(0, 2)).concat(this.forward(bbox.slice(2, 4)))
            }

            return this.inverse(bbox.slice(0, 2)).concat(this.inverse(bbox.slice(2, 4)))
        }

        // Convert lon/lat values to 900913 x/y.
        forward (ll) {
            const xy = [A * ll[0] * D2R, A * Math.log(Math.tan(Math.PI * 0.25 + 0.5 * ll[1] * D2R))]
            // if xy value is beyond maxextent (e.g. poles), return maxextent.
            xy[0] > MAXEXTENT && (xy[0] = MAXEXTENT)
            xy[0] < -MAXEXTENT && (xy[0] = -MAXEXTENT)
            xy[1] > MAXEXTENT && (xy[1] = MAXEXTENT)
            xy[1] < -MAXEXTENT && (xy[1] = -MAXEXTENT)

            return xy
        }

        // Convert 900913 x/y values to lon/lat.
        inverse (xy) {
            return [(xy[0] * R2D) / A, (Math.PI * 0.5 - 2.0 * Math.atan(Math.exp(-xy[1] / A))) * R2D]
        }

        // returns the bit array representing a specific number
        bits (n, b = 32) {
            // n = number, b = number of bits to extract
            return [...Array(b)].map((_, idx, arr) => (n >> (arr.length - idx - 1)) & 1)
        }

        // Adaptation of the well-known algorithm to calculate unique keys that represent
        // tiles in a quadtree grid for geo-coordinates. The standard algorithm produces
        // strings with a size that equals to the zoom level (ex.: 21 zoom => 21 character
        // string) with each character being a digit representation between 0 and 3. Since
        // we only need 2 bits to represent each of these numbers, we can compress the data
        // into a smaller integer and still have some space to add other metadata. In this
        // specific case, we're appending the size (21) to the end of the produced integer
        //
        // Original implementation: https://github.com/mapbox/tilebelt
        tileToQuadkeyCompress (tile) {
            let bitmap = []

            for (let z = tile[2]; z > 0; z--) {
                // apply the mask as per the original algorithm
                let digit = 0
                const mask = 1 << (z - 1)
                if ((tile[0] & mask) !== 0) digit = 1
                if ((tile[1] & mask) !== 0) digit += 2
                // add only the desired 2 bits to the bit map
                bitmap = bitmap.concat(this.bits(digit, 2))
            }

            // creates an integer based on the obtained bitmap and append the size (for decompression)
            return bitmap.reduce((res, val, idx) => res + val * 2 ** idx) * 100 + tile[2]
        }

        quadkeyCompressToTile (quadkey) {
            let x = 0
            let y = 0
            const z = quadkey % 100 // extract the size

            // split the integer into the bit array without the appended size
            quadkey = Math.trunc(quadkey / 100)
                .toString(2)
                .split('')
            // based on the extracted size, pad the bit array if needed
            if (quadkey.length < z * 2) {
                quadkey = Array(z * 2 - quadkey.length)
                    .fill('0')
                    .concat(quadkey)
            }

            // going in reverse order in the bit array, extract each pair to decode the value and
            // then apply the original unmask algo
            for (let i = quadkey.length - 1; i > 0; --i) {
                // extract the digit from each bit pair
                const digit = +quadkey[i--] * 2 + +quadkey[i]
                // apply the mask as per the original algorithm
                const mask = 1 << Math.floor(i / 2)

                if (digit === 1) {
                    x |= mask
                } else if (digit === 2) {
                    y |= mask
                } else if (digit === 3) {
                    x |= mask
                    y |= mask
                }
            }

            return [x, y, z]
        }

        quadkeyToBbox (tileKey) {
            const tile = this.quadkeyCompressToTile(tileKey)

            return this.bbox(tile[0], tile[1], tile[2])
        }

        quadkeyToPolygon (tileIndex) {
            let bbox = this.quadkeyToBbox(tileIndex);
            //console.log("quadKeyToPolygon bbox: ", { bbox, tileIndex });

            let coordinates = [
                [
                    [bbox[0], bbox[1]],
                    [bbox[0], bbox[3]],
                    [bbox[2], bbox[3]],
                    [bbox[2], bbox[1]],
                    [bbox[0], bbox[1]],
                ]
            ];
            //console.log("quadKeyToPolygon coordinates", coordinates);

            return turf.polygon(coordinates);
        }

        tileToLngLat (x, y, z) {
            const lng = this.tile2lon(x, z)
            const lat = this.tile2lat(y, z)

            return [+lng.toFixed(PRECISION), +lat.toFixed(PRECISION)]
        }

        tile2lon (x, z) {
            return (x / Math.pow(2, z)) * 360 - 180
        }

        tile2lat (y, z) {
            const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z)

            return r2d * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
        }

        getXYFromCoordinates (latlon /* [number, number] */, zoom) {
            const lat = latlon[0]
            const lon = latlon[1]

            const xtile = parseInt(Math.floor(((lon + 180) / 360) * Math.pow(2, zoom)), 10)
            const ytile = parseInt(
                Math.floor(
                    ((1 - Math.log(Math.tan(this.toRad(lat)) + 1 / Math.cos(this.toRad(lat))) / Math.PI) / 2) *
                    Math.pow(2, zoom)
                ),
                10
            )

            return [xtile, ytile]
        }

        getPolygonsWithDirectionData (turfPolygon) {
            var bbox = turf.bbox(turfPolygon);
            //console.log("turf bbox: ", {bbox, turfPolygon});

            let bboxWidth = Math.abs(Math.max(bbox[0], bbox[2]) - Math.min(bbox[0], bbox[2]));
            let bboxHeight = Math.abs(Math.max(bbox[1], bbox[3]) - Math.min(bbox[1], bbox[3]));
            turfPolygon.properties.bbox = {
                bboxWidth: bboxWidth,
                bboxHeight: bboxHeight,
                center: turf.center(turfPolygon),
                box: bbox
            };

            //console.log("turfPoly: ", turfPolygon);
            //console.log("bbox: ", turfPolygon.properties.bbox);

            let polyBBox = turfPolygon.properties.bbox;
            let center = turfPolygon.properties.bbox.center.geometry.coordinates;

            let directions = [
                turf.feature({ "type": "Point", "coordinates": [center[0] - polyBBox.bboxWidth, center[1]], }, { direction: DIRECTIONS.LEFT, color: "#00FF00", }), //green
                turf.feature({ "type": "Point", "coordinates": [center[0], center[1] - polyBBox.bboxHeight], }, { direction: DIRECTIONS.DOWN, color: "#FF0000", }), //red
                turf.feature({ "type": "Point", "coordinates": [center[0] + polyBBox.bboxWidth, center[1]], }, { direction: DIRECTIONS.RIGHT, color: "#0000FF" }), //blue
                turf.feature({ "type": "Point", "coordinates": [center[0], center[1] + polyBBox.bboxHeight], }, { direction: DIRECTIONS.UP, color: "#000000", })//black
            ];
            return directions;
        }

        getTileIndexFromLatLng (coordinatesNormal) {
            let xy = this.getXYFromCoordinates(coordinatesNormal.reverse(), 21);
            let tileIndex = tilePolygonHelper.tileToQuadkeyCompress([xy[0], xy[1], 21]);
            return tileIndex;
        }

        getStepTilePolygonAndDirections (currentDirections, direction) {
            //console.log("getStepTilePolygonAndDirections: ", { currentDirections, direction });
            let nextCenter = currentDirections.find(d => d.properties.direction === direction);
            let nextTilePolygon = tilePolygonHelper.quadkeyToPolygon(tilePolygonHelper.getTileIndexFromLatLng(nextCenter.geometry.coordinates));
            let nextDirections = tilePolygonHelper.getPolygonsWithDirectionData(nextTilePolygon);
            return { stepTilePolygon: nextTilePolygon, stepTilePolygonDirections: nextDirections };
        }
    }

    let tilePolygonHelper = new TilePolygonHelper();

    class LoadingAnimationPart {
        constructor(direction, countryCode) {
            this.direction = direction;
            this.countryCode = countryCode;
        }
    }

    class LoadingAnimation {
        constructor() {
            this.flagsGO_G = [ //starting top right corner
                new LoadingAnimationPart("", "IN"), //"India", <--not going anywhere
                new LoadingAnimationPart(DIRECTIONS.LEFT, "AT"), //Austria
                new LoadingAnimationPart(DIRECTIONS.LEFT, "JE"), //Jersey
                new LoadingAnimationPart(DIRECTIONS.LEFT, "GB"), //UK        -> top left corner
                new LoadingAnimationPart(DIRECTIONS.DOWN, "BT"), //Bhutan
                new LoadingAnimationPart(DIRECTIONS.DOWN, "JP"), //Japan
                new LoadingAnimationPart(DIRECTIONS.DOWN, "__"), //"International",
                new LoadingAnimationPart(DIRECTIONS.DOWN, "KR"), //SK
                new LoadingAnimationPart(DIRECTIONS.DOWN, "KR"), //SK       -> bottom left corner
                new LoadingAnimationPart(DIRECTIONS.RIGHT, "VA"), //"Holy See",
                new LoadingAnimationPart(DIRECTIONS.RIGHT, "AU"),//"Australia",
                new LoadingAnimationPart(DIRECTIONS.RIGHT, "NF"),//"Norfolk", //bottom right corner
                new LoadingAnimationPart(DIRECTIONS.UP, "GI"),//"Gibraltar",
                new LoadingAnimationPart(DIRECTIONS.UP, "SE"),//"Sweden",
                new LoadingAnimationPart(DIRECTIONS.LEFT, "CA"),//"Canada" //G end
            ]

            this.flagsGO_O = [ //starting top right corner
                new LoadingAnimationPart("", "SE"),//"Sweden",
                new LoadingAnimationPart(DIRECTIONS.LEFT, "QA"),//"Qatar",
                new LoadingAnimationPart(DIRECTIONS.LEFT, "HU"),//"Hungary",
                new LoadingAnimationPart(DIRECTIONS.LEFT, "BT"),//"Bhutan", //top left corner
                new LoadingAnimationPart(DIRECTIONS.DOWN, "GB"),//"UK",
                new LoadingAnimationPart(DIRECTIONS.DOWN, "DE"),//"Germany",
                new LoadingAnimationPart(DIRECTIONS.DOWN, "TM"),//"Turkmenistan",
                new LoadingAnimationPart(DIRECTIONS.DOWN, "IT"),//"Italy",
                new LoadingAnimationPart(DIRECTIONS.DOWN, "US"),//"US", //bottom left corner
                new LoadingAnimationPart(DIRECTIONS.RIGHT, "CY"),// "Cyprus",
                new LoadingAnimationPart(DIRECTIONS.RIGHT, "US"),//"US",
                new LoadingAnimationPart(DIRECTIONS.RIGHT, "SO"),//"Somalia",//bottom right corner
                new LoadingAnimationPart(DIRECTIONS.UP, "BI"),//"Burundi",
                new LoadingAnimationPart(DIRECTIONS.UP, "GB"),//"UK",
                new LoadingAnimationPart(DIRECTIONS.UP, "US"),// "US",
                new LoadingAnimationPart(DIRECTIONS.UP, "JE"),//"Jersey",
            ];

            this.flagsGO_Ex = [
                new LoadingAnimationPart("", "__"),
                new LoadingAnimationPart(DIRECTIONS.DOWN, "__"),
                new LoadingAnimationPart(DIRECTIONS.DOWN, "__"),
                //new LoadingAnimationPart(DIRECTIONS.DOWN, "__"),
                new LoadingAnimationPart(DIRECTIONS.DOWN, "__"),
                new LoadingAnimationPart(DIRECTIONS.DOWN, "SKIP"),
                new LoadingAnimationPart(DIRECTIONS.DOWN, "__"),
            ]
        }



        async loadGO () {
            //console.log("load go");
            // mapgl.setPaintProperty('landfield-fill-layer', 'fill-opacity', 0.025)
            // mapgl.setPaintProperty('landfield-owned-pattern-layer', 'fill-opacity', 0.025)
            // mapgl.setPaintProperty('flags', 'icon-opacity', 0.025);
            mapHandler.mapgl.loadImage(
                //'https://i.imgur.com/oJEqUiS.png', //original
                //"https://i.imgur.com/VqDIwaL.png", //yellow border
                //"https://i.imgur.com/edYVeOv.png", //blue border
                "https://i.imgur.com/dMy0PCD.png", //gradient border
                (error, image) => {
                    if (error) throw error;

                    // Add the image to the map style.
                    //mapgl.addImage('shegg', image, { sdf: true });
                    mapHandler.mapgl.addImage('shegg', image);
                }
            );

            mapHandler.mapgl.loadImage(
                //"https://i.imgur.com/fD3iBgN.png",//big rocket
                //"https://i.imgur.com/gJ6VJoL.png",//small rocket
                "https://i.imgur.com/RNtXMVr.png", //small rocket with outer glow
                (error, image) => {
                    if (error) throw error;

                    // Add the image to the map style.
                    //mapgl.addImage('shegg', image, { sdf: true });
                    mapHandler.mapgl.addImage('kRocket', image);
                }
            )

            this.HideOtherStuffz();

            //let countryData = await fetch("/api/v2/tileprices").then(r => r.json());

            //get center of the map
            //get tile polygon and related directions
            let centerTileIndex = tilePolygonHelper.getTileIndexFromLatLng(mapHandler.mapgl.getCenter().toArray());
            let centerTilePolygon = tilePolygonHelper.quadkeyToPolygon(centerTileIndex);
            //new ___reactContext.mapStore.geocoder._mapboxgl.Marker().setLngLat(centerTilePolygon.geometry.coordinates[0][0]).addTo(mapgl); //marker at center's tile

            let directions = tilePolygonHelper.getPolygonsWithDirectionData(centerTilePolygon);

            let stepUp = tilePolygonHelper.getStepTilePolygonAndDirections(directions, DIRECTIONS.UP); //step 1 up
            for (let i = 0; i < 7; i++) {
                stepUp = tilePolygonHelper.getStepTilePolygonAndDirections(stepUp.stepTilePolygonDirections, DIRECTIONS.UP);
            }

            let stepLeft = tilePolygonHelper.getStepTilePolygonAndDirections(stepUp.stepTilePolygonDirections, DIRECTIONS.LEFT);

            let polygonsG = this.GetLoadingAnimationPartsPolygons(this.flagsGO_G, stepLeft);

            let stepRight = tilePolygonHelper.getStepTilePolygonAndDirections(stepUp.stepTilePolygonDirections, DIRECTIONS.RIGHT);
            for (let i = 0; i < 3; i++) {
                stepRight = tilePolygonHelper.getStepTilePolygonAndDirections(stepRight.stepTilePolygonDirections, DIRECTIONS.RIGHT);
            }

            let polygonsO = this.GetLoadingAnimationPartsPolygons(this.flagsGO_O, stepRight);

            stepRight = tilePolygonHelper.getStepTilePolygonAndDirections(stepRight.stepTilePolygonDirections, DIRECTIONS.RIGHT);
            stepRight = tilePolygonHelper.getStepTilePolygonAndDirections(stepRight.stepTilePolygonDirections, DIRECTIONS.RIGHT);

            let polygonsEx = this.GetLoadingAnimationPartsPolygons(this.flagsGO_Ex, stepRight);

            let sumPolygons = polygonsG.concat(polygonsO).concat(polygonsEx);

            //new ___reactContext.mapStore.geocoder._mapboxgl.Marker().setLngLat(stepLeft.stepTilePolygon.geometry.coordinates[0][0]).addTo(mapgl)

            this.sFeatures = turf.featureCollection([sumPolygons.shift()]);
            let loadImagesId = "flags-load";
            mapHandler.mapgl.addSource(loadImagesId, {
                'type': 'geojson',
                'data': this.sFeatures
            });

            mapHandler.mapgl.addLayer({
                id: loadImagesId,// FLAGS_LAYER_ID,
                layout: {
                    'icon-allow-overlap': true,
                    'icon-image': 'country:{country}',
                    'icon-size': {
                        stops: [
                            [16, 0.2],
                            [20, 1],
                        ],
                    },
                },
                source: loadImagesId,
                type: 'symbol',
            })

            let _this = this;
            let timeOut = 100;
            let loadInterval = setInterval(() => {
                try {
                    //console.log("loadInterval", sumPolygons.length)
                    if (sumPolygons.length === 0) {
                        clearInterval(loadInterval);
                        this.HideOtherStuffz();

                        document.querySelector("div.map .z-3").remove();

                        this.uiHandler = new UIHandler(_this);

                        setTimeout(() => {
                            mapHandler.mapgl.removeLayer(loadImagesId);
                            mapHandler.mapgl.removeSource(loadImagesId);
                        }, 1500);

                    } else {
                        this.HideOtherStuffz();
                        let newItem = sumPolygons.shift();
                        let data = mapHandler.mapgl.getSource(loadImagesId)._data.features;
                        data.push(newItem);
                        mapHandler.mapgl.getSource(loadImagesId).setData(turf.featureCollection(data));
                    }
                } catch (e) {
                    clearInterval(loadInterval);
                }

            }, timeOut);

            //new ___reactContext.mapStore.geocoder._mapboxgl.Marker().setLngLat(centerTilePolygon.geometry.coordinates[0][0]).addTo(mapgl);
        }

        HideOtherStuffz () {
            //console.log("hideotherstuffz: ", mapHandler.mapgl.getLayer("landfield-fill-layer").visibility);
            if (mapHandler.mapgl.getLayer("landfield-fill-layer") && mapHandler.mapgl.getLayoutProperty('landfield-fill-layer', 'visibility') !== "none") {
                mapHandler.mapgl.setLayoutProperty('landfield-fill-layer', 'visibility', "none")
                mapHandler.mapgl.setLayoutProperty('landfield-owned-pattern-layer', 'visibility', "none")
                mapHandler.mapgl.setLayoutProperty('flags', 'visibility', "none")
                mapHandler.mapgl.setLayoutProperty('landfield-layer', 'visibility', "none")
            }
        }

        GetLoadingAnimationPartsPolygons (loadingAnimationPartsArray, startStepPolygonWithDirections) {


            let result = [];
            let lastDirection = startStepPolygonWithDirections.stepTilePolygonDirections;
            for (let i = 0; i < loadingAnimationPartsArray.length; i++) {
                let loadingAnimationPart = loadingAnimationPartsArray[i];

                let countryCode = loadingAnimationPart.countryCode === "__" || loadingAnimationPart.countryCode === "SKIP" ? "european union" : loadingAnimationPart.countryCode;

                if (loadingAnimationPart.direction !== "") {
                    let direction = loadingAnimationPart.direction;

                    let lAPPolygon = tilePolygonHelper.getStepTilePolygonAndDirections(lastDirection, direction);
                    //console.log("l.a.p. polygon: ", lAPPolygon);

                    lAPPolygon.stepTilePolygon.properties.country = countryCode;

                    if (loadingAnimationPart.countryCode !== "SKIP") {
                        result.push(lAPPolygon.stepTilePolygon);
                    }

                    lastDirection = lAPPolygon.stepTilePolygonDirections;

                } else {
                    //handle "stay"
                    //console.log("stay: ", startStepPolygonWithDirections.stepTilePolygon);
                    startStepPolygonWithDirections.stepTilePolygon.properties.country = countryCode;
                    result.push(startStepPolygonWithDirections.stepTilePolygon)
                }
            }
            return result;
        }

    }

    let loadScript = async (src) => {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.type = 'text/javascript'
            script.onload = resolve;
            script.onerror = reject;
            script.src = src;
            document.head.append(script);
        })
    };

    class MoveHandler {
        constructor(parent) {

            this.parent = parent;
            this.canMove = true;
            //console.log("movehandler parent: ", this.parent);
            //this.lessGo();

            mapHandler.mapgl.addSource(CONSTS.TilePolysId, {
                'type': 'geojson',
                'data': turf.featureCollection([])
            });
            //window.lastPoly = this.tilePolys.features[tilePolys.features.length - 1];

            // Add a new layer to visualize the polygon.
            mapHandler.mapgl.addLayer({
                'id': CONSTS.TilePolysId,
                'type': 'fill',
                'source': CONSTS.TilePolysId, // reference the data source
                'layout': {},
                'paint': {
                    'fill-color': ["get", "color"],// '#0080ff', // blue color fill
                    'fill-opacity': 0.5,
                    'fill-outline-color': "#FF00FF"
                }
            });

            this.snakeHeadHandler = new SnakeHeadHandler();
        }

        init (firstClick) {
            this.resetScores();
            this.tjaScore = 0;

            if (firstClick === true) {
                this.lessGo();
                this.addArrowEventHandlers();
            } else {
                this.reset();
                this.lessGo();
            }

        }

        lessGo () {

            //mapgl.setCenter([-74.00630999999913, 41.31224199999977]);

            let centerTileIndex = tilePolygonHelper.getTileIndexFromLatLng(mapHandler.mapgl.getCenter().toArray());
            let centerTilePolygon = tilePolygonHelper.quadkeyToPolygon(centerTileIndex);
            this.setAdditionalPolygonProperties(centerTilePolygon);

            this.tileIndexes = [centerTileIndex];

            this.tilePolys = turf.featureCollection([centerTilePolygon]);

            let source = mapHandler.mapgl.getSource(CONSTS.TilePolysId)
            if (source) {
                //source already present
                source.setData(this.tilePolys)
            } else {

            }
            this.updateDirectionData(false, DIRECTIONS.UP);



        }

        // lessGo_old () {
        //     //let tileIndexes = [212170715732421];//, 161060604910021, 432073041287621, 102219552954821, 322121878510021, 15461213575621, 125412376353221, 380962930465221, 235363539130821, 345314701908421, 216036186298821, 70436794964421, 180387957742021];
        //     //432073041287621 - right
        //     //102219552954821 - up

        //     let tileIndex = 212170715732421;
        //     this.tileIndexes = [tileIndex];
        //     let startPolygon = tilePolygonHelper.quadkeyToPolygon(tileIndex);
        //     startPolygon.properties.color = CONSTS.DefaultTilePolygonColor;

        //     this.tilePolys = turf.featureCollection([startPolygon]);
        //     mapHandler.mapgl.addSource(CONSTS.TilePolysId, {
        //         'type': 'geojson',
        //         'data': this.tilePolys
        //     });
        //     //window.lastPoly = this.tilePolys.features[tilePolys.features.length - 1];

        //     // Add a new layer to visualize the polygon.
        //     mapHandler.mapgl.addLayer({
        //         'id': CONSTS.TilePolysId,
        //         'type': 'fill',
        //         'source': CONSTS.TilePolysId, // reference the data source
        //         'layout': {},
        //         'paint': {
        //             'fill-color': ["get", "color"],// '#0080ff', // blue color fill
        //             'fill-opacity': 0.5,
        //             'fill-outline-color': "#FF00FF"
        //         }
        //     });

        //     this.updateDirectionData(false);

        //     //console.log("poly: ", polygons);
        // }

        resetScores () {
            this.sheggScore = 0;
            this.lengthScore = 0;
            //

            this.parent.setSheggScore(this.sheggScore);
            this.parent.setLengthScore(this.lengthScore);
        }

        updateDirectionData (isReset, direction) {
            let lastPoly = this.tilePolys.features[this.tilePolys.features.length - 1];
            let directions = tilePolygonHelper.getPolygonsWithDirectionData(lastPoly);
            // if (isReset) {
            //     console.log(`directions: `, directions);
            // }
            this.directionsFeatureCollection = turf.featureCollection(directions);

            if (isDebug == true) {

                let source = mapHandler.mapgl.getSource("circles");

                if (source) {
                    mapHandler.mapgl.getSource("circles").setData(this.directionsFeatureCollection);
                } else {
                    mapHandler.mapgl.addSource('circles', {
                        'type': 'geojson',
                        'data': this.directionsFeatureCollection
                    });

                    mapHandler.mapgl.addLayer({
                        id: "circles",
                        type: "circle",
                        source: "circles",
                        'paint': {
                            'circle-radius': 5,
                            'circle-color': ["get", "color"],
                            'circle-opacity': 0.75,
                            'circle-stroke-color': "#00FFFF",
                            'circle-stroke-width': 2
                        }
                    });
                }
            }

            if (isReset) {
                this.snakeHeadHandler = new SnakeHeadHandler();
            } else {

                let rotation = 0;
                switch (direction) {
                    case DIRECTIONS.UP:
                        rotation = 0;
                        break;
                    case DIRECTIONS.DOWN:
                        rotation = 180;
                        break;
                    case DIRECTIONS.LEFT:
                        rotation = 270;
                        break;
                    case DIRECTIONS.RIGHT:
                        rotation = 90;
                        break;
                }

                mapHandler.mapgl.setLayoutProperty(CONSTS.SnakeHeadId, "icon-rotate", rotation);
            }
            this.snakeHeadHandler.addNewPosition(lastPoly.properties.bbox.center);
            requestAnimationFrame(() => { this.snakeHeadHandler.updateSnakeHeadPosition(); });
        }

        addArrowEventHandlers () {
            document.addEventListener("keydown", (e) => {
                let prevent = false;
                switch (e.code) {
                    case "ArrowUp":
                        prevent = true;
                        break;
                    case "ArrowDown":
                        prevent = true;
                        break;
                }
                if (prevent) {
                    e.preventDefault();
                }
            })

            document.addEventListener('keyup', (e) => {
                //console.log("keyup e: ", e);

                switch (e.code) {
                    case "ArrowUp":
                        this.moveIt("up");
                        break;
                    case "ArrowDown":
                        this.moveIt("down");
                        break;
                    case "ArrowLeft":
                        this.moveIt("left");
                        break;
                    case "ArrowRight":
                        this.moveIt("right");
                        break;
                }

                e.preventDefault();
                e.stopPropagation();
            });
        }

        moveIt (direction) {
            if (this.canMove) {
                //console.log(`move: [${direction}]`, this.directionsFeatureCollection);
                let nextCenter = this.directionsFeatureCollection.features.find(m => m.properties.direction == direction);
                let tileIndex = tilePolygonHelper.getTileIndexFromLatLng(nextCenter.geometry.coordinates);

                if (!this.tileIndexes.includes(tileIndex)) {
                    //console.log("nextTileIndex: ", tileIndex);
                    let nextPoly = tilePolygonHelper.quadkeyToPolygon(tileIndex);
                    this.setAdditionalPolygonProperties(nextPoly);

                    this.tilePolys.features.push(nextPoly);
                    mapHandler.mapgl.getSource(CONSTS.TilePolysId).setData(this.tilePolys);

                    this.updateDirectionData(false, direction);
                    this.checkPosition(nextPoly);

                    this.tileIndexes.push(tileIndex);

                    if (this.tileIndexes.length > 5) {
                        this.checkAddShegg();
                    }

                    if (this.hasFoundShegg(nextPoly)) {
                        this.removeSheggFromMap();

                        console.log("shegg caught!");
                        this.sheggScore++;
                        this.parent.setSheggScore(this.sheggScore);
                    }

                    this.lengthScore++;
                    this.parent.setLengthScore(this.lengthScore);

                } else {
                    this.tjaScore++;
                    if (this.tjaScore % 3 === 0) {
                        console.log("tja");
                    } else {
                        console.log(".. ouch");
                    }

                    this.canMove = false;

                    let data = mapHandler.mapgl.getSource(CONSTS.TilePolysId)._data.features;
                    for (let i = 0; i < data.length; i++) {
                        data[i].properties.color = "#FF0000";
                    }
                    mapHandler.mapgl.getSource(CONSTS.TilePolysId).setData(turf.featureCollection(data));
                    setTimeout(() => {
                        this.reset();
                    }, 500);
                }
            }

        }

        setAdditionalPolygonProperties (tilePolygon) {
            tilePolygon.properties.color = currentTileColor;
            tilePolygon.properties.created = new Date();
        }

        checkPosition (nextPoly) {
            //check if we are nearing the borders of the map -> then ease to the current location
            //console.log("checkPosition: ", { nextPoly });
            let coords = mapHandler.mapgl.project(nextPoly.geometry.coordinates[0][0]);

            let clientWidth = document.querySelector("div#map").clientWidth;
            let clientHeight = document.querySelector("div#map").clientHeight;

            //console.log(`screen coords: [${coords.x} | ${coords.y}] vs [${clientWidth} | ${clientHeight}]`);

            let limit = 100;
            if (coords.x < limit || coords.y < limit
                || (clientWidth - coords.x) < limit
                || (clientHeight - coords.y) < limit) {
                mapHandler.mapgl.easeTo({ center: nextPoly.geometry.coordinates[0][0], duration: 100 });
            }
        }

        reset () {
            //console.log("reset");


            this.resetScores();
            this.removeSheggFromMap();

            let centerTileIndex = tilePolygonHelper.getTileIndexFromLatLng(mapHandler.mapgl.getCenter().toArray());
            let centerTilePolygon = tilePolygonHelper.quadkeyToPolygon(centerTileIndex);
            this.setAdditionalPolygonProperties(centerTilePolygon);

            this.tilePolys.features = [];
            this.tilePolys.features.push(centerTilePolygon);

            mapHandler.mapgl.getSource(CONSTS.TilePolysId).setData(this.tilePolys);
            //mapgl.setCenter(centerTilePolygon.geometry.coordinates[0][0]);
            this.updateDirectionData(true, DIRECTIONS.UP);
            this.tileIndexes = [centerTileIndex];

            this.canMove = true;
        }

        checkAddShegg () {

            let layer = mapHandler.mapgl.getLayer(CONSTS.SheggId);
            if (layer) {
                //console.log("shegg already present");
            } else {
                let limit = 69;
                let max = 100;
                let min = 1;
                let diceRoll = Math.floor(Math.random() * (max - min)) + min;
                let doShegg = diceRoll > limit;
                //console.log(`dice roll: [${diceRoll}] > [${limit}] ? [${doShegg}]`);
                if (doShegg) {
                    this.addShegg(CONSTS.SheggId);
                }
            }
        }

        addShegg (sheggId) {

            let bounds = mapHandler.mapgl.getBounds().toArray().flat();

            //console.log("addShegg bounds: ", bounds);
            let randomPos = turf.randomPosition(bounds);
            let tileIndex = tilePolygonHelper.getTileIndexFromLatLng(randomPos);
            while (this.tileIndexes.includes(tileIndex)) {
                randomPos = turf.randomPosition(bounds);
                tileIndex = tilePolygonHelper.getTileIndexFromLatLng(randomPos);
                console.log(`random pos index: [${tileIndex}]`, randomPos);
            }

            let sheggPolygon = tilePolygonHelper.quadkeyToPolygon(tileIndex);
            let center = turf.center(sheggPolygon);

            //console.log("center: ", center);

            let source = mapHandler.mapgl.getSource(sheggId);
            if (source) {
                this.removeSheggFromMap();

            }

            mapHandler.mapgl.addSource(sheggId, { 'type': 'geojson', 'data': turf.featureCollection([center]) });

            let iconSize = this.calculateImageScale("shegg");

            mapHandler.mapgl.addLayer({
                'id': sheggId,
                'type': 'symbol',
                'source': sheggId,
                'layout': {
                    'icon-image': 'shegg',
                    'icon-size': iconSize,
                    //'icon-allow-overlap': false,
                }
            });

            console.log("shegg added ");

        }

        removeSheggFromMap () {
            if (mapHandler.mapgl.getSource(CONSTS.SheggId)) {
                mapHandler.mapgl.removeLayer(CONSTS.SheggId);
                mapHandler.mapgl.removeSource(CONSTS.SheggId);
            }

        }

        calculateImageScale (imageName) {
            let imgData = mapHandler.mapgl.style.imageManager.images[imageName].data;
            let tilePolygon = this.tilePolys.features.filter(tp => tp.properties.bbox)[0];

            if (!tilePolygon) {
                let centerTileIndex = tilePolygonHelper.getTileIndexFromLatLng(mapHandler.mapgl.getCenter().toArray());
                tilePolygon = tilePolygonHelper.quadkeyToPolygon(centerTileIndex);
            }

            //console.log("calculateSheggSize: ", { imgData, lastTilePolygon });

            let tileBbox = tilePolygon.properties.bbox.box;
            let bbox1 = mapHandler.mapgl.project([tileBbox[0], tileBbox[1]]);
            let bbox2 = mapHandler.mapgl.project([tileBbox[2], tileBbox[3]]);

            let pixelWidth = Math.abs(Math.max(bbox1.x, bbox2.x) - Math.min(bbox1.x, bbox2.x));
            let pixelHeight = Math.abs(Math.max(bbox1.y, bbox2.y) - Math.min(bbox1.y, bbox2.y));

            let ratio = pixelHeight / imgData.height;
            //console.log("ratio: "+ratio);
            return ratio - 0.0001;
        }

        hasFoundShegg (tilePolygon) {
            let foundShegg = false;
            if (mapHandler.mapgl.getSource(CONSTS.SheggId)) {
                let sheggCenter = turf.point(mapHandler.mapgl.getSource(CONSTS.SheggId)._data.features[0].geometry.coordinates);
                foundShegg = turf.booleanPointInPolygon(sheggCenter, tilePolygon);
            }

            //console.log(`shegg found: [${foundShegg}]`)
            return foundShegg;
        }
    }

    class UIHandler {
        constructor(parent) {
            this.containerSelector = "div.map";
            this.buttonStartId = "btn-go";
            this.buttonEnoughId = "btn-nuff-said";
            this.buttonRandomId = "btn-going-places";
            this.buttonColorMe = "btn-color-me";
            this.scoreSheggId = "shegg_score";
            this.scoreLengthId = "length_score";


            this.initUI();

            this.parent = parent;
        }

        initUI () {
            if (!document.querySelector("#" + this.buttonStartSelector)) {
                let viewButtonsTag = `
                    <div class="extra-bits-2" style="position:absolute; z-index:2; bottom: 50px; left:10px; width: 265px; border: 1px solid green; padding: 5px; background-color:rgba(51, 51, 51, 0.5);">
                        <button type="button" id="${this.buttonStartId}"><span style="padding-left: 10px;padding-right: 10px;color: #FF0; border: 1px solid #FF0;">lessGO!</span></button>
                        <button type="button" id="${this.buttonEnoughId}"><span style="padding-left: 10px;padding-right: 10px;color: #FF0;  border: 1px solid #FF0;">Iz 'Nuff</span></button>
                        <button type="button" id="${this.buttonRandomId}"><span style="padding-left: 10px;padding-right: 10px;color: #FF0;  border: 1px solid #FF0;">Going places</span></button>
                        <div id="scores" style="color: white;">
                            <div id="${this.scoreSheggId}">Sheggs: <span style="color: red;">0</span></div>
                            <div id="${this.scoreLengthId}">Score: <span style="color: snow;">0</span></div>
                        </div>
                        <button type="button" id="${this.buttonColorMe}" style="position:absolute; right: 15px; bottom: 15px;background-color: ${currentTileColor};border: 1px solid #FF0;"> Color me.. </button>
                    </div>
                    `;
                document.querySelector(this.containerSelector).insertAdjacentHTML("afterbegin", viewButtonsTag);

                let moveHandler = new MoveHandler(this);

                let startFirstClick = true;
                let startButton = document.querySelector("#" + this.buttonStartId);
                startButton.addEventListener("click", () => {
                    //console.log("start clicked");
                    startButton.disabled = true;
                    moveHandler.init(startFirstClick);
                    startFirstClick = false;
                    startButton.disabled = false;
                });

                let sendHighscoreButton = document.querySelector("#" + this.buttonEnoughId);
                sendHighscoreButton.addEventListener("click", async () => {

                    if (moveHandler.lengthScore === 0) {
                        this.showCustomToast(MessageSeverity.ERROR, "score 0 -> not sending sorry");
                        return;
                    }

                    //console.log("send high score clicked");
                    sendHighscoreButton.disabled = true;
                    try {
                        let result = prompt('Enter your name (3 characters only)\r\nfrom: [a-z][A-Z][0-9]');

                        if (this.validateUserName(result) === "") {
                            if (window.auth0user !== undefined) {
                                result += `;userId:${window.auth0user.id}`;
                            }

                            moveHandler.canMove = false;

                            //console.log("light encode: ", moveHandler);
                            //let msg = lightEncoder.lightEncode(`v${CONSTS.Version};${new Date().toISOString()};user:${result};score:${moveHandler.lengthScore};sheggs:${moveHandler.sheggScore};tja:${moveHandler.tjaScore};tiles:${moveHandler.tileIndexes.join("#")}`);
                            let msg = lightEncoder.lightEncode(`version:${CONSTS.Version};user:${result};score:${moveHandler.lengthScore};sheggs:${moveHandler.sheggScore};tja:${moveHandler.tjaScore};tiles:${moveHandler.tileIndexes.join("#")}`);
                            //console.log("msg: ", msg);

                            //let decoded = lightEncoder.lightDecode(msg);
                            //console.log("dec: ", decoded);
                            this.showCustomToast(MessageSeverity.WARNING, "Sending score, please wait..");

                            let saveResult = await fetch('https://earth-2-biomes.herokuapp.com/api/game-scores/save', {
                                method: 'POST',
                                headers: {
                                    'Accept': 'application/json',
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ data: msg })
                            }).catch(err => {
                                console.warn("Error while sending data ", err);
                                sendHighscoreButton.disabled = false;
                            });

                            if (saveResult.ok === true) {
                                this.showCustomToast(MessageSeverity.SUCCESS, "Score saved", true);
                                moveHandler.reset();
                            } else {
                                this.showCustomToast(MessageSeverity.ERROR, "Oh no. Something bad happened, pls contact dev.");
                            }

                            //console.log("result: ", saveResult);

                            moveHandler.canMove = true;


                        } else {
                            this.showCustomToast(MessageSeverity.ERROR, "Invalid input, please try again");
                        }


                    } catch (err1) {
                        console.log("error while sending high score ", { err1 });
                    }

                    sendHighscoreButton.disabled = false;
                });


                let goRandomButton = document.querySelector("#" + this.buttonRandomId);
                goRandomButton.addEventListener("click", () => {
                    //console.log("send to random location clicked");

                    let randomPos = turf.randomPosition([-175, -80, 175, 80])
                    console.log("random pos: ", randomPos);
                    mapHandler.mapgl.setCenter(randomPos);
                    mapHandler.mapgl.setZoom(16.5);
                    if (!startFirstClick) {
                        startButton.click();
                    }
                });

                let colorMe = document.querySelector("#" + this.buttonColorMe);
                colorMe.addEventListener("click", () => {
                    currentTileColor = "#" + Math.floor(Math.random() * 16777215).toString(16);
                    this.showCustomToast(MessageSeverity.SUCCESS, ".. like one of those French girls", true);
                    colorMe.style["background-color"] = currentTileColor;
                })
            }
        }

        validateUserName (input) {
            if (input.length > 3) {
                return "input too long";
            } else {
                return /^[a-z0-9]+$/i.test(input) ? "" : "invalid input";
            }
        }

        setSheggScore (scoreNumber) {
            document.querySelector(`#${this.scoreSheggId} span`).textContent = scoreNumber;
            if (scoreNumber === 42 || scoreNumber === 69 || scoreNumber === 420) {
                this.showCustomToast(MessageSeverity.SUCCESS, "Noice!", true);
            }
        }

        setLengthScore (scoreNumber) {
            document.querySelector(`#${this.scoreLengthId} span`).textContent = scoreNumber;
            if (scoreNumber === 42 || scoreNumber === 69 || scoreNumber === 420) {
                this.showCustomToast(MessageSeverity.SUCCESS, "Noice!", true);
            }
        }

        showCustomToast (severity, message, dismissOthers) {
            try {
                //console.log(`[${severity}] : ${message}`);

                let showLength = 2500;

                if (dismissOthers === true) {
                    M.Toast.dismissAll();
                }

                let colorClass = "";
                switch (severity) {
                    case MessageSeverity.SUCCESS: colorClass = "green"; break;
                    case MessageSeverity.WARNING: colorClass = "yellow black-text"; break;
                    case MessageSeverity.ERROR: colorClass = "red"; break;
                }

                M.toast({
                    html: `<i class="material-icons">clear</i> ${message}`,
                    classes: `${colorClass} darken-1 pulse`,
                    displayLength: showLength
                });
            } catch (e) {
                console.error("show custom toast error", e);
            }
        }
    }

    let snakeHeadPositions = [];
    class SnakeHeadHandler {
        constructor() {
            this.stepCount = 10;
            this.positionQueue = [];
            this.lastPosition = null;

            if (mapHandler.mapgl.getSource(CONSTS.SnakeHeadId)) {
                mapHandler.mapgl.removeLayer(CONSTS.SnakeHeadId);
                mapHandler.mapgl.removeSource(CONSTS.SnakeHeadId);
            }

            mapHandler.mapgl.addSource(CONSTS.SnakeHeadId, { "type": "geojson", "data": turf.featureCollection([]) });

            let iconSize = 1;//4 * this.calculateImageScale("kRocket");

            mapHandler.mapgl.addLayer({
                'id': CONSTS.SnakeHeadId,
                'type': 'symbol',
                'source': CONSTS.SnakeHeadId,
                'layout': {
                    'icon-image': 'kRocket',
                    'icon-size': iconSize,
                    'icon-allow-overlap': true,
                }
            });
        }

        addNewPosition (newPositionPoint, direction) {
            if (this.lastPosition !== null) {
                //calculate points between current "last" position and new 
                //add items to the queue
                //console.log(`addNewPosition `, { a_last: this.lastPosition.geometry.coordinates, b_add: newPositionPoint.geometry.coordinates })
                let distance1 = this.getDistance(this.lastPosition, newPositionPoint, 0);
                let distance2 = this.getDistance(this.lastPosition, newPositionPoint, 1);
                //console.log(`distances: [${distance1} | ${distance2}]`);

                let distance1Steps = distance1 / this.stepCount;
                let distance2Steps = distance2 / this.stepCount;

                //console.log(`distance steps: `, { distance1Steps, distance2Steps });

                let xMultiplier = this.lastPosition.geometry.coordinates[0] > newPositionPoint.geometry.coordinates[0] ? -1 : 1;
                let yMultiplier = this.lastPosition.geometry.coordinates[1] > newPositionPoint.geometry.coordinates[1] ? -1 : 1;

                for (let i = 0; i < this.stepCount; i++) {
                    this.positionQueue.push(turf.point([
                        this.lastPosition.geometry.coordinates[0] + (i + 1) * distance1Steps * xMultiplier,
                        this.lastPosition.geometry.coordinates[1] + (i + 1) * distance2Steps * yMultiplier,
                    ]));
                }
                //console.log("queue: ", this.positionQueue.map(pq => pq.geometry.coordinates));
            } else {
                let source = mapHandler.mapgl.getSource(CONSTS.SnakeHeadId)
                source._data.features.push(newPositionPoint);
                source.setData(source._data);
            }
            this.lastPosition = newPositionPoint;
        }

        getDistance (pointA, pointB, index) {
            return Math.max(pointA.geometry.coordinates[index], pointB.geometry.coordinates[index]) - Math.min(pointA.geometry.coordinates[index], pointB.geometry.coordinates[index]);
        }

        getDistanceAbs (pointA, pointB, index) {
            return Math.abs(Math.max(pointA.geometry.coordinates[index], pointB.geometry.coordinates[index]) - Math.min(pointA.geometry.coordinates[index], pointB.geometry.coordinates[index]))
        }

        updateSnakeHeadPosition () {
            //console.log("update ", { t: this, pq: this.positionQueue });
            if (this.positionQueue.length > 0) {
                let nextPosition = this.positionQueue.shift();

                //console.log("updateSnakeHeadPosition", nextPosition.geometry.coordinates);

                let source = mapHandler.mapgl.getSource(CONSTS.SnakeHeadId);
                source._data.features[0] = nextPosition;
                source.setData(source._data);

                requestAnimationFrame(() => { this.updateSnakeHeadPosition(); });
            }
        }
    }

    class EncodingLight {
        constructor() {
            this.charMap = new Map([
                ["a", ["alma", "ahitat", "attol"]],
                ["b", ["bodza", "borbarat", "burgonyaszirom"]],
                ["c", ["citrom", "cinege", "cerna"]],
                ["d", ["datolya", "dohany", "dragako"]],
                ["e", ["eper", "ekeszarv", "evezolapat"]],
                ["f", ["fuge", "faszengaz", "flekken"]],
                ["g", ["gomba", "gizgaz", "gubernator"]],
                ["h", ["humusz", "hod", " hullamvasut"]],
                ["i", ["ibolya", "iszap", "ispotaly"]],
                ["j", ["juhsajt", "jehova", "jancsiszeg"]],
                ["k", ["kukorica", "kajszibarack", "karaj"]],
                ["l", ["langos", "lepeny", "libamaj"]],
                ["m", ["mango", "malac", "mehecske"]],
                ["n", ["nokedli", "naphal", "negyzetgyok"]],
                ["o", ["orgona", "okostojas", "omagyar"]],
                ["p", ["pipacs", "pecsenye", "poszata"]],
                ["q", ["qrva", "qkorica", "qtya"]],
                ["r", ["repce", "repa", "ribizli"]],
                ["s", ["komondor", "sertes", "sutopor"]],
                ["t", ["tea", "tuzok", "tukortojas"]],
                ["u", ["uborka", "ugar", "ujj"]],
                ["v", ["virsli", "voroshagyma", "vocsok"]],
                ["w", ["wakeger", "waddiszno", "wamhivatal"]],
                ["x", ["tyuxar", "gikszer", "szekszard"]],
                ["y", ["lyuk", "lyukkartya", "paszuly"]],
                ["z", ["zentai", "zerge", "zab"]],

                ["0", ["orrureg", "okirat", "omladek"]],
                ["1", ["iroda", "illetmeny", "ingyenes"]],
                ["2", ["zaszlo", "zene", "zimanko"]],
                ["3", ["ecet", "egyetlen", "eloszoba"]],
                ["4", ["adomany", "agynemu", "apaca"]],
                ["5", ["sarkkor", "srac", "suritett"]],
                ["6", ["gazolaj", "gepsonka", "gondviseles"]],
                ["7", ["lapszemle", "legatereszto", "lidercfeny"]],
                ["8", ["olelkezes", "oromtanya", "ozonviz"]],
                ["9", ["ugyeletes", "udvhadsereg", "ustokos"]],
            ]);

            this.charMapRu = new Map([
                ["a", ["ë", "Ǝ", "ɏ", "Ĥ"]],
                ["b", ["ƃ", "Ù", "§", "æ"]],
                ["c", ["Ζ", "Ψ", "Ǖ", "ƭ"]],
                ["d", ["ǫ", "ŝ", "ò", "Ń"]],
                ["e", ["Ϛ", "ߓ", "պ", "Ж"]],
                ["f", ["ԁ", "ԧ", "ẉ", "ả"]],
                ["g", ["Ⅿ", "ẻ", "Ꮞ", "ߗ"]],
                ["h", ["ǔ", "᱐", "е", "х"]],
                ["i", ["ɣ", "Ꭵ", "с", "Ǫ"]],
                ["j", ["ū", "Ү", "Ŕ", "ʘ"]],
                ["k", ["ã", "ɵ", "Օ", "Ҏ"]],
                ["l", ["Ẑ", "Ꭲ", "ȯ", "Ḍ"]],
                ["m", ["Ṵ", "Ꮋ", "Ḑ", "Ἐ"]],
                ["n", ["Ḗ", "Ꮢ", "Ἑ", "Ḛ"]],
                ["o", ["Ḿ", "Ꮎ", "Ṣ", "ⴸ"]],
                ["p", ["Ⱬ", "Ꮤ", "Ṉ", "ⵏ"]],
                ["q", ["Ⲃ", "Ꮐ", "Ọ", "ⵚ"]],
                ["r", ["Ɒ", "Ợ", "ⴱ", "ｏ"]],
                ["s", ["ⅰ", "Ἡ", "０", "ꮤ"]],
                ["t", ["Ⅽ", "ḟ", "ⵀ", "ꓒ"]],
                ["u", ["ằ", "Ⲟ", "ⵙ", "ꓴ"]],
                ["v", ["ᗷ", "Ꚛ", "Ⲓ", "О"]],
                ["w", ["ᗞ", "Ⱪ", "⊚", "å"]],
                ["x", ["Ꭼ", "⊛", "А", "ȃ"]],
                ["y", ["ი", "І", "һ", "ȁ"]],
                ["z", ["ӕ", "В", "ṭ", "ո"]],

                ["0", ["ᖰ", "ᖱ", "ᖲ", "ᖳ"]],
                ["1", ["⡉", "⡊", "⠿"]],
                ["2", ["⠬", "⠭"]],
                ["3", ["⠓", "⠔"]],
                ["4", ["⣶", "⣷"]],
                ["5", ["⢻", "⣧"]],
                ["6", ["⢡", "⢢"]],
                ["7", ["⢇", "⢺"]],
                ["8", ["⠸", "⠹"]],
                ["9", ["⡻", "⡃"]],
            ]);

            this.capitalStrings = ["≐", "≑", "≒", "≓", "≔", "≕"];
        }

        getChars = (stringToSplit) => { return stringToSplit.split('') }

        getRandomElementFromArray = (items) => { /*console.log("items: ", items);*/ return items[Math.floor(Math.random() * items.length)]; }

        lightEncode (testString) {
            //console.log(`to encode: [${testString}]`, this);
            let splitted = this.getChars(testString);

            let result1 = [];
            splitted.forEach(ch => {

                let charAsLowerCase = ch.toLowerCase();
                let isUpperCase = ch !== ch.toLowerCase();
                if (isUpperCase) {
                    result1.push(this.getRandomElementFromArray(this.capitalStrings));
                }

                //console.log(`lower case: [${charAsLowerCase}]`);
                let matchingEntries = this.charMap.get(charAsLowerCase);
                if (matchingEntries) {
                    result1.push(this.getRandomElementFromArray(matchingEntries));
                } else {
                    result1.push(ch);
                }

            });
            //console.log(`for [${testString}] : result 1: [${result1.join("|")}]`);

            //let string1 = result1.join("|",m => m.reverse().map(ch => getRandomElementFromArray(charMapRu.get(ch))));
            let string1 = "";
            result1.forEach(r1 => {
                for (let i = 0; i < r1.length; i++) {
                    let matchingEntries = this.charMapRu.get(r1[i]);
                    if (matchingEntries) {
                        string1 += this.getRandomElementFromArray(matchingEntries);
                    } else {
                        string1 += r1[i];
                    }
                }
            })
            //console.log(`for [${testString}] : result 2: [${string1}]`);

            let rev = [...string1].reverse().join("");
            //console.log(`for [${testString}] : result 3: [${rev}]`)

            return rev;
        }

        lightDecode (testString) {
            let rev = [...testString].reverse();

            let string1 = "";
            rev.forEach(r1 => {
                let foundMatch = false;
                for (let [key, value] of this.charMapRu.entries()) {
                    if (value.includes(r1)) {
                        string1 += key;
                        foundMatch = true;
                        break;
                    }
                }
                if (!foundMatch) {
                    string1 += r1;
                }
            });
            //console.log("rev1: "+string1);

            let string2 = string1;
            for (let [key, value] of this.charMap.entries()) {
                value.forEach(v => {
                    string2 = string2.replaceAll(v, key);
                });
            }
            //console.log("string2: ", string2);

            let string3 = "";
            let arr = [...string2];
            for (let i = 0; i < arr.length; i++) {
                let ch = arr[i];
                if (this.capitalStrings.includes(ch)) {
                    string3 += arr[i + 1].toUpperCase();
                    i++;
                } else {
                    string3 += ch;
                }
            }
            //console.log("string3: ", string3);
            return string3;
        }
    }

    let lightEncoder = new EncodingLight();


    loadScript('https://npmcdn.com/@turf/turf/turf.min.js')
        .then(async () => {
            //console.log("scripts loaded");
            greetings();

            let loadTime = new Date();

            let loadingAnimation = new LoadingAnimation();
            await loadingAnimation.loadGO();

            //check nextPoly.created (if too much time elapsed reload page)

            //console.log(".. done ..");
        }).catch((e) => console.log('Something went wrong.', e));

})();