import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { DrinksLab } from "@/modules/challenges/components/DrinksLab";

export const metadata = { title: "Labo — Challenges" };

export default async function ChallengesLaboPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "owner") redirect("/challenges/overview");

  return <DrinksLab />;
}
