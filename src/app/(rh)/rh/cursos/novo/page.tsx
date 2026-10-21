import type { Metadata } from "next";
import { AdminPage, AdminPageHeader } from "@/components/admin/page-header";
import { CourseForm, EMPTY_COURSE } from "@/features/rh/courses/course-form";
import { requireRhCtx } from "@/server/auth/rh";
import { listCourseCategories } from "@/server/services/courses";
import { orgOptions } from "@/server/services/rh/org";

export const metadata: Metadata = { title: "Novo curso · Gestão" };

export default async function NewCoursePage() {
  const ctx = await requireRhCtx("course:manage");
  const [categories, org] = await Promise.all([listCourseCategories(), orgOptions(ctx)]);
  return (
    <AdminPage>
      <AdminPageHeader title="Novo curso" crumbs={[{ label: "Cursos", href: "/rh/cursos" }]} description="O curso começa como rascunho. Depois de salvar, adicione módulos e aulas e publique." />
      <CourseForm initial={EMPTY_COURSE} categories={categories} audienceOptions={org} />
    </AdminPage>
  );
}
