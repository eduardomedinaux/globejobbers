import Image from "next/image";

export function Wordmark() {
  return (
    <Image
      src="/globejobbers-logo.svg"
      alt="GlobeJobbers"
      width={237}
      height={34}
      priority
      className="h-[34px] w-auto"
    />
  );
}
