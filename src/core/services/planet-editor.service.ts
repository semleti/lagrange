import * as THREE from 'three'
import planetFragShader from '@assets/glsl/planet.frag.glsl?raw'
import planetVertShader from '@assets/glsl/planet.vert.glsl?raw'
import cloudsFragShader from '@assets/glsl/clouds.frag.glsl?raw'
import cloudsVertShader from '@assets/glsl/clouds.vert.glsl?raw'
import atmosphereFragShader from '@assets/glsl/atmosphere.frag.glsl?raw'
import atmosphereVertShader from '@assets/glsl/atmosphere.vert.glsl?raw'
import ringFragShader from '@assets/glsl/ring.frag.glsl?raw'
import ringVertShader from '@assets/glsl/ring.vert.glsl?raw'
import { degToRad } from 'three/src/math/MathUtils.js'
import {
  LG_NAME_CLOUDS,
  LG_NAME_PLANET,
  LG_NAME_AMBLIGHT,
  LG_NAME_ATMOSPHERE,
  LG_NAME_SUN,
  AXIS_Y,
  AXIS_X,
  ATMOSPHERE_HEIGHT_DIVIDER,
  TEXTURE_SIZES,
  LG_NAME_RING,
} from '@core/globals'
import { ColorMode, GeometryType, type DataTextureWrapper } from '@core/types'
import { loadCubeTexture } from '@core/three/external-data.loader'
import {
  createAmbientightComponent,
  createGeometryComponent,
  createPerspectiveCameraComponent,
  createRendererComponent,
  createCustomShaderMaterialComponent,
  createShaderMaterialComponent,
  createSphereGeometryComponent,
  createRingGeometryComponent,
} from '@core/three/component.builder'
import { SceneElements } from '@core/models/scene-elements.model'
import { LensFlareEffect } from '@core/three/lens-flare.effect'
import PlanetData from '@core/models/planet-data.model'
import { ref } from 'vue'
import { normalizeUInt8ArrayPixels } from '@/utils/math-utils'
import { createBiomeTexture, createRampTexture } from '../helpers/texture.helper'

// Editor constants
export const LG_PLANET_DATA = ref(new PlanetData())

// Buffers
export const LG_BUFFER_SURFACE = new Uint8Array(TEXTURE_SIZES.SURFACE * 4)
export const LG_BUFFER_BIOME = new Uint8Array(TEXTURE_SIZES.BIOME * TEXTURE_SIZES.BIOME * 4)
export const LG_BUFFER_CLOUDS = new Uint8Array(TEXTURE_SIZES.CLOUDS * TEXTURE_SIZES.CLOUDS * 4)
export const LG_BUFFER_RING = new Uint8Array(TEXTURE_SIZES.RING * TEXTURE_SIZES.RING * 4)

// ----------------------------------------------------------------------------------------------------------------------
// SCENE FUNCTIONS

export function createScene(data: PlanetData, width: number, height: number, pixelRatio: number): SceneElements {
  // setup cubemap
  const scene = new THREE.Scene()
  scene.background = loadCubeTexture('/skybox/', [
    'space_ft.png',
    'space_bk.png',
    'space_up.png',
    'space_dn.png',
    'space_rt.png',
    'space_lf.png',
  ])

  // setup scene (renderer, cam, lighting)
  const renderer = createRendererComponent(width, height, pixelRatio)
  const camera = createPerspectiveCameraComponent(
    50,
    width / height,
    0.1,
    1e6,
    new THREE.Spherical(data.initCamDistance, Math.PI / 2.0, degToRad(data.initCamAngle)),
  )
  const ambientLight = createAmbientightComponent(data.ambLightColor, data.ambLightIntensity)
  ambientLight.name = LG_NAME_AMBLIGHT
  scene.add(ambientLight)

  return new SceneElements(scene, renderer, camera)
}

