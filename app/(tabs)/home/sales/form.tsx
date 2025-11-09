import { useRouter } from 'expo-router'
import React from 'react'
import SalesForm from './POS'

export default function form() {
  const router = useRouter()

  return (
    <SalesForm
          type="sales"
          onBack={() => router.back()}
        />
  )
}