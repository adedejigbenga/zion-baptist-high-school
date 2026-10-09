/**
 * Generates the placeholder ILLUSTRATIONS in public/images (one SVG per slot in src/lib/site-images.ts).
 *
 *   node scripts/generate-illustrations.mjs
 *
 * They are original flat drawings in the Zion Baptist High School purple palette, standing in for photographs until the
 * school supplies real ones. To use a real photo instead, put it in public/images and change that slot's `src`
 * in src/lib/site-images.ts: this script is not needed for that.
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "images")
mkdirSync(OUT, { recursive: true })

const W = 1600
const H = 1000

const C = {
  p950: "#2e1065", p900: "#4c1d95", p800: "#5b21b6", p700: "#6d28d9", p600: "#7c3aed", p500: "#8b5cf6",
  p400: "#a78bfa", p300: "#c4b5fd", p200: "#ddd6fe", p100: "#ede9fe", p50: "#f5f3ff", white: "#ffffff",
  grass: "#a5d3ac", grass2: "#86bd92", tree: "#4a8660", tree2: "#6aa97c", trunk: "#6b4a3a",
  wall: "#f6f1fd", wall2: "#e8defa", wood: "#d09a6c", wood2: "#aa7549", floor: "#e6ddf8",
  gold: "#f2c46d", red: "#e5736b", blue: "#6aa6e8", teal: "#5fbfb3", orange: "#f0955a", ink: "#2b2140",
}
const SKIN = ["#8d5524", "#c68642", "#e0ac69", "#f1c27d", "#5c3a21", "#a0673a"]
const HAIR = ["#1f1720", "#2b1b17", "#3b2a24", "#5a3a28", "#14101a"]
const TOPS = [C.white, C.p200, C.white, C.p300, C.white, C.p100]
const BOTTOMS = [C.p900, "#3b3550", C.p800, "#3b3550"]
const pick = (arr, i) => arr[Math.abs(i) % arr.length]
const r = (n) => Math.round(n * 10) / 10

// ---------------------------------------------------------------- primitives
const rect = (x, y, w, h, fill, rx = 0, extra = "") => `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="${rx}" fill="${fill}" ${extra}/>`
const circle = (x, y, rad, fill, extra = "") => `<circle cx="${r(x)}" cy="${r(y)}" r="${r(rad)}" fill="${fill}" ${extra}/>`
const ellipse = (x, y, rx, ry, fill, extra = "") => `<ellipse cx="${r(x)}" cy="${r(y)}" rx="${r(rx)}" ry="${r(ry)}" fill="${fill}" ${extra}/>`
const path = (d, fill, extra = "") => `<path d="${d}" fill="${fill}" ${extra}/>`
const g = (inner, transform = "") => `<g${transform ? ` transform="${transform}"` : ""}>${inner}</g>`

function svg(body, defs = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs><rect width="${W}" height="${H}" fill="${C.p100}"/>${body}</svg>\n`
}

const skyDefs = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.p200}"/><stop offset="1" stop-color="${C.p50}"/></linearGradient>`
const sky = (h = 640) => rect(0, 0, W, h, "url(#sky)")
const cloud = (x, y, s = 1) => g(ellipse(0, 0, 90, 26, C.white) + ellipse(-40, -14, 44, 24, C.white) + ellipse(34, -20, 52, 28, C.white), `translate(${x} ${y}) scale(${s})`)

/** A person standing with feet at (x, y). `arms` = [left, right] angles in degrees (0 = hanging down, 180 = straight up). */
function person(x, y, h, { skin = SKIN[2], hair = HAIR[0], top = C.white, bottom = C.p900, arms = [8, -8], girl = false, coat = false, tilt = 0, shoe = C.ink } = {}) {
  const hr = h * 0.12
  const tw = h * 0.27
  const legTop = y - h * 0.42
  const torsoTop = y - h * 0.8
  const headY = torsoTop - hr * 0.78
  const arm = (side, angle) => {
    const sx = x + side * (tw / 2 - h * 0.012)
    const sy = torsoTop + h * 0.045
    const aw = h * 0.075
    return g(rect(-aw / 2, 0, aw, h * 0.33, coat ? top : top, aw / 2) + circle(0, h * 0.33, aw * 0.62, skin), `translate(${r(sx)} ${r(sy)}) rotate(${-side * angle})`)
  }
  const hairShape = girl
    ? path(`M${r(x - hr * 1.12)} ${r(headY + hr * 1.5)}v${r(-hr * 1.5)}a${r(hr * 1.12)} ${r(hr * 1.12)} 0 0 1 ${r(hr * 2.24)} 0v${r(hr * 1.5)}h${r(-hr * 0.5)}v${r(-hr * 0.9)}h${r(-hr * 1.24)}v${r(hr * 0.9)}Z`, hair)
    : path(`M${r(x - hr * 1.04)} ${r(headY - hr * 0.05)}a${r(hr * 1.04)} ${r(hr * 1.08)} 0 0 1 ${r(hr * 2.08)} 0q${r(-hr)} ${r(-hr * 0.55)} ${r(-hr * 2.08)} 0Z`, hair)
  const body = [
    arm(-1, arms[0]),
    arm(1, arms[1]),
    rect(x - tw * 0.43, legTop, tw * 0.38, h * 0.42, bottom, tw * 0.1),
    rect(x + tw * 0.05, legTop, tw * 0.38, h * 0.42, bottom, tw * 0.1),
    ellipse(x - tw * 0.24, y, tw * 0.28, h * 0.025, shoe),
    ellipse(x + tw * 0.24, y, tw * 0.28, h * 0.025, shoe),
    rect(x - tw / 2, torsoTop, tw, legTop - torsoTop + h * 0.07, top, tw * 0.32),
    coat ? rect(x - 2, torsoTop + 4, 4, legTop - torsoTop, C.p100, 1) : girl ? "" : rect(x - tw * 0.07, torsoTop + 2, tw * 0.14, h * 0.17, C.p700, 2),
    rect(x - hr * 0.35, torsoTop - hr * 0.35, hr * 0.7, hr * 0.6, skin),
    circle(x, headY, hr, skin),
    hairShape,
  ].join("")
  return tilt ? g(body, `rotate(${tilt} ${r(x)} ${r(y)})`) : g(body)
}

