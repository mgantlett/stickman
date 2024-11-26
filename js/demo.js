// Modern WebGL Demo Scene Engine
import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';
import { TextEffect } from './textEffect.js';
import { AudioAnalyzer } from './audioAnalyzer.js';
class DemoScene {
    constructor() {
        this.canvas = document.getElementById('demoCanvas');
        this.clock = new THREE.Clock();
        this.time = 0;
        this.audioAnalyzer = new AudioAnalyzer();
        
        // Setup renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // Setup scene and camera
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 5;
        
        // Initialize effects
        this.initEffects();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Start animation loop
        this.animate();
    }
    
    async initEffects() {
        // Create a retro-style tunnel effect
        const tunnelGeometry = new THREE.CylinderGeometry(1, 2, 12, 32, 1, true);
        
        // Add some particles for depth
        const particlesGeometry = new THREE.BufferGeometry();
        const particleCount = 1000;
        const positions = new Float32Array(particleCount * 3);
        
        for(let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 10;
            positions[i + 1] = (Math.random() - 0.5) * 10;
            positions[i + 2] = (Math.random() - 0.5) * 10;
        }
        
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.02,
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8
        });
        
        this.particles = new THREE.Points(particlesGeometry, particlesMaterial);
        this.scene.add(this.particles);
        const tunnelMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                audioIntensity: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float audioIntensity;
                varying vec2 vUv;
                
                void main() {
                    vec2 p = vUv * 2.0 - 1.0;
                    float r = length(p);
                    float angle = atan(p.y, p.x);
                    
                    // Use audio intensity to modify the pattern
                    float pattern = sin(angle * (10.0 + audioIntensity * 5.0) + time * 2.0) * 0.5 + 0.5;
                    vec3 color = vec3(pattern * (1.0 - r));
                    
                    // Pulse color based on audio
                    vec3 baseColor = vec3(0.8, 0.3, 0.9); // Purple-ish tint
                    vec3 pulseColor = vec3(1.0, 0.5, 0.8); // Pink-ish tint
                    color *= mix(baseColor, pulseColor, audioIntensity);
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `,
            side: THREE.BackSide
        });
        
        this.tunnel = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
        this.scene.add(this.tunnel);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    async animate() {
        requestAnimationFrame(() => this.animate());
        
        this.time = this.clock.getElapsedTime();
        
        // Get audio data
        const audioData = this.audioAnalyzer.getFrequencyData();
        if (audioData) {
            // Update tunnel effect with audio
            this.tunnel.material.uniforms.audioIntensity.value = audioData.bass;
            
            // Modify particle properties based on audio
            this.particles.material.size = 0.02 + audioData.treble * 0.03;
            this.particles.material.opacity = 0.5 + audioData.mid * 0.5;
        }
        
        // Update tunnel effect
        this.tunnel.material.uniforms.time.value = this.time;
        this.tunnel.rotation.z = this.time * 0.1;
        
        // Animate particles
        this.particles.rotation.y = this.time * 0.1;
        this.particles.rotation.x = this.time * 0.05;
        
        // Dynamic camera movement
        this.camera.position.x = Math.sin(this.time * 0.5) * 0.5;
        this.camera.position.y = Math.cos(this.time * 0.3) * 0.3;
        this.camera.lookAt(0, 0, -2);
        
        // Update text effect if initialized with audio data
        if (this.textEffect) {
            this.textEffect.update(this.time, audioData);
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the demo when the page loads
window.addEventListener('load', async () => {
    const demo = new DemoScene();
    // Initialize text effect after scene is ready
    demo.textEffect = new TextEffect(demo.scene);
    
    // Create audio control overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: cyan;
        font-family: monospace;
        font-size: 24px;
        text-align: center;
        background: rgba(0, 0, 0, 0.7);
        padding: 20px;
        border-radius: 10px;
        text-shadow: 0 0 10px cyan;
        transition: opacity 1s;
    `;
    
    const content = document.createElement('div');
    content.innerHTML = `
        <div style="margin-bottom: 20px;">Audio Visualizer</div>
        <div style="margin-bottom: 15px; font-size: 16px; opacity: 0.8;">
            Choose your audio source to begin the visualization:
        </div>
        <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <select id="audioDevices" style="background: rgba(0,0,0,0.7); color: cyan; border: 1px solid cyan; padding: 10px; border-radius: 5px; cursor: pointer;">
                    <option value="">Loading audio devices...</option>
                </select>
                <button id="micBtn" style="background: cyan; color: black; border: none; padding: 10px 20px; cursor: pointer; border-radius: 5px;">
                    🎤 Use Selected Input
                </button>
            </div>
            <input type="file" id="audioFile" accept="audio/*" style="display: none;">
            <button id="fileBtn" style="background: cyan; color: black; border: none; padding: 10px 20px; cursor: pointer; border-radius: 5px;">
                🎵 Upload Audio File
            </button>
        </div>
        <div style="margin-top: 15px;">
            <input type="text" id="audioUrl" placeholder="Enter audio URL" style="padding: 10px; width: 80%; margin-right: 10px; border-radius: 5px; border: 1px solid cyan; background: rgba(0,0,0,0.7); color: cyan;">
            <button id="urlBtn" style="background: cyan; color: black; border: none; padding: 10px 20px; cursor: pointer; border-radius: 5px;">
                🌐 Load URL
            </button>
        </div>
        <div style="margin-top: 15px; font-size: 14px; opacity: 0.7;">
            Supported formats: MP3, WAV, OGG
        </div>
    `;
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    // Create error message element
    const errorMsg = document.createElement('div');
    errorMsg.style.cssText = `
        color: #ff4444;
        margin-top: 15px;
        font-size: 16px;
        display: none;
    `;
    content.appendChild(errorMsg);

    const showError = (message) => {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
        setTimeout(() => {
            errorMsg.style.display = 'none';
        }, 5000);
    };

    // Function to update audio device list
    const updateAudioDevices = async () => {
        try {
            const devices = await demo.audioAnalyzer.getAudioDevices();
            const currentDevice = audioDevices.value;
            audioDevices.innerHTML = devices.map(device => 
                `<option value="${device.id}" ${device.id === currentDevice ? 'selected' : device.default ? 'selected' : ''}>${device.label}</option>`
            ).join('');
        } catch (error) {
            showError(error.message);
            audioDevices.innerHTML = '<option value="">No audio devices available</option>';
        }
    };

    // Monitor device changes
    navigator.mediaDevices.addEventListener('devicechange', updateAudioDevices);

    // Get audio devices select element and do initial population
    const audioDevices = document.getElementById('audioDevices');
    await updateAudioDevices();

    // Handle audio input selection
    document.getElementById('micBtn').addEventListener('click', async () => {
        try {
            const deviceId = audioDevices.value;
            await demo.audioAnalyzer.start(null, deviceId);
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 1000);
        } catch (error) {
            showError(error.message);
        }
    });

    // Handle file upload
    const fileInput = document.getElementById('audioFile');
    document.getElementById('fileBtn').addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            try {
                await demo.audioAnalyzer.start(file);
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 1000);
            } catch (error) {
                showError(error.message);
                fileInput.value = ''; // Reset file input
            }
        }
    });

    // Handle URL input
    document.getElementById('urlBtn').addEventListener('click', async () => {
        const audioUrl = document.getElementById('audioUrl').value.trim();
        if (!audioUrl) {
            showError('Please enter a valid audio URL');
            return;
        }
        try {
            await demo.audioAnalyzer.start(audioUrl);
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 1000);
        } catch (error) {
            showError(error.message);
            document.getElementById('audioUrl').value = ''; // Reset URL input
        }
    });
});