export function createSun(data: PlanetData) {
  const sun = new THREE.DirectionalLight(data.sunLightColor, data.sunLightIntensity)
  sun.frustumCulled = false
  sun.userData.lens = 'no-occlusion'
  sun.name = LG_NAME_SUN
  sun.castShadow = true
  sun.shadow.camera.far = 1e4
  sun.shadow.mapSize.width = 4096
  sun.shadow.mapSize.height = 4096
  sun.shadow.bias = -0.00003
  return sun
}

export function createLensFlare(data: PlanetData, pos: THREE.Vector3, color: THREE.Color) {
  return new LensFlareEffect({
    opacity: 1,
    lensPosition: pos,
    colorGain: color,
    starPointsIntensity: data.lensFlarePointsIntensity,
    glareIntensity: data.lensFlareGlareIntensity,
  })
}

export function createPlanet(data: PlanetData): { mesh: THREE.Mesh; texs: DataTextureWrapper[] } {
  const geometry = createSphereGeometryComponent()
  geometry.computeTangents()

  const surfaceTex = createRampTexture(LG_BUFFER_SURFACE, TEXTURE_SIZES.SURFACE, data.planetSurfaceColorRamp.steps)
  const biomeTex = createBiomeTexture(LG_BUFFER_BIOME, TEXTURE_SIZES.BIOME, data.biomesParams)

  const material = createCustomShaderMaterialComponent(
    planetVertShader,
    planetFragShader,
    {
      // Planet & Rendering
      u_radius: { value: 1.0 },
      u_pbr_params: {
        value: {
          wlevel: data.planetWaterLevel,
          wrough: data.planetWaterRoughness,
          wmetal: data.planetWaterMetalness,
          grough: data.planetGroundRoughness,
          gmetal: data.planetGroundMetalness,
        },
      },
      // Surface
      u_bump: { value: data.planetSurfaceShowBumps },
      u_bump_strength: { value: data.planetSurfaceBumpStrength },
      u_bump_offset: { value: 0.005 },
      u_warp: { value: data.planetSurfaceShowWarping },
      u_displace: { value: data.planetSurfaceShowDisplacement },
      u_surface_displacement: {
        value: {
          freq: data.planetSurfaceDisplacement.frequency,
          amp: data.planetSurfaceDisplacement.amplitude,
          lac: data.planetSurfaceDisplacement.lacunarity,
          oct: data.planetSurfaceDisplacement.octaves,
          eps: data.planetSurfaceDisplacement.epsilon,
          mul: data.planetSurfaceDisplacement.multiplier,
          fac: data.planetSurfaceDisplacement.factor,
        },
      },
      u_surface_noise: {
        value: {
          freq: data.planetSurfaceNoise.frequency,
          amp: data.planetSurfaceNoise.amplitude,
          lac: data.planetSurfaceNoise.lacunarity,
          oct: data.planetSurfaceNoise.octaves,
          layers: data.planetSurfaceNoise.layers,
          xwarp: data.planetSurfaceNoise.xWarpFactor,
          ywarp: data.planetSurfaceNoise.yWarpFactor,
          zwarp: data.planetSurfaceNoise.zWarpFactor,
        },
      },
      u_surface_tex: { value: surfaceTex.texture },
      // Biomes
      u_biomes: { value: data.biomesEnabled },
      u_biomes_tex: { value: biomeTex.texture },
      u_temp_noise: {
        value: {
          mode: data.biomesTemperatureMode,
          freq: data.biomesTemperatureNoise.frequency,
          amp: data.biomesTemperatureNoise.amplitude,
          lac: data.biomesTemperatureNoise.lacunarity,
          oct: data.biomesTemperatureNoise.octaves,
        },
      },
      u_humi_noise: {
        value: {
          mode: data.biomesHumidityMode,
          freq: data.biomesHumidityNoise.frequency,
          amp: data.biomesHumidityNoise.amplitude,
          lac: data.biomesHumidityNoise.lacunarity,
          oct: data.biomesHumidityNoise.octaves,
        },
      },
    },
    THREE.MeshStandardMaterial,
  )
  material.shadowSide = THREE.DoubleSide

  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.name = LG_NAME_PLANET
  return { mesh, texs: [surfaceTex, biomeTex] }
}

