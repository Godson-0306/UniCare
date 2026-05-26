import { DataListPage } from "@/components/student/data-list-page";

export default function StudentPrescriptionsPage() {
  return (
    <DataListPage
      title="Prescriptions"
      endpoint="/student/prescriptions/"
      emptyMessage="No prescriptions on record."
    />
  );
}
