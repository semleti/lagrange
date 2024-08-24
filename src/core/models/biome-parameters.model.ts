import { Color } from 'three'
import { ChangeTracker } from './change-tracker.model'
import { nanoid } from 'nanoid'

export class BiomeDimensions {
  temperatureMin: number = 0.0
  temperatureMax: number = 1.0
  humidityMin: number = 0.0
  humidityMax: number = 1.0
}
export class BiomeParameters extends ChangeTracker {
  private _id: string
  private _tempMin: number = 0.0
  private _tempMax: number = 1.0
  private _humiMin: number = 0.0
  private _humiMax: number = 1.0
  private _color: Color

  constructor(
    changedPropsRef: string[],
    changePrefix: string,
    dims: BiomeDimensions,
    color: Color,
  ) {
    super(changedPropsRef, changePrefix)
    this._id = nanoid()
    this._tempMin = dims.temperatureMin
    this._tempMax = dims.temperatureMax
    this._humiMin = dims.humidityMin
    this._humiMax = dims.humidityMax
    this._color = new Color(color)
  }

  clone(): BiomeParameters {
    return new BiomeParameters(
      this._changedProps,
      this._changePrefix,
      { 
        temperatureMin: this._tempMin,
        temperatureMax: this._tempMax,
        humidityMin: this._humiMin,
        humidityMax: this._humiMax,
      },
      this._color.clone(),
    )
  }

  public get id(): string {
    return this._id
  }
  
  public get tempMin(): number {
    return this._tempMin
  }
  public set tempMin(value: number) {
    this._tempMin = value
    this.markForChange(this._changePrefix)
  }
  public get tempMax(): number {
    return this._tempMax
  }
  public set tempMax(value: number) {
    this._tempMax = value
    this.markForChange(this._changePrefix)
  }

  public get humiMin(): number {
    return this._humiMin
  }
  public set humiMin(value: number) {
    this._humiMin = value
    this.markForChange(this._changePrefix)
  }
  public get humiMax(): number {
    return this._humiMax
  }
  public set humiMax(value: number) {
    this._humiMax = value
    this.markForChange(this._changePrefix)
  }
  public get color(): Color {
    return this._color
  }
  public set color(value: Color) {
    this._color.set(value)
    this.markForChange(this._changePrefix)
  }
}
