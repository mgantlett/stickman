export class AudioAnalyzer {
    constructor() {
        this.initialized = false;
        this.analyser = null;
        this.dataArray = null;
        this.audioContext = null;
    }

    async init(audioSource = null, deviceId = null) {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            
            if (!audioSource) {
                // Create audio input from selected device or default microphone
                const constraints = {
                    audio: deviceId ? { deviceId: { exact: deviceId } } : true
                };
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                const source = this.audioContext.createMediaStreamSource(stream);
                source.connect(this.analyser);
            } else if (audioSource instanceof File) {
                // Handle File object (local file upload)
                const arrayBuffer = await audioSource.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                const source = this.audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(this.analyser);
                this.analyser.connect(this.audioContext.destination);
                source.loop = true;
                source.start(0);
            } else if (typeof audioSource === 'string') {
                // Handle URL string
                const response = await fetch(audioSource);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                const source = this.audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(this.analyser);
                this.analyser.connect(this.audioContext.destination);
                source.loop = true;
                source.start(0);
            }
            
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.initialized = true;
            
        } catch (error) {
            console.error('Audio initialization failed:', error);
            if (error.name === 'NotAllowedError') {
                throw new Error('Microphone access denied. Please allow microphone access and try again.');
            } else if (error.name === 'NotReadableError') {
                throw new Error('Could not access the audio device. Please check your hardware and try again.');
            } else if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new Error('Could not load the audio file. The file might be invalid or inaccessible.');
            } else {
                throw new Error('An error occurred while initializing audio: ' + error.message);
            }
        }
    }

    getFrequencyData() {
        if (!this.initialized) return null;
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Calculate different frequency bands
        const bass = this.getAverageFrequency(0, 3);
        const mid = this.getAverageFrequency(4, 10);
        const treble = this.getAverageFrequency(11, 20);
        
        return {
            bass: bass / 255,
            mid: mid / 255,
            treble: treble / 255,
            raw: Array.from(this.dataArray)
        };
    }

    getAverageFrequency(startIndex, endIndex) {
        let sum = 0;
        for (let i = startIndex; i <= endIndex; i++) {
            sum += this.dataArray[i];
        }
        return sum / (endIndex - startIndex + 1);
    }

    async getAudioDevices() {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true }); // Request permission first
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'audioinput').map(device => ({
                id: device.deviceId,
                label: device.label || `Audio Input ${device.deviceId.slice(0, 5)}...`,
                default: device.deviceId === 'default'
            }));
        } catch (error) {
            console.error('Failed to enumerate audio devices:', error);
            throw new Error('Could not access audio devices. Please check permissions and try again.');
        }
    }

    async start(audioSource = null, deviceId = null) {
        if (this.audioContext?.state === 'suspended') {
            await this.audioContext.resume();
        }
        if (!this.initialized || audioSource || deviceId) {
            await this.init(audioSource, deviceId);
        }
    }
}
