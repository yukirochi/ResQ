import Foundation
import CoreBluetooth

@objc(BlePeripheralModule)
class BlePeripheralModule: NSObject, CBPeripheralManagerDelegate {
    
    private var peripheralManager: CBPeripheralManager?
    private var service: CBMutableService?
    private var statusChar: CBMutableCharacteristic?
    private var profileChar: CBMutableCharacteristic?
    private var chatTxChar: CBMutableCharacteristic?
    private var chatRxChar: CBMutableCharacteristic?
    private var sirenChar: CBMutableCharacteristic?

    private var isSosActive: Bool = false
    private var cachedProfileJson: String = ""

    static let serviceUUID = CBUUID(string: "7E500001-B5A3-F393-E0A9-E50E24DCCA9E")
    static let statusUUID = CBUUID(string: "7E500002-B5A3-F393-E0A9-E50E24DCCA9E")
    static let profileUUID = CBUUID(string: "7E500003-B5A3-F393-E0A9-E50E24DCCA9E")
    static let chatTxUUID = CBUUID(string: "7E500004-B5A3-F393-E0A9-E50E24DCCA9E")
    static let chatRxUUID = CBUUID(string: "7E500005-B5A3-F393-E0A9-E50E24DCCA9E")
    static let sirenUUID = CBUUID(string: "7E500006-B5A3-F393-E0A9-E50E24DCCA9E")

    override init() {
        super.init()
        let options = [
            CBPeripheralManagerOptionRestoreIdentifierKey: "com.resq.peripheral.restore"
        ]
        peripheralManager = CBPeripheralManager(delegate: self, queue: nil, options: options)
    }

    func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        if peripheral.state == .poweredOn {
            setupServices()
        }
    }

    private func setupServices() {
        guard let pm = peripheralManager else { return }

        let s = CBMutableService(type: Self.serviceUUID, primary: true)

        statusChar = CBMutableCharacteristic(
            type: Self.statusUUID,
            properties: [.notify, .read],
            value: nil,
            permissions: [.readable]
        )

        profileChar = CBMutableCharacteristic(
            type: Self.profileUUID,
            properties: [.read],
            value: nil,
            permissions: [.readable]
        )

        chatTxChar = CBMutableCharacteristic(
            type: Self.chatTxUUID,
            properties: [.write, .writeWithoutResponse],
            value: nil,
            permissions: [.writeable]
        )

        chatRxChar = CBMutableCharacteristic(
            type: Self.chatRxUUID,
            properties: [.notify, .read],
            value: nil,
            permissions: [.readable]
        )

        sirenChar = CBMutableCharacteristic(
            type: Self.sirenUUID,
            properties: [.write],
            value: nil,
            permissions: [.writeable]
        )

        s.characteristics = [statusChar!, profileChar!, chatTxChar!, chatRxChar!, sirenChar!]
        pm.add(s)
        self.service = s
    }

    @objc func startAdvertising(_ ephemeralIdHex: String, statusByte: NSNumber, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard let pm = peripheralManager, pm.state == .poweredOn else {
            reject("BLE_OFF", "Bluetooth is not powered on", nil)
            return
        }

        let advData: [String: Any] = [
            CBAdvertisementDataServiceUUIDsKey: [Self.serviceUUID],
            CBAdvertisementDataLocalNameKey: "ResQ"
        ]
        pm.startAdvertising(advData)
        resolve(true)
    }

    @objc func stopAdvertising(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        peripheralManager?.stopAdvertising()
        resolve(true)
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveRead request: CBATTRequest) {
        if request.characteristic.uuid == Self.profileUUID {
            guard isSosActive else {
                peripheral.respond(to: request, withResult: .readNotPermitted)
                return
            }
            let data = cachedProfileJson.data(using: .utf8) ?? Data()
            if request.offset > data.count {
                peripheral.respond(to: request, withResult: .invalidOffset)
                return
            }
            request.value = data.subdata(in: request.offset..<data.count)
            peripheral.respond(to: request, withResult: .success)
        } else {
            peripheral.respond(to: request, withResult: .success)
        }
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveWrite requests: [CBATTRequest]) {
        for request in requests {
            if request.characteristic.uuid == Self.sirenUUID, let val = request.value, !val.isEmpty {
                let command = val[0]
                NotificationCenter.default.post(name: NSNotification.Name("ResQSirenCommand"), object: command)
            }
            peripheral.respond(to: request, withResult: .success)
        }
    }
}
