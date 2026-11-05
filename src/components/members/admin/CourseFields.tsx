import { CheckboxField, Field, TextAreaField } from "@/components/members/Field";

type Course = {
  title: string;
  slug: string;
  summary: string;
  cover_url: string | null;
  price_paise: number;
  is_published: boolean;
  sort: number;
};

/** The course form's fields, shared by Add and Edit. */
export function CourseFields({ course }: { course?: Course }) {
  return (
    <>
      <Field id="course-title" name="title" label="Title" required maxLength={160} defaultValue={course?.title} />
      <Field
        id="course-slug"
        name="slug"
        label="Web address"
        maxLength={80}
        defaultValue={course?.slug}
        hint="The part after /courses/. Leave empty to make one from the title."
      />
      <Field
        id="course-price"
        name="price"
        label="Price in rupees"
        type="number"
        inputMode="decimal"
        min={1}
        step="0.01"
        required
        defaultValue={course ? course.price_paise / 100 : undefined}
      />
      <TextAreaField id="course-summary" name="summary" label="Summary" maxLength={2000} defaultValue={course?.summary} />
      <Field id="course-cover" name="cover_url" label="Cover picture link (optional)" type="url" placeholder="https://" defaultValue={course?.cover_url ?? ""} />
      <Field id="course-sort" name="sort" label="Order on the courses page" type="number" defaultValue={course?.sort ?? 0} />
      <CheckboxField id="course-published" name="is_published" label="Published: members can see it" defaultChecked={course?.is_published} />
    </>
  );
}
