import type { LucideIcon } from "lucide-react"
import { CloudCog, Laptop, Smartphone, Tablet, Watch } from "lucide-react"

export const segmentIcons: Record<string, LucideIcon> = {
  iPhone: Smartphone,
  Mac: Laptop,
  iPad: Tablet,
  "Wearables, Home & Accessories": Watch,
  Services: CloudCog,
}

export default segmentIcons