/** A seated pupil: only head and torso show above the desk, whose top edge is at deskY. */
const pupil = (x, deskY, h, opts) => person(x, deskY + h * 0.4, h, opts)

const kid = (i, extra = {}) => ({
  skin: pick(SKIN, i * 2 + 1),
  hair: pick(HAIR, i * 3 + 2),
  top: pick(TOPS, i),
  bottom: pick(BOTTOMS, i),
  girl: i % 3 === 1,
  ...extra,
})

function tree(x, y, s = 1, light = false) {
  return g(rect(-10, -150, 20, 150, C.trunk, 6) + circle(0, -190, 85, light ? C.tree2 : C.tree) + circle(-50, -150, 55, light ? C.tree2 : C.tree) + circle(52, -156, 58, light ? C.tree : C.tree2), `translate(${x} ${y}) scale(${s})`)
}

function windows(x, y, cols, rows, w, h, gx, gy, fill = C.p300) {
  let s = ""
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) s += rect(x + i * (w + gx), y + j * (h + gy), w, h, fill, 6) + rect(x + i * (w + gx), y + j * (h + gy) + h / 2 - 2, w, 4, C.p100)
  return s
}

function building(x, y, w, h, { cols = 8, rows = 2 } = {}) {
  const ww = (w - 120) / cols
  const door = 110
  return [
    rect(x, y, w, h, C.wall, 10),
    rect(x - 16, y - 28, w + 32, 40, C.p800, 8),
    rect(x, y + 12, w, 14, C.p600),
    windows(x + 60, y + 70, cols, rows, ww * 0.6, 70, ww * 0.4, 56),
    rect(x + w / 2 - door / 2 - 30, y + h - 170, door + 60, 170, C.wall2),
    rect(x + w / 2 - door / 2, y + h - 140, door, 140, C.p700, 8),
    rect(x + w / 2 - 3, y + h - 140, 6, 140, C.p400),
    path(`M${x + w / 2 - door / 2 - 44} ${y + h - 170}h${door + 88}l-${(door + 88) / 2} -60Z`, C.p800),
    circle(x + w / 2, y + h - 190, 11, C.p200),
  ].join("")
}

