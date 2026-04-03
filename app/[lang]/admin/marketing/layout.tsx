import { MarketingNav } from "@/components/admin/marketing-nav"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="-m-4 sm:-m-6 lg:-m-8">
      <MarketingNav />
      <div className="p-4 sm:p-6 lg:p-8">
        {children}
      </div>
    </div>
  )
}
