import SignInForm from "@/components/SignInForm";

// Admins only. There is no student account and no sign-up here by design; see lib/auth.ts.
export default async function SignInPage({ searchParams }: PageProps<"/masuk">) {
  const { next } = await searchParams;
  return <SignInForm next={typeof next === "string" ? next : "/"} />;
}
