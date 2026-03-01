import Image from "next/image";
import HeroImage from "@/app/images/Hero-book-hammer.png";

export default function HomePage() {
  return (
    <main className="bg-black text-white">
      <section className="relative h-[60vh] w-full overflow-hidden md:h-[70vh]">
        <Image
          src={HeroImage}
          alt="Summary Justice Act Book"
          fill
          priority
          className="object-cover object-center"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.75) 60%, rgba(0,0,0,0.85) 100%)",
            backdropFilter: "blur(3px)",
          }}
        />

        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-white">
          <h1 className="max-w-4xl text-balance text-3xl font-semibold leading-tight md:text-5xl">
            The Summary Justice (Social Contributions) Act 2025
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-base text-white/85 md:text-xl">
            A voluntary framework for social accountability within Team Sigma Three.
          </p>
          <a
            href="/act"
            className="mt-8 rounded-full border border-white/30 bg-white/10 px-7 py-3 text-sm font-medium tracking-wide text-white shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md transition duration-300 hover:border-white/50 hover:bg-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] md:text-base"
          >
            View the Act
          </a>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-black"
        />
      </section>
    </main>
  );
}
