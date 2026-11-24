import type { MachineCategory } from '../types';

/**
 * Machine catalogue: names, brands and links read from the public product pages
 * of F1 Recreation (f1-recreation.com.sg) on 24 Nov 2026. Images stay on the
 * store's CDN; Atlas only saves one on the device when the machine is added.
 */
export interface CatalogMachine {
  id: string;
  name: string;
  brand: string;
  category: MachineCategory;
  imageUrl: string;
  sourceUrl: string;
}

const SITE = 'https://f1-recreation.com.sg/products/';
const CDN = 'https://cdn.shopify.com/s/files/1/0728/6492/3804/files/';

// name | product handle | image file, grouped by category
const ROWS: Record<Exclude<MachineCategory, 'other'>, string> = {
  treadmill: `
Life Fitness Symbio Runner|life-fitness-symbio-runner|SymbioRunnerTreadmill_BLACKONYX_TEAL.jpg
Life Fitness Integrity+ Treadmill SE4HD|life-fitness-integrity-se4hd-treadmill|42550_integrity-plus_tread-se4_24inch_black-onyx_3000-x-3000_mr-scaled-e1712026819783.jpg
Life Fitness Integrity D Treadmill SE3HD|cpo-life-fitness-integrity-se3hd-treadmill-black|Integrity-Treadmill-Black-SE3HD-Standard.jpg
Life Fitness Integrity CLST Treadmill|cpo-life-fitness-integrity-clst-treadmill-copy|Web_LFCLSTTreadmill.webp
Life Fitness Atmos Treadmill SE4HD|life-fitness-atmos-treadmill-sl-console-copy|Atmos_Treadmill_SE4_mr.jpg
Life Fitness Atmos Treadmill SL|life-fitness-atmos-treadmill-sl-console|Atmos_Treadmill_SL_mr.jpg
Life Fitness Aspire Treadmill SL|life-fitness-aspire-series-sl-treadmill|Aspire_Treadmill_Perspective_BLK_SL_3acc095a-6d20-4606-bdca-53a79315019b.jpg
Life Fitness Activate OST Treadmill|cpo-life-fitness-activate-ost-treadmill|ACTIVATE-TREAD-OST.jpg
Life Fitness F3 Foldable Treadmill|life-fitness-f3-foldable-treadmill|Web_F3-Treadmill-TrackConnect-console-StandardView.webp
Hammer Strength HD Tread|hammer-strength-hd-tread|01_hammer-strength-hd-tread-main-1000x1000_3000x_248e9a82-626f-4d7f-b00d-0b78d6496959.webp
Intenza Aeria Series Ti2S Treadmill|intenza-aeria-treadmill-ti2s|Web_Intenza-ATi2S-Back-45.webp
Intenza 550 Series Te2+ Treadmill|intenza-550-series-treadmill|42033_intenza-te2-back-45-hard-black_02.jpg
Intenza 450 Series Ti2S Treadmill|intenza-450-series-treadmill-450ti2s|42024_ti2s_back-45_02.jpg
Impulse RT970 Treadmill|impulse-rt970-treadmill-with-touch-screen-console|impulse_treadmill_rt970_0004_layer_7.webp
Impulse AC810 Treadmill (touch)|impulse-ac810-treadmill-with-touch-screen-console|ac850-1218-640x6400_01.jpg
Impulse AC810 Treadmill (LED)|impulse-ac810-treadmill|Web_AC810LEDTreadmill_01.webp
Impulse RT700K Treadmill|impulse-rt700k-treadmill|Web_RT700K.webp
Body Charger Rehab Treadmill GT8800 RF|body-charger-rehab-treadmill-gt8800-rf|GT8800RF-V1-03.jpg`,
  elliptical: `
Life Fitness Symbio Incline Elliptical|life-fitness-symbio-incline-elliptical|SymbioElliptical_BLACKONYX_TEAL.jpg
Life Fitness Integrity+ Cross Trainer SE4HD|life-fitness-integrity-se4hd-cross-trainer|42546_integrity-plus_crosstrainer_se4-16inch_black-onyx_3000-x-3000_mr-scaled-e1712026996619.jpg
Life Fitness Integrity+ Total Body Arc Trainer|life-fitness-integrity-se4hd-total-body-arc-trainer|INTEGRITY-PLUS_ARC-Total-Body-SE4_16inch_Black-Onyx_3000-x-3000_mr_b90b7e3f-e32d-41e8-bbba-b0628351b18e.jpg
Life Fitness Integrity D Cross Trainer SE3HD|life-fitness-integrity-series-d-se3hd-crosstrainer|Web_Integrity-CrossTrainer-Black-SE3HD-Standard.webp
Life Fitness Elevation 95X Cross Trainer|life-fitness-discover-95x-se3hd-crosstrainer|Web_ElevationSeries-CrossTrainer-DiscoverSE3-HD-BlackOnyx-StandardView.webp
Life Fitness Atmos Cross Trainer SL|life-fitness-atmos-cross-trainer-sl-console|Atmos_CrossTrainer_SL_mr.jpg
Life Fitness Aspire Cross Trainer SL|life-fitness-aspire-series-sl-crosstrainer|39313_aspire_crosstrainer_rear_blk_sl_mr.jpg
Life Fitness E3 Elliptical|life-fitness-e3-elliptical-crosstrainer|Web_E3-Crosstrainer-TrackConnect-console-standardview.webp
Intenza 550 Series ETe2+ Elliptical|intenza-550-series-elliptical-trainer-cross-trainer|42045_intenza-ete2back-45-hard-black_02.jpg
Intenza 450 Series ETi2S Elliptical|intenza-450-series-elliptical-trainer-cross-trainer|Square_ETi2S_Twin_Back.jpg
Impulse RE700 Elliptical|impulse-re700-elliptical-cross-trainer|Web_RE700.webp
Keiser M5i Strider|keiser-m5i-strider|5602_M5i_STRIDER_ELLIPTICAL_MACHINE-Left_Three_Quarter-cinv-1622220946504406.jpg`,
  bike: `
Life Fitness Symbio SwitchCycle|life-fitness-symbio-switch-cycle|SymbioSwitchCycle_BLACKONYX_TEAL.jpg
Life Fitness Symbio Recumbent Cycle|life-fitness-symbio-recumbent-cycle|Symbio_Recumbent_BLACK_ONYX_TEAL_bce026f1-dbd8-49d7-839b-40c7880e4daa.jpg
Life Fitness Integrity+ Upright Bike SE4HD|life-fitness-integrity-se4hd-upright-bike|INTEGRITY-PLUS_Upright-Bike-SE4_16inch_Black-Onyx_3000-x-3000_mr_a34409e5-7d70-483e-a2ee-8fd57c477eb2.jpg
Life Fitness Integrity+ Recumbent Bike SE4HD|life-fitness-integrity-se4hd-recumbent-bike|INTEGRITY-PLUS_Recumbent-Bike-SE4_16inch_Black-Onyx_3000-x-3000_mr_22692387-9c41-4a62-86f4-c417d95e322d.jpg
Life Fitness Integrity D Upright Bike SE3HD|cpo-life-fitness-integrity-s-upright-bike-with-se3hd|Web_IntegrityUpright-Silver-SE3HD.webp
Life Fitness Integrity D Recumbent Bike SE3HD|life-fitness-integrity-d-recumbent-bike-se3hd-arctic-silver|Web_IntegrityRecumbent-Silver-SE3HDConsole.webp
Life Fitness Integrity D Recumbent Bike SL|life-fitness-integrity-dsl-recumbent-bike|Web_IntegritySeries-Recumbent-D-SL-Black.webp
Life Fitness Elevation 95C Upright Bike|life-fitness-discover-95c-series-se3hd-upright-bike|Web_ElevationSeries-UprightBike-DiscoverSE3-BlackOnyx-StandardView.webp
Life Fitness Atmos Upright Bike SL|life-fitness-atmos-upright-bike-sl-console|Atmos_Upright-Bike_SL_mr.jpg
Life Fitness Atmos Recumbent Bike SL|life-fitness-atmos-recumbent-bike-sl-console|Atmos_Recumbent-Bike_SL_mr.jpg
Life Fitness Aspire Upright Bike SL|life-fitness-aspire-series-sl-upright-bike|aspire-upright-bike-sl-console-smooth-charcoal-data_4c3de48e-ab07-444d-b3e1-8fa12102b1d5.jpg
Life Fitness Aspire Recumbent Bike SL|life-fitness-aspire-series-sl-recumbent-bike|aspire-recumbent-bike-sl-console-smooth-charcoal-data.jpg
Life Fitness Activate OSR Recumbent Bike|cpo-life-fitness-activate-series-osr-recumbent-bike|ACTIVATE-RECUMBENT-BIKE-OSR_f1f5a1ca-0227-4b7d-9948-1f017d502a39.jpg
Life Fitness C3 Upright Bike|life-fitness-c3-upright-bike-with-track-connect-console|Web_C3-Upright-TrackConnect-console-3quarter-view.webp
Life Fitness IC5 Indoor Cycle|life-fitness-ic5|icg-ic5-indoor-cycle-back-side-1000x1000_1800x1800_f658b403-ad83-4904-aea9-c3449e6bebdc.png
Life Fitness IC6 Indoor Cycle|life-fitness-ic6|icg-ic6-back-angled-1000x1000_1800x1800_fc13c324-d9c8-483c-8833-1331c5d42af2.png
Life Fitness IC7 Indoor Cycle|life-fitness-ic7|21542_4c51ecb2-09b4-47b1-8eb9-0f969584aa85.jpg
Keiser M3i Indoor Cycle|keiser-m3i-indoor-cycle-2|Thumb-M3i-700-cinv-1700506467263477.jpg
Hammer Strength HD Air Bike|hammer-strength-hd-airbike|Web_HammerStrengthHDAirBike_02.webp
Torque Stealth Air Bike T-800|hammer-strength-hd-airbike-copy|AB-TS-T800_16.jpg
Octane ADX AirdyneX|cpo-octane-adx-airdynex|Web_airdyneX_01.webp
Intenza 550 Series UBe2+ Upright Bike|intenza-550-series-upright-bike|42051_02_intenza-ube2-back-20-hard-black.jpg
Intenza 550 Series RBe2+ Recumbent Bike|intenza-550-series-recumbent-bike|42072_02_intenza-rbe2-back-45-hard-black.jpg
Intenza 450 Series UBi2S Upright Bike|intenza-450-series-upright-bike|Web_UBi2S_TwinFront2.webp
Intenza 450 Series RBi2S Recumbent Bike|intenza-450-series-recumbent-bike|Web_RBi2S_TwinBack.webp
Impulse RU700 Upright Bike|impulse-ru700-upright-bike|Web_ImpulseRU700_04.webp
Impulse RR700 Recumbent Bike|recumbent-bikes-2|Web_RR700.webp`,
  row_climb: `
Concept2 RowErg|concept2-rowerg-standard-14-with-pm5-monitor-model-d|RowERG_comparison_Profile_DeviceHolder_1.jpg
Concept2 SkiErg 2|concept-2-skierg-with-floor-stand|Concept2SkiERG2withPM5Monitor_FloorStand_01.webp
Torque Stealth Air Rower|torque-stealth-air-rower|Web_ROW-TSR_01_78c49fba-be27-428e-a1e1-6881c2c97f47.webp
Impulse Ski & Row|impulse-fitness-ski-row-multiple-training-machine|Web_HSR700.webp
Life Fitness PowerMill Climber SE4HD|life-fitness-integrity-se4hd-powermill-climber|INTEGRITY-PLUS_Powermill-SE4_16inch_Black-Onyx_3000-x-3000_mr_fb737033-4032-44c7-958d-6ae95a66ea0d.jpg
Impulse XSC700 Stair Climber|impulse-stair-climber-led-xsc700|Web_ImpulseStairClimber-01_01.webp
Torque TANK M4|torque-tank-copy|Web_Tank4.webp`,
  strength: `
Hammer Strength Select Leg Extension|hammer-strength-select-leg-extension-charcoal-black-hs-le|HS-LE.jpg
Life Fitness Axiom Lat Pulldown / Low Row|life-fitness-axiom-series-lat-pulldown-low-row-ph-oplr|PH-OPLR.jpg
Life Fitness Axiom Multi Press|life-fitness-axiom-series-multi-press-ph-opmp|35193_screenshot-2022-02-17-at-11.06.34-am.png
Life Fitness G4 Home Gym|life-fitness-g4-home-gym-system|Web_G4HomeGym_1.webp
Impulse Encore ES3000 3-Station Multi Gym|encore|Web_ES3000.webp
F1 Recreation Preacher Curl|f1-recreation-f1pc-preacher-curl|healthstream-it7002-seated-preacher-curl-1.webp
F1 Recreation Vertical Knee Raise|f1-f1vkr-vertical-knee-raise|24110_it7010.jpg`,
  cable: `
Life Fitness Axiom Dual Adjustable Pulley|life-fitness-axiom-series-dual-adjustable-pulley-op-dap|Web_OP-DAP_01.webp
Life Fitness Cable Motion Dual Adjustable Pulley (CMDAP)|life-fitness-cmdap-dual-adjustable-pulley|Web_Life_Fitness-CMDAP-Charcoal-FrontView_3000_03.webp
Life Fitness Cable Motion DAP with Stability Pad (CMDAS)|life-fitness-cable-motion-dual-adjustable-pulley-with-stability-pad-cmdas|Web_Life_Fitness-CMDAS-Charcoal-FrontView_3000_02.webp
Eleiko Dual Adjustable Pulley 120 kg|eleiko-dual-adjustable-pulley-120kg-black|NEW_3085806-120-03_10.jpg
Impulse Encore ES2100 Multi-Functional Trainer|impulse-encore-es2100-multi-functional-trainer|NEW-impulse-ES2100.jpg
TuffStuff Six Pak Functional Trainer|tuffstuff-six-pack-functional-trainer-spt-6x-200|45133_tuffstuff-spt-6x-six-pak-trainer.jpg
TuffStuff Corner Functional Trainer with Smith|tuffstuff-corner-multi-functional-trainer-with-smith-press-home-gym-system-cxt200-150-cxt225|45147_tuffstuff-cxt-225-corner-multi-functional-cross-trainer.jpg`,
  rack: `
Hammer Strength HD Elite iD Half Rack|hammer-strength-hd-elite-id-half-rack|Web_LF-LDYN-RENDER25-HD-ELITEID-HALFRACK-45.webp
Life Fitness Axiom Smith Rack|life-fitness-op-sm-smith-machine|opsm.jpg
Eleiko Prestera Power Rack|eleiko-prestera-power-rack-stainless-prestera-straight-pull-up-bar-black|Eleiko_PowerRack_Chrome_00.webp
Eleiko Prestera Half Rack|eleiko-prestera-fitness-half-rack-stainless-prestera-straight-pull-up-bar-black|EleikoPresHalfRack_BlackWeightPins_01.webp
Eleiko SVR Platform Prestera Power Rack|eleiko-svr-insert-platform-prestera-power-rack-small-black|NEW_3085565-03_10_859aa7e3-77a9-4445-abde-fea0aa6fb1c5.jpg
Eleiko SVR Platform Prestera Half Rack|eleiko-svr-insert-platform-prestera-half-rack-small-black|NEW_3085517-03_10_df135cb1-0ca3-4e21-b775-74ff41af6e62.jpg
Torque TR2 Rack|torque-tr1-racks-series-copy|TR2PowerRack.webp
Torque TR1 Rack|torque-x-rack-functional-training-copy|7FT_2.1M_TR1HalfRack.webp
Torque X-RACK|x-rack|Web_X-RACK.webp
Torque X-CREATE|x-create|Web_7216_x-create.webp
Naomi Power Rack|power-rack|Web_7220_power-rack.webp
Naomi Cube|cube|Web_Cube-S500.1.webp
Naomi Chameleon|chameleon|Web_Chameleon-Titanium.webp
Naomi Suspension Bridge|suspension-bridge|Web_7221_suspension-bridge-thumbnail.webp`,
  bench: `
Life Fitness Signature Multi Adjustable Bench|life-fitness-smab-multi-adjustable-bench|24140_smab_black.jpg
Life Fitness Signature Adjustable Abdominal Bench|life-fitness-sadb-abdominal-bench|24127_signature_br_adjustable_decline_abdominal_crunch_platblk.jpg
Eleiko Adjustable Bench|eleiko-adjustable-bench-charcoal-pur-cushion|NEW_3062962-060_10.jpg
F1 Recreation Multi Adjustable Bench|f1-recreation-multi-adjustable-bench-display-unit-reserved-copy|1_ITF8802_3000x_ad6c7d32-5432-435b-8e0b-02fec204d5ee.webp
F1 Recreation Olympic Flat Bench|f1-recreation-f1ofb-olympic-flat-bench|Web_F1_OFB_Black.webp
F1 Recreation Ab Crunch Bench|f1-recreation-ab-crunch-bench|232.20140811140843790.1.large.jpg
F1 Recreation Multi-Abdominal Bench|f1-recreation-multi-abdominal-bench|GymGearEliteSeriesMultiAbdominalBenchFullImage_800x800_47411846-f6e8-491b-9b3c-f791fc023082.png
F1 Recreation Stretch Trainer|benches|ST-B_F1StretchTrainer_IT7004_-BlackFrame_01.png
FITBENCH ONE Next Gen|fitbench-one-phased-out-move-to-one-next-gen-copy|NXT-Gen_classic.webp`,
  pilates: `
Merrithew V2 Max Reformer|merrithew-v2-max-reformer|12255_st01082_03_nodvd.jpg
Merrithew V2 Max Plus Reformer|merrithew-v2-max-plus-reformer|12257_st01083_03_nodvd.jpg
Merrithew Rehab V2 Max Plus Reformer|merrithew-rehab-v2-max-plus-reformer-bundle|28850_st01085_03_nodvd.jpg
Merrithew SPX Max Reformer|merrithew-spx-max-reformer|12249_st01080_03_nodvd.jpg
Merrithew SPX Max Reformer with Vertical Stand|merrithew-spx-max-reformer-with-vertical-stand-bundle|13497_st11032_03_nodvd.jpg
Merrithew SPX Max Plus Reformer|merrithew-spx-max-plus-reformer-bundle|13502_st01081_03_nodvd.jpg
Merrithew MPX Reformer with Vertical Stand|merrithew-mpx-reformer|ST11095_MPX_Reformer_Package_with_Vertical_Stand.jpg
Merrithew Cadillac / Trapeze Table|merrithew-cadillac-trapeze-table|m_cadillac1.webp
Align Pilates R8 Pro Reformer|align-pilates-r8-pro-reformer-black|PAPREFORMERR8-align-pilates-r8-pro-pilates-reformer-1-1_jpg.webp
Align Pilates C8 Pro Reformer|merrithew-c8-pro-reformer|PAPREFORMERC8-align-pilates-c8-pro-pilates-reformer-1-1_jpg.webp`,
  rehab: `
Body Charger Semi Recumbent Cross Trainer|body-charger-total-body-trainer-pro-with-10-1-tft-lcd-console-gb7005mini-2|GB7005min-V1-1-1-01.jpg
Body Charger Recumbent Stepper PRO|body-charger-recumbent-stepper-pro-with-10-1-tft-lcd-console-gb7008-2|GB7008-V1-1-01.jpg
Body Charger Total Body Trainer PRO|body-charger-total-body-trainer-pro-with-10-tft-lcd-console-gb7009-2|GB7009-V1-01-1.jpg
Body Charger Upper and Lower Body Trainer PRO|body-charger-upper-and-lower-body-trainer-pro-with-10-tft-lcd-console-gb5050-2|GB5050-2_01.jpg
Body Charger Motorized UBE Table|body-charger-motorized-ube-table-gb5050mx-220v|GB5050MX-220V_01.jpg
Body Charger ERGO Bike|body-charger-ergo-bike-with-10-tft-lcd-console-gb5007-2|GB5007-2_01.jpg
Body Charger Rehab Recumbent Bike|body-charger-rehab-recumbent-bike-with-10-1-tft-lcd-console-gb7201-2|GB7201-2-V1-01.jpg
Power Plate MOVE|power-plate-move-silver|movesilversquare_ba540393-a3f8-4153-b76c-97dbd4598612.jpg
Personal Power Plate|personal-power-plate-2|Personal-Powerplate-Image-2.jpg
Evolt EV360 Body Composition Analyzer|evolt-ev360-body-composition-analyzer|EvoltEV360BodyCompositionAnalyzer.jpg`,
};

