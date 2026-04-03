import { redirect } from "next/navigation"

export default async function MarketingPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  redirect(`/${lang}/marketing`)
}
