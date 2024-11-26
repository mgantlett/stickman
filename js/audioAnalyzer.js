export class AudioAnalyzer {
    constructor() {
        this.initialized = false;
        this.analyser = null;
        this.dataArray = null;
        this.audioContext = null;
    }

    async init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            
            // Load and play demo music
            const response = await fetch('https://cdn.jsdelivr.net/gh/michaelbromley/chromata/demo/audio/ambient.mp3');
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            source.loop = true;
            source.start(0);
            
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.initialized = true;
            
        } catch (error) {
            console.error('Audio initialization failed:', error);
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

    async start() {
        if (this.audioContext?.state === 'suspended') {
            await this.audioContext.resume();
        }
        if (!this.initialized) {
            await this.init();
        }
    }
}
