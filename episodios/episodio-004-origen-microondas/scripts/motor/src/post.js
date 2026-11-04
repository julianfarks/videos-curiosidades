import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uFlash: { value: 0 }, uFlashColor: { value: new THREE.Color(1, 1, 1) },
    uZoom: { value: 0 }, uRewind: { value: 0 }, uDesat: { value: 0 }, uVignette: { value: 0.32 }, uGrain: { value: 0.035 },
    uWarm: { value: 1.0 }, uBlack: { value: 0 }, uAspect: { value: 9 / 16 }, uCA: { value: 0.0015 }, uTint: { value: new THREE.Color(1, 1, 1) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime,uFlash,uZoom,uRewind,uDesat,uVignette,uGrain,uWarm,uBlack,uAspect,uCA; uniform vec3 uFlashColor,uTint;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    vec3 samp(vec2 uv){ return texture2D(tDiffuse, clamp(uv, 0.001, 0.999)).rgb; }
    void main(){
      vec2 uv = vUv;
      // rewind: horizontal tracking jitter + wobble
      if(uRewind>0.0){
        float band = step(0.93, fract(uv.y*3.0 - uTime*2.7));
        uv.x += uRewind*(0.012*sin(uv.y*90.0+uTime*40.0) + band*0.035*(hash(vec2(floor(uv.y*60.0), floor(uTime*24.0)))-0.5));
      }
      vec2 c = uv-0.5; float d = length(c*vec2(uAspect,1.0));
      vec3 col;
      if(uZoom>0.001){
        col = vec3(0.0); float tot=0.0;
        for(int i=0;i<14;i++){ float k = float(i)/13.0; float s = 1.0 - uZoom*0.35*k; col += samp(0.5 + c*s); tot+=1.0; }
        col/=tot;
      } else {
        float ca = uCA*(0.5+d*1.5) + uRewind*0.006;
        col.r = samp(uv + c*ca).r; col.g = samp(uv).g; col.b = samp(uv - c*ca).b;
      }
      // grade: warm highlights, teal shadows
      float l = dot(col, vec3(0.2126,0.7152,0.0722));
      vec3 shadowT = vec3(0.92,1.0,1.06), highT = vec3(1.06,1.0,0.9);
      col *= mix(vec3(1.0), mix(shadowT, highT, smoothstep(0.05,0.75,l)), uWarm);
      col = mix(col, vec3(l), uDesat);
      col *= uTint;
      // rewind scanlines and tint
      if(uRewind>0.0){ col *= 1.0 - uRewind*0.18*step(0.5, fract(vUv.y*480.0)); col = mix(col, col*vec3(0.85,0.95,1.15)+0.03, uRewind*0.6); }
      // vignette
      col *= 1.0 - uVignette*smoothstep(0.25, 0.85, d);
      // grain
      col += (hash(vUv*vec2(1080.0,1920.0)+fract(uTime*13.1))-0.5)*uGrain;
      col = mix(col, uFlashColor, uFlash);
      col = mix(col, vec3(0.0), uBlack);
      gl_FragColor = vec4(col,1.0);
    }`
};

export function makePost(renderer, W, H) {
  const composer = new EffectComposer(renderer);
  composer.setSize(W, H);
  const renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
  composer.addPass(renderPass);
  const bokeh = new BokehPass(new THREE.Scene(), new THREE.PerspectiveCamera(), { focus: 1.0, aperture: 0.004, maxblur: 0.008 });
  bokeh.enabled = false; composer.addPass(bokeh);
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.35, 0.6, 0.85); composer.addPass(bloom);
  const output = new OutputPass(); composer.addPass(output);
  const grade = new ShaderPass(GradeShader); grade.uniforms.uAspect.value = W / H; composer.addPass(grade);
  function set(scene, camera) {
    renderPass.scene = scene; renderPass.camera = camera;
    bokeh.scene = scene; bokeh.camera = camera;
  }
  return { composer, renderPass, bokeh, bloom, grade, set };
}
