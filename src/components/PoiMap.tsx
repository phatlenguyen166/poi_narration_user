import { useEffect } from 'react'
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import { APP_CONSTANTS, DEFAULT_CENTER } from '../constants'
import type { GeoPoint, Poi } from '../types'

interface PoiMapProps {
  pois: Poi[]
  userLocation: GeoPoint | null
  focusPoint: GeoPoint | null
  onPoiSelect: (poi: Poi) => void
}

const MapViewController = ({ center }: { center: GeoPoint }) => {
  const map = useMap()

  useEffect(() => {
    map.setView([center.latitude, center.longitude], map.getZoom(), { animate: true })
  }, [center.latitude, center.longitude, map])

  return null
}

export const PoiMap = ({ pois, userLocation, focusPoint, onPoiSelect }: PoiMapProps) => {
  const center = focusPoint ?? userLocation ?? DEFAULT_CENTER

  return (
    <MapContainer
      center={[center.latitude, center.longitude]}
      zoom={APP_CONSTANTS.defaultMapZoom}
      className='h-full w-full'
      zoomControl={false}
    >
      <MapViewController center={center} />

      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />

      {pois.map((poi) => (
        <Circle
          key={`radius-${poi.id}`}
          center={[poi.latitude, poi.longitude]}
          radius={poi.radius}
          pathOptions={{
            color: '#f97316',
            fillColor: '#f97316',
            fillOpacity: 0.14,
            weight: 2
          }}
        />
      ))}

      {pois.map((poi) => (
        <CircleMarker
          key={`poi-${poi.id}`}
          center={[poi.latitude, poi.longitude]}
          radius={8}
          pathOptions={{
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.95
          }}
          eventHandlers={{
            click: () => onPoiSelect(poi)
          }}
        >
          <Popup>
            <strong>{poi.id.toUpperCase()}</strong>
          </Popup>
        </CircleMarker>
      ))}

      {userLocation && (
        <CircleMarker
          center={[userLocation.latitude, userLocation.longitude]}
          radius={9}
          pathOptions={{
            color: '#38bdf8',
            fillColor: '#0ea5e9',
            fillOpacity: 0.95
          }}
        >
          <Popup>Your location</Popup>
        </CircleMarker>
      )}
    </MapContainer>
  )
}
