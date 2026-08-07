import { notFound } from "next/navigation";
import { Network } from "lucide-react";

import { FamilyMemberList, FamilyTreeView } from "@/components/pets/family-tree";
import { ActionLink } from "@/components/ui/action";
import { EmptyState, Section } from "@/components/ui/section";
import { getPetFamily } from "@/server/queries";

export const metadata = { title: "Familia" };

export default async function PetFamilyPage({ params }: PageProps<"/mascotas/[petId]/familia">) {
  const { petId } = await params;
  const result = await getPetFamily(petId);
  if (!result) notFound();

  const tree = result.data;
  const hasAnyFamily =
    tree.father.kind !== "unknown" ||
    tree.mother.kind !== "unknown" ||
    tree.siblings.length > 0 ||
    tree.children.length > 0;

  if (!hasAnyFamily) {
    return (
      <EmptyState
        icon={<Network className="size-8" />}
        title="Aún no hay familia registrada"
        description="Elige a su padre o a su madre al editar la ficha; de ahí salen el árbol genealógico, los hermanos y los hijos."
        action={
          <ActionLink href={`/mascotas/${petId}/editar`} variant="outline">
            Editar ficha
          </ActionLink>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Árbol genealógico"
        description="Los miembros registrados en el sistema; el resto de posiciones quedan en blanco."
      >
        <FamilyTreeView tree={tree} />
      </Section>

      <Section title="Hermanos" description="Comparten padre o madre.">
        {tree.siblings.length > 0 ? (
          <FamilyMemberList members={tree.siblings} />
        ) : (
          <p className="text-muted-foreground text-sm">No hay hermanos registrados.</p>
        )}
      </Section>

      {tree.children.length > 0 && (
        <Section title="Hijos" description="Mascotas que la tienen como padre o madre.">
          <FamilyMemberList members={tree.children} />
        </Section>
      )}
    </div>
  );
}