export function createClouds(data: PlanetData): { mesh: THREE.Mesh; texs: DataTextureWrapper[] } {
  const cloudHeight = data.cloudsHeight / ATMOSPHERE_HEIGHT_DIVIDER
  const geometry = createSphereGeometryComponent(cloudHeight)
  const opacityTex = createRampTexture(LG_BUFFER_CLOUDS, TEXTURE_SIZES.CLOUDS, data.cloudsColorRamp.steps)

  const material = createCustomShaderMaterialComponent(
    cloudsVertShader,
    cloudsFragShader,
    {
      u_warp: { value: data.cloudsShowWarping },
      u_noise: {
        value: {
          freq: data.cloudsNoise.frequency,
          amp: data.cloudsNoise.amplitude,
          lac: data.cloudsNoise.lacunarity,
          oct: data.cloudsNoise.octaves,
          layers: data.cloudsNoise.layers,
          xwarp: data.cloudsNoise.xWarpFactor,
          ywarp: data.cloudsNoise.yWarpFactor,
          zwarp: data.cloudsNoise.zWarpFactor,
        },
      },
      u_color: { value: data.cloudsColor },
      u_opacity_tex: { value: opacityTex.texture },
    },
    THREE.MeshStandardMaterial,
  )
  material.transparent = true

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = LG_NAME_CLOUDS
  mesh.receiveShadow = true
  mesh.castShadow = true
  return { mesh, texs: [opacityTex] }
}

export function createAtmosphere(data: PlanetData, sunPos: THREE.Vector3): THREE.Mesh {
  const atmosHeight = data.atmosphereHeight / ATMOSPHERE_HEIGHT_DIVIDER
  const atmosDensity = data.atmosphereDensityScale / ATMOSPHERE_HEIGHT_DIVIDER
  const geometry = createSphereGeometryComponent(atmosHeight)
  const material = createShaderMaterialComponent(atmosphereVertShader, atmosphereFragShader, {
    u_light_position: { value: sunPos },
    u_light_intensity: { value: data.sunLightIntensity },
    u_surface_radius: { value: 1.0 },
    u_radius: { value: 1.0 + atmosHeight },
    u_density: { value: atmosDensity },
    u_intensity: { value: data.atmosphereIntensity },
    u_color_mode: { value: ColorMode.REALISTIC },
    u_hue: { value: data.atmosphereHue },
    u_tint: { value: data.atmosphereTint },
  })
  material.transparent = true
  material.depthWrite = false

  const mesh = new THREE.Mesh(geometry, material)
  mesh.userData.lens = 'no-occlusion'
  mesh.name = LG_NAME_ATMOSPHERE
  mesh.castShadow = true
  return mesh
}

export function createRing(data: PlanetData): { mesh: THREE.Mesh; texs: DataTextureWrapper[] } {
  const rgbaTex = createRampTexture(LG_BUFFER_RING, TEXTURE_SIZES.RING, data.ringColorRamp.steps)
  const geometry = createRingGeometryComponent(data.ringInnerRadius, data.ringOuterRadius)
  const material = createCustomShaderMaterialComponent(
    ringVertShader,
    ringFragShader,
    {
      u_inner_radius: { value: LG_PLANET_DATA.value.ringInnerRadius },
      u_outer_radius: { value: LG_PLANET_DATA.value.ringOuterRadius },
      u_ring_tex: { value: rgbaTex.texture },
    },
    THREE.MeshStandardMaterial,
  )
  material.side = THREE.DoubleSide
  material.transparent = true

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = LG_NAME_RING
  mesh.receiveShadow = true
  mesh.castShadow = true
  return { mesh, texs: [rgbaTex] }
}

// ----------------------------------------------------------------------------------------------------------------------
// DATA FUNCTIONS

