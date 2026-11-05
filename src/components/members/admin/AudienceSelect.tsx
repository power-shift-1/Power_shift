import { SelectField } from "@/components/members/Field";

/** Everyone, or only one course's buyers. */
export function AudienceSelect({ id, courses }: { id: string; courses: { id: string; title: string }[] }) {
  return (
    <SelectField id={id} name="course_id" label="Who sees it" defaultValue="">
      <option value="">Every member</option>
      {courses.map((course) => (
        <option key={course.id} value={course.id}>
          Buyers of {course.title}
        </option>
      ))}
    </SelectField>
  );
}
