import Foundation
import Capacitor
import Speech

@objc(SpeechRecognition)
public class SpeechRecognition: CAPPlugin {

    let defaultMatches = 5
    let messageMissingPermission = "Missing permission"
    let messageAccessDenied = "User denied access to speech recognition"
    let messageRestricted = "Speech recognition restricted on this device"
    let messageNotDetermined = "Speech recognition not determined on this device"
    let messageAccessDeniedMicrophone = "User denied access to microphone"
    let messageOngoing = "Ongoing speech recognition"
    let messageUnknown = "Unknown error occured"

    private var speechRecognizer: SFSpeechRecognizer?
    private var audioEngine: AVAudioEngine?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var lastVolumeUpdate: TimeInterval = 0
    private var inputTapInstalled = false

    private func stopAudioCapture() {
        if let engine = self.audioEngine {
            engine.stop()
            if self.inputTapInstalled {
                self.inputTapInstalled = false
                engine.inputNode.removeTap(onBus: 0)
            }
        }
        self.recognitionRequest?.endAudio()
        self.recognitionRequest = nil
        self.recognitionTask = nil
        self.lastVolumeUpdate = 0
        self.notifyListeners("volumeLevel", data: ["level": 0])
        self.notifyListeners("listeningState", data: ["status": "stopped"])
    }

    private func publishVolumeLevel(from buffer: AVAudioPCMBuffer) {
        let now = Date.timeIntervalSinceReferenceDate
        guard now - self.lastVolumeUpdate >= 0.1,
              let samples = buffer.floatChannelData?[0] else {
            return
        }

        let frameCount = Int(buffer.frameLength)
        guard frameCount > 0 else {
            return
        }

        var sumOfSquares: Float = 0
        for index in 0..<frameCount {
            let sample = samples[index]
            sumOfSquares += sample * sample
        }

        let rootMeanSquare = sqrt(sumOfSquares / Float(frameCount))
        let decibels = 20 * log10(max(rootMeanSquare, 0.000_001))
        let level = max(0, min(1, (decibels + 60) / 60))
        self.lastVolumeUpdate = now
        self.notifyListeners("volumeLevel", data: ["level": level])
    }

    @objc func available(_ call: CAPPluginCall) {
        guard let recognizer = SFSpeechRecognizer() else {
            call.resolve([
                "available": false
            ])
            return
        }
        call.resolve([
            "available": recognizer.isAvailable
        ])
    }

    @objc func start(_ call: CAPPluginCall) {
        if self.audioEngine != nil {
            if self.audioEngine!.isRunning {
                call.reject(self.messageOngoing)
                return
            }
        }

        let status: SFSpeechRecognizerAuthorizationStatus = SFSpeechRecognizer.authorizationStatus()
        if status != SFSpeechRecognizerAuthorizationStatus.authorized {
            call.reject(self.messageMissingPermission)
            return
        }

        AVAudioSession.sharedInstance().requestRecordPermission { (granted) in
            if !granted {
                call.reject(self.messageAccessDeniedMicrophone)
                return
            }

            let language: String = call.getString("language") ?? "en-US"
            let maxResults: Int = call.getInt("maxResults") ?? self.defaultMatches
            let partialResults: Bool = call.getBool("partialResults") ?? false

            if self.recognitionTask != nil {
                self.recognitionTask?.cancel()
                self.recognitionTask = nil
            }

            self.audioEngine = AVAudioEngine.init()
            self.speechRecognizer = SFSpeechRecognizer.init(locale: Locale(identifier: language))

            let audioSession: AVAudioSession = AVAudioSession.sharedInstance()
            do {
                try audioSession.setCategory(AVAudioSession.Category.playAndRecord, options: AVAudioSession.CategoryOptions.defaultToSpeaker)
                try audioSession.setMode(AVAudioSession.Mode.default)
                try audioSession.setActive(true, options: AVAudioSession.SetActiveOptions.notifyOthersOnDeactivation)
            } catch {

            }

            self.recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
            self.recognitionRequest?.shouldReportPartialResults = partialResults

            let inputNode: AVAudioInputNode = self.audioEngine!.inputNode
            let format: AVAudioFormat = inputNode.outputFormat(forBus: 0)

            self.recognitionTask = self.speechRecognizer?.recognitionTask(with: self.recognitionRequest!, resultHandler: { (result, error) in
                if result != nil {
                    let resultArray: NSMutableArray = NSMutableArray()
                    var counter: Int = 0

                    for transcription: SFTranscription in result!.transcriptions {
                        if maxResults > 0 && counter < maxResults {
                            resultArray.add(transcription.formattedString)
                        }
                        counter+=1
                    }

                    if partialResults {
                        self.notifyListeners("partialResults", data: ["matches": resultArray])
                    } else {
                        call.resolve([
                            "matches": resultArray
                        ])
                    }

                    if result!.isFinal {
                        self.stopAudioCapture()
                    }
                }

                if error != nil {
                    self.stopAudioCapture()
                    self.notifyListeners("speechError", data: ["message": error!.localizedDescription])
                    call.reject(error!.localizedDescription)
                }
            })

            inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { (buffer: AVAudioPCMBuffer, _: AVAudioTime) in
                self.recognitionRequest?.append(buffer)
                self.publishVolumeLevel(from: buffer)
            }
            self.inputTapInstalled = true

            self.audioEngine?.prepare()
            do {
                try self.audioEngine?.start()
                self.notifyListeners("listeningState", data: ["status": "started"])
                if partialResults {
                    call.resolve()
                }
            } catch {
                self.stopAudioCapture()
                call.reject(self.messageUnknown)
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.global(qos: DispatchQoS.QoSClass.default).async {
            if self.audioEngine != nil {
                self.stopAudioCapture()
            }
            call.resolve()
        }
    }

    @objc func isListening(_ call: CAPPluginCall) {
        let isListening = self.audioEngine?.isRunning ?? false
        call.resolve([
            "listening": isListening
        ])
    }

    @objc func getSupportedLanguages(_ call: CAPPluginCall) {
        let supportedLanguages: Set<Locale>! = SFSpeechRecognizer.supportedLocales() as Set<Locale>
        let languagesArr: NSMutableArray = NSMutableArray()

        for lang: Locale in supportedLanguages {
            languagesArr.add(lang.identifier)
        }

        call.resolve([
            "languages": languagesArr
        ])
    }

    @objc override public func checkPermissions(_ call: CAPPluginCall) {
        let status: SFSpeechRecognizerAuthorizationStatus = SFSpeechRecognizer.authorizationStatus()
        let permission: String
        switch status {
        case .authorized:
            permission = "granted"
        case .denied, .restricted:
            permission = "denied"
        case .notDetermined:
            permission = "prompt"
        @unknown default:
            permission = "prompt"
        }
        call.resolve(["speechRecognition": permission])
    }

    @objc override public func requestPermissions(_ call: CAPPluginCall) {
        SFSpeechRecognizer.requestAuthorization { (status: SFSpeechRecognizerAuthorizationStatus) in
            DispatchQueue.main.async {
                switch status {
                case .authorized:
                    AVAudioSession.sharedInstance().requestRecordPermission { (granted: Bool) in
                        if granted {
                            call.resolve(["speechRecognition": "granted"])
                        } else {
                            call.resolve(["speechRecognition": "denied"])
                        }
                    }
                    break
                case .denied, .restricted, .notDetermined:
                    self.checkPermissions(call)
                    break
                @unknown default:
                    self.checkPermissions(call)
                }
            }
        }
    }
}
