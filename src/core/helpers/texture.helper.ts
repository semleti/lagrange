import type { BiomeParameters } from '@/core/models/biome-parameters.model'
import type { Rect, DataTextureWrapper, Coordinates2D } from '@/core/types'
import { avg, findMinDistanceToRect, findRectOverlaps, truncateTo } from '@/utils/math-utils'
import { Color, DataTexture } from 'three'
import type { ColorRampStep } from '../models/color-ramp.model'
import { clamp } from 'three/src/math/MathUtils.js'
import { INT8_TO_UNIT_MUL } from '../globals'

export function createRampTexture(w: number, steps: ColorRampStep[]): DataTextureWrapper {
  const data = new Uint8Array(w * 4)
  if (steps.length > 0) {
    fillRamp(data, w, steps)
  }
  const dt = new DataTexture(data, w, 1)
  dt.needsUpdate = true
  return { texture: dt, data }
}

export function recalculateRampTexture(data: Uint8Array, w: number, steps: ColorRampStep[]): void {
  if (steps.length === 0) {
    return
  }
  data.fill(0)
  fillRamp(data, w, steps)
}

function fillRamp(data: Uint8Array, w: number, steps: ColorRampStep[]) {
  let stride = 0
  let currentStep, nextStep
  for (let i = 0; i < steps.length-1; i++) {
    currentStep = steps[i].clone()
    nextStep = steps[i+1].clone()

    const currentStepX = truncateTo(currentStep.factor * w, 1e4)
    const nextStepX = truncateTo(nextStep.factor * w, 1e4)
    const totalPixels = Math.ceil(nextStepX - currentStepX)

    const lerpColor = new Color(0x0)
    for (let px = 0; px < totalPixels; px++) {
      lerpColor.lerpColors(currentStep.color, nextStep.color, truncateTo(px/totalPixels, 1e4))
      data[stride] = Math.floor(lerpColor.r * 255.0)
      data[stride + 1] = Math.floor(lerpColor.g * 255.0)
      data[stride + 2] = Math.floor(lerpColor.b * 255.0)
      data[stride + 3] = 255
      stride += 4
    }
  }
}

// ------------------------------------------------------------------------------------------------

export function createBiomeTexture(w: number, biomes: BiomeParameters[]): DataTextureWrapper {
  const data = new Uint8Array(w * w * 4)
  if (biomes.length > 0) {
    fillBiomes(data, w, biomes)
  }
  const dt = new DataTexture(data, w, w)
  dt.needsUpdate = true
  return { texture: dt, data }
}

export function recalculateBiomeTexture(data: Uint8Array, w: number, biomes: BiomeParameters[]): void {
  if (biomes.length === 0) {
    return
  }
  data.fill(0)
  fillBiomes(data, w, biomes)
}

function fillBiomes(data: Uint8Array, w: number, biomes: BiomeParameters[]) {
  let lineStride = 0
  let cellStride = (Math.ceil(biomes[0].humiMin * w) + (biomes[0].tempMin * w)) * 4
  for (let i = 0; i < biomes.toReversed().length; i++) {
    const biome = biomes[i]
    const biomeRect: Rect = {
      x: Math.floor(biome.humiMin * w),
      y: Math.floor(biome.tempMin * w),
      w: Math.ceil((biome.humiMax - biome.humiMin) * w),
      h: Math.ceil((biome.tempMax - biome.tempMin) * w)
    }
    const totalPixels = biomeRect.w * biomeRect.h
    const maxBiomeX = (biomeRect.x + biomeRect.w) * 4

    // Pre-calculate smoothing data
    const biomeAvgSmoothness = avg(...[biomeRect.w * biome.smoothness, biomeRect.h * biome.smoothness])
    const biomeOverlaps = findRectOverlaps(w, w, biomeRect)

    // Adjust strides depending on starting temp & humi
    cellStride = biomeRect.x * 4
    lineStride = biomeRect.y * w * 4

    // Calculate biome color
    const r = Math.floor(biome.color.r * 255.0)
    const g = Math.floor(biome.color.g * 255.0)
    const b = Math.floor(biome.color.b * 255.0)
    let a = 1.0

    // Prepare coords and pixel/temp colors
    const pixelCoords: Coordinates2D = { x: biomeRect.x, y: biomeRect.y }
    const pixelColor: Color = new Color('#000000')
    const tmpColor: Color = new Color('#000000')
    let pixelAlpha = 0.0

    // Iterate through every single pixel inside the biome rect
    let rectDistance: number, dataIdx: number
    for (let biomePx = 0; biomePx < totalPixels; biomePx++) {     
      dataIdx = lineStride + cellStride
      pixelColor.setRGB(
        data[dataIdx]*INT8_TO_UNIT_MUL,
        data[dataIdx + 1]*INT8_TO_UNIT_MUL,
        data[dataIdx + 2]*INT8_TO_UNIT_MUL
      )
      pixelAlpha = data[dataIdx + 3]*INT8_TO_UNIT_MUL

      rectDistance = findMinDistanceToRect(biomeRect, pixelCoords.x, pixelCoords.y, biomeOverlaps)
      a = truncateTo(clamp(rectDistance/biomeAvgSmoothness, 0, 1), 1e4)
      
      if (pixelAlpha > 0) {
        tmpColor.lerpColors(pixelColor, biome.color, 1 - pixelAlpha)
        data[dataIdx] = tmpColor.r*255.0
        data[dataIdx + 1] = tmpColor.g*255.0
        data[dataIdx + 2] = tmpColor.b*255.0
        data[dataIdx + 3] = clamp(data[dataIdx + 3]+(a*255.0), 0, 255)
      } else {
        data[dataIdx] = r
        data[dataIdx + 1] = g
        data[dataIdx + 2] = b
        data[dataIdx + 3] = a * 255.0
      }
      
      cellStride += 4
      pixelCoords.x++

      if (cellStride >= maxBiomeX) {
        lineStride += w * 4
        cellStride = biomeRect.x * 4
        pixelCoords.x = biomeRect.x
        pixelCoords.y++
      }
    }
  }
}
