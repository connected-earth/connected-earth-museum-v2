import * as THREE from 'three';

export const bgShaderMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uCameraRotation: { value: new THREE.Matrix3().identity() }, // New uniform
    // Background and star parameters:
    skyColor: { value: new THREE.Vector3(0.02, 0.02, 0.02) },
    starBaseColor: { value: new THREE.Vector3(0.8, 1.0, 0.3) },
    starHueOffset: { value: 0.6 },
    starIntensity: { value: 0.08 },
    starTwinkleSpeed: { value: 0.8 },
    starTwinkleIntensity: { value: 0.2 },
    layerScale: { value: 20.0 },
    layerScaleStep: { value: 10.0 },
    layersCount: { value: 4 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision highp float;

    #define PI 3.14159265359
    #define TAU 6.28318530718
    #define USE_TWINKLE

    uniform float uTime;
    uniform vec2 uResolution;
    uniform mat3 uCameraRotation; // New uniform

    uniform vec3 skyColor;
    uniform vec3 starBaseColor;
    uniform float starHueOffset;
    uniform float starIntensity;
    uniform float starTwinkleSpeed;
    uniform float starTwinkleIntensity;
    uniform float layerScale;
    uniform float layerScaleStep;
    uniform int layersCount;

    varying vec2 vUv;

    // Hash function based on Inigo Quilez’s work.
    vec3 hash(vec3 p) {
      p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
               dot(p, vec3(269.5, 183.3, 246.1)),
               dot(p, vec3(113.5, 271.9, 124.6)));
      return fract(sin(p) * 43758.5453123);
    }

    // 3D Voronoi cell distance calculation.
    vec2 voronoi(vec3 x) {
      vec3 p = floor(x);
      vec3 f = fract(x);
      float res = 100.0;
      float id = 0.0;
      for (float k = -1.0; k <= 1.0; k += 1.0) {
        for (float j = -1.0; j <= 1.0; j += 1.0) {
          for (float i = -1.0; i <= 1.0; i += 1.0) {
            vec3 b = vec3(i, j, k);
            vec3 r = b - f + hash(p + b);
            float d = dot(r, r);
            if(d < res) {
              res = d;
              id = dot(p + b, vec3(0.0, 57.0, 113.0));
            }
          }
        }
      }
      return vec2(sqrt(res), id);
    }

    // Adjust hue of the input color.
    vec3 hue(vec3 color, float offset, int range_index) {
      vec4 k = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
      vec4 p = mix(vec4(color.bg, k.wz), vec4(color.gb, k.xy), step(color.b, color.g));
      vec4 q = mix(vec4(p.xyw, color.r), vec4(color.r, p.yzx), step(p.x, color.r));
      float d = q.x - min(q.w, q.y);
      float e = 1e-10;
      vec3 hsv = vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)),
                      d / (q.x + e),
                      q.x);
      offset = (range_index == 0) ? offset / 360.0 : offset;
      float newHue = hsv.x + offset;
      if(newHue < 0.0) {
        hsv.x = newHue + 1.0;
      } else if(newHue > 1.0) {
        hsv.x = newHue - 1.0;
      } else {
        hsv.x = newHue;
      }
      vec4 k2 = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
      vec3 p2 = abs(fract(vec3(hsv.x) + k2.xyz) * 6.0 - k2.www);
      vec3 rgb = hsv.z * mix(k2.xxx, clamp(p2 - k2.xxx, 0.0, 1.0), hsv.y);
      return rgb;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution;
      vec2 pos = uv * 2.0 - 1.0;
      pos.x *= uResolution.x / uResolution.y;
      // Use the camera rotation to transform the ray, anchoring it to world space.
      vec3 ray = normalize(uCameraRotation * vec3(pos, -1.0));
      vec3 color = skyColor;
      for (int i = 0; i < 12; i++) {
        if(i >= layersCount) break;
        float currentScale = layerScale + float(i) * layerScaleStep;
        vec3 samplePos = ray * currentScale;
        vec2 voro = voronoi(samplePos);
        vec3 rnd = hash(vec3(voro.y));
        #ifdef USE_TWINKLE
          float twinkle = sin(uTime * PI * starTwinkleSpeed + rnd.x * TAU);
          twinkle *= starTwinkleIntensity;
          float star = smoothstep(starIntensity + starIntensity * twinkle, 0.0, voro.x);
        #else
          float star = smoothstep(starIntensity, 0.0, voro.x);
        #endif
        vec3 starColor = star * hue((skyColor + starBaseColor), rnd.y * starHueOffset, 1);
        color += starColor;
      }
      gl_FragColor = vec4(color, 1.0);
    }
  `,
  depthWrite: false,
  depthTest: false
});

