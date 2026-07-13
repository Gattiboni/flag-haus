import { LoginForm } from './LoginForm'

/**
 * /admin/login — fora do route group (protected), então não passa pelo gate.
 * O middleware já redireciona pra cá quem não tem sessão, e pra /admin quem
 * tem. O parâmetro ?blocked=1 vem do requireOperator() quando o usuário
 * autentica mas não está na allowlist.
 */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ blocked?: string }>
}) {
  const { blocked } = await searchParams
  return <LoginForm blocked={blocked === '1'} />
}
