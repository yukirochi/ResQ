/**
 * ResQ Offline Disaster Survival Protocols & Knowledge Base
 * Medically verified protocols (Red Cross / FEMA standards) and ResQ App Operation Manual.
 * Grounding corpus for on-device Small Language Models (SLMs) via react-native-llama.
 */

export interface SurvivalProtocol {
  id: string;
  category: 'MEDICAL' | 'DISASTER' | 'APP_MANUAL';
  title: string;
  subtitle: string;
  severity: 'CRITICAL' | 'HIGH' | 'INFO';
  tags: string[];
  steps: string[];
  warning?: string;
}

export const RESQ_SYSTEM_PROMPT = `
You are resQ, an on-device conversational emergency survival and app guidance companion operating 100% offline.
Your purpose is to provide immediate, actionable, life-safety survival steps and interactive instructions on how to operate the ResQ rescue app during disasters.

CORE RULES:
1. BREVITY & CLARITY: Keep answers clear, structured, and easy to read under extreme distress.
2. LIFE-SAFETY FIRST: Never speculate or invent medical procedures. Strictly adhere to established Red Cross and FEMA protocols.
3. CONTEXT GROUNDING: When asked about the ResQ app, accurately explain:
   - Beacon: 15-min rotating ephemeral BLE ID, zero cellular or internet required.
   - Radar: Immediate (<2m), Near (<5m), Far (<15m) zones with 1D-CNN denoising.
   - Siren: Remote acoustic trigger used by rescuers to pinpoint victims under concrete.
   - Medical Profile: Encrypted local triage data (blood type, diabetic, mobility, allergies).
   - Mesh Chat: Peer-to-peer BLE message packets.
4. CALM & DIRECT: Use active, imperative verbs ("Apply pressure", "Stay low", "Tap in sets of 3").
5. CONVERSATIONAL & EMPATHETIC: Acknowledge user names, trapped locations, companions, or medical conditions with steady reassurance.
`;