const BRANDS = ['Life Fitness', 'Hammer Strength', 'Intenza', 'Impulse', 'Body Charger', 'Keiser', 'Torque', 'Octane', 'Concept2', 'TuffStuff', 'Eleiko', 'Naomi', 'F1 Recreation', 'FITBENCH', 'Merrithew', 'Align Pilates', 'Power Plate', 'Evolt'];

export const MACHINE_CATALOG: CatalogMachine[] = (Object.keys(ROWS) as (keyof typeof ROWS)[]).flatMap((category) =>
  ROWS[category]
    .trim()
    .split('\n')
    .map((row) => {
      const [name, handle, file] = row.split('|');
      return { id: handle, name, brand: BRANDS.find((b) => name.includes(b)) ?? '', category, imageUrl: CDN + file, sourceUrl: SITE + handle };
    }),
);

export const MACHINE_CATEGORY: Record<MachineCategory, string> = {
  treadmill: 'Treadmills',
  elliptical: 'Ellipticals',
  bike: 'Bikes',
  row_climb: 'Row, ski & climb',
  strength: 'Strength',
  cable: 'Cables',
  rack: 'Racks',
  bench: 'Benches',
  pilates: 'Pilates',
  rehab: 'Rehab & testing',
  other: 'Other',
};

/** The store's CDN resizes on request, so lists load small images. */
export const sized = (url: string, width: number) => (url.startsWith(CDN) ? `${url}?width=${width}` : url);