function flag(x, y) {
  return g(rect(-3, -150, 6, 150, C.p950) + path("M3 -150h86v54h-86Z", C.p500) + rect(3, -126, 86, 6, C.p200), `translate(${x} ${y})`)
}

const ground = (y, fill = C.grass) => rect(0, y, W, H - y, fill) + rect(0, y, W, 16, C.grass2)

// ---------------------------------------------------------------- scenes
const scenes = {}

scenes.hero = () => {
  const people = [0, 1, 2, 3, 4].map((i) => person(560 + i * 74, 960 - (i % 2) * 14, 190, kid(i + 3, { arms: [i === 2 ? 150 : 10, -10] }))).join("")
  return svg(
    sky(700) + circle(1280, 150, 70, C.p100) + cloud(260, 150) + cloud(980, 260, 0.8) + cloud(1420, 110, 0.6) +
      path("M0 600c200-80 380-100 560-40s360 30 560-30 340-40 480 20v200H0Z", C.p200) +
      tree(110, 760, 1.15, true) + tree(330, 740, 0.9) +
      building(560, 250, 900, 480, { cols: 9, rows: 2 }) + flag(1010, 220) +
      ground(720) + path("M690 720h220l180 280H430Z", C.p50) + path("M740 720h120l110 280H570Z", C.wall2, 'opacity=".5"') +
      tree(1520, 800, 1.1) + tree(1300, 770, 0.8, true) + people,
    skyDefs,
  )
}

scenes.campus = () =>
  svg(
    sky(600) + cloud(240, 160) + cloud(1100, 120, 0.7) + path("M0 540c260-90 520-70 800-10s560 50 800-20v160H0Z", C.p200) +
      building(120, 280, 760, 400, { cols: 7, rows: 2 }) + flag(1000, 600) +
      ground(660) + path("M300 660h200l260 340H80Z", C.p50) +
      tree(1000, 700, 1.3, true) + tree(1250, 720, 1.0) + tree(1480, 700, 1.2, true) +
      g(rect(0, 0, 220, 16, C.wood2, 4) + rect(10, 16, 14, 40, C.ink) + rect(196, 16, 14, 40, C.ink) + rect(0, -46, 220, 40, C.wood, 6), "translate(1010 830)") +
      person(780, 900, 230, kid(5, { arms: [14, -26] })) + person(870, 910, 220, kid(2, { arms: [-8, 8] })),
    skyDefs,
  )

scenes.welcome = () => {
  const row2 = [0, 1, 2, 3, 4].map((i) => person(420 + i * 190, 800, 380, kid(i + 1, { arms: [i % 2 ? 10 : 20, i % 2 ? -10 : -20] }))).join("")
  const row1 = [0, 1, 2, 3].map((i) => person(515 + i * 190, 1010, 470, kid(i + 7, { arms: [i === 1 ? 160 : 8, -8] }))).join("")
  return svg(
    sky(560) + cloud(260, 150) + cloud(1200, 210, 0.8) + building(200, 300, 1200, 380, { cols: 9, rows: 2 }) + ground(640) +
      tree(110, 700, 1.5, true) + tree(1500, 700, 1.4) + row2 + row1,
    skyDefs,
  )
}

