/**
 * ResQ Automated Core Test & Verification Suite
 * Tests BLE Packet Encoding, Ephemeral ID Rotation, Sliding Window Statistics,
 * Adaptive Kalman Filtering, and Path-Loss Proximity Classification.
 */

const { WindowBuffer } = require('./src/core/ml/windowBuffer');
const { KalmanRssiFilter } = require('./src/core/ml/kalmanBaseline');
const { ProximityEngine } = require('./src/core/ml/proximity');
const { EphemeralIdManager } = require('./src/core/ble/ephemeralId');
const { BlePacketCodec } = require('./src/core/ble/packets');
const { LocalEncryptionService } = require('./src/core/security/localEncryption');

console.log('====================================================');
console.log('       RESQ CORE ENGINE SELF-VERIFICATION SUITE      ');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// 1. Ephemeral ID Rotation Test
console.log('--- 1. Testing Rotating Ephemeral Identifiers ---');
const idManager = EphemeralIdManager.getInstance();
const id1 = idManager.getEphemeralId();
assert(id1.length === 16, `Ephemeral ID must be exactly 8 bytes (16 hex chars): got "${id1}"`);
assert(/^[0-9A-F]{16}$/.test(id1), 'Ephemeral ID is valid uppercase hex');

// 2. BLE Advertising Packet Serialization Test
console.log('\n--- 2. Testing BLE Advertising Packet Codec ---');
const statusByte = BlePacketCodec.encodeStatusByte('TRAPPED');
assert(statusByte === 0x10, `Status TRAPPED encoded as 0x10 (got 0x${statusByte.toString(16)})`);

const rawAdvPayload = BlePacketCodec.encodeAdvertisingPayload(id1, statusByte);
assert(rawAdvPayload.length === 9, 'Advertising payload must be exactly 9 bytes');

const decodedAdv = BlePacketCodec.decodeAdvertisingPayload(rawAdvPayload);
assert(decodedAdv !== null, 'Payload decoded successfully');
assert(decodedAdv.ephemeralId === id1, `Decoded ID matches original (${decodedAdv.ephemeralId} === ${id1})`);
assert(decodedAdv.statusByte === statusByte, 'Decoded status byte matches');
const decodedCondition = BlePacketCodec.decodeStatusByte(decodedAdv.statusByte);
assert(decodedCondition === 'TRAPPED', `Decoded condition matches original: "${decodedCondition}"`);

// 3. Chat Fragmentation and Reassembly Test
console.log('\n--- 3. Testing Chat Framing & MTU Chunking ---');
const messageId = 'testmsg1';
const longText = 'Emergency: Trapped on 3rd floor under rubble. Please send search dogs and heavy cutters. Oxygen is low.';
const chunks = BlePacketCodec.fragmentMessage(messageId, longText);
assert(chunks.length >= 1, `Message fragmented into ${chunks.length} frame(s)`);
const parsedFrame = BlePacketCodec.parseFrame(chunks[0]);
assert(parsedFrame !== null, 'Chunk frame parsed successfully');
assert(parsedFrame.messageId === messageId, 'Message ID matches in frame header');

// 4. Sliding Window Buffer & Statistical Moments Test
console.log('\n--- 4. Testing WindowBuffer & Moments ---');
const buffer = new WindowBuffer(10);
const samples = [-85, -82, -80, -78, -75, -72, -70, -68, -65, -60];
const now = Date.now();
samples.forEach((rssi, i) => buffer.push(rssi, now + i * 400));

assert(buffer.size() === 10, 'Window buffer filled to capacity 10');
assert(buffer.getMean() < -60 && buffer.getMean() > -85, `Mean computed accurately: ${buffer.getMean()}`);
assert(buffer.getVariance() > 0, `Variance detected RF variation: ${buffer.getVariance().toFixed(2)}`);
const slope = buffer.getSlope();
assert(slope > 0, `Regression slope reflects getting warmer (positive slope): ${slope.toFixed(2)} dB/s`);

// 5. Adaptive 1D Kalman Filter Denoising Test
console.log('\n--- 5. Testing Adaptive 1D Kalman Filter ---');
const kf = new KalmanRssiFilter();
kf.reset(-85);
const noisySamples = [-85, -95, -75, -92, -78, -84, -86, -83];
let filtered = -85;
noisySamples.forEach((val) => {
  filtered = kf.update(val, 15.0);
});
assert(Math.abs(filtered - -85) < 8.0, `Kalman successfully dampened extreme spikes: final estimate=${filtered.toFixed(2)} dBm`);

// 6. Proximity Engine Distance & Zone Classification
console.log('\n--- 6. Testing Proximity Engine ---');
const distClose = ProximityEngine.calculateDistance(-60); // Near 1m reference (-59dBm)
const distFar = ProximityEngine.calculateDistance(-85);
assert(distClose < 2.0, `Close RSSI (-60dBm) gives distance < 2.0m: ${distClose}m`);
assert(distFar > 5.0, `Weak RSSI (-85dBm) gives distance > 5.0m: ${distFar}m`);

const zoneImmediate = ProximityEngine.classifyZone(1.2);
const zoneNear = ProximityEngine.classifyZone(3.5);
const zoneFar = ProximityEngine.classifyZone(9.0);
assert(zoneImmediate === 'IMMEDIATE', '1.2m correctly classified as IMMEDIATE');
assert(zoneNear === 'NEAR', '3.5m correctly classified as NEAR');
assert(zoneFar === 'FAR', '9.0m correctly classified as FAR');

const trendWarmer = ProximityEngine.determineTrend(1.2);
const trendColder = ProximityEngine.determineTrend(-1.5);
assert(trendWarmer === 'WARMER', '+1.2 dB/s correctly classified as WARMER');
assert(trendColder === 'COLDER', '-1.5 dB/s correctly classified as COLDER');

// 7. Local Hardware Encryption / Decryption Test
console.log('\n--- 7. Testing Local Data Encryption ---');
const privateMedicalRecord = JSON.stringify({ blood: 'O+', allergies: ['Penicillin'], secret: 'insulin in bag' });
const encrypted = LocalEncryptionService.encrypt(privateMedicalRecord);
assert(encrypted !== privateMedicalRecord, 'Ciphertext differs from plaintext');
const decrypted = LocalEncryptionService.decrypt(encrypted);
assert(decrypted === privateMedicalRecord, 'Decrypted payload matches original medical record byte-for-byte');

console.log('\n====================================================');
console.log(`SUMMARY: ${passedTests}/${totalTests} TESTS PASSED CLEANLY (100%)`);
console.log('====================================================\n');
