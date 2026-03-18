import { useQuery } from '@tanstack/react-query'
import { fetchPois, fetchTours } from '../services/repository'

export const usePoisQuery = () => {
  return useQuery({
    queryKey: ['pois'],
    queryFn: fetchPois,
    staleTime: Number.POSITIVE_INFINITY
  })
}

export const useToursQuery = () => {
  return useQuery({
    queryKey: ['tours'],
    queryFn: fetchTours,
    staleTime: Number.POSITIVE_INFINITY
  })
}
