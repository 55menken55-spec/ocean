/* ================= ББР: ЭКОЛОГИЧЕСКИЙ ПЛАН ФАУНЫ ================= */
/* План для OC.FaunaEngine: станции очистки, стаи, одиночная мегафауна, дельфины
   и летучие рыбы с привязкой к геометрии лагуны и рифового прохода. */
window.OC = window.OC || {};
(function (OC) {
  'use strict';
  const T = THREE;
  const { shelfOffset, passCenterZ, BLUE_HOLE_X, BLUE_HOLE_Z, CAY_X, CAY_Z, BOMMIES } = OC._GbrBase;

  const bom0 = BOMMIES[0] || { x: -140, z: 60 };
  const bom1 = BOMMIES[1] || { x: -195, z: -85 };
  const CLEANING_STATIONS = [
    { id: 'bommie_station', x: bom0.x + 12, y: -6.5, z: bom0.z - 8, radius: 20 },
    { id: 'crest_station', x: 155 + shelfOffset(20), y: -6.0, z: 20, radius: 22 }
  ];

  const FAUNA_PLAN = {
    cleaningStations: CLEANING_STATIONS,
    schools: [
      { key: 'fish_blue', n: 38, cx: -60 + shelfOffset(40), cz: 40, radius: 34, yDepth: -7, spread: 10, speed: 6.5, diel: 'diurnal', shyness: 0.9,
        geoOpts: { len: 1.15, height: 0.56, width: 0.2, colA: 0x1d7ed8, colB: 0x72c8ff, finCol: 0xffe44d, tailH: 0.72 } },
      { key: 'fish_blue', n: 42, cx: 145 + shelfOffset(-40), cz: -40, radius: 42, yDepth: -6, spread: 12, speed: 7.2, diel: 'diurnal', shyness: 0.9,
        geoOpts: { len: 1.15, height: 0.56, width: 0.2, colA: 0x1d7ed8, colB: 0x72c8ff, finCol: 0xffe44d, tailH: 0.72 } },
      { key: 'fish_yellow', n: 32, cx: 95 + shelfOffset(120), cz: 120, radius: 36, yDepth: -5.5, spread: 9, speed: 5.5, diel: 'diurnal', shyness: 0.65,
        geoOpts: { len: 1.25, height: 0.88, width: 0.2, colA: 0xffc61a, colB: 0xfff3a8, finCol: 0xffa800, tailH: 0.52 } },
      { key: 'fish_yellow', n: 28, cx: 180 + shelfOffset(-190), cz: -190, radius: 32, yDepth: -8, spread: 9, speed: 5.8, diel: 'diurnal', shyness: 0.65,
        geoOpts: { len: 1.25, height: 0.88, width: 0.2, colA: 0xffc61a, colB: 0xfff3a8, finCol: 0xffa800, tailH: 0.52 } },
      { key: 'fish_silver', n: 75, cx: 345 + shelfOffset(245), cz: passCenterZ(345 + shelfOffset(245)), radius: 28, yDepth: -14, spread: 11, speed: 9.5, scale: 0.85, diel: 'cathemeral', shyness: 1.35,
        geoOpts: { len: 0.95, height: 0.32, width: 0.14, colA: 0x90b4c8, colB: 0xedf8ff, finCol: 0xb2cbd9, tailH: 0.85 } },
      { key: 'fish_silver', n: 65, cx: -120 + shelfOffset(-120), cz: -120, radius: 44, yDepth: -9, spread: 13, speed: 8.8, scale: 0.85, diel: 'cathemeral', shyness: 1.35,
        geoOpts: { len: 0.95, height: 0.32, width: 0.14, colA: 0x90b4c8, colB: 0xedf8ff, finCol: 0xb2cbd9, tailH: 0.85 } },
      { key: 'fish_chromis', n: 55, cx: 80 + shelfOffset(10), cz: 10, radius: 18, yDepth: -4.2, spread: 7, speed: 4.5, scale: 0.65, diel: 'diurnal', shyness: 1.15, cleaner: true,
        geoOpts: { len: 0.85, height: 0.4, width: 0.16, colA: 0x38d8c8, colB: 0xb8fff6, finCol: 0x6ce8dc } },
      { key: 'fish_chromis', n: 48, cx: bom0.x, cz: bom0.z, radius: 20, yDepth: -6.5, spread: 7, speed: 4.2, scale: 0.65, diel: 'diurnal', shyness: 1.15, cleaner: true,
        geoOpts: { len: 0.85, height: 0.4, width: 0.16, colA: 0x38d8c8, colB: 0xb8fff6, finCol: 0x6ce8dc } },
      { key: 'fish_orange', n: 16, cx: -20 + shelfOffset(45), cz: 45, radius: 9, yDepth: -7.5, spread: 3.6, speed: 3.4, scale: 0.85, diel: 'diurnal', curious: 0.55, hostAnemone: true,
        geoOpts: { len: 0.95, height: 0.52, width: 0.22, colA: 0xff5a1f, colB: 0xffffff, finCol: 0xff8a30, stripes: 1.0 } },
      { key: 'fish_orange', n: 14, cx: CAY_X + 88, cz: CAY_Z + 40, radius: 8, yDepth: -3.5, spread: 3.4, speed: 3.2, scale: 0.85, diel: 'diurnal', curious: 0.55, hostAnemone: true,
        geoOpts: { len: 0.95, height: 0.52, width: 0.22, colA: 0xff5a1f, colB: 0xffffff, finCol: 0xff8a30, stripes: 1.0 } },
      { key: 'fish_butterfly', n: 18, cx: 110 + shelfOffset(50), cz: 50, radius: 26, yDepth: -5.5, spread: 9, speed: 4.2, scale: 0.9, diel: 'diurnal', curious: 0.65, cleaner: true,
        geoOpts: { len: 1.0, height: 0.85, width: 0.16, colA: 0xffe44d, colB: 0x1a1a22, finCol: 0xffffff, stripes: 1.0 } },
      { key: 'fish_idol', n: 14, cx: 210 + shelfOffset(-40), cz: -40, radius: 30, yDepth: -9.5, spread: 8, speed: 4.8, scale: 1.0, diel: 'diurnal', curious: 0.5,
        geoOpts: { len: 1.05, height: 0.88, width: 0.16, colA: 0x181c24, colB: 0xffdc4d, finCol: 0xffffff, stripes: 1.0, streamer: true } },
      { key: 'fish_barracuda', n: 28, cx: 440 + shelfOffset(240), cz: passCenterZ(440 + shelfOffset(240)), radius: 22, yDepth: -22, spread: 8, speed: 7.5, scale: 1.35, diel: 'cathemeral', isPredator: true,
        geoOpts: { len: 2.3, height: 0.36, width: 0.24, colA: 0x5c7382, colB: 0xdcebf2, finCol: 0x455866, tailH: 0.9 } },
      { key: 'fish_parrot', n: 16, cx: 135 + shelfOffset(15), cz: 15, radius: 28, yDepth: -6.5, spread: 10, speed: 4.6, scale: 1.15, diel: 'diurnal', curious: 0.4,
        geoOpts: { len: 1.5, height: 0.62, width: 0.28, colA: 0x26c6a8, colB: 0xff7aa8, finCol: 0x52e0c4, tailH: 0.6 } },
      { key: 'fish_lantern', n: 36, cx: BLUE_HOLE_X + 4, cz: BLUE_HOLE_Z - 4, radius: 24, yDepth: -38, spread: 9, speed: 4.8, scale: 0.88, diel: 'nocturnal', biolum: true, shyness: 0.75,
        geoOpts: { len: 0.9, height: 0.38, width: 0.16, colA: 0x162844, colB: 0x5af5ff, finCol: 0x3ad4ff, eyeScale: 1.45 } },
      { key: 'fish_lantern', n: 32, cx: 585 + shelfOffset(-65), cz: -65, radius: 34, yDepth: -46, spread: 11, speed: 5.0, scale: 0.9, diel: 'nocturnal', biolum: true, shyness: 0.75,
        geoOpts: { len: 0.9, height: 0.38, width: 0.16, colA: 0x162844, colB: 0x5af5ff, finCol: 0x3ad4ff, eyeScale: 1.45 } }
    ],
    soloFish: [0, 1, 2, 3, 4, 5].map((i) => {
      const z = -300 + i * 120;
      return {
        key: 'angelfish', cx: 60 + shelfOffset(z), cz: z, r: 16 + (i % 3) * 5, y: -7 - (i % 3) * 3, speed: 2.2, scale: 1.1,
        diel: 'diurnal', curious: true,
        geoOpts: { len: 1.8, height: 0.92, width: 0.3, colA: 0x2255c8, colB: 0xffe14d, finCol: 0x55aaff, stripes: 1.0 }
      };
    }),
    lionfish: [
      { cx: BLUE_HOLE_X + 28, cz: BLUE_HOLE_Z - 16, r: 9, y: -26, scale: 1.15 },
      { cx: BLUE_HOLE_X - 24, cz: BLUE_HOLE_Z + 22, r: 10, y: -38, scale: 1.1 },
      { cx: 420 + shelfOffset(120), cz: 120, r: 12, y: -25, scale: 1.1 }
    ],
    octopus: [
      { x: -110 + shelfOffset(60), z: 60, scale: 1.05 },
      { x: 185 + shelfOffset(-85), z: -85, scale: 1.15 },
      { x: 375 + shelfOffset(210), z: passCenterZ(375 + shelfOffset(210)) + 26, scale: 1.1 }
    ],
    moray: [
      { x: BLUE_HOLE_X + 36, z: BLUE_HOLE_Z + 18 },
      { x: 320 + shelfOffset(-60), z: -60 },
      { x: bom1.x + 10, z: bom1.z - 8 }
    ],
    jellies: (function () {
      const list = [];
      const jHues = [0.82, 0.74, 0.91, 0.62, 0.87, 0.70, 0.78, 0.94];
      for (let i = 0; i < 10; i++) {
        const z = -420 + i * 95;
        const x = (-180 + (i % 4) * 130) + shelfOffset(z);
        list.push({ x, z, y: -5 - (i % 4) * 3.5, hue: jHues[i % jHues.length], size: 0.95 + (i % 3) * 0.25, deep: false });
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * 6.28;
        list.push({
          x: BLUE_HOLE_X + Math.cos(a) * 18, z: BLUE_HOLE_Z + Math.sin(a) * 18,
          y: -26 - i * 8, hue: 0.76 + (i % 3) * 0.08, size: 1.2 + (i % 2) * 0.35, deep: true
        });
      }
      for (let i = 0; i < 4; i++) {
        const z = -220 + i * 160;
        list.push({ x: 640 + shelfOffset(z), z, y: -42 - i * 10, hue: 0.56 + i * 0.1, size: 1.4, deep: true });
      }
      return list;
    })(),
    dugongs: [
      { cx: -555 + shelfOffset(90), cz: 90, r: 28, scale: 1.15 },
      { cx: -595 + shelfOffset(-140), cz: -140, r: 34, scale: 1.0 }
    ],
    turtles: [
      { cx: -520 + shelfOffset(60), cz: 60, r: 35, y: -5.5, size: 0.8 },
      { cx: CAY_X + 65, cz: CAY_Z + 45, r: 28, y: -3.2, size: 0.75 },
      { cx: 115 + shelfOffset(20), cz: 20, r: 38, y: -5.5, size: 0.85 },
      { cx: -150 + shelfOffset(-220), cz: -220, r: 42, y: -9.0, size: 0.65 }
    ],
    rays: [
      { cx: -480 + shelfOffset(120), cz: 120, r: 24, speed: 2.0, eagle: false },
      { cx: -180 + shelfOffset(150), cz: 150, r: 32, speed: 2.2, eagle: false },
      { cx: CAY_X + 95, cz: CAY_Z - 55, r: 22, speed: 1.9, eagle: false },
      { cx: 360 + shelfOffset(245), cz: passCenterZ(360 + shelfOffset(245)), r: 28, y: -15, speed: 3.4, eagle: true },
      { cx: 470 + shelfOffset(230), cz: passCenterZ(470 + shelfOffset(230)), r: 32, y: -20, speed: 3.8, eagle: true }
    ],
    mantas: [
      { cx: 615 + shelfOffset(-40), cz: -40, r: 58, y: -26, span: 11, size: 0.75, speed: 4.2 },
      { cx: 645 + shelfOffset(180), cz: 180, r: 52, y: -32, span: 9.5, size: 0.7, speed: 4.6 },
      { cx: 380 + shelfOffset(245), cz: passCenterZ(380 + shelfOffset(245)), r: 45, y: -16, span: 9, size: 0.68, speed: 4.0 }
    ],
    sharks: [
      { cx: BLUE_HOLE_X, cz: BLUE_HOLE_Z, r: 54, y: -18, speed: 4.8 },
      { cx: 590 + shelfOffset(-120), cz: -120, r: 65, y: -32, speed: 5.2 },
      { cx: 625 + shelfOffset(140), cz: 140, r: 62, y: -38, speed: 5.5 },
      { cx: 390 + shelfOffset(240), cz: passCenterZ(390 + shelfOffset(240)), r: 44, y: -22, speed: 4.9 },
      { cx: 700 + shelfOffset(-40), cz: -40, r: 95, y: -36, speed: 3.2, whaleShark: true }
    ],
    whales: [
      { cx: 840 + shelfOffset(20), cz: 20, r: 145, y: -48, speed: 3.6 }
    ],
    vessels: [
      { x: 320 + shelfOffset(-65), z: -65, yaw: 0.62, variant: 'tropical', name: 'НИС «Коралловый Исследователь»' }
    ],
    seabirds: [
      { cx: CAY_X, cz: CAY_Z, r: 72, y: 11.5, speed: 11.8, count: 8, variant: 'tropical' },
      { cx: 320 + shelfOffset(-65), cz: -65, r: 58, y: 14.5, speed: 10.6, count: 6, variant: 'tropical' }
    ],
    dolphins: [
      { cx: 340 + shelfOffset(110), cz: 110, r: 85, speed: 7.8, count: 4, variant: 'spinner' },
      { cx: CAY_X + 125, cz: CAY_Z + 80, r: 64, speed: 7.4, count: 3, variant: 'spinner' }
    ],
    flyingFish: [
      { cx: 380 + shelfOffset(-120), cz: -120, r: 44, speed: 9.6, count: 8 },
      { cx: 520 + shelfOffset(90), cz: 90, r: 48, speed: 9.8, count: 7 }
    ]
  };
  OC._GbrFaunaPlan = { FAUNA_PLAN };
})(window.OC);
