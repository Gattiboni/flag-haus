import { getAnamneseProfileByPhone, submitAnamnese } from '@/app/actions/anamnese'
import { AnamneseForm } from './AnamneseForm'

export default function AntesDaSessaoPage() {
  return (
    <AnamneseForm
      getProfileAction={getAnamneseProfileByPhone}
      submitAction={submitAnamnese}
    />
  )
}
