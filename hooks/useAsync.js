'use client'

import { useState, useCallback } from 'react'

/**
 * Custom hook for handling async operations with loading states
 * Requirements: 15.3
 * 
 * @param {Function} asyncFunction - The async function to execute
 * @param {Object} options - Configuration options
 * @returns {Object} - { execute, loading, error, data, reset }
 */
export function useAsync(asyncFunction, options = {}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(options.initialData || null)

  const execute = useCallback(
    async (...params) => {
      setLoading(true)
      setError(null)

      try {
        const result = await asyncFunction(...params)
        setData(result)
        return result
      } catch (err) {
        setError(err)
        if (options.onError) {
          options.onError(err)
        }
        throw err
      } finally {
        setLoading(false)
      }
    },
    [asyncFunction, options]
  )

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    setData(options.initialData || null)
  }, [options.initialData])

  return { execute, loading, error, data, reset }
}

/**
 * Custom hook for mutations with optimistic updates and rollback
 * Requirements: 15.3
 * 
 * @param {Function} mutationFn - The mutation function to execute
 * @param {Object} options - Configuration options
 * @returns {Object} - { mutate, loading, error, reset }
 */
export function useOptimisticMutation(mutationFn, options = {}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const mutate = useCallback(
    async (optimisticData) => {
      setLoading(true)
      setError(null)

      // Store original data for rollback
      let rollbackData = null
      
      try {
        // Apply optimistic update if provided
        if (options.onOptimisticUpdate && optimisticData) {
          rollbackData = options.onOptimisticUpdate(optimisticData)
        }

        // Execute the mutation
        const result = await mutationFn(optimisticData)

        // Call success callback
        if (options.onSuccess) {
          options.onSuccess(result)
        }

        return result
      } catch (err) {
        // Rollback optimistic update on error
        if (options.onRollback && rollbackData) {
          options.onRollback(rollbackData)
        }

        setError(err)
        
        // Call error callback
        if (options.onError) {
          options.onError(err)
        }

        throw err
      } finally {
        setLoading(false)
      }
    },
    [mutationFn, options]
  )

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
  }, [])

  return { mutate, loading, error, reset }
}
