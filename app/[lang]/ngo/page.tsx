import { redirect } from "next/navigation"

export default async function NgoPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  redirect(`/${lang}/ngo/dashboard`)
}
