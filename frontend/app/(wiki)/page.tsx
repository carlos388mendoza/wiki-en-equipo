import { WallSections } from "@/components/layout/WallSections";
import { getCompanyWall } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";

export default async function CompanyWall() {
  const user = (await getCurrentUser())!;
  const wall = await getCompanyWall(user);
  const firstName = user.name.split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <header className="relative mb-10 overflow-hidden rounded-2xl bg-basil px-6 py-10 text-white sm:px-10">
        <div aria-hidden className="pointer-events-none absolute -right-4 -top-6 select-none text-[9rem] leading-none opacity-20 sm:text-[12rem]">🍽️</div>
        <p className="text-white/80">Hola, {firstName}</p>
        <h1 className="mt-1 max-w-xl font-display text-4xl font-bold leading-tight sm:text-5xl">Lo que todo el grupo necesita saber</h1>
        <p className="mt-3 max-w-lg text-white/85">Políticas, guías y anuncios publicados para toda la empresa.</p>
      </header>
      <WallSections {...wall} />
    </div>
  );
}