scenes.about = () => {
  const adults = [
    person(560, 940, 520, { skin: SKIN[1], hair: HAIR[1], top: C.p700, bottom: "#3b3550", girl: true, arms: [10, -12] }),
    person(1050, 940, 540, { skin: SKIN[4], hair: HAIR[4], top: C.p900, bottom: "#2b2640", arms: [8, -8] }),
  ].join("")
  const kids = [0, 1, 2, 3].map((i) => person(700 + i * 100, 960, 330, kid(i + 10, { arms: [10, i === 2 ? -150 : -10] }))).join("")
  return svg(
    sky(600) + cloud(300, 170) + cloud(1150, 130, 0.7) +
      // school gate
      rect(250, 300, 90, 420, C.wall2, 6) + rect(1260, 300, 90, 420, C.wall2, 6) + rect(230, 270, 130, 50, C.p800, 8) + rect(1240, 270, 130, 50, C.p800, 8) +
      rect(340, 330, 920, 40, C.p700, 10) + rect(500, 290, 600, 70, C.p900, 14) + circle(800, 325, 26, C.p200) +
      ground(700) + path("M560 700h480l260 300H300Z", C.p50) + tree(120, 740, 1.2, true) + tree(1490, 740, 1.2) +
      adults + kids,
    skyDefs,
  )
}

scenes.classrooms = () => {
  const desk = (x, y, i) => pupil(x + 70, y, 200, kid(i, { arms: [20, -20] })) + rect(x, y + 20, 200, 130, C.wood2, 6) + rect(x, y, 200, 26, C.wood, 8)
  let desks = ""
  const rowsY = [600, 740, 880]
  rowsY.forEach((y, ri) => [180, 480, 780, 1080].forEach((x, ci) => (desks += desk(x + (ri % 2) * 30, y, ri * 4 + ci))))
  return svg(
    rect(0, 0, W, H, C.wall) + rect(0, 740, W, 260, C.floor) + rect(0, 730, W, 14, C.wall2) +
      rect(200, 120, 880, 360, C.p950, 14) + rect(212, 132, 856, 336, C.p900, 10) +
      path("M280 230c60-30 120 20 200-10s120 10 180-6", "none", `stroke="${C.p200}" stroke-width="8" stroke-linecap="round"`) +
      path("M280 320c80 20 160-20 240 0s140 10 200-10", "none", `stroke="${C.p300}" stroke-width="8" stroke-linecap="round"`) +
      rect(1180, 110, 330, 380, C.p100, 12) + rect(1196, 126, 298, 348, C.p200, 8) + rect(1340, 126, 8, 348, C.p100) + rect(1196, 290, 298, 8, C.p100) +
      rect(190, 486, 900, 22, C.wood2, 6) +
      person(1190, 590, 470, { skin: SKIN[3], hair: HAIR[2], top: C.p700, bottom: "#3b3550", girl: true, arms: [20, -130] }) +
      desks,
  )
}

