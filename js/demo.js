// Modern WebGL Demo Scene Engine
import * as THREE from 'https://cdn.skypack.dev/three@0.157.0';
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
    
    // Start audio visualization on user interaction
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
        pointer-events: none;
        text-shadow: 0 0 10px cyan;
        transition: opacity 1s;
    `;
    overlay.textContent = 'Click anywhere to start audio';
    document.body.appendChild(overlay);

    document.addEventListener('click', async () => {
        await demo.audioAnalyzer.start();
        // Fade out and remove overlay
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 1000);
    }, { once: true });
});
