import { getPersonProfileByPhone, submitCadastro } from '@/app/actions/people'
import { CadastroForm } from './CadastroForm'

export default function CadastroPage() {
  return (
    <CadastroForm
      getProfileAction={getPersonProfileByPhone}
      submitAction={submitCadastro}
    />
  )
}
