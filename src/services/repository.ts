import axios from 'axios'
import { POIS } from '../data/pois'
import { TOURS } from '../data/tours'
import type { Poi, Tour } from '../types'

export const http = axios.create({
  baseURL: '/'
})

export const fetchPois = async (): Promise<Poi[]> => {
  return POIS
}

export const fetchTours = async (): Promise<Tour[]> => {
  return TOURS
}