export type PlanetPreviewData = {
  sun: THREE.DirectionalLight
  ambientLight: THREE.AmbientLight
  planet: THREE.Mesh
  clouds: THREE.Mesh
  atmosphere: THREE.Mesh
  ring: THREE.Mesh
}

export function exportPlanetPreview($se: SceneElements, data: PlanetPreviewData): string {
  const initialSize = new THREE.Vector2()
  $se.renderer.getSize(initialSize)

  // ------------------------------- Setup render scene -------------------------------
  const w = 384,
    h = 384
  const previewRenderTarget = new THREE.WebGLRenderTarget(w, h, {
    colorSpace: THREE.SRGBColorSpace,
  })
  const previewScene = new THREE.Scene()
  const previewCamera = createPerspectiveCameraComponent(
    50,
    w / h,
    0.1,
    1e4,
    new THREE.Spherical(
      LG_PLANET_DATA.value.initCamDistance - (LG_PLANET_DATA.value.ringEnabled ? 0.75 : 1.5),
      Math.PI / 2.0,
      degToRad(LG_PLANET_DATA.value.initCamAngle),
    ),
  )
  previewCamera.setRotationFromAxisAngle(AXIS_Y, degToRad(LG_PLANET_DATA.value.initCamAngle))
  previewCamera.updateProjectionMatrix()

  // ---------------------- Add cloned objects to preview scene -----------------------

  const planetGroup = new THREE.Group()
  planetGroup.add(data.planet)
  planetGroup.add(data.clouds)
  planetGroup.add(data.atmosphere)

  const ringAnchor = new THREE.Group()
  ringAnchor.add(data.ring)
  planetGroup.add(ringAnchor)

  previewScene.add(planetGroup)
  previewScene.add(data.sun)
  previewScene.add(data.ambientLight)

  planetGroup.scale.setScalar(LG_PLANET_DATA.value.planetRadius)
  planetGroup.setRotationFromAxisAngle(AXIS_X, degToRad(LG_PLANET_DATA.value.planetAxialTilt))
  ringAnchor.setRotationFromAxisAngle(AXIS_X, degToRad(LG_PLANET_DATA.value.ringAxialTilt))

  // ---------------------------- Setup renderer & render -----------------------------

  $se.renderer.clear()
  $se.renderer.setSize(w, h)
  $se.renderer.setRenderTarget(previewRenderTarget)

  const rawBuffer = new Uint8Array(w * h * 4)
  $se.renderer.render(previewScene, previewCamera)
  $se.renderer.readRenderTargetPixels(previewRenderTarget, 0, 0, w, h, rawBuffer)

  $se.renderer.setSize(initialSize.x, initialSize.y)
  $se.renderer.setRenderTarget(null)

  // ----------------- Create preview canvas & write data from buffer -----------------

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.createImageData(w, h)
  const previewBuffer = normalizeUInt8ArrayPixels(rawBuffer, w, h)
  for (let i = 0; i < imageData.data.length; i++) {
    imageData.data[i] = previewBuffer[i]
  }
  ctx.putImageData(imageData, 0, 0)

  // ------------------------------- Clean-up resources -------------------------------

  ringAnchor.clear()
  planetGroup.clear()
  data.sun.dispose()
  data.ambientLight.dispose()
  ;(data.clouds.material as THREE.Material).dispose()
  ;(data.atmosphere.material as THREE.Material).dispose()
  ;(data.planet.material as THREE.Material).dispose()
  ;(data.ring.material as THREE.Material).dispose()

  data.clouds.geometry.dispose()
  data.atmosphere.geometry.dispose()
  data.planet.geometry.dispose()
  data.ring.geometry.dispose()

  previewRenderTarget.dispose()
  previewScene.clear()

  // ----------------------------- Save and remove canvas -----------------------------

  const dataURL = canvas.toDataURL('image/webp')
  canvas.remove()

  return dataURL
}
