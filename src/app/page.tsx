import { VerificationFlow } from "@/components/verification-flow";
import { listProducts } from "@/lib/products/repository";

export default function Home() {
  return <VerificationFlow products={listProducts()} />;
}
