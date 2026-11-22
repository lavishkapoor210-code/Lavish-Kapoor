import { PageHeader } from "@/components/ui";
import { NewProjectForm } from "./NewProjectForm";

export default function NewProjectPage() {
  return (
    <>
      <PageHeader title="New project" subtitle="Creates the project folder, manifest and sub-folders." />
      <NewProjectForm />
    </>
  );
}