scenes.laboratory = () => {
  const flask = (x, y, s, col) => g(path("M-14 -80h28v40l34 70c8 16-2 30-18 30h-60c-16 0-26-14-18-30l34-70Z", C.p100, `stroke="${C.p300}" stroke-width="5"`) + path("M-28 -4l-4 0 -14 28c-4 8 2 16 10 16h56c8 0 14-8 10-16l-14-28Z", col) + rect(-18, -92, 36, 14, C.p300, 4), `translate(${x} ${y}) scale(${s})`)
  const tube = (x, y, col) => rect(x, y - 90, 26, 100, C.p100, 13, `stroke="${C.p300}" stroke-width="4"`) + rect(x + 4, y - 46, 18, 50, col, 9)
  const micro = (x, y) => g(rect(-50, -20, 100, 20, C.p800, 6) + rect(-8, -170, 16, 150, C.p700, 6) + path("M-8 -160h60v20h-60Z", C.p600) + rect(26, -125, 18, 70, C.p900, 4) + circle(-30, -190, 18, C.p300), `translate(${x} ${y})`)
  const shelf = (y) => rect(130, y, 700, 14, C.wood2, 4) + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => rect(160 + i * 80, y - 76 + (i % 3) * 8, 40, 76 - (i % 3) * 8, pick([C.p300, C.teal, C.p500, C.gold, C.blue], i), 8)).join("")
  return svg(
    rect(0, 0, W, H, C.wall) + rect(0, 780, W, 220, C.floor) + shelf(250) + shelf(430) +
      rect(1010, 130, 450, 320, C.p100, 12) + rect(1026, 146, 418, 288, C.p200, 8) + circle(1235, 290, 70, C.p100) + path("M1235 220v140M1165 290h140", "none", `stroke="${C.p300}" stroke-width="6"`) +
      person(480, 790, 520, { skin: SKIN[2], hair: HAIR[3], top: C.white, bottom: "#3b3550", coat: true, girl: true, arms: [30, -40] }) +
      person(1000, 790, 520, { skin: SKIN[4], hair: HAIR[0], top: C.white, bottom: "#3b3550", coat: true, arms: [20, -20] }) +
      rect(100, 700, 1400, 40, C.wood, 8) + rect(100, 738, 1400, 262, C.p100, 6) + [0, 1, 2, 3, 4].map((i) => rect(130 + i * 280, 760, 240, 200, C.p50, 8, `stroke="${C.p200}" stroke-width="4"`) + rect(240 + i * 280, 850, 20, 12, C.p400, 4)).join("") +
      flask(300, 700, 1.1, C.teal) + flask(620, 700, 0.9, C.orange) + flask(1240, 700, 1.2, C.p500) + micro(860, 700) + tube(1010, 700, C.red) + tube(1046, 700, C.gold) + tube(1082, 700, C.teal) + rect(1000, 690, 120, 12, C.wood2, 4) + flask(1400, 700, 0.8, C.blue),
  )
}

scenes.ict = () => {
  const station = (x, y, i) => {
    const mon = g(rect(0, 0, 230, 150, C.p950, 12) + rect(12, 12, 206, 120, i % 2 ? C.p500 : C.p600, 6) + rect(26, 28, 110, 12, C.p200, 4) + rect(26, 52, 160, 10, C.p300, 4) + rect(26, 74, 130, 10, C.p300, 4) + rect(100, 150, 30, 36, C.p900) + rect(60, 184, 110, 12, C.p800, 6), `translate(${x} ${y})`)
    return pupil(x + 115, y + 120, 300, kid(i + 20, { arms: [60, -60] })) + mon
  }
  let s = ""
  ;[0, 1, 2].forEach((i) => (s += station(130 + i * 480, 400, i)))
  ;[0, 1, 2].forEach((i) => (s += station(130 + i * 480, 660, i + 3)))
  return svg(
    rect(0, 0, W, H, C.wall) + rect(0, 730, W, 270, C.floor) + rect(160, 110, 560, 240, C.p950, 12) + rect(176, 126, 528, 208, C.p800, 8) + circle(330, 230, 50, C.p400) + rect(420, 190, 240, 14, C.p200, 6) + rect(420, 224, 190, 14, C.p300, 6) + rect(420, 258, 220, 14, C.p300, 6) +
      rect(1000, 120, 480, 300, C.p100, 12) + rect(1016, 136, 448, 268, C.p200, 8) +
      rect(80, 540, 1440, 26, C.wood, 8) + rect(80, 566, 1440, 20, C.wood2) + s + rect(80, 800, 1440, 26, C.wood, 8) + rect(80, 826, 1440, 20, C.wood2),
  )
}

