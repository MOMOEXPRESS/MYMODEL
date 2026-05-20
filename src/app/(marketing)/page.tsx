import { getLocale } from "@/lib/i18n";
import { getMarketingCopy } from "@/lib/marketing-copy";
import { MarketingPage } from "@/components/marketing/marketing-page";

export default async function HomePage() {
  const locale = await getLocale();
  const copy = getMarketingCopy(locale);
  return <MarketingPage locale={locale} copy={copy} />;
}
