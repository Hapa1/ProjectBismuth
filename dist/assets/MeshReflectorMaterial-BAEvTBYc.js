import{R as Z,S as ee,w as E,N as te,U as u,W as H,H as X,L as V,x as re,y as ae,g as ie,m as O,a as ne,t as oe,r,z as se,e as j,J as le,V as w,l as $,K as G,Q as ue,X as fe,Y as he,Z as me,b as ve,$ as ce}from"./index-DfGpesBi.js";const de=()=>parseInt(Z.replace(/\D+/g,"")),pe=de();class xe extends ee{constructor(e=new E){super({uniforms:{inputBuffer:new u(null),depthBuffer:new u(null),resolution:new u(new E),texelSize:new u(new E),halfTexelSize:new u(new E),kernel:new u(0),scale:new u(1),cameraNear:new u(0),cameraFar:new u(1),minDepthThreshold:new u(0),maxDepthThreshold:new u(1),depthScale:new u(0),depthToBlurRatioBias:new u(.25)},fragmentShader:`#include <common>
        #include <dithering_pars_fragment>      
        uniform sampler2D inputBuffer;
        uniform sampler2D depthBuffer;
        uniform float cameraNear;
        uniform float cameraFar;
        uniform float minDepthThreshold;
        uniform float maxDepthThreshold;
        uniform float depthScale;
        uniform float depthToBlurRatioBias;
        varying vec2 vUv;
        varying vec2 vUv0;
        varying vec2 vUv1;
        varying vec2 vUv2;
        varying vec2 vUv3;

        void main() {
          float depthFactor = 0.0;
          
          #ifdef USE_DEPTH
            vec4 depth = texture2D(depthBuffer, vUv);
            depthFactor = smoothstep(minDepthThreshold, maxDepthThreshold, 1.0-(depth.r * depth.a));
            depthFactor *= depthScale;
            depthFactor = max(0.0, min(1.0, depthFactor + 0.25));
          #endif
          
          vec4 sum = texture2D(inputBuffer, mix(vUv0, vUv, depthFactor));
          sum += texture2D(inputBuffer, mix(vUv1, vUv, depthFactor));
          sum += texture2D(inputBuffer, mix(vUv2, vUv, depthFactor));
          sum += texture2D(inputBuffer, mix(vUv3, vUv, depthFactor));
          gl_FragColor = sum * 0.25 ;

          #include <dithering_fragment>
          #include <tonemapping_fragment>
          #include <${pe>=154?"colorspace_fragment":"encodings_fragment"}>
        }`,vertexShader:`uniform vec2 texelSize;
        uniform vec2 halfTexelSize;
        uniform float kernel;
        uniform float scale;
        varying vec2 vUv;
        varying vec2 vUv0;
        varying vec2 vUv1;
        varying vec2 vUv2;
        varying vec2 vUv3;

        void main() {
          vec2 uv = position.xy * 0.5 + 0.5;
          vUv = uv;

          vec2 dUv = (texelSize * vec2(kernel) + halfTexelSize) * scale;
          vUv0 = vec2(uv.x - dUv.x, uv.y + dUv.y);
          vUv1 = vec2(uv.x + dUv.x, uv.y + dUv.y);
          vUv2 = vec2(uv.x + dUv.x, uv.y - dUv.y);
          vUv3 = vec2(uv.x - dUv.x, uv.y - dUv.y);

          gl_Position = vec4(position.xy, 1.0, 1.0);
        }`,blending:te,depthWrite:!1,depthTest:!1}),this.toneMapped=!1,this.setTexelSize(e.x,e.y),this.kernel=new Float32Array([0,1,2,2,3])}setTexelSize(e,t){this.uniforms.texelSize.value.set(e,t),this.uniforms.halfTexelSize.value.set(e,t).multiplyScalar(.5)}setResolution(e){this.uniforms.resolution.value.copy(e)}}class _e{constructor({gl:e,resolution:t,width:i=500,height:m=500,minDepthThreshold:c=0,maxDepthThreshold:d=1,depthScale:p=0,depthToBlurRatioBias:D=.25}){this.renderToScreen=!1,this.renderTargetA=new H(t,t,{minFilter:V,magFilter:V,stencilBuffer:!1,depthBuffer:!1,type:X}),this.renderTargetB=this.renderTargetA.clone(),this.convolutionMaterial=new xe,this.convolutionMaterial.setTexelSize(1/i,1/m),this.convolutionMaterial.setResolution(new E(i,m)),this.scene=new re,this.camera=new ae,this.convolutionMaterial.uniforms.minDepthThreshold.value=c,this.convolutionMaterial.uniforms.maxDepthThreshold.value=d,this.convolutionMaterial.uniforms.depthScale.value=p,this.convolutionMaterial.uniforms.depthToBlurRatioBias.value=D,this.convolutionMaterial.defines.USE_DEPTH=p>0;const h=new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),x=new Float32Array([0,0,2,0,0,2]),f=new ie;f.setAttribute("position",new O(h,3)),f.setAttribute("uv",new O(x,2)),this.screen=new ne(f,this.convolutionMaterial),this.screen.frustumCulled=!1,this.scene.add(this.screen)}render(e,t,i){const m=this.scene,c=this.camera,d=this.renderTargetA,p=this.renderTargetB;let D=this.convolutionMaterial,h=D.uniforms;h.depthBuffer.value=t.depthTexture;const x=D.kernel;let f=t,T,_,P;for(_=0,P=x.length-1;_<P;++_)T=_&1?p:d,h.kernel.value=x[_],h.inputBuffer.value=f.texture,e.setRenderTarget(T),e.render(m,c),f=T;h.kernel.value=x[_],h.inputBuffer.value=f.texture,e.setRenderTarget(this.renderToScreen?null:i),e.render(m,c)}}let ge=class extends oe{constructor(e={}){super(e),this._tDepth={value:null},this._distortionMap={value:null},this._tDiffuse={value:null},this._tDiffuseBlur={value:null},this._textureMatrix={value:null},this._hasBlur={value:!1},this._mirror={value:0},this._mixBlur={value:0},this._blurStrength={value:.5},this._minDepthThreshold={value:.9},this._maxDepthThreshold={value:1},this._depthScale={value:0},this._depthToBlurRatioBias={value:.25},this._distortion={value:1},this._mixContrast={value:1},this.setValues(e)}onBeforeCompile(e){var t;(t=e.defines)!=null&&t.USE_UV||(e.defines.USE_UV=""),e.uniforms.hasBlur=this._hasBlur,e.uniforms.tDiffuse=this._tDiffuse,e.uniforms.tDepth=this._tDepth,e.uniforms.distortionMap=this._distortionMap,e.uniforms.tDiffuseBlur=this._tDiffuseBlur,e.uniforms.textureMatrix=this._textureMatrix,e.uniforms.mirror=this._mirror,e.uniforms.mixBlur=this._mixBlur,e.uniforms.mixStrength=this._blurStrength,e.uniforms.minDepthThreshold=this._minDepthThreshold,e.uniforms.maxDepthThreshold=this._maxDepthThreshold,e.uniforms.depthScale=this._depthScale,e.uniforms.depthToBlurRatioBias=this._depthToBlurRatioBias,e.uniforms.distortion=this._distortion,e.uniforms.mixContrast=this._mixContrast,e.vertexShader=`
        uniform mat4 textureMatrix;
        varying vec4 my_vUv;
      ${e.vertexShader}`,e.vertexShader=e.vertexShader.replace("#include <project_vertex>",`#include <project_vertex>
        my_vUv = textureMatrix * vec4( position, 1.0 );
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );`),e.fragmentShader=`
        uniform sampler2D tDiffuse;
        uniform sampler2D tDiffuseBlur;
        uniform sampler2D tDepth;
        uniform sampler2D distortionMap;
        uniform float distortion;
        uniform float cameraNear;
			  uniform float cameraFar;
        uniform bool hasBlur;
        uniform float mixBlur;
        uniform float mirror;
        uniform float mixStrength;
        uniform float minDepthThreshold;
        uniform float maxDepthThreshold;
        uniform float mixContrast;
        uniform float depthScale;
        uniform float depthToBlurRatioBias;
        varying vec4 my_vUv;
        ${e.fragmentShader}`,e.fragmentShader=e.fragmentShader.replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>

      float distortionFactor = 0.0;
      #ifdef USE_DISTORTION
        distortionFactor = texture2D(distortionMap, vUv).r * distortion;
      #endif

      vec4 new_vUv = my_vUv;
      new_vUv.x += distortionFactor;
      new_vUv.y += distortionFactor;

      vec4 base = texture2DProj(tDiffuse, new_vUv);
      vec4 blur = texture2DProj(tDiffuseBlur, new_vUv);

      vec4 merge = base;

      #ifdef USE_NORMALMAP
        vec2 normal_uv = vec2(0.0);
        vec4 normalColor = texture2D(normalMap, vUv * normalScale);
        vec3 my_normal = normalize( vec3( normalColor.r * 2.0 - 1.0, normalColor.b,  normalColor.g * 2.0 - 1.0 ) );
        vec3 coord = new_vUv.xyz / new_vUv.w;
        normal_uv = coord.xy + coord.z * my_normal.xz * 0.05;
        vec4 base_normal = texture2D(tDiffuse, normal_uv);
        vec4 blur_normal = texture2D(tDiffuseBlur, normal_uv);
        merge = base_normal;
        blur = blur_normal;
      #endif

      float depthFactor = 0.0001;
      float blurFactor = 0.0;

      #ifdef USE_DEPTH
        vec4 depth = texture2DProj(tDepth, new_vUv);
        depthFactor = smoothstep(minDepthThreshold, maxDepthThreshold, 1.0-(depth.r * depth.a));
        depthFactor *= depthScale;
        depthFactor = max(0.0001, min(1.0, depthFactor));

        #ifdef USE_BLUR
          blur = blur * min(1.0, depthFactor + depthToBlurRatioBias);
          merge = merge * min(1.0, depthFactor + 0.5);
        #else
          merge = merge * depthFactor;
        #endif

      #endif

      float reflectorRoughnessFactor = roughness;
      #ifdef USE_ROUGHNESSMAP
        vec4 reflectorTexelRoughness = texture2D( roughnessMap, vUv );
        reflectorRoughnessFactor *= reflectorTexelRoughness.g;
      #endif

      #ifdef USE_BLUR
        blurFactor = min(1.0, mixBlur * reflectorRoughnessFactor);
        merge = mix(merge, blur, blurFactor);
      #endif

      vec4 newMerge = vec4(0.0, 0.0, 0.0, 1.0);
      newMerge.r = (merge.r - 0.5) * mixContrast + 0.5;
      newMerge.g = (merge.g - 0.5) * mixContrast + 0.5;
      newMerge.b = (merge.b - 0.5) * mixContrast + 0.5;

      diffuseColor.rgb = diffuseColor.rgb * ((1.0 - min(1.0, mirror)) + newMerge.rgb * mixStrength);
      `)}get tDiffuse(){return this._tDiffuse.value}set tDiffuse(e){this._tDiffuse.value=e}get tDepth(){return this._tDepth.value}set tDepth(e){this._tDepth.value=e}get distortionMap(){return this._distortionMap.value}set distortionMap(e){this._distortionMap.value=e}get tDiffuseBlur(){return this._tDiffuseBlur.value}set tDiffuseBlur(e){this._tDiffuseBlur.value=e}get textureMatrix(){return this._textureMatrix.value}set textureMatrix(e){this._textureMatrix.value=e}get hasBlur(){return this._hasBlur.value}set hasBlur(e){this._hasBlur.value=e}get mirror(){return this._mirror.value}set mirror(e){this._mirror.value=e}get mixBlur(){return this._mixBlur.value}set mixBlur(e){this._mixBlur.value=e}get mixStrength(){return this._blurStrength.value}set mixStrength(e){this._blurStrength.value=e}get minDepthThreshold(){return this._minDepthThreshold.value}set minDepthThreshold(e){this._minDepthThreshold.value=e}get maxDepthThreshold(){return this._maxDepthThreshold.value}set maxDepthThreshold(e){this._maxDepthThreshold.value=e}get depthScale(){return this._depthScale.value}set depthScale(e){this._depthScale.value=e}get depthToBlurRatioBias(){return this._depthToBlurRatioBias.value}set depthToBlurRatioBias(e){this._depthToBlurRatioBias.value=e}get distortion(){return this._distortion.value}set distortion(e){this._distortion.value=e}get mixContrast(){return this._mixContrast.value}set mixContrast(e){this._mixContrast.value=e}};const Te=r.forwardRef(({mixBlur:y=0,mixStrength:e=1,resolution:t=256,blur:i=[0,0],minDepthThreshold:m=.9,maxDepthThreshold:c=1,depthScale:d=0,depthToBlurRatioBias:p=.25,mirror:D=0,distortion:h=1,mixContrast:x=1,distortionMap:f,reflectorOffset:T=0,..._},P)=>{se({MeshReflectorMaterialImpl:ge});const n=j(({gl:s})=>s),R=j(({camera:s})=>s),q=j(({scene:s})=>s);i=Array.isArray(i)?i:[i,i];const A=i[0]+i[1]>0,U=r.useRef(null);r.useImperativeHandle(P,()=>U.current,[]);const[M]=r.useState(()=>new le),[g]=r.useState(()=>new w),[S]=r.useState(()=>new w),[W]=r.useState(()=>new w),[F]=r.useState(()=>new $),[z]=r.useState(()=>new w(0,0,-1)),[v]=r.useState(()=>new G),[b]=r.useState(()=>new w),[k]=r.useState(()=>new w),[C]=r.useState(()=>new G),[B]=r.useState(()=>new $),[l]=r.useState(()=>new ue),J=r.useCallback(()=>{var s;const a=U.current.parent||((s=U.current)==null?void 0:s.__r3f.parent);if(!a||(S.setFromMatrixPosition(a.matrixWorld),W.setFromMatrixPosition(R.matrixWorld),F.extractRotation(a.matrixWorld),g.set(0,0,1),g.applyMatrix4(F),S.addScaledVector(g,T),b.subVectors(S,W),b.dot(g)>0))return;b.reflect(g).negate(),b.add(S),F.extractRotation(R.matrixWorld),z.set(0,0,-1),z.applyMatrix4(F),z.add(W),k.subVectors(S,z),k.reflect(g).negate(),k.add(S),l.position.copy(b),l.up.set(0,1,0),l.up.applyMatrix4(F),l.up.reflect(g),l.lookAt(k),l.far=R.far,l.updateMatrixWorld(),l.projectionMatrix.copy(R.projectionMatrix),B.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),B.multiply(l.projectionMatrix),B.multiply(l.matrixWorldInverse),B.multiply(a.matrixWorld),M.setFromNormalAndCoplanarPoint(g,S),M.applyMatrix4(l.matrixWorldInverse),v.set(M.normal.x,M.normal.y,M.normal.z,M.constant);const o=l.projectionMatrix;C.x=(Math.sign(v.x)+o.elements[8])/o.elements[0],C.y=(Math.sign(v.y)+o.elements[9])/o.elements[5],C.z=-1,C.w=(1+o.elements[10])/o.elements[14],v.multiplyScalar(2/v.dot(C)),o.elements[2]=v.x,o.elements[6]=v.y,o.elements[10]=v.z+1,o.elements[14]=v.w},[R,T]),[L,K,Q,I]=r.useMemo(()=>{const s={minFilter:V,magFilter:V,type:X},a=new H(t,t,s);a.depthBuffer=!0,a.depthTexture=new fe(t,t),a.depthTexture.format=he,a.depthTexture.type=me;const o=new H(t,t,s),N=new _e({gl:n,resolution:t,width:i[0],height:i[1],minDepthThreshold:m,maxDepthThreshold:c,depthScale:d,depthToBlurRatioBias:p}),Y={mirror:D,textureMatrix:B,mixBlur:y,tDiffuse:a.texture,tDepth:a.depthTexture,tDiffuseBlur:o.texture,hasBlur:A,mixStrength:e,minDepthThreshold:m,maxDepthThreshold:c,depthScale:d,depthToBlurRatioBias:p,distortion:h,distortionMap:f,mixContrast:x,"defines-USE_BLUR":A?"":void 0,"defines-USE_DEPTH":d>0?"":void 0,"defines-USE_DISTORTION":f?"":void 0};return[a,o,N,Y]},[n,i,B,t,D,A,y,e,m,c,d,p,h,f,x]);return ve(()=>{var s;const a=U.current.parent||((s=U.current)==null?void 0:s.__r3f.parent);if(!a)return;a.visible=!1;const o=n.xr.enabled,N=n.shadowMap.autoUpdate;J(),n.xr.enabled=!1,n.shadowMap.autoUpdate=!1,n.setRenderTarget(L),n.state.buffers.depth.setMask(!0),n.autoClear||n.clear(),n.render(q,l),A&&Q.render(n,L,K),n.xr.enabled=o,n.shadowMap.autoUpdate=N,a.visible=!0,n.setRenderTarget(null)}),r.createElement("meshReflectorMaterialImpl",ce({attach:"material",key:"key"+I["defines-USE_BLUR"]+I["defines-USE_DEPTH"]+I["defines-USE_DISTORTION"],ref:U},I,_))});export{Te as M};
