import SignInForm from "@/components/SignInForm";

// Admins only. There is no student account and no sign-up here by design; see lib/auth.ts.
export default async function SignInPage({ searchParams }: PageProps<"/masuk">) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Masuk</h1>
      <p className="mt-1.5 text-[0.9375rem] text-muted">
        Halaman ini untuk admin dan pemateri. Peserta tidak perlu akun.
      </p>
      <SignInForm next={typeof next === "string" ? next : "/"} />
    </main>
  );
}