scenes.library = () => {
  const books = (x, y, w, rows) => {
    let s = rect(x, y, w, rows * 130 + 20, C.wood2, 10)
    for (let rrow = 0; rrow < rows; rrow++) {
      s += rect(x + 12, y + 110 + rrow * 130, w - 24, 12, C.wood, 3)
      let bx = x + 20
      let i = rrow * 7
      while (bx < x + w - 50) {
        const bw = 22 + ((i * 7) % 4) * 6
        const bh = 70 + ((i * 11) % 5) * 8
        s += rect(bx, y + 110 + rrow * 130 - bh, bw, bh, pick([C.p600, C.p300, C.teal, C.gold, C.red, C.p800, C.blue, C.p400], i * 3), 3)
        bx += bw + 4
        i++
      }
    }
    return s
  }
  return svg(
    rect(0, 0, W, H, C.wall) + rect(0, 780, W, 220, C.floor) +
      books(60, 120, 520, 5) + books(1020, 120, 520, 5) +
      rect(640, 140, 320, 330, C.p100, 12) + rect(654, 154, 292, 302, C.p200, 8) + rect(796, 154, 8, 302, C.p100) +
      person(620, 760, 470, kid(31, { girl: true, arms: [70, -70] })) + person(980, 760, 470, kid(32, { arms: [60, -60] })) +
      rect(480, 640, 640, 30, C.wood, 8) + rect(520, 670, 16, 200, C.wood2) + rect(1064, 670, 16, 200, C.wood2) +
      rect(590, 600, 160, 40, C.p700, 6) + rect(610, 590, 120, 14, C.white, 4) + rect(860, 604, 140, 36, C.teal, 6) + rect(878, 594, 104, 12, C.white, 4) +
      path("M1090 640l20-110h60l20 110Z", C.p500) + rect(1136, 640, 8, 10, C.p900),
  )
}

scenes.sports = () => {
  const stripes = [0, 1, 2, 3, 4, 5].map((i) => rect(0, 600 + i * 70, W, 70, i % 2 ? C.grass : C.grass2)).join("")
  const player = (x, y, i, tilt, arms) => person(x, y, 270, kid(i + 40, { arms, tilt, bottom: C.p800, top: i % 2 ? C.p500 : C.p700 }))
  return svg(
    sky(600) + cloud(280, 160) + cloud(1180, 220, 0.8) + path("M0 540c260-60 540-50 800 0s560 30 800-30v120H0Z", C.p200) + stripes +
      tree(110, 640, 1.0, true) + tree(1490, 640, 1.0) +
      rect(640, 500, 10, 150, C.white) + rect(950, 500, 10, 150, C.white) + rect(636, 496, 328, 10, C.white, 4) + path("M650 506h300v144H650Z", C.white, 'opacity=".18"') +
      path("M0 960L560 640M1600 960L1040 640", "none", `stroke="${C.white}" stroke-width="8" opacity=".8"`) +
      player(480, 900, 0, 6, [70, -100]) + player(1010, 860, 1, -4, [-100, 60]) + player(1250, 940, 2, 5, [40, -120]) +
      circle(760, 930, 34, C.white, `stroke="${C.ink}" stroke-width="5"`) + path("M740 914l20-12 20 12-8 24h-24Z", C.ink),
    skyDefs,
  )
}

scenes.science = () => {
  const beaker = (x, y, col) => rect(x, y - 90, 70, 90, C.p100, 8, `stroke="${C.p300}" stroke-width="5"`) + rect(x + 6, y - 50, 58, 44, col, 6)
  return svg(
    rect(0, 0, W, H, C.wall) + rect(0, 780, W, 220, C.floor) + rect(120, 110, 430, 280, C.p100, 12) + rect(136, 126, 398, 248, C.p200, 8) +
      path("M200 320l60-120 60 120Zm110 0l50-80 50 80Z", C.p500) + circle(450, 190, 30, C.gold) +
      rect(1060, 120, 440, 130, C.p800, 12) + [0, 1, 2, 3, 4, 5].map((i) => circle(1110 + i * 70, 185, 22, pick([C.p200, C.gold, C.teal, C.white], i))).join("") +
      person(380, 800, 480, kid(50, { girl: true, coat: true, arms: [40, -30] })) + person(1130, 800, 500, kid(51, { coat: true, arms: [30, -50] })) + person(1330, 800, 400, kid(52, { girl: true, arms: [-150, -20] })) +
      rect(100, 690, 1400, 40, C.wood, 8) + rect(100, 728, 1400, 272, C.p100, 6) +
      path("M560 690l60-200h160l60 200Z", C.wood2) + path("M650 490c-30-90 10-150 40-190 30 40 70 100 40 190Z", C.orange) + path("M680 470c-8-50 10-80 24-100 16 24 28 50 20 100Z", C.gold) +
      beaker(900, 690, C.teal) + beaker(990, 690, C.p500) + beaker(1260, 690, C.orange) +
      circle(260, 610, 70, C.blue) + path("M200 590c30-26 50 6 70-10s40 20 60 6c-4 40-30 80-70 84-30-14-52-46-60-80Z", C.tree2) + rect(250, 676, 20, 20, C.p800) + rect(220, 690, 80, 14, C.p900, 6),
  )
}

