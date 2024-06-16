import * as THREE from 'three'
import planetFragShader from '@assets/glsl/planet.frag.glsl?raw'
import planetVertShader from '@assets/glsl/planet.vert.glsl?raw'
import cloudsFragShader from '@assets/glsl/clouds.frag.glsl?raw'
import cloudsVertShader from '@assets/glsl/clouds.vert.glsl?raw'
import atmosphereFragShader from '@assets/glsl/atmosphere.frag.glsl?raw'
import atmosphereVertShader from '@assets/glsl/atmosphere.vert.glsl?raw'
import { degToRad } from 'three/src/math/MathUtils.js'
import {
  LG_PARAMETERS,
  LG_NAME_CLOUDS,
  LG_NAME_PLANET,
  LG_NAME_SUN,
  LG_HEIGHT_DIVIDER,
  LG_NAME_AMBLIGHT,
  LG_NAME_ATMOSPHERE,
} from '@core/globals'
import { GeometryType, type SceneElements } from '@core/types'
import { loadCubeTexture } from '@/core/three/external-data.loader'
import { createAmbientight, createGeometry, createPerspectiveCamera, createRenderer, createShaderMaterial } from '@/core/three/component.builder'
import { resolveImports } from './three/shader-imports.loader'

// ----------------------------------------------------------------------------------------------------------------------
// SCENE FUNCTIONS

export function createScene(width: number, height: number, pixelRatio: number): SceneElements
{
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
  const renderer = createRenderer(width, height, pixelRatio)
  const camera = createPerspectiveCamera(
    50, width / height, 0.1, 1e9,
    new THREE.Spherical(
      LG_PARAMETERS.initCamDistance,
      Math.PI / 2.0,
      degToRad(LG_PARAMETERS.initCamAngle)
    )
  )
  const ambientLight = createAmbientight(
    LG_PARAMETERS.ambLightColor,
    LG_PARAMETERS.ambLightIntensity
  )
  ambientLight.name = LG_NAME_AMBLIGHT
  scene.add(ambientLight)

  return { scene, renderer, camera }
}

export function createSun(): THREE.DirectionalLight {
  const geometry = new THREE.IcosahedronGeometry(50, 4)
  const material = new THREE.MeshStandardMaterial( { color: 0xffffff, emissive: new THREE.Color(100, 100, 100) } )
  const sun = new THREE.DirectionalLight(
    LG_PARAMETERS.sunLightColor, 
    LG_PARAMETERS.sunLightIntensity
  )
  sun.add(new THREE.Mesh(geometry, material))
  sun.name = LG_NAME_SUN
  return sun
}

export function createPlanet(type: GeometryType): THREE.Mesh {
  const geometry = createGeometry(type)
  geometry.computeTangents()

  const material = createShaderMaterial(planetVertShader, planetFragShader, {
    u_resolution:           { value: new THREE.Vector2(256, 256)},
    u_radius:               { value: LG_PARAMETERS.initPlanetRadius },
    u_octaves:              { value: 16 },
    u_frequency:            { value: LG_PARAMETERS.planetSurfaceNoise.frequency },
    u_amplitude:            { value: LG_PARAMETERS.planetSurfaceNoise.amplitude },
    u_lacunarity:           { value: LG_PARAMETERS.planetSurfaceNoise.lacunarity },
    u_water_level:          { value: 0.5 },
    u_water_roughness:      { value: 0.55 },
    u_ground_roughness:     { value: 0.8 },
    u_water_metalness:      { value: 0.5 },
    u_ground_metalness:     { value: 0.1 },
    u_bump:                 { value: true },
    u_bump_offset:          { value: 0.005 },
    u_bump_strength:        { value: 0.0875 },
    u_cr_colors:            { value: LG_PARAMETERS.planetSurfaceColorRamp.colors },
    u_cr_positions:         { value: LG_PARAMETERS.planetSurfaceColorRamp.factors },
    u_cr_size:              { value: LG_PARAMETERS.planetSurfaceColorRampSize },
  }, THREE.MeshStandardMaterial)

  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  mesh.name = LG_NAME_PLANET
  return mesh
}

