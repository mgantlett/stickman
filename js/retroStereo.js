import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';

export class RetroStereo {
    constructor() {
        // Create main group for the stereo
        this.group = new THREE.Group();
        this.group.position.set(0, 1.5, -3);
        this.group.rotation.x = -0.2;

        // Create stereo frame
        const frame = new THREE.Mesh(
            new THREE.BoxGeometry(2, 0.8, 0.2),
            new THREE.MeshPhongMaterial({ color: 0x303030 })
        );
        this.group.add(frame);

        // Create display panel for oscilloscope
        this.oscilloscopeCanvas = document.createElement('canvas');
        this.oscilloscopeCanvas.width = 512;
        this.oscilloscopeCanvas.height = 256;
        this.oscilloscopeCtx = this.oscilloscopeCanvas.getContext('2d');
        
        const oscilloscopeTexture = new THREE.CanvasTexture(this.oscilloscopeCanvas);
        const oscilloscopeScreen = new THREE.Mesh(
            new THREE.PlaneGeometry(0.8, 0.4),
            new THREE.MeshBasicMaterial({ map: oscilloscopeTexture })
        );
        oscilloscopeScreen.position.set(-0.5, 0.1, 0.101);
        this.group.add(oscilloscopeScreen);
        this.oscilloscopeTexture = oscilloscopeTexture;

        // Create display panel for spectrum analyzer
        this.spectrumCanvas = document.createElement('canvas');
        this.spectrumCanvas.width = 512;
        this.spectrumCanvas.height = 256;
        this.spectrumCtx = this.spectrumCanvas.getContext('2d');
        
        const spectrumTexture = new THREE.CanvasTexture(this.spectrumCanvas);
        const spectrumScreen = new THREE.Mesh(
            new THREE.PlaneGeometry(0.8, 0.4),
            new THREE.MeshBasicMaterial({ map: spectrumTexture })
        );
        spectrumScreen.position.set(0.5, 0.1, 0.101);
        this.group.add(spectrumScreen);
        this.spectrumTexture = spectrumTexture;

        // Create info display
        this.infoCanvas = document.createElement('canvas');
        this.infoCanvas.width = 512;
        this.infoCanvas.height = 64;
        this.infoCtx = this.infoCanvas.getContext('2d');
        
        const infoTexture = new THREE.CanvasTexture(this.infoCanvas);
        const infoScreen = new THREE.Mesh(
            new THREE.PlaneGeometry(1.6, 0.2),
            new THREE.MeshBasicMaterial({ map: infoTexture })
        );
        infoScreen.position.set(0, -0.2, 0.101);
        this.group.add(infoScreen);
        this.infoTexture = infoTexture;
    }

    update(audioData) {
        if (!audioData) return;

        // Update oscilloscope
        this.oscilloscopeCtx.fillStyle = 'rgb(0, 20, 0)';
        this.oscilloscopeCtx.fillRect(0, 0, this.oscilloscopeCanvas.width, this.oscilloscopeCanvas.height);
        this.oscilloscopeCtx.lineWidth = 2;
        this.oscilloscopeCtx.strokeStyle = 'rgb(0, 255, 0)';
        this.oscilloscopeCtx.beginPath();

        const sliceWidth = this.oscilloscopeCanvas.width / audioData.timeData.length;
        let x = 0;

        for (let i = 0; i < audioData.timeData.length; i++) {
            const v = audioData.timeData[i] / 128.0;
            const y = v * this.oscilloscopeCanvas.height / 2;

            if (i === 0) {
                this.oscilloscopeCtx.moveTo(x, y);
            } else {
                this.oscilloscopeCtx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        this.oscilloscopeCtx.stroke();
        this.oscilloscopeTexture.needsUpdate = true;

        // Update spectrum analyzer
        this.spectrumCtx.fillStyle = 'rgb(0, 20, 0)';
        this.spectrumCtx.fillRect(0, 0, this.spectrumCanvas.width, this.spectrumCanvas.height);
        
        const barWidth = this.spectrumCanvas.width / audioData.raw.length;
        const heightScale = this.spectrumCanvas.height / 255;

        this.spectrumCtx.fillStyle = 'rgb(0, 255, 0)';
        for (let i = 0; i < audioData.raw.length; i++) {
            const barHeight = audioData.raw[i] * heightScale;
            this.spectrumCtx.fillRect(
                i * barWidth,
                this.spectrumCanvas.height - barHeight,
                barWidth - 1,
                barHeight
            );
        }
        this.spectrumTexture.needsUpdate = true;

        // Update info display
        this.infoCtx.fillStyle = 'rgb(0, 20, 0)';
        this.infoCtx.fillRect(0, 0, this.infoCanvas.width, this.infoCanvas.height);
        this.infoCtx.font = '20px monospace';
        this.infoCtx.fillStyle = 'rgb(0, 255, 0)';
        this.infoCtx.textAlign = 'center';
        this.infoCtx.fillText(
            `BASS: ${(audioData.bass * 100).toFixed(0)}% MID: ${(audioData.mid * 100).toFixed(0)}% TREB: ${(audioData.treble * 100).toFixed(0)}%`,
            this.infoCanvas.width / 2,
            this.infoCanvas.height / 2 + 8
        );
        this.infoTexture.needsUpdate = true;
    }
}