scenes.events = () => {
  const aud = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => g(circle(0, 0, 44, pick(HAIR, i)) + path("M-84 120c0-70 40-100 84-100s84 30 84 100Z", pick([C.p900, C.p800, C.p950], i)), `translate(${60 + i * 120} ${900 + (i % 2) * 34})`)).join("")
  const bunting = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => path(`M${i * 100 + 4} ${50 + Math.sin(i * 0.8) * 8}h80l-40 70Z`, pick([C.p500, C.gold, C.p200, C.teal, C.red], i))).join("")
  return svg(
    rect(0, 0, W, H, C.p900) + rect(0, 0, W, 130, C.p950) + path("M0 55q800 120 1600 0", "none", `stroke="${C.p200}" stroke-width="5"`) + bunting +
      path("M0 130c100 180 80 400 20 560H0Z", C.p700) + path("M1600 130c-100 180-80 400-20 560h20Z", C.p700) + path("M60 130c80 150 60 360 10 560H0V130Z", C.p600) + path("M1540 130c-80 150-60 360-10 560h30V130Z", C.p600) +
      path("M500 140h600l180 560H320Z", C.p500, 'opacity=".35"') + rect(0, 690, W, 150, C.wood, 0) + rect(0, 690, W, 16, C.wood2) +
      rect(700, 380, 200, 320, C.wood2, 10) + rect(670, 360, 260, 30, C.wood, 8) +
      person(500, 690, 400, kid(60, { girl: true, arms: [-140, -20] })) + person(1090, 690, 400, kid(61, { arms: [10, 150] })) + person(800, 690, 420, kid(62, { arms: [20, -20] })) +
      aud,
  )
}

scenes.arts = () => {
  const note = (x, y, c) => g(ellipse(0, 0, 22, 16, c, 'transform="rotate(-20)"') + rect(16, -80, 6, 80, c), `translate(${x} ${y})`)
  return svg(
    rect(0, 0, W, H, C.wall) + rect(0, 780, W, 220, C.floor) + rect(1000, 120, 480, 300, C.p100, 12) + rect(1016, 136, 448, 268, C.p200, 8) +
      note(180, 260, C.p600) + note(280, 200, C.p400) + note(390, 280, C.p800) + note(500, 210, C.p500) +
      // easel and canvas
      path("M240 820l120-440 40 10-110 430Z", C.wood2) + path("M600 820l-120-440-40 10 110 430Z", C.wood2) + rect(250, 380, 340, 260, C.white, 8, `stroke="${C.wood2}" stroke-width="10"`) +
      circle(380, 480, 56, C.gold) + path("M260 620l120-110 80 70 70-60 50 100Z", C.tree2) + path("M270 460c60-60 120-70 180-40", "none", `stroke="${C.p500}" stroke-width="14" stroke-linecap="round"`) +
      person(740, 800, 480, kid(70, { girl: true, top: C.p300, arms: [10, -60] })) +
      // drum
      ellipse(1060, 740, 120, 36, C.p100) + rect(940, 740, 240, 130, C.p700, 0) + ellipse(1060, 870, 120, 36, C.p700) + ellipse(1060, 740, 120, 36, C.p100, `stroke="${C.p300}" stroke-width="5"`) + [0, 1, 2, 3].map((i) => path(`M${960 + i * 55} 760l30 100`, "none", `stroke="${C.p300}" stroke-width="5"`)).join("") +
      person(1260, 800, 470, kid(71, { arms: [70, -70] })) + person(1440, 800, 400, kid(72, { girl: true, arms: [30, -120] }))
  )
}

