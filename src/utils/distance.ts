import { APP_CONSTANTS } from '../constants'
import type { GeoPoint, Poi } from '../types'

const EARTH_RADIUS_METERS = 6371000

export const calculateDistanceMeters = (point1: GeoPoint, point2: GeoPoint): number => {
  const dLat = toRad(point2.latitude - point1.latitude)
  const dLon = toRad(point2.longitude - point1.longitude)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.latitude)) * Math.cos(toRad(point2.latitude)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_METERS * c
}

export const getDistanceToNearestPoi = (position: GeoPoint, pois: Poi[]): number => {
  if (pois.length === 0) {
    return Number.POSITIVE_INFINITY
  }

  let nearest = Number.POSITIVE_INFINITY
  for (const poi of pois) {
    const distance = calculateDistanceMeters(position, {
      latitude: poi.latitude,
      longitude: poi.longitude
    })
    if (distance < nearest) {
      nearest = distance
    }
  }
  return nearest
}

export const findNearbyPoi = (position: GeoPoint, pois: Poi[]): Poi | null => {
  let selected: Poi | null = null
  let nearestDistance = Number.POSITIVE_INFINITY

  for (const poi of pois) {
    const distance = calculateDistanceMeters(position, {
      latitude: poi.latitude,
      longitude: poi.longitude
    })

    if (distance > poi.radius) {
      continue
    }

    if (
      selected === null ||
      poi.priority > selected.priority ||
      (poi.priority === selected.priority && distance < nearestDistance)
    ) {
      selected = poi
      nearestDistance = distance
    }
  }

  return selected
}

export const shouldTriggerCooldown = (lastTriggerAt: number | null): boolean => {
  if (lastTriggerAt === null) {
    return true
  }
  const elapsedSeconds = (Date.now() - lastTriggerAt) / 1000
  return elapsedSeconds > APP_CONSTANTS.cooldownSeconds
}

const toRad = (value: number): number => value * (Math.PI / 180)