export const SURVIVAL_PROTOCOLS: SurvivalProtocol[] = [
  {
    id: 'cpr_cardiac',
    category: 'MEDICAL',
    title: 'CPR / Unresponsive Victim',
    subtitle: 'Adult Cardiac Arrest & Breathing Cessation',
    severity: 'CRITICAL',
    tags: ['cpr', 'heart', 'cardiac', 'unresponsive', 'unconscious', 'breathing'],
    steps: [
      'Check for responsiveness and breathing for no more than 10 seconds.',
      'Place heel of one hand in center of victim\'s chest, interlock other hand on top.',
      'Deliver 30 hard, fast chest compressions (depth: 5-6 cm, rate: 100-120 bpm to the rhythm of "Stayin\' Alive").',
      'Tilt head back gently, lift chin, and deliver 2 rescue breaths (1 second each, watch chest rise).',
      'Continue 30:2 compression-to-breath cycle without stopping until help arrives or victim moves.'
    ],
    warning: 'Do not interrupt compressions for more than 10 seconds. Hard and fast compressions are vital.'
  },
  {
    id: 'severe_bleeding',
    category: 'MEDICAL',
    title: 'Severe Bleeding & Hemorrhage',
    subtitle: 'Arterial or Heavy Traumatic Blood Loss',
    severity: 'CRITICAL',
    tags: ['bleeding', 'blood', 'hemorrhage', 'cut', 'wound', 'tourniquet'],
    steps: [
      'Apply immediate, firm, direct pressure over wound using a clean cloth, shirt, or sterile pad.',
      'Maintain continuous pressure for at least 5-10 minutes without lifting cloth to check.',
      'If bleeding does not stop on limb, apply a commercial or improvised tourniquet 2-3 inches above the wound (never over a joint).',
      'Tighten until arterial bleeding ceases and distal pulse vanishes. Note the exact application time on the victim\'s forehead or limb.',
      'Keep victim warm with clothing/blanket to prevent trauma-induced hypothermia and shock.'
    ],
    warning: 'Do NOT remove deeply embedded objects (glass/rebar); stabilize around the object.'
  },
  {
    id: 'crush_injury',
    category: 'MEDICAL',
    title: 'Crush Injury & Rubble Extraction',
    subtitle: 'Entrapment under Concrete, Beams, or Masonry',
    severity: 'HIGH',
    tags: ['crush', 'trapped', 'rubble', 'concrete', 'pinned', 'debris'],
    steps: [
      'Assess entrapment duration: If victim has been pinned >15 minutes, be aware of Crush Syndrome (myoglobin/potassium release upon release).',
      'Alert incoming rescuers via ResQ BLE Chat of crush entrapment time before lifting the load.',
      'If conscious and able to swallow, provide oral hydration (water/electrolyte) prior to release if medical aid is delayed.',
      'Keep the crushed limb lower than heart level once released if possible.',
      'Monitor for dark brown/red urine, rapid swelling, and shock immediately post-extraction.'
    ],
    warning: 'Sudden release of crushing weight after prolonged entrapment can cause fatal cardiac arrhythmias.'
  },
  {
    id: 'earthquake_collapse',
    category: 'DISASTER',
    title: 'Earthquake & Structural Collapse',
    subtitle: 'Immediate Actions During and After Tremors',
    severity: 'CRITICAL',
    tags: ['earthquake', 'quake', 'collapse', 'building', 'debris', 'aftershock'],
    steps: [
      'DROP to your hands and knees. COVER head and neck under sturdy furniture. HOLD ON until shaking stops.',
      'If trapped under rubble: Cover your mouth and nose with clothing to avoid lethal dust inhalation.',
      'Do not shout continuously (wastes oxygen and inhales dust); tap metal pipes or walls in rhythmic sets of 3.',
      'Activate ResQ SOS Beacon: It will broadcast your location and medical profile to rescuers within 30 meters.',
      'Do not light matches or lighters due to ruptured gas pipes. Use phone screen or flash.'
    ],
    warning: 'Expect aftershocks. Stay away from damaged structural masonry and dangling power lines.'
  },
  {
    id: 'flash_flood',
    category: 'DISASTER',
    title: 'Flash Flood & Rising Waters',
    subtitle: 'Rapid Inundation & Swift Water Hazards',
    severity: 'HIGH',
    tags: ['flood', 'water', 'drowning', 'rain', 'storm', 'typhoon'],
    steps: [
      'Seek high ground immediately. Avoid basements or low-lying structures.',
      'Never attempt to walk or swim through moving water deeper than 15 cm (6 inches).',
      'Never drive into flooded roadways—most flood deaths occur inside vehicles swept away.',
      'If trapped inside a building by rising water, move to top floor or roof; do NOT climb into a closed attic without an exit route.',
      'Turn off main electrical breaker if water enters living areas and it is safe to reach.'
    ],
    warning: 'Floodwaters carry severe biohazards, electrical current, and hidden submerged debris.'
  },
  {
    id: 'burns_smoke',
    category: 'DISASTER',
    title: 'Burns & Smoke Inhalation',
    subtitle: 'Thermal Trauma & Toxic Air Survival',
    severity: 'HIGH',
    tags: ['burn', 'fire', 'smoke', 'inhalation', 'flame'],
    steps: [
      'Crawl low under smoke layer where breathable air and visibility are highest.',
      'Cover mouth with a damp or dry fabric to filter coarse soot particulates.',
      'Check doors for heat using back of your hand before turning handles.',
      'For thermal burns: Cool immediately under clean, running room-temperature water for 10-20 minutes. Never use ice.',
      'Cover burn with a loose, dry sterile dressing. Do not apply butter, oil, or puncture blisters.'
    ],
    warning: 'Carbon monoxide and cyanide gas in structural fires cause rapid loss of consciousness.'
  },
  {
    id: 'resq_radar_guide',
    category: 'APP_MANUAL',
    title: 'ResQ Search Radar Manual',
    subtitle: 'Proximity Zones & 1D-CNN Denoising',
    severity: 'INFO',
    tags: ['radar', 'search', 'find', 'proximity', 'distance', 'signal'],
    steps: [
      'Open Radar Tab: ResQ automatically scans for 2.4 GHz emergency mesh beacons.',
      'Radar Lock Rings: Immediate (<2m, inner ring), Near (<5m, middle ring), Far (<15m, outer ring).',
      'Follow Dynamic Trend: "Approaching" (green) indicates you are moving in the correct direction; "Moving Away" (red) indicates wrong direction.',
      'Edge AI Filtering: Raw radio signals fluctuate by ±10 dBm due to concrete and body shadowing. ResQ\'s 1D-CNN neural filter cleans this in real-time.',
      'Tap on any locked victim dot to inspect their medical triage record and blood type.'
    ]
  },
  {
    id: 'resq_siren_guide',
    category: 'APP_MANUAL',
    title: 'ResQ Remote Acoustic Siren',
    subtitle: 'Locating Victims Trapped in Dark or Rubble',
    severity: 'INFO',
    tags: ['siren', 'alarm', 'sound', 'audio', 'locate', 'buzzer'],
    steps: [
      'When Rescuer radar enters Immediate zone (<2m), tap "Sound Siren" on the victim card.',
      'ResQ sends a Bluetooth command packet (GATT characteristic 0x01) to the victim\'s phone.',
      'The victim\'s phone immediately sounds a piercing dual-tone acoustic alarm and vibrates at maximum volume, bypassing silent mode.',
      'Rescuers use directional acoustic listening to locate the exact position under rubble or darkness.',
      'Victims can silence the alarm anytime from their own screen by tapping "Mute Siren".'
    ]
  },
  {
    id: 'resq_beacon_guide',
    category: 'APP_MANUAL',
    title: 'ResQ Emergency Beacon (SOS Mode)',
    subtitle: 'Zero-Internet P2P Advertising & Privacy',
    severity: 'INFO',
    tags: ['beacon', 'sos', 'broadcast', 'privacy', 'ephemeral', 'bluetooth'],
    steps: [
      'Tap the large central SOS button on the Home Screen to activate the beacon.',
      'Your phone broadcasts an emergency payload containing your current condition flags.',
      'Rotating Ephemeral ID: Your Bluetooth identifier rotates every 15 minutes to prevent unauthorized civilian tracking.',
      'Works 100% Offline: No Wi-Fi, cellular data, or SIM card is required for beacon discovery.',
      'Declare your medical conditions (diabetic, asthma, mobility) in Profile so rescuers extract you prepared.'
    ]
  }
];