scenes.activities = () => {
  const board = (x, y) => g(rect(0, 0, 300, 24, C.wood2, 4) + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [0, 1, 2, 3, 4, 5, 6, 7].map((j) => ((i + j) % 2 ? "" : rect(i * 0 + 0, 0, 0, 0, "none"))).join("")).join("") +
    path("M0 0h300v-110H0Z", C.p100) + [0, 1, 2, 3].map((i) => [0, 1, 2, 3].map((j) => ((i + j) % 2 ? rect(i * 75, -110 + j * 27.5, 75, 27.5, C.p900) : "")).join("")).join("") +
    rect(120, -150, 22, 40, C.white, 8) + rect(190, -135, 22, 25, C.p300, 8) + rect(60, -128, 20, 18, C.p950, 8), `translate(${x} ${y})`)
  return svg(
    rect(0, 0, W, H, C.p50) + rect(0, 760, W, 240, C.floor) + path("M0 700q400-120 800 0t800 0v100H0Z", C.p100) +
      rect(150, 120, 380, 260, C.p100, 12) + rect(166, 136, 348, 228, C.p200, 8) + circle(340, 250, 64, C.p300) + path("M280 270l60-80 60 80Z", C.p700) +
      rect(1120, 130, 340, 250, C.p800, 12) + rect(1140, 150, 300, 20, C.p200, 6) + rect(1140, 190, 220, 14, C.p300, 6) + rect(1140, 224, 260, 14, C.p300, 6) + rect(1140, 258, 180, 14, C.p300, 6) +
      person(420, 780, 440, kid(80, { arms: [40, -40] })) + person(720, 780, 470, kid(81, { girl: true, arms: [50, -50] })) + person(1010, 780, 450, kid(82, { arms: [60, -10] })) + person(1260, 780, 440, kid(83, { girl: true, arms: [30, -30] })) +
      rect(380, 680, 960, 36, C.wood, 10) + rect(420, 716, 18, 220, C.wood2) + rect(1280, 716, 18, 220, C.wood2) +
      board(650, 680) + rect(440, 640, 110, 40, C.p600, 6) + rect(452, 628, 86, 14, C.white, 4) + rect(1090, 646, 100, 34, C.teal, 6) + rect(1100, 636, 80, 12, C.white, 4),
  )
}

scenes.assembly = () => {
  let rows = ""
  const spec = [[960, 150, 18, 78, 40], [850, 130, 20, 74, 8], [750, 112, 22, 68, 16], [665, 96, 24, 64, 4]]
  spec.forEach(([y, h, n, gap, x0], ri) => {
    for (let i = 0; i < n; i++) rows += person(x0 + i * gap + (ri % 2) * 24, y, h, kid(ri * 30 + i, { arms: [8, -8] }))
  })
  return svg(
    sky(560) + cloud(260, 150) + cloud(1220, 120, 0.7) + building(180, 240, 1240, 330, { cols: 10, rows: 2 }) + flag(800, 640) +
      ground(580) + path("M600 580h400l120 120H480Z", C.p50) + tree(90, 650, 1.0, true) + tree(1520, 650, 1.0) +
      rows + person(800, 640, 200, { skin: SKIN[1], hair: HAIR[0], top: C.p800, bottom: "#2b2640", arms: [12, -12] }),
    skyDefs,
  )
}

for (const [name, draw] of Object.entries(scenes)) {
  writeFileSync(join(OUT, `${name}.svg`), draw())
  console.log("wrote", name)
}