export function createClouds(type: GeometryType): THREE.Mesh {
  const cloudHeight = (LG_PARAMETERS.cloudsHeight / LG_HEIGHT_DIVIDER)
  const geometry = createGeometry(type, cloudHeight)
  const material = createShaderMaterial(cloudsVertShader, cloudsFragShader, {
    u_resolution:     { value: new THREE.Vector2(256, 256) },
    u_octaves:        { value: 8 },
    u_frequency:      { value: LG_PARAMETERS.cloudsNoise.frequency },
    u_amplitude:      { value: LG_PARAMETERS.cloudsNoise.amplitude },
    u_lacunarity:     { value: LG_PARAMETERS.cloudsNoise.lacunarity },
    u_color:          { value: new THREE.Color(0xffffff) },
    u_cr_colors:      { value: LG_PARAMETERS.cloudsColorRamp.colors },
    u_cr_positions:   { value: LG_PARAMETERS.cloudsColorRamp.factors },
    u_cr_size:        { value: LG_PARAMETERS.cloudsColorRampSize },
  }, THREE.MeshStandardMaterial)
  material.transparent = true

  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  mesh.castShadow = true
  mesh.name = LG_NAME_CLOUDS
  return mesh
}

export function createAtmosphere(type: GeometryType, sunPos: THREE.Vector3): THREE.Mesh {
  const atmosHeight = (LG_PARAMETERS.atmosphereHeight / LG_HEIGHT_DIVIDER)
  const geometry = createGeometry(type, atmosHeight)
  const material = createShaderMaterial(atmosphereVertShader, atmosphereFragShader, {
    u_light_position: { value: sunPos },
    u_light_intensity: { value: LG_PARAMETERS.sunLightIntensity * 2 },
    u_surface_radius: { value: 1.0 },
    u_radius: { value: LG_PARAMETERS.initPlanetRadius + atmosHeight }
  }, THREE.ShaderMaterial)
  material.transparent = true

  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = LG_NAME_ATMOSPHERE
  return mesh
}

// ----------------------------------------------------------------------------------------------------------------------
// UPDATE FUNCTIONS

export function switchPlanetMesh(scene: THREE.Scene, type: GeometryType): THREE.Mesh {
  const planet = scene.getObjectByName(LG_NAME_PLANET) as THREE.Mesh
  if (
    planet.geometry instanceof THREE.IcosahedronGeometry && type === GeometryType.SPHERE
    || planet.geometry instanceof THREE.TorusGeometry && type === GeometryType.TORUS
    || planet.geometry instanceof THREE.BoxGeometry && type === GeometryType.BOX
  ) {
    return planet
  }

  (planet.material as THREE.Material).dispose()
  planet.geometry.dispose()
  scene.remove(planet)

  const newPlanet = createPlanet(type)
  scene.add(newPlanet)
  return newPlanet
}

export function switchCloudsMesh(scene: THREE.Scene, type: GeometryType): THREE.Mesh {
  const clouds = scene.getObjectByName(LG_NAME_CLOUDS) as THREE.Mesh
  if (
    clouds.geometry instanceof THREE.IcosahedronGeometry && type === GeometryType.SPHERE
    || clouds.geometry instanceof THREE.TorusGeometry && type === GeometryType.TORUS
    || clouds.geometry instanceof THREE.BoxGeometry && type === GeometryType.BOX
  ) {
    return clouds
  }

  (clouds.material as THREE.Material).dispose()
  clouds.geometry.dispose()
  scene.remove(clouds)

  const newClouds = createClouds(type)
  scene.add(newClouds)
  return newClouds
}

export function forceUpdatePlanet(scene: THREE.Scene): THREE.Mesh {
  const planet = scene.getObjectByName(LG_NAME_PLANET) as THREE.Mesh
  (planet.material as THREE.Material).dispose()
  planet.geometry.dispose()
  scene.remove(planet)

  const newPlanet = createPlanet(LG_PARAMETERS.planetGeometryType)
  scene.add(newPlanet)
  return newPlanet
}

export function forceUpdateClouds(scene: THREE.Scene): THREE.Mesh {
  const clouds = scene.getObjectByName(LG_NAME_CLOUDS) as THREE.Mesh
  (clouds.material as THREE.Material).dispose()
  clouds.geometry.dispose()
  scene.remove(clouds)

  const newClouds = createClouds(LG_PARAMETERS.planetGeometryType)
  scene.add(newClouds)
  return newClouds
}