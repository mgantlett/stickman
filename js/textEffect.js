// Retro Text Effect with Scanlines and Glow
import * as THREE from 'https://cdn.skypack.dev/three@0.157.0?min';

export class TextEffect {
    constructor(scene, text = "DEMO SCENE 2024") {
        this.scene = scene;
        this.textMesh = null;
        this.init(text);
    }

    async init(text) {
        // Load font
        const loader = new THREE.FontLoader();
        const font = await new Promise(resolve => {
            loader.load('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', resolve);
        });

        // Create text geometry
        const geometry = new THREE.TextGeometry(text, {
            font: font,
            size: 0.3,
            height: 0.05,
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 0.02,
            bevelSize: 0.01,
            bevelOffset: 0,
            bevelSegments: 5
        });

        // Center the text
        geometry.computeBoundingBox();
        const centerOffset = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
        
        // Create material with custom shader
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color: { value: new THREE.Color(0.0, 1.0, 1.0) }, // Cyan color
                glowIntensity: { value: 1.0 },
                bassIntensity: { value: 0.0 },
                trebleIntensity: { value: 0.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                void main() {
                    vUv = uv;
                    vNormal = normal;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 color;
                uniform float glowIntensity;
                uniform float bassIntensity;
                uniform float trebleIntensity;
                varying vec2 vUv;
                varying vec3 vNormal;

                void main() {
                    // Scanline effect modified by treble
                    float scanFreq = 0.1 + trebleIntensity * 0.2;
                    float scan = sin(gl_FragCoord.y * scanFreq + time * 2.0) * 0.1 + 0.9;
                    
                    // Glow effect enhanced by bass
                    float glow = sin(time * 3.0) * 0.5 + 0.5;
                    float bassGlow = glow + bassIntensity * 0.5;
                    
                    // Dynamic noise based on treble
                    float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
                    float dynamicNoise = noise * (0.05 + trebleIntensity * 0.1);
                    
                    // Color variation based on audio
                    vec3 audioColor = mix(
                        color,
                        vec3(1.0, 0.5, 1.0), // Purple-pink variation
                        bassIntensity * 0.5
                    );
                    
                    // Combine effects
                    vec3 finalColor = audioColor * scan * (1.0 + bassGlow * glowIntensity);
                    finalColor += dynamicNoise;
                    
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `
        });

        this.textMesh = new THREE.Mesh(geometry, material);
        this.textMesh.position.x = centerOffset;
        this.textMesh.position.z = -2;
        this.textMesh.position.y = 1;
        
        this.scene.add(this.textMesh);
    }

    update(time, audioData) {
        if (this.textMesh) {
            this.textMesh.material.uniforms.time.value = time;
            this.textMesh.material.uniforms.bassIntensity.value = audioData?.bass || 0;
            this.textMesh.material.uniforms.trebleIntensity.value = audioData?.treble || 0;
            
            // Dynamic rotation based on audio
            const baseRotation = Math.sin(time * 0.5) * 0.2;
            const audioRotation = (audioData?.mid || 0) * 0.3;
            this.textMesh.rotation.y = baseRotation + audioRotation;
        }
    }
}
